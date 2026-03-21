import { Building } from "../../api/client";

export const CAMPUS_MAP_IMAGE_SRC = "/carleton-campus-map-ses.jpg";
export const CAMPUS_MAP_IMAGE_WIDTH = 2560;
export const CAMPUS_MAP_IMAGE_HEIGHT = 1656;
export const CAMPUS_MAP_VIEW_BOX = `0 0 ${CAMPUS_MAP_IMAGE_WIDTH} ${CAMPUS_MAP_IMAGE_HEIGHT}`;

type CampusMapMarkerDefinition = {
  markerId?: string;
  buildingId?: string;
  code: string;
  name: string;
  cx: number;
  cy: number;
  r: number;
  floors?: number[];
};

type CampusMapMarkerSeed = Omit<CampusMapMarkerDefinition, "r"> & {
  r?: number;
};

export type CampusMapMarker = CampusMapMarkerDefinition & {
  id: string;
  building?: Building;
  tooltipX: number;
  tooltipY: number;
};

const DEFAULT_MARKER_RADIUS = 18;
const DEFAULT_FLOORS = [1, 2, 3];

function marker(definition: CampusMapMarkerSeed): CampusMapMarkerDefinition {
  return {
    r: DEFAULT_MARKER_RADIUS,
    ...definition,
  };
}

// Marker centers are aligned to the red circular map badges in the SES campus map.
const CAMPUS_MAP_MARKERS: CampusMapMarkerDefinition[] = [
  marker({ buildingId: "dt", code: "DT", name: "Dunton Tower", cx: 810.5, cy: 238.5, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "le", code: "LE", name: "Leeds House", cx: 1790.5, cy: 265.0 }),
  marker({ buildingId: "ru", code: "RU", name: "Russell House", cx: 1632.5, cy: 308.0 }),
  marker({ buildingId: "gr", code: "GR", name: "Grenville House", cx: 1557.5, cy: 319.0 }),
  marker({ buildingId: "ml", code: "ML", name: "MacOdrum Library", cx: 696.5, cy: 328.5, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "sp", code: "SP", name: "St. Patrick's Building (Carleton University Art Gallery)", cx: 1733.5, cy: 328.5 }),
  marker({ buildingId: "vs", code: "VS", name: "Visualization and Simulation Building", cx: 413.5, cy: 332.0 }),
  marker({ markerId: "pg-east", buildingId: "pg", code: "PG", name: "Parking Garages", cx: 2128.5, cy: 342.5, floors: [0] }),
  marker({ buildingId: "sa", code: "SA", name: "Southam Hall (Kailash Mital Theatre)", cx: 555.5, cy: 345.5 }),
  marker({ buildingId: "fr", code: "FR", name: "Frontenac House", cx: 1491.5, cy: 352.0 }),
  marker({ buildingId: "canal", code: "CB", name: "Canal Building", cx: 1133.0, cy: 354.0, floors: [1, 2, 3] }),
  marker({ buildingId: "dh", code: "DH", name: "Dundas House", cx: 1869.5, cy: 357.5 }),
  marker({ buildingId: "ap", code: "AP", name: "Azrieli Pavilion", cx: 875.5, cy: 359.5, floors: [1, 2] }),
  marker({ buildingId: "at", code: "AT", name: "Azrieli Theatre", cx: 974.5, cy: 359.5 }),
  marker({ buildingId: "hc", code: "HC", name: "Human Computer Interaction Building", cx: 446.5, cy: 363.0 }),
  marker({ buildingId: "sr", code: "SR", name: "Social Sciences Research Building", cx: 380.5, cy: 367.5 }),
  marker({ buildingId: "lh", code: "LH", name: "Lanark House", cx: 1441.5, cy: 367.5 }),
  marker({ buildingId: "la", code: "LA", name: "Loeb Building", cx: 489.5, cy: 379.5 }),
  marker({ buildingId: "gh", code: "GH", name: "Glengarry House", cx: 1658.5, cy: 383.0 }),
  marker({ buildingId: "sh", code: "SH", name: "Stormont House", cx: 1830.5, cy: 395.5 }),
  marker({ buildingId: "me", code: "ME", name: "Mackenzie Building", cx: 1297.5, cy: 405.5, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "pa", code: "PA", name: "Paterson Hall", cx: 672.5, cy: 414.0 }),
  marker({ buildingId: "uh", code: "UH", name: "Urbandale Centre", cx: 2429.0, cy: 414.0 }),
  marker({ buildingId: "lx", code: "LX", name: "Lennox and Addington House", cx: 1614.5, cy: 427.5 }),
  marker({ buildingId: "tc", code: "TC", name: "Teranga Commons (formerly Residence Commons)", cx: 1738.5, cy: 429.0, floors: [1, 2] }),
  marker({ buildingId: "rh", code: "RH", name: "Renfrew House", cx: 1553.0, cy: 433.0 }),
  marker({ buildingId: "tb", code: "TB", name: "Tory Building", cx: 816.5, cy: 435.0, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "ph", code: "PH", name: "Prescott House", cx: 1486.0, cy: 455.5 }),
  marker({
    buildingId: "minto",
    code: "MC",
    name: "Minto Centre for Advanced Studies in Engineering",
    cx: 1360.5,
    cy: 456.0,
    floors: [1, 2, 3, 4],
  }),
  marker({ buildingId: "aa", code: "AA", name: "Architecture Building", cx: 1119.5, cy: 457.0 }),
  marker({ buildingId: "ab", code: "AB", name: "ARISE Building", cx: 559.5, cy: 468.5 }),
  marker({ buildingId: "uc", code: "NN", name: "Nideyinan (formerly University Centre)", cx: 1030.0, cy: 474.0, floors: [0, 1, 2, 3] }),
  marker({ buildingId: "nicol", code: "NI", name: "Nicol Building (Sprott School of Business)", cx: 1184.5, cy: 492.0, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "hp", code: "HP", name: "Herzberg Laboratories", cx: 729.5, cy: 499.0 }),
  marker({ buildingId: "hs", code: "HS", name: "Health Sciences Building", cx: 989.5, cy: 519.5, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "sc", code: "SC", name: "Steacie Building", cx: 886.5, cy: 521.5 }),
  marker({ buildingId: "td", code: "TD", name: "Tennis Centre", cx: 2033.5, cy: 550.0, floors: [1] }),
  marker({ buildingId: "ks", code: "KS", name: "TAAG Park (formerly Keith Harris Stadium)", cx: 2110.0, cy: 550.5, floors: [1] }),
  marker({ buildingId: "fh", code: "FH", name: "Fieldhouse", cx: 1832.5, cy: 606.0, floors: [1] }),
  marker({ buildingId: "rb", code: "RB", name: "Richcraft Hall", cx: 812.5, cy: 612.5, floors: [1, 2, 3, 4] }),
  marker({ markerId: "pg-central", buildingId: "pg", code: "PG", name: "Parking Garages", cx: 1117.5, cy: 637.5, floors: [0] }),
  marker({ buildingId: "ac", code: "AC", name: "Athletics", cx: 1684.5, cy: 657.5, floors: [1, 2] }),
  marker({ buildingId: "mb", code: "MB", name: "Maintenance Building", cx: 1284.5, cy: 699.5, floors: [1, 2] }),
  marker({ buildingId: "cc", code: "CC", name: "Colonel By Child Care Centre", cx: 1550.5, cy: 699.5, floors: [0, 1] }),
  marker({ buildingId: "ah", code: "AH", name: "Alumni Hall", cx: 1800.5, cy: 743.0, floors: [1, 2] }),
  marker({ buildingId: "ro", code: "RO", name: "Robertson Hall", cx: 1080.5, cy: 748.0, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "gy", code: "GY", name: "Gymnasium", cx: 1646.5, cy: 765.5, floors: [1] }),
  marker({ buildingId: "tt", code: "TT", name: "Carleton Technology and Training Centre", cx: 1363.5, cy: 784.5, floors: [1, 2] }),
  marker({ buildingId: "nb", code: "NB", name: "Nesbitt Biology Building", cx: 1222.5, cy: 842.0, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "nw", code: "NW", name: "National Wildlife Research Centre", cx: 1315.5, cy: 898.5 }),
  marker({ buildingId: "ih", code: "IH", name: "Ice House", cx: 1688.0, cy: 899.0, floors: [1] }),
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFallbackCode(building: Building) {
  return building.name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function round(value: number, digits: number) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function getFallbackMarker(building: Building): CampusMapMarker | null {
  if (!building.mapPosition) return null;

  const cx = clamp((building.mapPosition.x / 100) * CAMPUS_MAP_IMAGE_WIDTH, 72, CAMPUS_MAP_IMAGE_WIDTH - 72);
  const yPercent = clamp((building.mapPosition.y / 80) * 100, 5, 95);
  const cy = (yPercent / 100) * CAMPUS_MAP_IMAGE_HEIGHT;

  return {
    id: building.id,
    code: getFallbackCode(building),
    name: building.name,
    cx,
    cy,
    r: DEFAULT_MARKER_RADIUS,
    tooltipX: cx,
    tooltipY: cy - 82,
    building,
  };
}

function buildCampusBuilding(definition: CampusMapMarkerDefinition): Building | null {
  if (!definition.buildingId) return null;

  return {
    id: definition.buildingId,
    name: definition.name,
    floors: definition.floors ?? DEFAULT_FLOORS,
    mapPosition: {
      x: round((definition.cx / CAMPUS_MAP_IMAGE_WIDTH) * 100, 1),
      y: round((definition.cy / CAMPUS_MAP_IMAGE_HEIGHT) * 80, 1),
    },
  };
}

export function mergeCampusMapBuildings(apiBuildings: Building[]): Building[] {
  const merged = new Map(apiBuildings.map((building) => [building.id, building]));

  for (const definition of CAMPUS_MAP_MARKERS) {
    const existing = definition.buildingId ? merged.get(definition.buildingId) : null;
    if (existing) continue;

    const fallbackBuilding = buildCampusBuilding(definition);
    if (fallbackBuilding) {
      merged.set(fallbackBuilding.id, fallbackBuilding);
    }
  }

  return Array.from(merged.values());
}

export function getCampusMapMarkers(buildings: Building[]): CampusMapMarker[] {
  const remainingBuildings = new Map(buildings.map((building) => [building.id, building]));

  const markers = CAMPUS_MAP_MARKERS.map((mapMarker) => {
    const linkedBuilding = mapMarker.buildingId
      ? remainingBuildings.get(mapMarker.buildingId) ?? buildCampusBuilding(mapMarker) ?? undefined
      : undefined;

    if (linkedBuilding) remainingBuildings.delete(linkedBuilding.id);

    return {
      id: mapMarker.markerId ?? linkedBuilding?.id ?? `${mapMarker.code.toLowerCase()}-${mapMarker.cx}-${mapMarker.cy}`,
      code: mapMarker.code,
      name: linkedBuilding?.name ?? mapMarker.name,
      cx: mapMarker.cx,
      cy: mapMarker.cy,
      r: mapMarker.r,
      tooltipX: mapMarker.cx,
      tooltipY: mapMarker.cy - mapMarker.r - 30,
      building: linkedBuilding,
    };
  });

  const fallbackMarkers = Array.from(remainingBuildings.values())
    .map((building) => getFallbackMarker(building))
    .filter((mapMarker): mapMarker is CampusMapMarker => mapMarker !== null);

  return [...markers, ...fallbackMarkers];
}
