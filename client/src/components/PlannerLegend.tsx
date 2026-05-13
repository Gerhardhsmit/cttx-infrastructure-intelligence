/*
 * CTTX Link Planner command-board philosophy:
 * Swiss operational typography, dark navy infrastructure intelligence, precise semantic colours,
 * fixed planning surfaces, and restrained engineering language. This legend is the right-side
 * evidence control panel where layer opacity and operational counts remain transparent.
 */

import { BackboneLink, HighSite, Mast, Facility, PROVIDER_COLOURS, RidgeCandidate, RoadFeature, mastProviderLabel } from "@/lib/linkPlanner";
import { LayerKey, LayerState } from "@/components/PlannerMap";

type PlannerLegendProps = {
  layers: LayerState;
  onLayerChange: (key: LayerKey, patch: Partial<LayerState[LayerKey]>) => void;
  highSites: HighSite[];
  masts: Mast[];
  links: BackboneLink[];
  facilities: Facility[];
  roads: RoadFeature[];
  ridgeCandidates: RidgeCandidate[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

const LAYER_META: Record<LayerKey, { label: string; colour: string; detail: string }> = {
  boundary: { label: "Boundary", colour: "#67e8f9", detail: "confirmed property polygon" },
  insideHighSites: { label: "Core high sites", colour: "#22c55e", detail: "highest terrain candidates inside boundary" },
  nearbyHighSites: { label: "Nearby kopjes", colour: "#38bdf8", detail: "relay candidates near the boundary" },
  remoteHighSites: { label: "Remote terrain", colour: "#64748b", detail: "off by default, not used in backbone" },
  masts: { label: "Carrier masts", colour: "#eab308", detail: "classified Vodacom, MTN, Cell C, Telkom" },
  unknownMasts: { label: "Unknown carriers", colour: "#94a3b8", detail: "visible by default where provider cannot be inferred" },
  backbone: { label: "LOS network links", colour: "#ffffff", detail: "green confirmed, amber marginal, red blocked" },
  facilities: { label: "Detected facilities", colour: "#8b5cf6", detail: "lodges, gates, buildings, operating points" },
  roads: { label: "Road traces", colour: "#f8fafc", detail: "OSM highway geometry inside boundary" },
};

function countForLayer(key: LayerKey, highSites: HighSite[], masts: Mast[], links: BackboneLink[], facilities: Facility[], roads: RoadFeature[], ridgeCandidates: RidgeCandidate[]) {
  switch (key) {
    case "boundary":
      return highSites.length || masts.length || links.length || facilities.length || roads.length ? 1 : 0;
    case "insideHighSites":
      return highSites.filter(site => site.category === "inside").length;
    case "nearbyHighSites":
      return highSites.filter(site => site.category === "nearby").length + ridgeCandidates.length;
    case "remoteHighSites":
      return highSites.filter(site => site.category === "remote").length;
    case "masts":
      return masts.filter(mast => mast.provider !== "unknown").length;
    case "unknownMasts":
      return masts.filter(mast => mast.provider === "unknown").length;
    case "backbone":
      return links.length;
    case "facilities":
      return facilities.length;
    case "roads":
      return roads.length;
  }
}

export default function PlannerLegend({ layers, onLayerChange, highSites, masts, links, facilities, roads, ridgeCandidates, collapsed, onToggleCollapsed }: PlannerLegendProps) {
  const linkCounts = {
    uplink: links.filter(link => link.type === "uplink").length,
    backbone: links.filter(link => link.type === "backbone").length,
    distribution: links.filter(link => link.type === "distribution" || link.type === "relay").length,
    confirmed: links.filter(link => link.losStatus === "confirmed").length,
    marginal: links.filter(link => link.losStatus === "marginal").length,
    blocked: links.filter(link => link.losStatus === "blocked").length,
  };

  const providerCounts = Object.keys(PROVIDER_COLOURS).map(provider => ({
    provider: provider as keyof typeof PROVIDER_COLOURS,
    count: masts.filter(mast => mast.provider === provider).length,
    colour: PROVIDER_COLOURS[provider as keyof typeof PROVIDER_COLOURS],
  }));

  return (
    <aside className={`planner-legend ${collapsed ? "collapsed" : "expanded"}`} aria-label="Map layer legend">
      <button type="button" className="panel-collapse-toggle right" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand right legend panel" : "Collapse right legend panel"} aria-expanded={!collapsed}>
        <span>{collapsed ? "◀" : "×"}</span>
        <small>Layers</small>
      </button>
      <div className="panel-collapsible-content">
      <div className="legend-heading">
        <span>Live Layers</span>
        <h2>Map Evidence</h2>
      </div>
      <div className="legend-stack">
        {(Object.keys(LAYER_META) as LayerKey[]).map(key => {
          const meta = LAYER_META[key];
          const count = countForLayer(key, highSites, masts, links, facilities, roads, ridgeCandidates);
          return (
            <div className={`legend-row ${layers[key].enabled ? "enabled" : "disabled"}`} key={key}>
              <label className="legend-toggle">
                <input
                  type="checkbox"
                  checked={layers[key].enabled}
                  onChange={event => onLayerChange(key, { enabled: event.target.checked })}
                />
                <span className="legend-swatch" style={{ "--swatch-colour": meta.colour } as React.CSSProperties} />
                <span className="legend-copy">
                  <strong>{meta.label}</strong>
                  <small>{meta.detail}</small>
                </span>
                <span className="legend-count">{count}</span>
              </label>
              <div className="legend-compact-detail">Opacity {(layers[key].opacity * 100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      <div className="legend-section">
        <h3>LOS colour code</h3>
        <div className="line-key"><span className="line-sample green" />Confirmed LOS — solid green</div>
        <div className="line-key"><span className="line-sample gold dashed" />Marginal LOS — amber dashed with warning</div>
        <div className="line-key"><span className="line-sample red dotted" />Blocked LOS — red dotted diagnostic</div>
        <div className="line-key"><span className="line-sample slate dashed" />LOS pending — awaiting elevation profile</div>
      </div>

      <div className="legend-section">
        <h3>Network counts</h3>
        <div className="mini-metrics four">
          <div><strong>{linkCounts.confirmed}</strong><span>Confirmed</span></div>
          <div><strong>{linkCounts.marginal}</strong><span>Marginal</span></div>
          <div><strong>{linkCounts.blocked}</strong><span>Blocked</span></div>
          <div><strong>{linkCounts.uplink}</strong><span>Uplinks</span></div>
        </div>
        <div className="legend-footnote">Topology spans: {linkCounts.backbone} backbone, {linkCounts.distribution} facility, {linkCounts.uplink} carrier uplink.</div>
      </div>

      <div className="legend-section">
        <h3>Carrier distribution</h3>
        <div className="provider-list">
          {providerCounts.map(item => (
            <div key={item.provider} className="provider-row">
              <span style={{ background: item.colour }} />
              <strong>{mastProviderLabel(item.provider)}</strong>
              <small>{item.count}</small>
            </div>
          ))}
        </div>
      </div>
      </div>
    </aside>
  );
}
