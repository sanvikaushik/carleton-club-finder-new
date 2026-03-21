import React, { useEffect, useMemo, useRef, useState } from "react";
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
  x: number;
  y: number;
};

export const CampusImageMap: React.FC<{
  ariaLabel: string;
  buildings: Building[];
  countsByBuilding?: Map<string, number>;
  onSelectBuilding: (building: Building) => void;
  selectedBuildingId?: string | null;
  debugMarkers?: boolean;
}> = ({ ariaLabel, buildings, countsByBuilding, onSelectBuilding, selectedBuildingId, debugMarkers = false }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [walkZoomActive, setWalkZoomActive] = useState(false);

  const mapMarkers = useMemo(() => getCampusMapMarkers(buildings), [buildings]);
  const zoomScale = walkZoomActive ? 1.8 : 1;

  useEffect(() => {
    if (!walkZoomActive) return;

    const viewport = viewportRef.current;
    const frame = frameRef.current;
    if (!viewport || !frame) return;

    const selectedMarker = selectedBuildingId
      ? mapMarkers.find((marker) => marker.building?.id === selectedBuildingId)
      : null;

    const focusX = selectedMarker ? selectedMarker.cx / CAMPUS_MAP_IMAGE_WIDTH : 0.5;
    const focusY = selectedMarker ? selectedMarker.cy / CAMPUS_MAP_IMAGE_HEIGHT : 0.5;

    const left = frame.offsetWidth * focusX - viewport.clientWidth / 2;
    const top = frame.offsetHeight * focusY - viewport.clientHeight / 2;
    const maxLeft = Math.max(0, frame.offsetWidth - viewport.clientWidth);
    const maxTop = Math.max(0, frame.offsetHeight - viewport.clientHeight);

    viewport.scrollTo({
      left: Math.min(Math.max(left, 0), maxLeft),
      top: Math.min(Math.max(top, 0), maxTop),
      behavior: "smooth",
    });
  }, [walkZoomActive, selectedBuildingId, mapMarkers]);

  function toFramePoint(clientX: number, clientY: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function toFramePointFromMarker(marker: CampusMapMarker) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: (marker.tooltipX / CAMPUS_MAP_IMAGE_WIDTH) * rect.width,
      y: (marker.tooltipY / CAMPUS_MAP_IMAGE_HEIGHT) * rect.height,
    };
  }

  function showTooltip(marker: CampusMapMarker, point: { x: number; y: number }) {
    setTooltip({
      markerId: marker.id,
      code: marker.code,
      name: marker.name,
      count: marker.building ? countsByBuilding?.get(marker.building.id) ?? 0 : 0,
      x: point.x,
      y: point.y,
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGGElement>, marker: CampusMapMarker) {
    const point = toFramePoint(event.clientX, event.clientY);
    if (!point) return;
    showTooltip(marker, point);
  }

  function handleFocus(marker: CampusMapMarker) {
    const point = toFramePointFromMarker(marker);
    if (!point) return;
    showTooltip(marker, point);
  }

  function hideTooltip(markerId?: string) {
    setTooltip((current) => {
      if (!current) return null;
      if (!markerId || current.markerId === markerId) return null;
      return current;
    });
  }

  return (
    <div className="mapCard campusImageCard">
      <div ref={viewportRef} className={`campusImageViewport ${walkZoomActive ? "zoomed" : ""}`}>
        <button
          type="button"
          className={`campusZoomBtn ${walkZoomActive ? "active" : ""}`}
          aria-label={walkZoomActive ? "Reset campus map zoom" : "Zoom into the campus map"}
          aria-pressed={walkZoomActive}
          onClick={() => setWalkZoomActive((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="13" cy="4.5" r="2.5" />
            <path d="M12.8 8.2a2 2 0 0 0-1.9 1.4l-.8 2.4-2.9 2.2a1 1 0 0 0 1.2 1.6l2.2-1.6.8 2.4-1.5 4.2a1 1 0 1 0 1.9.7l1.4-4 2.6 2.2a1 1 0 0 0 1.7-.8l-.3-3.6 1.8-2.1a1 1 0 1 0-1.5-1.3l-2.3 2.6-.5-2.8a2 2 0 0 0-1.9-1.5Z" />
          </svg>
        </button>

        <div className="campusImageCanvas" style={{ "--campus-zoom": zoomScale } as React.CSSProperties}>
          <div ref={frameRef} className="campusImageFrame" aria-label={ariaLabel}>
            <img className="campusImage" src={CAMPUS_MAP_IMAGE_SRC} alt="" aria-hidden="true" />
            <div className="campusImageShade" aria-hidden="true" />

            <svg
              className={`campusSvgOverlay ${debugMarkers ? "debug" : ""}`}
              viewBox={CAMPUS_MAP_VIEW_BOX}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <filter id="campus-region-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(255, 214, 10, 0.9)" />
                  <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(255, 230, 120, 0.2)" />
                </filter>
              </defs>

              {mapMarkers.map((marker) => {
                const count = marker.building ? countsByBuilding?.get(marker.building.id) ?? 0 : 0;
                const selected = marker.building?.id === selectedBuildingId;
                const hovered = tooltip?.markerId === marker.id;
                const interactive = Boolean(marker.building);

                function handleSelectMarker() {
                  if (!marker.building) return;
                  console.debug("[CampusMap] building selected", {
                    buildingId: marker.building.id,
                    code: marker.code,
                    name: marker.name,
                    selected: selectedBuildingId === marker.building.id,
                  });
                  onSelectBuilding(marker.building);
                }

                return (
                  <g
                    key={marker.id}
                    className={`campusRegion ${interactive ? "isClickable" : ""} ${selected ? "selected" : ""} ${hovered ? "hovered" : ""} ${
                      debugMarkers ? "debug" : ""
                    }`}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    onClick={interactive ? handleSelectMarker : undefined}
                    onPointerEnter={(event) => handlePointerMove(event, marker)}
                    onPointerMove={(event) => handlePointerMove(event, marker)}
                    onPointerLeave={() => hideTooltip(marker.id)}
                    onFocus={interactive ? () => handleFocus(marker) : undefined}
                    onBlur={interactive ? () => hideTooltip(marker.id) : undefined}
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
                    aria-label={`${marker.name} (${marker.code})${count > 0 ? `, ${count} active event${count === 1 ? "" : "s"}` : ""}`}
                  >
                    <circle
                      className="campusRegionShape"
                      cx={marker.cx}
                      cy={marker.cy}
                      r={marker.r}
                      data-code={marker.code}
                      data-name={marker.name}
                    />
                    {debugMarkers ? (
                      <text className="campusRegionDebugCode" x={marker.cx} y={marker.cy - marker.r - 12} textAnchor="middle">
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
                {tooltip.count > 0 ? (
                  <div className="campusTooltipMeta">
                    {tooltip.count} active event{tooltip.count === 1 ? "" : "s"}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
