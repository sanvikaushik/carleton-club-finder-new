import React, { useMemo, useRef, useState } from "react";
import { Building } from "../../api/client";
import {
  CAMPUS_MAP_IMAGE_HEIGHT,
  CAMPUS_MAP_IMAGE_SRC,
  CAMPUS_MAP_IMAGE_WIDTH,
  CAMPUS_MAP_VIEW_BOX,
  CampusMapMarker,
  getCampusMapMarkers,
} from "./campusMapData";

type TooltipState = {
  markerId: string;
  code: string;
  name: string;
  count: number;
  friendCount: number;
  x: number;
  y: number;
};

export const CampusImageMap: React.FC<{
  ariaLabel: string;
  buildings: Building[];
  countsByBuilding?: Map<string, number>;
  friendCountsByBuilding?: Map<string, number>;
  onSelectBuilding: (building: Building) => void;
  selectedBuildingId?: string | null;
  debugMarkers?: boolean;
}> = ({ ariaLabel, buildings, countsByBuilding, friendCountsByBuilding, onSelectBuilding, selectedBuildingId, debugMarkers = false }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const mapMarkers = useMemo(() => getCampusMapMarkers(buildings), [buildings]);

  function toFramePointFromMarker(marker: CampusMapMarker) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (marker.tooltipX / CAMPUS_MAP_IMAGE_WIDTH) * rect.width,
      y: (marker.tooltipY / CAMPUS_MAP_IMAGE_HEIGHT) * rect.height,
    };
  }

  function showTooltip(marker: CampusMapMarker) {
    const point = toFramePointFromMarker(marker);
    if (!point) return;
    setTooltip({
      markerId: marker.id,
      code: marker.code,
      name: marker.name,
      count: marker.building ? countsByBuilding?.get(marker.building.id) ?? 0 : 0,
      friendCount: marker.building ? friendCountsByBuilding?.get(marker.building.id) ?? 0 : 0,
      x: point.x,
      y: point.y,
    });
  }

  return (
    <div className="mapCard campusImageCard">
      <div className="campusImageViewport">
        <div ref={frameRef} className="campusImageFrame" aria-label={ariaLabel}>
          <img className="campusImage" src={CAMPUS_MAP_IMAGE_SRC} alt="" aria-hidden="true" />
          <div className="campusImageShade" aria-hidden="true" />

          <svg className={`campusSvgOverlay ${debugMarkers ? "debug" : ""}`} viewBox={CAMPUS_MAP_VIEW_BOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <filter id="campus-region-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(255, 214, 10, 0.9)" />
                <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(255, 230, 120, 0.2)" />
              </filter>
            </defs>

            {mapMarkers.map((marker) => {
              const count = marker.building ? countsByBuilding?.get(marker.building.id) ?? 0 : 0;
              const friendCount = marker.building ? friendCountsByBuilding?.get(marker.building.id) ?? 0 : 0;
              const selected = marker.building?.id === selectedBuildingId;
              const hovered = tooltip?.markerId === marker.id;
              const interactive = Boolean(marker.building);
              const live = count > 0;
              const heatRadius = marker.r + Math.min(count * 6, 20);

              function handleSelectMarker() {
                if (!marker.building) return;
                onSelectBuilding(marker.building);
              }

              return (
                <g
                  key={marker.id}
                  className={`campusRegion ${interactive ? "isClickable" : ""} ${selected ? "selected" : ""} ${hovered ? "hovered" : ""} ${live ? "isLive" : ""} ${
                    friendCount > 0 ? "hasFriends" : ""
                  } ${debugMarkers ? "debug" : ""}`}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? handleSelectMarker : undefined}
                  onPointerEnter={() => showTooltip(marker)}
                  onPointerMove={() => showTooltip(marker)}
                  onPointerLeave={() => setTooltip((current) => (current?.markerId === marker.id ? null : current))}
                  onFocus={interactive ? () => showTooltip(marker) : undefined}
                  onBlur={interactive ? () => setTooltip((current) => (current?.markerId === marker.id ? null : current)) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectMarker();
                          }
                        }
                      : undefined
                  }
                  aria-label={`${marker.name} (${marker.code})${count > 0 ? `, ${count} active events` : ""}${friendCount > 0 ? `, ${friendCount} friends nearby` : ""}`}
                >
                  {live ? <circle className="campusHeatRing" cx={marker.cx} cy={marker.cy} r={heatRadius} /> : null}
                  <circle className="campusRegionShape" cx={marker.cx} cy={marker.cy} r={marker.r + 2} />
                  {live ? <circle className="campusPulseRing" cx={marker.cx} cy={marker.cy} r={marker.r + 6} /> : null}
                  {friendCount > 0 ? <circle className="campusFriendHalo" cx={marker.cx} cy={marker.cy} r={marker.r + 12} /> : null}
                  {debugMarkers ? (
                    <text className="campusRegionDebugCode" x={marker.cx} y={marker.cy - marker.r - 30} textAnchor="middle">
                      {marker.code}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {tooltip ? (
            <div className="campusTooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <div className="campusTooltipTitle">{tooltip.name}</div>
              <div className="campusTooltipMeta">{tooltip.code}</div>
              {tooltip.count > 0 ? <div className="campusTooltipMeta">{tooltip.count} active events</div> : null}
              {tooltip.friendCount > 0 ? <div className="campusTooltipMeta">{tooltip.friendCount} friends nearby</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
