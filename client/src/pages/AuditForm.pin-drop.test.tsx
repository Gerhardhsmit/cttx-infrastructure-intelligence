// @vitest-environment jsdom
import React, { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuditForm from "./AuditForm";

const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
  createAuditMutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  mapClick: undefined as undefined | ((event: { latLng: { lat: () => number; lng: () => number } }) => void),
  placeChanged: undefined as undefined | (() => void),
  autocompletePlace: undefined as undefined | { formatted_address?: string; name?: string; geometry?: { location?: { lat: () => number; lng: () => number } } },
  mapCenter: { lat: -33.1842, lng: 26.5698 },
  mapSetCenter: vi.fn(),
  mapSetZoom: vi.fn(),
  mapFitBounds: vi.fn(),
  markerConstructor: vi.fn(),
  polylineConstructor: vi.fn(),
  circleConstructor: vi.fn(),
  polygonConstructor: vi.fn(),
  boundsExtend: vi.fn(),
  boundsInstances: [] as Array<{ points: Array<{ lat: number; lng: number }> }>,
  elevationLocations: [] as Array<{ lat: number; lng: number }>,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/audit/new", mocks.setLocation],
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo },
}));

vi.mock("@/components/Map", () => ({
  MapView: (props: { onMapReady?: (map: { getCenter: () => { lat: () => number; lng: () => number }; getZoom: () => number; setCenter: (latLng: { lat: number; lng: number }) => void; setZoom: (zoom: number) => void; fitBounds: (bounds: unknown, padding?: number) => void; addListener: (eventName: string, callback: typeof mocks.mapClick) => { remove: () => void } }) => void }) => {
    useEffect(() => {
      props.onMapReady?.({
        getCenter: () => ({ lat: () => mocks.mapCenter.lat, lng: () => mocks.mapCenter.lng }),
        getZoom: () => 12,
        setCenter: mocks.mapSetCenter,
        setZoom: mocks.mapSetZoom,
        fitBounds: mocks.mapFitBounds,
        addListener: (_eventName, callback) => {
          mocks.mapClick = callback;
          return { remove: vi.fn() };
        },
      });
    }, []);

    return (
      <button
        type="button"
        onClick={() => mocks.mapClick?.({ latLng: { lat: () => -33.33333333, lng: () => 26.66666666 } })}
      >
        Mock audit map click
      </button>
    );
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => (
    <select aria-label="mock select" value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    audits: {
      create: {
        useMutation: () => ({ mutateAsync: mocks.createAuditMutateAsync, isPending: false }),
      },
    },
  },
}));

function getPropertyBoundaryInput() {
  return screen.getByRole("textbox", { name: /^Property boundary$/i });
}

function openManualOfflineOptions() {
  const summary = screen.getAllByText(/Manual \/ offline options/i).find((element) => element.tagName.toLowerCase() === "summary");
  if (!summary) throw new Error("Manual / offline options summary was not found");
  const details = summary.closest("details");
  if (details && !details.hasAttribute("open")) fireEvent.click(summary);
}

function enterManualPropertyCoordinates(latitude: string, longitude: string, propertySize = "22000") {
  openManualOfflineOptions();
  fireEvent.change(screen.getByLabelText(/property size/i), { target: { value: propertySize } });
  fireEvent.change(screen.getByLabelText(/manual latitude/i), { target: { value: latitude } });
  fireEvent.change(screen.getByLabelText(/manual longitude/i), { target: { value: longitude } });
  fireEvent.click(screen.getByRole("button", { name: /use these coordinates/i }));
}

describe("AuditForm pin-drop workflow", () => {
  beforeEach(() => {
    mocks.setLocation.mockClear();
    mocks.createAuditMutateAsync.mockResolvedValue({ id: 7788 });
    mocks.createAuditMutateAsync.mockClear();
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
    mocks.toastInfo.mockClear();
    mocks.mapSetCenter.mockClear();
    mocks.mapSetZoom.mockClear();
    mocks.mapFitBounds.mockClear();
    mocks.markerConstructor.mockClear();
    mocks.polylineConstructor.mockClear();
    mocks.circleConstructor.mockClear();
    mocks.polygonConstructor.mockClear();
    mocks.boundsExtend.mockClear();
    mocks.boundsInstances = [];
    mocks.elevationLocations = [];
    mocks.mapClick = undefined;
    mocks.placeChanged = undefined;
    mocks.autocompletePlace = undefined;
    mocks.mapCenter = { lat: -33.1842, lng: 26.5698 };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("api.open-meteo.com")) {
        return {
          ok: true,
          json: async () => ({
            elevation: Array.from({ length: 100 }, (_, index) => {
              const row = Math.floor(index / 10);
              const col = index % 10;
              return row % 2 === 1 && col % 2 === 1 ? 1000 + row * 10 + col : 300 + row + col;
            }),
          }),
        };
      }
      return { ok: true, json: async () => [] };
    }));
    vi.stubGlobal("google", {
      maps: {
        SymbolPath: { CIRCLE: "CIRCLE" },
        ElevationStatus: { OK: "OK" },
        LatLngBounds: vi.fn(function MockLatLngBounds(this: any) {
          const points: Array<{ lat: number; lng: number }> = [];
          this.points = points;
          mocks.boundsInstances.push({ points });
          this.extend = (point: { lat: number; lng: number }) => {
            points.push(point);
            mocks.boundsExtend(point);
          };
        }),
        Marker: vi.fn(function MockMarker(this: any, options: unknown) {
          mocks.markerConstructor(options);
          this.setMap = vi.fn();
        }),
        Polyline: vi.fn(function MockPolyline(this: any, options: unknown) {
          mocks.polylineConstructor(options);
          this.setMap = vi.fn();
        }),
        Circle: vi.fn(function MockCircle(this: any, options: unknown) {
          mocks.circleConstructor(options);
          this.setMap = vi.fn();
        }),
        Polygon: vi.fn(function MockPolygon(this: any, options: unknown) {
          mocks.polygonConstructor(options);
          this.setMap = vi.fn();
        }),
        ElevationService: vi.fn(function MockElevationService(this: any) {
          this.getElevationForLocations = vi.fn(({ locations }: { locations: Array<{ lat: number; lng: number }> }, callback: (results: Array<{ location: { lat: () => number; lng: () => number }; elevation: number }>, status: string) => void) => {
            mocks.elevationLocations = locations;
            callback(
              locations.map((location, index) => ({
                location: { lat: () => location.lat, lng: () => location.lng },
                elevation: 450 + index,
              })),
              "OK",
            );
          });
        }),
        event: {
          trigger: vi.fn(),
        },
        places: {
          Autocomplete: vi.fn(function MockAutocomplete(this: any) {
            this.bindTo = vi.fn();
            this.addListener = vi.fn((_eventName: string, callback: () => void) => {
              mocks.placeChanged = callback;
              return { remove: vi.fn() };
            });
            this.getPlace = () => mocks.autocompletePlace;
          }),
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows an instant GIS auto-scan preview when technician property coordinates are entered", async () => {
    render(<AuditForm />);

    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();
    expect(screen.getByLabelText(/GIS auto-scan preview/i)).toBeTruthy();

    enterManualPropertyCoordinates("-33.123456", "26.654321");

    expect(await screen.findByText(/provider masts within 20 km, .*Open-Meteo\/SRTM high-site maxima, and .*earned topology links/i)).toBeTruthy();
    await waitFor(() => expect(mocks.markerConstructor.mock.calls.some(([options]) => options?.title?.includes("SRTM High Site"))).toBe(true));
    expect(mocks.polylineConstructor.mock.calls.some(([options]) => /Single uplink/i.test(options?.title ?? ""))).toBe(true);
    expect(mocks.polylineConstructor.mock.calls.some(([options]) => /Nearest-neighbour backbone/i.test(options?.title ?? ""))).toBe(true);
    expect(mocks.circleConstructor).toHaveBeenCalledWith(expect.objectContaining({ radius: expect.any(Number) }));
    expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/OSM Nominatim/i) }));
    expect(screen.getByText(/20 km provider scan radius/i)).toBeTruthy();
    expect(screen.getByText(/^Vodacom$/i)).toBeTruthy();
    expect(screen.getByText(/^MTN$/i)).toBeTruthy();
    expect(screen.getByText(/^Cell C$/i)).toBeTruthy();
    expect(screen.getByText(/^Telkom$/i)).toBeTruthy();
    expect(screen.getAllByText(/bearing/i).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/LOS intelligence summary/i)).toBeTruthy();
    expect(screen.getAllByText(/SRTM/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/High Site|Backbone|uplink|nearest-neighbour/i).length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/Boundary source: OSM Nominatim candidate/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Day-2 threat \/ incident GPS coordinate/i), { target: { value: "-33.1910, 26.5880" } });
    fireEvent.click(screen.getByRole("button", { name: /check live relay los/i }));
    expect(await screen.findByText(/Nearest Live Relay:/i)).toBeTruthy();

    await waitFor(() => expect(mocks.markerConstructor).toHaveBeenCalled());
    expect(mocks.markerConstructor.mock.calls.filter(([options]) => /nearest on-property high site/i.test(options?.title ?? "")).length).toBeGreaterThanOrEqual(12);
    expect(mocks.markerConstructor.mock.calls.filter(([options]) => options?.title?.includes("SRTM High Site")).length).toBeGreaterThanOrEqual(5);
    expect(mocks.polylineConstructor.mock.calls.filter(([options]) => options?.title?.includes("fibre")).length).toBeGreaterThanOrEqual(2);
    expect(mocks.polylineConstructor.mock.calls.filter(([options]) => options?.title?.includes("Eskom")).length).toBeGreaterThanOrEqual(2);
    expect(mocks.mapFitBounds).toHaveBeenCalled();
    expect(screen.getByLabelText(/Step 2 map layers/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /all off/i })).toBeTruthy();
    expect(screen.getByLabelText(/toggle property boundary/i)).toBeTruthy();
  });

  it("opens the planning map fullscreen from the map body and closes it with X or Escape", async () => {
    render(<AuditForm />);

    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));

    expect(screen.getByRole("button", { name: /close fullscreen map/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /close fullscreen map/i }));
    expect(screen.queryByRole("button", { name: /close fullscreen map/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /open the planning map in fullscreen/i }));
    expect(screen.getByRole("button", { name: /close fullscreen map/i })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button", { name: /close fullscreen map/i })).toBeNull());
  });

  it("lets planners toggle individual provider, infrastructure, LOS, high-site, and property-boundary layers", async () => {
    render(<AuditForm />);

    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();

    enterManualPropertyCoordinates("-33.123456", "26.654321");

    await waitFor(() => expect(mocks.markerConstructor.mock.calls.some(([options]) => options?.title?.startsWith("Vodacom"))).toBe(true));
    expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ strokeColor: "#FFE600", fillOpacity: 0.12 }));
    expect(screen.getByText(/map layers/i)).toBeTruthy();
    expect(screen.getByText(/toggle overlays on or off for planner review/i)).toBeTruthy();

    mocks.markerConstructor.mockClear();
    fireEvent.click(screen.getByLabelText(/toggle Vodacom masts/i));
    await waitFor(() => expect(mocks.markerConstructor.mock.calls.some(([options]) => options?.title?.startsWith("MTN"))).toBe(true));
    expect(screen.getByLabelText(/toggle Vodacom masts/i).getAttribute("aria-checked")).toBe("false");

    mocks.polylineConstructor.mockClear();
    fireEvent.click(screen.getByLabelText(/toggle fibre routes/i));
    await waitFor(() => expect(mocks.polylineConstructor.mock.calls.some(([options]) => options?.title?.includes("Eskom"))).toBe(true));
    expect(mocks.polylineConstructor.mock.calls.some(([options]) => options?.title?.includes("fibre"))).toBe(false);

    mocks.polygonConstructor.mockClear();
    mocks.circleConstructor.mockClear();
    fireEvent.click(screen.getByLabelText(/toggle property boundary/i));
    await waitFor(() => expect(mocks.markerConstructor).toHaveBeenCalled());
    expect(mocks.polygonConstructor).not.toHaveBeenCalled();
    expect(mocks.circleConstructor).not.toHaveBeenCalled();
  });

  it("turns every optional overlay off and back on with the master all-layers control", async () => {
    render(<AuditForm />);

    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();

    enterManualPropertyCoordinates("-33.123456", "26.654321");

    await waitFor(() => expect(mocks.polygonConstructor).toHaveBeenCalled());
    mocks.markerConstructor.mockClear();
    mocks.polylineConstructor.mockClear();
    mocks.polygonConstructor.mockClear();
    mocks.circleConstructor.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /all off/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /all on/i })).toBeTruthy());
    expect(screen.getByLabelText(/toggle Vodacom masts/i).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByLabelText(/toggle high site peaks/i).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByLabelText(/toggle property boundary/i).getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: /all on/i }));
    await waitFor(() => expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/OSM Nominatim/i) })));
    expect(mocks.markerConstructor.mock.calls.some(([options]) => options?.title?.startsWith("Vodacom"))).toBe(true);
    expect(mocks.polylineConstructor.mock.calls.some(([options]) => options?.title?.includes("fibre"))).toBe(true);
  });

  it("loads and confirms an OpenStreetMap polygon from debounced Nominatim autocomplete", async () => {
    const nominatimResult = {
      place_id: 991,
      display_name: "Kwandwe Private Game Reserve, Eastern Cape, South Africa",
      lat: "-33.1842",
      lon: "26.5698",
      osm_id: 123456,
      osm_type: "relation",
      geojson: {
        type: "Polygon",
        coordinates: [[
          [26.55, -33.19],
          [26.59, -33.19],
          [26.59, -33.16],
          [26.55, -33.16],
          [26.55, -33.19],
        ]],
      },
    };
    const fetchMock = vi.fn(async (url: string) => {
      const requestUrl = String(url);
      if (requestUrl.includes("nominatim.openstreetmap.org")) return { ok: true, json: async () => [nominatimResult] };
      if (requestUrl.includes("overpass-api.de")) return { ok: true, json: async () => ({ elements: [{ type: "relation", members: [{ geometry: [
        { lat: -33.19, lon: 26.55 },
        { lat: -33.185, lon: 26.58 },
        { lat: -33.17, lon: 26.595 },
        { lat: -33.16, lon: 26.56 },
        { lat: -33.19, lon: 26.55 },
        { lat: -33.188, lon: 26.552 },
      ] }] }] }) };
      if (requestUrl.includes("api.open-meteo.com")) return { ok: true, json: async () => ({ elevation: Array.from({ length: 100 }, (_, index) => 400 + index) }) };
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);
    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();

    fireEvent.change(getPropertyBoundaryInput(), { target: { value: "Kwandwe" } });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const nominatimCall = fetchMock.mock.calls.find(([url]) => String(url).includes("nominatim.openstreetmap.org"));
    expect(nominatimCall).toBeTruthy();
    const requestedUrl = new URL(nominatimCall?.[0] as string);
    expect(requestedUrl.hostname).toBe("nominatim.openstreetmap.org");
    expect(requestedUrl.searchParams.get("polygon_geojson")).toBe("1");
    expect(requestedUrl.searchParams.get("countrycodes")).toBe("za,zw,bw,na,mz,sz");
    expect(await screen.findByText(/polygon_geojson available — draws immediately/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: /kwandwe private game reserve/i }));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Boundary loaded automatically from the selected OpenStreetMap result."));
    openManualOfflineOptions();
    expect(screen.getByRole("button", { name: /confirm boundary/i })).toHaveProperty("disabled", false);
    expect(screen.getByLabelText(/manual latitude/i)).toHaveProperty("value", "-33.18420000");
    expect(screen.getByLabelText(/manual longitude/i)).toHaveProperty("value", "26.56980000");
    await waitFor(() => expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ strokeColor: "#22C55E", fillColor: "#22C55E" })));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("overpass-api.de") && String(url).includes("relation"))).toBe(true));
    await waitFor(() => expect(mocks.mapFitBounds).toHaveBeenCalledWith(expect.objectContaining({ points: expect.any(Array) }), 64));
    const boundaryFitBounds = mocks.mapFitBounds.mock.calls.findLast((call) => call[1] === 64)?.[0] as { points: Array<{ lat: number; lng: number }> };
    expect(boundaryFitBounds.points.length).toBeGreaterThanOrEqual(4);
    expect(boundaryFitBounds.points.every((point) => point.lat >= -33.191 && point.lat <= -33.159 && point.lng >= 26.549 && point.lng <= 26.596)).toBe(true);
  });

  it("generates an estimated footprint and still preserves manual drawing when Nominatim has no polygon", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const requestUrl = String(url);
      if (requestUrl.includes("nominatim.openstreetmap.org")) return {
        ok: true,
        json: async () => [{
          place_id: 992,
          display_name: "Private Farm Without OSM Polygon, South Africa",
          lat: "-33.18",
          lon: "26.57",
          osm_id: 654321,
          osm_type: "way",
        }],
      };
      if (requestUrl.includes("api.open-meteo.com")) return { ok: true, json: async () => ({ elevation: Array.from({ length: 100 }, (_, index) => 350 + index) }) };
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuditForm />);
    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Private Farm" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();

    await waitFor(() => expect(getPropertyBoundaryInput()).toHaveProperty("value", "Private Farm Without OSM Polygon, South Africa"));
    expect(await screen.findByText(/estimated planning footprint was generated/i)).toBeTruthy();
    openManualOfflineOptions();
    expect(screen.getByRole("button", { name: /confirm boundary/i })).toHaveProperty("disabled", false);
    await waitFor(() => expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("Estimated planning footprint"), strokeColor: "#F59E0B" })));

    fireEvent.click(screen.getByRole("button", { name: /draw boundary manually/i }));
    expect(await screen.findByText(/Manual boundary drawing active/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm boundary/i })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(await screen.findByText(/manual boundary needs 2 more points/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(await screen.findByText(/manual boundary needs 1 more point/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(await screen.findByText(/manual boundary ready/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm boundary/i })).toHaveProperty("disabled", false);
    await waitFor(() => expect(mocks.polygonConstructor).toHaveBeenCalledWith(expect.objectContaining({ title: "Manual property boundary", strokeColor: "#22C55E" })));
  });

  it("captures the property pin independently through map clicks, Places search, and manual latitude/longitude entry", async () => {
    render(<AuditForm />);

    fireEvent.change(screen.getByLabelText(/organization \/ property name/i), { target: { value: "Kwandwe Private Game Reserve" } });
    fireEvent.change(screen.getByRole("combobox", { name: "mock select" }), { target: { value: "Game Reserve" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/location pin & infrastructure discovery/i)).toBeTruthy();

    expect(getPropertyBoundaryInput()).toHaveProperty("value", "Kwandwe Private Game Reserve");
    expect(screen.getByText(/Manual \/ offline options/i)).toBeTruthy();
    openManualOfflineOptions();
    expect(screen.getByLabelText(/manual latitude/i)).toBeTruthy();
    expect(screen.getByLabelText(/manual longitude/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(screen.getByLabelText(/manual latitude/i)).toHaveProperty("value", "-33.33333333");
    expect(screen.getByLabelText(/manual longitude/i)).toHaveProperty("value", "26.66666666");

    mocks.autocompletePlace = {
      formatted_address: "Kwandwe Private Game Reserve, Eastern Cape",
      geometry: { location: { lat: () => -33.20123456, lng: () => 26.60123456 } },
    };
    act(() => mocks.placeChanged?.());
    expect(screen.getByLabelText(/manual latitude/i)).toHaveProperty("value", "-33.20123456");
    expect(screen.getByLabelText(/manual longitude/i)).toHaveProperty("value", "26.60123456");
    expect(mocks.mapSetCenter).toHaveBeenCalledWith({ lat: -33.20123456, lng: 26.60123456 });

    fireEvent.click(screen.getByRole("button", { name: /map clicks set property pin/i }));
    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(screen.getByLabelText(/manual latitude/i)).toHaveProperty("value", "-33.33333333");
    expect(screen.getByLabelText(/manual longitude/i)).toHaveProperty("value", "26.66666666");

    fireEvent.change(screen.getByLabelText(/property size/i), { target: { value: "22000" } });
    fireEvent.change(screen.getByLabelText(/manual latitude/i), { target: { value: "-33.1842" } });
    fireEvent.change(screen.getByLabelText(/manual longitude/i), { target: { value: "26.5698" } });
    fireEvent.click(screen.getByRole("button", { name: /use these coordinates/i }));
    expect(screen.getByLabelText(/manual latitude/i)).toHaveProperty("value", "-33.18420000");
    expect(screen.getByLabelText(/manual longitude/i)).toHaveProperty("value", "26.56980000");
    expect(await screen.findByText(/provider masts within 20 km, .*Open-Meteo\/SRTM high-site maxima, and .*earned topology links/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^pin$/i }));
    expect(screen.getByText(/coordinates: -33\.184200, 26\.569800/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /^pin$/i })[0]);
    expect(screen.getByText(/pin: -33\.184200, 26\.569800/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pin$/i }));
    fireEvent.click(screen.getByRole("button", { name: /mock audit map click/i }));
    expect(screen.getByText(/coordinates: -33\.333333, 26\.666667/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/operational critical locations/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/connectivity pain points/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate preliminary intelligence/i }));

    await waitFor(() => expect(mocks.createAuditMutateAsync).toHaveBeenCalled());
    const payload = mocks.createAuditMutateAsync.mock.calls[0][0];

    expect(payload).toMatchObject({
      clientName: "Kwandwe Private Game Reserve",
      sector: "Game Reserve",
      latitude: -33.1842,
      longitude: 26.5698,
      operationalZones: ["Main lodge"],
    });
    expect(payload.infrastructurePoints).toEqual([
      expect.objectContaining({
        label: "Main lodge",
        category: "Operational zone",
        latitude: -33.1842,
        longitude: 26.5698,
      }),
      expect.objectContaining({
        label: "Candidate backhaul handoff",
        category: "Potential handoff site",
        latitude: -33.33333333,
        longitude: 26.66666666,
      }),
    ]);
    expect(mocks.setLocation).toHaveBeenCalledWith("/audit/analyzing/7788");
  });
});
