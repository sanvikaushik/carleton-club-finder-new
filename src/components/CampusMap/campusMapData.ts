import { Building } from "../../api/client";

export const CAMPUS_MAP_IMAGE_SRC = "/carleton-campus-map.jpg";
export const CAMPUS_MAP_IMAGE_WIDTH = 5100;
export const CAMPUS_MAP_IMAGE_HEIGHT = 3300;
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

// Marker centers are aligned to the red circular map badges in the illustrated campus map.
const CAMPUS_MAP_MARKERS: CampusMapMarkerDefinition[] = [
  marker({ buildingId: "dt", code: "DT", name: "Dunton Tower", cx: 813, cy: 400, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "ml", code: "ML", name: "MacOdrum Library", cx: 1444, cy: 590, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "canal", code: "CB", name: "Canal Building", cx: 2194, cy: 1014, floors: [1, 2, 3] }),
  marker({ buildingId: "tb", code: "TB", name: "Tory Building", cx: 1728, cy: 1046, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "uc", code: "UC", name: "Nideyinan (formerly University Centre)", cx: 1893, cy: 1200, floors: [0, 1, 2, 3] }),
  marker({ buildingId: "hp", code: "HP", name: "Herzberg Laboratories", cx: 1657, cy: 1181 }),
  marker({ buildingId: "sc", code: "SC", name: "Steacie Building", cx: 1876, cy: 1431 }),
  marker({ buildingId: "me", code: "ME", name: "Mackenzie Building", cx: 2558, cy: 1090, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "lh", code: "LH", name: "Lanark House", cx: 2856, cy: 492 }),
  marker({ buildingId: "fr", code: "FR", name: "Frontenac House", cx: 2909, cy: 651 }),
  marker({ buildingId: "gr", code: "GR", name: "Grenville House", cx: 3228, cy: 987 }),
  marker({ buildingId: "ru", code: "RU", name: "Russell House", cx: 3448, cy: 796 }),
  marker({ buildingId: "sp", code: "SP", name: "St. Patrick's Building (Carleton University Art Gallery)", cx: 3649, cy: 806 }),
  marker({ buildingId: "le", code: "LE", name: "Leeds House", cx: 3845, cy: 608 }),
  marker({ buildingId: "gh", code: "GH", name: "Glengarry House", cx: 3442, cy: 1009 }),
  marker({ buildingId: "dh", code: "DH", name: "Dundas House", cx: 3994, cy: 948 }),
  marker({ buildingId: "sh", code: "SH", name: "Stormont House", cx: 3924, cy: 1127 }),
  marker({ buildingId: "ph", code: "PH", name: "Prescott House", cx: 3184, cy: 1367 }),
  marker({ buildingId: "rh", code: "RH", name: "Renfrew House", cx: 3244, cy: 1237 }),
  marker({ buildingId: "lx", code: "LX", name: "Lennox and Addington House", cx: 3435, cy: 1205 }),
  marker({
    buildingId: "minto",
    code: "MC",
    name: "Minto Centre for Advanced Studies in Engineering",
    cx: 2822,
    cy: 1417,
    floors: [1, 2, 3, 4],
  }),
  marker({ buildingId: "rb", code: "RB", name: "Richcraft Hall", cx: 1753, cy: 1607, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "pg", code: "PG", name: "Parking Garages", cx: 2079, cy: 1858, floors: [0] }),
  marker({ buildingId: "ro", code: "RO", name: "Robertson Hall", cx: 1962, cy: 2086, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "mb", code: "MB", name: "Maintenance Building", cx: 2414, cy: 1953, floors: [1, 2] }),
  marker({ buildingId: "nw", code: "NW", name: "National Wildlife Research Centre", cx: 2543, cy: 2529 }),
  marker({ buildingId: "nb", code: "NB", name: "Nesbitt Biology Building", cx: 2800, cy: 2282, floors: [1, 2, 3, 4] }),
  marker({ buildingId: "tt", code: "TT", name: "Carleton Technology and Training Centre", cx: 2865, cy: 2270, floors: [1, 2] }),
  marker({ buildingId: "cc", code: "CC", name: "Colonel By Child Care Centre", cx: 3075, cy: 2075, floors: [0, 1] }),
  marker({ buildingId: "ih", code: "IH", name: "Ice House", cx: 3312, cy: 2485, floors: [1] }),
  marker({ buildingId: "ah", code: "AH", name: "Alumni Hall", cx: 3186, cy: 2292, floors: [1, 2] }),
  marker({ buildingId: "ac", code: "AC", name: "Athletics", cx: 3404, cy: 2041, floors: [1, 2] }),
  marker({ buildingId: "gy", code: "GY", name: "Gymnasium", cx: 3392, cy: 2277, floors: [1] }),
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

  return markers;
}
