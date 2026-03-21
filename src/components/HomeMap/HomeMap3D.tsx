import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import { Building, EventModel, getBuildings, getEvents } from "../../api/client";
import { HomeTimeFilter, useAppState } from "../../state/appState";
import { mergeCampusMapBuildings } from "../CampusMap/campusMapData";
import { SegmentedControl, SegmentedOption } from "../filters/SegmentedControl";
import { BuildingCardPopup } from "./BuildingCardPopup";
import * as THREE from "three";

function withinRange(start: Date, end: Date, a: Date, b: Date) {
  return start < b && end > a;
}

function isSameLocalDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function filterEvents(events: EventModel[], filter: HomeTimeFilter, now: Date) {
  const next2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return events.filter((ev) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    if (filter === "now") return start <= now && end >= now;
    if (filter === "next2h") return withinRange(start, end, now, next2h);
    return withinRange(start, end, startOfToday, endOfToday) && isSameLocalDate(start, now);
  });
}

type FootprintPoint = [number, number];

type BuildingNode = {
  building: Building;
  count: number;
  position: [number, number, number];
  footprint: FootprintPoint[];
  height: number;
  roofHeight: number;
  accentColor: string;
};

type WalkNode = {
  id: string;
  label: string;
  position: [number, number, number];
  nextIds: string[];
};

const FOOTPRINT_PRESETS: Record<string, FootprintPoint[]> = {
  hp: [
    [-1.7, -0.8],
    [1.7, -0.8],
    [1.7, 0.1],
    [0.6, 0.1],
    [0.6, 0.8],
    [-1.7, 0.8],
  ],
  uc: [
    [-2.1, -1],
    [2.1, -1],
    [2.1, 1],
    [0.8, 1],
    [0.8, 0.2],
    [-0.5, 0.2],
    [-0.5, 1],
    [-2.1, 1],
  ],
  ml: [
    [-1.9, -0.9],
    [1.4, -0.9],
    [1.4, 0.9],
    [-0.4, 0.9],
    [-0.4, 0.3],
    [-1.9, 0.3],
  ],
  tb: [
    [-1.4, -1.1],
    [1.4, -1.1],
    [1.4, 1.1],
    [-1.4, 1.1],
  ],
  rb: [
    [-1.8, -0.8],
    [0.8, -0.8],
    [0.8, -0.2],
    [1.8, -0.2],
    [1.8, 0.8],
    [-1.8, 0.8],
  ],
  minto: [
    [-2.4, -0.8],
    [2.4, -0.8],
    [2.4, 0.8],
    [-0.5, 0.8],
    [-0.5, 1.4],
    [-2.4, 1.4],
  ],
  nicol: [
    [-1.7, -1],
    [1.7, -1],
    [1.7, 1],
    [0.4, 1],
    [0.4, 0.1],
    [-1.7, 0.1],
  ],
  fh: [
    [-2.2, -1.2],
    [2.2, -1.2],
    [2.2, 1.2],
    [-2.2, 1.2],
  ],
};

const WALK_NODE_BASES = [
  { id: "entry", label: "Campus entry", position: [-21, 0.14, 12] as [number, number, number] },
  { id: "library", label: "Library spine", position: [-10.5, 0.14, 4.8] as [number, number, number] },
  { id: "quad", label: "Central quad", position: [0, 0.14, 1.6] as [number, number, number] },
  { id: "uc", label: "Nideyinan plaza", position: [6.8, 0.14, 3.1] as [number, number, number] },
  { id: "engineering", label: "Engineering walk", position: [13.6, 0.14, -3] as [number, number, number] },
  { id: "science", label: "Science corridor", position: [8.4, 0.14, -9.8] as [number, number, number] },
  { id: "athletics", label: "Athletics route", position: [20.4, 0.14, -13.5] as [number, number, number] },
] as const;

const WALK_CONNECTIONS: Array<[string, string]> = [
  ["entry", "library"],
  ["library", "quad"],
  ["quad", "uc"],
  ["quad", "engineering"],
  ["uc", "science"],
  ["engineering", "science"],
  ["engineering", "athletics"],
  ["science", "athletics"],
];

const WALK_NODES: WalkNode[] = WALK_NODE_BASES.map((node) => ({
  ...node,
  nextIds: WALK_CONNECTIONS.flatMap(([from, to]) => {
    if (from === node.id) return [to];
    if (to === node.id) return [from];
    return [];
  }),
}));

function hashNumber(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function toWorldPosition(building: Building): [number, number, number] {
  const xPercent = building.mapPosition?.x ?? 50;
  const yPercent = building.mapPosition?.y ?? 40;
  const x = ((xPercent - 50) / 50) * 44;
  const z = ((yPercent - 40) / 40) * 32;
  return [x, 0, z];
}

function toVector3(position: [number, number, number]) {
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function toLinePoint(position: [number, number, number]): [number, number, number] {
  return [position[0], position[1] + 0.05, position[2]];
}

function getFootprint(building: Building): FootprintPoint[] {
  const preset = FOOTPRINT_PRESETS[building.id];
  if (preset) return preset;

  const seed = hashNumber(building.id);
  const width = 1.4 + (seed % 5) * 0.18;
  const depth = 0.95 + ((seed >> 3) % 4) * 0.16;
  const notch = 0.4 + ((seed >> 6) % 3) * 0.16;

  return [
    [-width, -depth],
    [width, -depth],
    [width, depth],
    [0.2, depth],
    [0.2, depth - notch],
    [-width, depth - notch],
  ];
}

function buildExtrudeShape(footprint: FootprintPoint[]) {
  const shape = new THREE.Shape();
  footprint.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  return shape;
}

function getAccentColor(building: Building) {
  const palette = ["#c8102e", "#ef4444", "#f97316", "#eab308", "#dc2626", "#f43f5e"];
  return palette[hashNumber(building.id) % palette.length];
}

function createFacadeTexture(buildingId: string, accentColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const seed = hashNumber(buildingId);
  const baseA = ["#c9d2dc", "#d8dde4", "#bcc7d2", "#d7c8bb"][seed % 4];
  const baseB = ["#8a98a8", "#a06a57", "#75879a", "#6f7c88"][(seed >> 2) % 4];
  const windowLit = ["#bde7ff", "#d9f0ff", "#fef3c7"][(seed >> 4) % 3];
  const windowDark = ["#3b556e", "#2f4358", "#334155"][(seed >> 6) % 3];

  context.fillStyle = baseA;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = baseB;
  for (let row = 0; row < 8; row += 1) {
    context.fillRect(0, row * 32, canvas.width, 3);
  }

  const accent = new THREE.Color(accentColor);
  context.fillStyle = `rgba(${Math.round(accent.r * 255)}, ${Math.round(accent.g * 255)}, ${Math.round(accent.b * 255)}, 0.28)`;
  context.fillRect(0, 18, canvas.width, 10);
  context.fillRect(0, canvas.height - 24, canvas.width, 12);

  for (let y = 34; y < canvas.height - 24; y += 28) {
    for (let x = 14; x < canvas.width - 14; x += 24) {
      context.fillStyle = (x + y + seed) % 5 === 0 ? windowLit : windowDark;
      context.fillRect(x, y, 12, 16);
    }
  }

  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  texture.needsUpdate = true;
  return texture;
}

function estimateFootprintRadius(footprint: FootprintPoint[]) {
  return footprint.reduce((maxRadius, [x, z]) => Math.max(maxRadius, Math.hypot(x, z)), 0);
}

function computeSpacedPositions(buildings: Building[]) {
  const footprints = new Map(buildings.map((building) => [building.id, getFootprint(building)]));
  const anchors = new Map(buildings.map((building) => [building.id, toWorldPosition(building)]));
  const positions = new Map(buildings.map((building) => [building.id, [...(anchors.get(building.id) ?? [0, 0, 0])] as [number, number, number]]));
  const radii = new Map(
    buildings.map((building) => {
      const footprint = footprints.get(building.id) ?? getFootprint(building);
      return [building.id, estimateFootprintRadius(footprint)];
    }),
  );

  for (let iteration = 0; iteration < 24; iteration += 1) {
    for (let index = 0; index < buildings.length; index += 1) {
      const current = buildings[index];
      const currentPosition = positions.get(current.id);
      if (!currentPosition) continue;

      for (let compareIndex = index + 1; compareIndex < buildings.length; compareIndex += 1) {
        const other = buildings[compareIndex];
        const otherPosition = positions.get(other.id);
        if (!otherPosition) continue;

        const dx = otherPosition[0] - currentPosition[0];
        const dz = otherPosition[2] - currentPosition[2];
        const distance = Math.hypot(dx, dz) || 0.0001;
        const minDistance = (radii.get(current.id) ?? 1.8) + (radii.get(other.id) ?? 1.8) + 1.9;

        if (distance >= minDistance) continue;

        const overlap = (minDistance - distance) * 0.5;
        const nx = dx / distance;
        const nz = dz / distance;

        currentPosition[0] -= nx * overlap;
        currentPosition[2] -= nz * overlap;
        otherPosition[0] += nx * overlap;
        otherPosition[2] += nz * overlap;
      }
    }

    for (const building of buildings) {
      const position = positions.get(building.id);
      const anchor = anchors.get(building.id);
      if (!position || !anchor) continue;
      position[0] += (anchor[0] - position[0]) * 0.08;
      position[2] += (anchor[2] - position[2]) * 0.08;
    }
  }

  return positions;
}

const BuildingMesh: React.FC<{
  node: BuildingNode;
  selected: boolean;
  onSelect: (building: Building) => void;
}> = ({ node, selected, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const shape = useMemo(() => buildExtrudeShape(node.footprint), [node.footprint]);
  const facadeTexture = useMemo(() => createFacadeTexture(node.building.id, node.accentColor), [node.building.id, node.accentColor]);
  const outline = useMemo(
    () => [...node.footprint.map(([x, z]) => [x, node.height + 0.03, z] as [number, number, number]), [node.footprint[0][0], node.height + 0.03, node.footprint[0][1]] as [number, number, number]],
    [node.footprint, node.height],
  );
  const bodyColor = selected ? "#ffe07d" : hovered ? "#ff8f7a" : "#cfd8e3";
  const roofColor = selected ? "#d97706" : hovered ? "#fb7185" : node.accentColor;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetScale = selected ? 1.08 : hovered ? 1.03 : 1;
    group.scale.x = THREE.MathUtils.damp(group.scale.x, targetScale, 8, delta);
    group.scale.y = THREE.MathUtils.damp(group.scale.y, targetScale, 8, delta);
    group.scale.z = THREE.MathUtils.damp(group.scale.z, targetScale, 8, delta);
  });

  return (
    <group ref={groupRef} position={node.position}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.building);
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <extrudeGeometry args={[shape, { depth: node.height, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.05, bevelThickness: 0.05 }]} />
        <meshStandardMaterial color={bodyColor} map={facadeTexture ?? undefined} metalness={0.12} roughness={0.62} />
      </mesh>

      <mesh position={[0, node.height + node.roofHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, node.roofHeight, 1.2]} />
        <meshStandardMaterial color={roofColor} metalness={0.18} roughness={0.55} />
      </mesh>

      <Line points={outline} color={selected ? "#fff0b8" : "#fca5a5"} lineWidth={1.4} transparent opacity={selected || hovered ? 0.95 : 0.35} />

      {(selected || hovered) && (
        <Html position={[0, node.height + node.roofHeight + 1, 0]} center distanceFactor={10}>
          <div className="home3dLabel">
            <div className="home3dLabelTitle">{node.building.name}</div>
            <div className="home3dLabelMeta">
              {node.count} active event{node.count === 1 ? "" : "s"}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

const WalkNodeMarker: React.FC<{
  node: WalkNode;
  active: boolean;
  onSelect: (nodeId: string) => void;
}> = ({ node, active, onSelect }) => (
  <group position={node.position}>
    <mesh
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      onPointerEnter={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "";
      }}
    >
      <cylinderGeometry args={[0.36, 0.36, 0.12, 24]} />
      <meshStandardMaterial color={active ? "#ffe07d" : "#60a5fa"} emissive={active ? "#b45309" : "#1d4ed8"} emissiveIntensity={0.5} />
    </mesh>
    {active ? (
      <Html position={[0, 0.9, 0]} center distanceFactor={12}>
        <div className="home3dWalkTag">{node.label}</div>
      </Html>
    ) : null}
  </group>
);

const WalkArrow: React.FC<{
  from: WalkNode;
  to: WalkNode;
  onSelect: (nodeId: string) => void;
}> = ({ from, to, onSelect }) => {
  const start = toVector3(from.position);
  const end = toVector3(to.position);
  const midpoint = start.clone().lerp(end, 0.55);
  const direction = end.clone().sub(start);
  const angle = Math.atan2(direction.x, direction.z);

  return (
    <group position={[midpoint.x, 0.2, midpoint.z]} rotation={[0, angle, 0]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(to.id);
        }}
        onPointerEnter={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          document.body.style.cursor = "";
        }}
      >
        <group>
          <mesh position={[0, 0.08, -0.35]}>
            <boxGeometry args={[0.38, 0.08, 1]} />
            <meshStandardMaterial color="#f8fafc" emissive="#94a3b8" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0.08, 0.32]}>
            <coneGeometry args={[0.34, 0.6, 3]} />
            <meshStandardMaterial color="#ffe07d" emissive="#d97706" emissiveIntensity={0.55} />
          </mesh>
        </group>
      </mesh>
      <Html position={[0, 0.72, 0.08]} center distanceFactor={15}>
        <button type="button" className="home3dArrowChip" onClick={() => onSelect(to.id)}>
          Walk to {to.label}
        </button>
      </Html>
    </group>
  );
};

const SceneControls: React.FC<{ target: [number, number, number] }> = ({ target }) => {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls> | null>(null);
  const targetRef = useRef(new THREE.Vector3(...target));

  useEffect(() => {
    targetRef.current.set(target[0], target[1], target[2]);
  }, [target]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.x = THREE.MathUtils.damp(controls.target.x, targetRef.current.x, 6, delta);
    controls.target.y = THREE.MathUtils.damp(controls.target.y, targetRef.current.y, 6, delta);
    controls.target.z = THREE.MathUtils.damp(controls.target.z, targetRef.current.z, 6, delta);
    controls.update();
  });

  return <OrbitControls ref={controlsRef} enablePan enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={22} />;
};

const CameraRig: React.FC<{ target: [number, number, number]; walkMode: boolean; enabled: boolean }> = ({ target, walkMode, enabled }) => {
  const { camera } = useThree();
  const focus = useRef(new THREE.Vector3(...target));

  useEffect(() => {
    focus.current.set(target[0], target[1], target[2]);
  }, [target]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const offset = walkMode ? new THREE.Vector3(0, 2.2, 4.4) : new THREE.Vector3(8, 10.5, 11);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, focus.current.x + offset.x, 3.6, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, focus.current.y + offset.y, 3.6, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, focus.current.z + offset.z, 3.6, delta);
    camera.lookAt(focus.current.x, walkMode ? 1.4 : 0.8, focus.current.z);
  });

  return null;
};

const CampusGround: React.FC<{ onSelectGround: (position: [number, number, number]) => void }> = ({ onSelectGround }) => {
  const routes = useMemo<[number, number, number][][]>(
    () =>
      WALK_NODES.flatMap((node) =>
        node.nextIds
          .filter((nextId) => node.id < nextId)
          .map((nextId) => {
            const next = WALK_NODES.find((candidate) => candidate.id === nextId);
            return next ? [toLinePoint(node.position), toLinePoint(next.position)] : null;
          })
          .filter((line): line is [number, number, number][] => line !== null),
      ),
    [],
  );

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelectGround([event.point.x, 0, event.point.z]);
        }}
      >
        <planeGeometry args={[108, 108]} />
        <meshStandardMaterial color="#0f2234" roughness={0.95} metalness={0.03} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelectGround([event.point.x, 0, event.point.z]);
        }}
      >
        <planeGeometry args={[52, 36]} />
        <meshStandardMaterial color="#16344b" roughness={1} metalness={0} />
      </mesh>

      {routes.map((points, index) => (
        <Line key={index} points={points} color="#93c5fd" lineWidth={2.2} transparent opacity={0.7} />
      ))}

      <gridHelper args={[108, 36, "#7f1d1d", "#1e3a5f"]} position={[0, 0.02, 0]} />
    </>
  );
};

const CampusScene: React.FC<{
  nodes: BuildingNode[];
  selectedBuildingId: string | null;
  activeWalkNodeId: string;
  walkMode: boolean;
  lockToFocus: boolean;
  freeTarget: [number, number, number];
  onSelectBuilding: (building: Building) => void;
  onSelectWalkNode: (nodeId: string) => void;
  onSelectGround: (position: [number, number, number]) => void;
}> = ({ nodes, selectedBuildingId, activeWalkNodeId, walkMode, lockToFocus, freeTarget, onSelectBuilding, onSelectWalkNode, onSelectGround }) => {
  const selectedNode = nodes.find((node) => node.building.id === selectedBuildingId) ?? null;
  const activeWalkNode = WALK_NODES.find((node) => node.id === activeWalkNodeId) ?? WALK_NODES[0];
  const linkedWalkNodes = activeWalkNode.nextIds
    .map((nodeId) => WALK_NODES.find((node) => node.id === nodeId))
    .filter((node): node is WalkNode => Boolean(node));
  const cameraTarget = lockToFocus
    ? walkMode
      ? activeWalkNode.position
      : selectedNode
        ? [selectedNode.position[0], 0.6, selectedNode.position[2]]
        : freeTarget
    : freeTarget;

  return (
    <Canvas className="home3dCanvas" shadows camera={{ position: [8, 10.5, 11], fov: 42 }}>
      <color attach="background" args={["#09111c"]} />
      <fog attach="fog" args={["#09111c", 16, 42]} />
      <ambientLight intensity={1.45} />
      <hemisphereLight intensity={0.85} groundColor="#08121d" color="#f8fafc" />
      <directionalLight
        castShadow
        intensity={1.7}
        position={[10, 16, 8]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[-12, 14, -8]} intensity={0.8} angle={0.42} penumbra={0.5} />
      <CameraRig target={cameraTarget as [number, number, number]} walkMode={walkMode} enabled={lockToFocus} />
      <SceneControls target={cameraTarget as [number, number, number]} />

      <CampusGround onSelectGround={onSelectGround} />

      {nodes.map((node) => (
        <BuildingMesh
          key={node.building.id}
          node={node}
          selected={node.building.id === selectedBuildingId}
          onSelect={onSelectBuilding}
        />
      ))}

      {WALK_NODES.map((node) => (
        <WalkNodeMarker key={node.id} node={node} active={node.id === activeWalkNode.id} onSelect={onSelectWalkNode} />
      ))}

      {walkMode
        ? linkedWalkNodes.map((node) => <WalkArrow key={`${activeWalkNode.id}-${node.id}`} from={activeWalkNode} to={node} onSelect={onSelectWalkNode} />)
        : null}
    </Canvas>
  );
};

export const HomeMap3D: React.FC = () => {
  const navigate = useNavigate();
  const { homeTimeFilter, setHomeTimeFilter } = useAppState();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupBuilding, setPopupBuilding] = useState<Building | null>(null);
  const [walkMode, setWalkMode] = useState(false);
  const [lockToFocus, setLockToFocus] = useState(false);
  const [activeWalkNodeId, setActiveWalkNodeId] = useState<string>(WALK_NODES[0].id);
  const [freeTarget, setFreeTarget] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [b, e] = await Promise.all([getBuildings(), getEvents()]);
        if (!cancelled) {
          setBuildings(mergeCampusMapBuildings(b));
          setEvents(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), [homeTimeFilter, loading]);
  const filteredEvents = useMemo(() => filterEvents(events, homeTimeFilter, now), [events, homeTimeFilter, now]);

  const eventsByBuilding = useMemo(() => {
    const map = new Map<string, EventModel[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.building) ?? [];
      list.push(ev);
      map.set(ev.building, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [filteredEvents]);

  const nodes = useMemo<BuildingNode[]>(
    () => {
      const spacedPositions = computeSpacedPositions(buildings);

      return buildings.map((building) => {
        const count = eventsByBuilding.get(building.id)?.length ?? 0;
        const seed = hashNumber(building.id);
        return {
          building,
          count,
          position: spacedPositions.get(building.id) ?? toWorldPosition(building),
          footprint: getFootprint(building),
          height: 0.9 + building.floors.length * 0.42 + Math.min(count, 5) * 0.18 + (seed % 3) * 0.08,
          roofHeight: 0.18 + ((seed >> 4) % 3) * 0.08,
          accentColor: getAccentColor(building),
        };
      });
    },
    [buildings, eventsByBuilding],
  );

  const activeWalkNode = useMemo(
    () => WALK_NODES.find((node) => node.id === activeWalkNodeId) ?? WALK_NODES[0],
    [activeWalkNodeId],
  );

  const timeOptions: SegmentedOption<HomeTimeFilter>[] = [
    { value: "now", label: "Now" },
    { value: "next2h", label: "Next 2 Hours" },
    { value: "today", label: "Today" },
  ];

  return (
    <div className="home3dWrap">
      <div className="home3dHero">
        <div className="home3dHeroCopy">
          <div className="home3dEyebrow">3D Campus Walkthrough</div>
          <div className="home3dTitle">Procedural buildings with linked walking arrows</div>
          <div className="home3dSub">
            Buildings now use footprint-based meshes instead of placeholder blocks, and the campus path graph exposes
            clickable arrow links so you can step through the scene using plausible outdoor walking connections. Free explore is the default, and fix-on-zoom is optional.
          </div>
        </div>
        <div className="homeMapTimeFilter">
          <SegmentedControl value={homeTimeFilter} options={timeOptions} onChange={setHomeTimeFilter} />
        </div>
      </div>

      <div className="home3dToolbar">
        <button
          type="button"
          className={`home3dModeBtn ${walkMode ? "active" : ""}`}
          onClick={() => setWalkMode((current) => !current)}
        >
          {walkMode ? "Walk Mode On" : "Walk Mode Off"}
        </button>
        <button
          type="button"
          className={`home3dModeBtn ${lockToFocus ? "active" : ""}`}
          onClick={() => setLockToFocus((current) => !current)}
        >
          {lockToFocus ? "Fix On Zoom On" : "Fix On Zoom Off"}
        </button>
        <button type="button" className="home3dModeBtn" onClick={() => setActiveWalkNodeId(WALK_NODES[0].id)}>
          Reset Route
        </button>
        <button
          type="button"
          className="home3dModeBtn"
          onClick={() => {
            setPopupBuilding(null);
            setWalkMode(false);
            setLockToFocus(false);
            setFreeTarget([0, 0, 0]);
          }}
        >
          Recenter Campus
        </button>
        <div className="home3dPathSummary">
          Current node: <strong>{activeWalkNode.label}</strong> · Click anywhere on the ground to move focus there.
        </div>
      </div>

      <div className="home3dCard">
        {loading ? (
          <div className="mapLoading">Loading 3D campus walkthrough...</div>
        ) : (
          <>
            <div className="home3dHud">
              <div className="home3dHudCard">
                <div className="home3dHudLabel">Navigation</div>
                <div className="home3dHudValue">
                  Drag to orbit, scroll to zoom, and click any open ground area to jump there. Turn on fix-on-zoom only when you want the camera to follow a building or walk node.
                </div>
              </div>
              <div className="home3dHudCard">
                <div className="home3dHudLabel">Scene State</div>
                <div className="home3dHudValue">
                  {lockToFocus ? "Follow camera active" : "Free camera active"} · {walkMode ? "walk nodes visible" : "walk nodes optional"} · {WALK_NODES.length} route nodes
                </div>
              </div>
            </div>
            <CampusScene
              nodes={nodes}
              selectedBuildingId={popupBuilding?.id ?? null}
              activeWalkNodeId={activeWalkNodeId}
              walkMode={walkMode}
              lockToFocus={lockToFocus}
              freeTarget={freeTarget}
              onSelectBuilding={(building) => {
                setWalkMode(false);
                setLockToFocus(true);
                setFreeTarget([building.mapPosition ? toWorldPosition(building)[0] : 0, 0.6, building.mapPosition ? toWorldPosition(building)[2] : 0]);
                setPopupBuilding(building);
              }}
              onSelectWalkNode={(nodeId) => {
                setPopupBuilding(null);
                setWalkMode(true);
                setLockToFocus(true);
                setActiveWalkNodeId(nodeId);
              }}
              onSelectGround={(position) => {
                setPopupBuilding(null);
                setLockToFocus(false);
                setFreeTarget(position);
              }}
            />
          </>
        )}
      </div>

      {popupBuilding ? (
        <BuildingCardPopup
          building={popupBuilding}
          events={eventsByBuilding.get(popupBuilding.id) ?? []}
          onClose={() => setPopupBuilding(null)}
          onViewEvent={(eventId) => {
            setPopupBuilding(null);
            navigate(`/event/${encodeURIComponent(eventId)}`);
          }}
          onViewFloor={() => {
            setPopupBuilding(null);
            navigate(`/building/${encodeURIComponent(popupBuilding.id)}`);
          }}
        />
      ) : null}
    </div>
  );
};
