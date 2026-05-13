/*
 * CTTX Link Planner command-board philosophy:
 * Swiss operational typography, dark navy infrastructure intelligence, precise semantic colours,
 * fixed planning surfaces, and restrained engineering language. This sidebar is the 360px command
 * surface for boundary selection, terrain intelligence, and deployment planning actions.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BackboneLink,
  BoundarySelection,
  FACILITY_TYPES,
  Facility,
  FacilityTypeKey,
  HighSite,
  highSiteKey,
  LatLng,
  Mast,
  ManualPointLink,
  MANUAL_LINK_HEIGHT_OPTIONS,
  Relay,
  boundaryCentreFromPolygon,
  flattenNominatimPolygon,
  formatKm,
  roughBoundaryAroundCentre,
  isValidLatLng,
  mastProviderLabel,
} from "@/lib/linkPlanner";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
  geojson?: any;
  type?: string;
  osm_type?: string;
  osm_id?: number;
};

type PlannerSidebarProps = {
  boundary: BoundarySelection | null;
  highSites: HighSite[];
  masts: Mast[];
  selectedMast: Mast | null;
  links: BackboneLink[];
  facilities: Facility[];
  loading: boolean;
  status: string;
  error: string | null;
  manualHighSiteMode: boolean;
  facilityMode: FacilityTypeKey | null;
  relays: Relay[];
  manualLinks: ManualPointLink[];
  manualLinkMode: boolean;
  pendingManualLinkPoint: LatLng | null;
  relayPlacementMode: boolean;
  onRelayModeToggle: () => void;
  onManualLinkModeToggle: () => void;
  onManualLinkHeightChange: (linkId: string, endpoint: "A" | "B", height: number) => void;
  onManualLinkDelete: (linkId: string) => void;
  relayHeightPending: LatLng | null;
  onConfirmRelayHeight: (height: number) => void;
  onBoundaryPreview: (boundary: BoundarySelection) => void;
  onConfirmBoundary: () => void;
  onManualModeToggle: () => void;
  onFacilityModeChange: (type: FacilityTypeKey | null) => void;
  onMastSelect: (mast: Mast) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onFacilityFocus: (facility: Facility) => void;  highSiteLabels?: Record<string, string>;
  onHighSiteLabelChange?: (site: HighSite, label: string) => void;
};

function classifyResults(result: NominatimResult): BoundarySelection {
  const fallback = { lat: Number(result.lat), lng: Number(result.lon) };
  const polygon = flattenNominatimPolygon(result.geojson);
  const centre = boundaryCentreFromPolygon(polygon, fallback);
  const bbox = result.boundingbox?.length === 4 ? result.boundingbox.map(Number) as [number, number, number, number] : undefined;
  return {
    id: String(result.place_id),
    displayName: result.display_name,
    centre,
    polygon,
    bbox,
  };
}

function shortName(displayName: string) {
  return displayName.split(",").slice(0, 3).join(",");
}

function boundarySearchQueries(rawQuery: string): string[] {
  const cleaned = rawQuery.trim();
  const normalised = cleaned.toLowerCase();

  // Strip any trailing type suffix to extract the core name
  // e.g. "Addo Elephant Park" → core = "Addo Elephant"
  // e.g. "Shamwari Private Game Reserve" → core = "Shamwari"
  const suffixes = [
    "private game reserve", "game reserve", "national park",
    "nature reserve", "safaris", "reserve", "park",
  ];
  let core = cleaned;
  for (const suffix of suffixes) {
    if (normalised.endsWith(suffix)) {
      core = cleaned.slice(0, cleaned.length - suffix.length).trim();
      break;
    }
  }

  // Build ALL variants — these are fired in PARALLEL so order doesn't matter
  const variants = new Set<string>();

  // 1. Exact query as typed
  variants.add(cleaned);

  // 2. Core name + every possible type suffix (critical: "Addo Elephant" + "National Park")
  for (const suffix of ["National Park", "Game Reserve", "Private Game Reserve", "Nature Reserve"]) {
    variants.add(`${core} ${suffix}`);
    variants.add(`${core} ${suffix}, South Africa`);
  }

  // 3. Original + South Africa context
  if (!normalised.includes("south africa")) {
    variants.add(`${cleaned}, South Africa`);
  }

  // 4. Core name alone (for short queries)
  if (core !== cleaned) {
    variants.add(core);
    variants.add(`${core}, South Africa`);
  }

  return Array.from(variants).filter(Boolean);
}

function resultQuality(result: NominatimResult) {
  const polygonPoints = flattenNominatimPolygon(result.geojson).length;
  // Relations have full boundary polygons; strongly prefer them over ways/nodes
  const relationBoost = result.osm_type === "relation" ? 1000 : result.osm_type === "way" ? 100 : 0;
  const classBoost = /nature_reserve|protected_area|reserve|park|national_park/i.test(`${result.type || ""} ${result.display_name || ""}`) ? 500 : 0;
  const nameBoost = /reserve|park|game|national|safari/i.test(result.display_name || "") ? 200 : 0;
  // Penalise sub-sections (e.g. "Addo Elephant Park (Nyati Section)")
  const sectionPenalty = /\(.*section\)/i.test(result.display_name || "") ? -400 : 0;
  return polygonPoints + relationBoost + classBoost + nameBoost + sectionPenalty;
}

async function fetchNominatimVariant(q: string, signal: AbortSignal): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&limit=8&countrycodes=za&q=${encodeURIComponent(q)}`;
  const resp = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data;
}

async function searchNominatim(query: string, signal: AbortSignal): Promise<NominatimResult[]> {
  if (signal.aborted) throw new DOMException("Boundary search aborted", "AbortError");

  const variants = boundarySearchQueries(query);

  // Fire ALL variants in parallel — this is the key fix.
  // Sequential search stops as soon as it finds sub-section results; parallel merges everything.
  const results = await Promise.allSettled(variants.map(v => fetchNominatimVariant(v, signal)));

  if (signal.aborted) throw new DOMException("Boundary search aborted", "AbortError");

  const seen = new Set<string>();
  const merged: NominatimResult[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (!item?.place_id) continue;
      // Filter out sub-sections — user wants the full boundary, not "(Nyati Section)"
      if (/\(.*section\)/i.test(item.display_name || "")) continue;
      const polygon = flattenNominatimPolygon(item?.geojson);
      if (polygon.length < 3) continue;
      const key = String(item.place_id);
      if (seen.has(key)) continue; // deduplicate
      seen.add(key);
      merged.push(item);
    }
  }

  const sorted = merged.sort((a, b) => resultQuality(b) - resultQuality(a));
  if (!sorted.length) {
    throw new Error("No boundary polygon found. Try the full official name (e.g. \"Addo Elephant National Park\") or use manual coordinates below.");
  }
  return sorted;
}

function highSiteDisplayLabel(site: HighSite, labels: Record<string, string>) {
  return labels[highSiteKey(site)] || site.name || "High point";
}

export default function PlannerSidebar({
  boundary,
  highSites,
  masts,
  selectedMast,
  links,
  facilities,
  loading,
  status,
  error,
  manualHighSiteMode,
  facilityMode,
  relays,
  manualLinks,
  manualLinkMode,
  pendingManualLinkPoint,
  relayPlacementMode,
  onRelayModeToggle,
  onManualLinkModeToggle,
  onManualLinkHeightChange,
  onManualLinkDelete,
  relayHeightPending,
  onConfirmRelayHeight,
  onBoundaryPreview,
  onConfirmBoundary,
  onManualModeToggle,
  onFacilityModeChange,
  onMastSelect,
  collapsed,
  onToggleCollapsed,
  onFacilityFocus,
  highSiteLabels = {},
  onHighSiteLabelChange,
}: PlannerSidebarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualCoordMode, setManualCoordMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const groupedSites = useMemo(() => ({
    inside: highSites.filter(site => site.category === "inside"),
    nearby: highSites.filter(site => site.category === "nearby"),
    remote: highSites.filter(site => site.category === "remote"),
  }), [highSites]);

  const visibleMasts = useMemo(() => masts.filter(mast => mast.visible && mast.provider !== "unknown"), [masts]);
  const highlightedMasts = useMemo(() => masts.filter(mast => mast.isClosestForProvider), [masts]);
  const facilitySummary = useMemo(() => ({
    detected: facilities.filter(facility => facility.source === "osm").length,
    manual: facilities.filter(facility => facility.source === "manual").length,
    gates: facilities.filter(facility => facility.type === "gate").length,
    operatingPoints: facilities.length,
  }), [facilities]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        setResults(await searchNominatim(query, ctrl.signal));
      } catch (err: any) {
        if (err.name !== "AbortError") setSearchError(err.message || "Boundary search unavailable");
      } finally {
        setSearching(false);
      }
    }, 380);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const handleManualBoundary = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!isValidLatLng({ lat, lng })) {
      setSearchError("Invalid coordinates. Use decimal format: lat -90 to 90, lng -180 to 180.");
      return;
    }
    const centre = { lat, lng };
    const polygon = roughBoundaryAroundCentre(centre, 8);
    const manualBoundary: BoundarySelection = {
      id: `manual-${Date.now()}`,
      displayName: `Manual boundary (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      centre,
      polygon,
    };
    onBoundaryPreview(manualBoundary);
    setManualCoordMode(false);
    setManualLat("");
    setManualLng("");
    setSearchError(null);
  };

  return (
    <aside className={`planner-sidebar ${collapsed ? "collapsed" : "expanded"}`} aria-label="Link Planner controls">
      <button type="button" className="panel-collapse-toggle left" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand left planner panel" : "Collapse left planner panel"} aria-expanded={!collapsed}>
        <span>{collapsed ? "☰" : "×"}</span>
        <small>Plan</small>
      </button>
      <div className="panel-collapsible-content">
      <div className="sidebar-hero">
        <div className="eyebrow">CTTX Infrastructure Intelligence</div>
        <h1>Link Planner</h1>
        <p>Terrain-led deployment planning for reserves, lodges, farms, and remote operating environments.</p>
      </div>

      <section className="panel-block boundary-panel">
        <div className="panel-heading">
          <span>Step 1</span>
          <h2>Boundary</h2>
        </div>
        <label className="field-label" htmlFor="boundary-search">Search property, reserve, farm, town, or operating area</label>
        <input
          id="boundary-search"
          className="command-input"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Example: Sabi Sand Game Reserve"
          autoComplete="off"
        />
        <div className="search-meta">Nominatim autocomplete with boundary polygon evidence.</div>
        {searching ? <div className="micro-status">Searching boundary index…</div> : null}
        {searchError && !manualCoordMode ? <div className="micro-alert">{searchError}</div> : null}
        {results.length ? (
          <div className="search-results">
            {results.map(result => {
              const polygon = flattenNominatimPolygon(result.geojson);
              return (
                <button
                  type="button"
                  key={result.place_id}
                  className="search-result"
                  onClick={() => onBoundaryPreview(classifyResults(result))}
                >
                  <strong>{shortName(result.display_name)}</strong>
                  <span>{polygon.length >= 3 ? `${polygon.length} boundary points` : "centre point only"}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {!results.length && query.trim().length >= 3 && !searching && !manualCoordMode ? (
          <button
            type="button"
            className="secondary-command"
            onClick={() => setManualCoordMode(true)}
          >
            No results found — enter coordinates manually
          </button>
        ) : null}
        {manualCoordMode ? (
          <div className="manual-coord-entry">
            <label className="field-label">Latitude</label>
            <input
              type="number"
              className="command-input"
              value={manualLat}
              onChange={e => setManualLat(e.target.value)}
              placeholder="-25.5"
              step="0.001"
            />
            <label className="field-label">Longitude</label>
            <input
              type="number"
              className="command-input"
              value={manualLng}
              onChange={e => setManualLng(e.target.value)}
              placeholder="31.5"
              step="0.001"
            />
            {searchError && manualCoordMode ? <div className="micro-alert">{searchError}</div> : null}
            <button type="button" className="primary-command" onClick={handleManualBoundary}>
              Create rough boundary
            </button>
            <button type="button" className="secondary-command" onClick={() => setManualCoordMode(false)}>
              Cancel
            </button>
          </div>
        ) : null}
        {boundary ? (
          <div className="selected-boundary">
            <span>Selected boundary</span>
            <strong>{shortName(boundary.displayName)}</strong>
            <small>{boundary.polygon.length >= 3 ? `${boundary.polygon.length} polygon points ready` : "No polygon returned; centre-based analysis will run"}</small>
          </div>
        ) : null}
        <button type="button" className="primary-command" disabled={!boundary || loading} onClick={onConfirmBoundary}>
          {loading ? "Analysing terrain and structures…" : "Confirm boundary and load intelligence"}
        </button>
        <div className="trigger-note">Confirmation auto-runs facility detection, terrain candidates, and carrier mast discovery in parallel. No step gates.</div>
      </section>

      <section className="panel-block status-panel">
        <div className="panel-heading compact">
          <span>Status</span>
          <h2>Planning State</h2>
        </div>
        <div className={`status-line ${loading ? "active" : ""}`}>{status}</div>
        {error ? <div className="micro-alert">{error}</div> : null}
      </section>

      <section className="panel-block terrain-panel">
        <div className="panel-heading">
          <span>Step 2</span>
          <h2>High Sites</h2>
        </div>
        <div className="metric-grid">
          <div><strong>{groupedSites.inside.length}</strong><span>Inside</span></div>
          <div><strong>{groupedSites.nearby.length}</strong><span>Nearby</span></div>
          <div><strong>{groupedSites.remote.length}</strong><span>Remote</span></div>
        </div>
        <button type="button" className={`secondary-command ${manualHighSiteMode ? "armed" : ""}`} onClick={onManualModeToggle}>
          {manualHighSiteMode ? "Manual relay placement armed" : "Place manual relay candidate"}
        </button>
        <div className="trigger-note">Manual placement remains available whether automated peaks are found or not.</div>
        <button type="button" className={`secondary-command ${relayPlacementMode ? "armed" : ""}`} onClick={onRelayModeToggle}>
          {relayPlacementMode ? "Relay placement armed" : "Place relay"}
        </button>
        <div className="trigger-note">Click the map to place a relay at any location.</div>

        <div className="item-list">
          {highSites.slice(0, 7).map(site => (
            <div className="planner-item" key={`${site.source}-${site.lat}-${site.lng}`}>
              <div>
                <strong>{highSiteDisplayLabel(site, highSiteLabels)}</strong>
                        {onHighSiteLabelChange ? (
                          <input
                            className="sidebar-high-site-label-input"
                            value={highSiteDisplayLabel(site, highSiteLabels)}
                            aria-label={`Rename ${site.name}`}
                            onChange={event => onHighSiteLabelChange(site, event.target.value)}
                            onClick={event => event.stopPropagation()}
                          />
                        ) : null}
                <span>{site.category} terrain candidate</span>
              </div>
              <small>{site.elevation ? `${Math.round(site.elevation)}m` : site.source}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-block mast-panel">
        <div className="panel-heading">
          <span>Step 3</span>
          <h2>Carrier Masts</h2>
        </div>
        <div className="metric-grid two">
          <div><strong>{masts.length}</strong><span>Total found</span></div>
          <div><strong>{highlightedMasts.length}</strong><span>Closest per provider</span></div>
        </div>
        <div className="item-list">
          {(visibleMasts.length ? visibleMasts : highlightedMasts).slice(0, 8).map(mast => (
            <button
              type="button"
              className={`planner-item mast-select ${selectedMast?.lat === mast.lat && selectedMast?.lng === mast.lng ? "selected" : ""}`}
              key={`${mast.provider}-${mast.lat}-${mast.lng}`}
              onClick={() => onMastSelect(mast)}
            >
              <div>
                <strong>{mastProviderLabel(mast.provider).toUpperCase()}</strong>
                <span>{mast.name}</span>
              </div>
              <small>{formatKm(mast.distFromRelay)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-block backbone-panel">
        <div className="panel-heading">
          <span>Step 4</span>
          <h2>Network Topology</h2>
        </div>
        <div className="metric-grid two">
          <div><strong>{links.filter(l => l.type === "backbone").length}</strong><span>Backbone spans</span></div>
          <div><strong>{links.filter(l => l.losStatus === "confirmed").length}</strong><span>LOS confirmed</span></div>
        </div>
        <div className="trigger-note">Topology is auto-built after boundary confirmation. All links include LOS clearance analysis and terrain profiles.</div>

        <button type="button" className={`secondary-command ${manualLinkMode ? "armed" : ""}`} onClick={onManualLinkModeToggle}>
          {manualLinkMode ? (pendingManualLinkPoint ? "Point A placed — click Point B" : "Draw Link mode armed") : "Draw Link"}
        </button>
        <div className="trigger-note">Draw manual point-to-point links between any two map locations. Each endpoint is draggable and has its own mast height.</div>
        {manualLinks.length ? (
          <div className="manual-link-list">
            {manualLinks.map((link, index) => (
              <div className={`manual-link-card ${link.losStatus}`} key={link.id}>
                <div className="manual-link-card-head">
                  <strong>Manual link {index + 1}</strong>
                  <button type="button" onClick={() => onManualLinkDelete(link.id)}>Delete</button>
                </div>
                <small>{formatKm(link.distKm)} · {link.calculating ? "calculating" : `${link.losStatus} · ${link.worstClearance.toFixed(1)}m clearance`}</small>
                <div className="manual-link-height-row">
                  <label>Point A
                    <select value={link.pointA.height} onChange={event => onManualLinkHeightChange(link.id, "A", Number(event.target.value))}>
                      {MANUAL_LINK_HEIGHT_OPTIONS.map(height => <option key={`a-${height}`} value={height}>{height}m</option>)}
                    </select>
                  </label>
                  <label>Point B
                    <select value={link.pointB.height} onChange={event => onManualLinkHeightChange(link.id, "B", Number(event.target.value))}>
                      {MANUAL_LINK_HEIGHT_OPTIONS.map(height => <option key={`b-${height}`} value={height}>{height}m</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <section className="panel-block facility-panel">
        <div className="panel-heading">
          <span>Inspect</span>
          <h2>Facilities</h2>
        </div>
        <div className="metric-grid two">
          <div><strong>{facilitySummary.operatingPoints}</strong><span>Operating points</span></div>
          <div><strong>{facilitySummary.gates}</strong><span>Gates</span></div>
        </div>
        <div className="facility-placement-row">
          <select
            className="facility-type-select"
            value={facilityMode || ""}
            onChange={event => onFacilityModeChange(event.target.value ? event.target.value as FacilityTypeKey : null)}
          >
            <option value="">Select type…</option>
            {(Object.keys(FACILITY_TYPES) as FacilityTypeKey[]).filter(k => k !== "relay").map(key => (
              <option key={key} value={key}>{FACILITY_TYPES[key].label}</option>
            ))}
          </select>
          <button
            type="button"
            className={`secondary-command facility-place-btn ${facilityMode ? "armed" : ""}`}
            onClick={() => onFacilityModeChange(facilityMode ? null : "other")}
            disabled={!boundary}
          >
            {facilityMode ? "Placement armed — click map" : "Add Facility"}
          </button>
        </div>
        <div className="trigger-note">Select a type, then click the map to place a manual facility. Default height: 5m above ground.</div>
        <div className="item-list compact-facility-list">
          {facilities.slice(0, 16).map(facility => (
            <button type="button" className="planner-item facility-fly-item" key={facility.id} onClick={() => onFacilityFocus(facility)}>
              <div>
                <strong>{facility.name}</strong>
                <span>{FACILITY_TYPES[facility.type].label}</span>
              </div>
              <small>Fly to</small>
            </button>
          ))}
          {!facilities.length ? <div className="empty-note">No facilities detected yet.</div> : null}
          {facilities.length > 16 ? <div className="empty-note">+ {facilities.length - 16} more facilities</div> : null}
        </div>
      </section>
      {relayHeightPending && (
        <div className="relay-height-modal-overlay">
          <div className="relay-height-modal">
            <h3>Select relay mast height</h3>
            <div className="relay-height-buttons">
              {[10, 15, 18, 24, 30, 36].map(height => (
                <button
                  key={height}
                  type="button"
                  className={height === 18 ? "default" : ""}
                  onClick={() => onConfirmRelayHeight(height)}
                >
                  {height}m
                </button>
              ))}
            </div>
            <button type="button" className="cancel-button" onClick={() => {
              // Cancel relay placement
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      </div>
    </aside>
  );
}
