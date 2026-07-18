import { useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SetupDraft } from "../../domain/types";
import { metersToFeet } from "../../calculations/unitConversion";
import { useI18n } from "../../i18n/I18n";

const SCALE = 54;
const PAD = 36;
export const FloorPlan2D = ({
  draft,
  selectedId,
  onSelect,
  onMove,
}: {
  draft: SetupDraft;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) => {
  const { units, tr } = useI18n();
  const dimension = (meters: number) =>
    units === "imperial" ? metersToFeet(meters).toFixed(1) : meters.toFixed(1);
  const lengthUnit = units === "imperial" ? "ft" : "m";
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const bounds = useMemo(
    () => ({
      width: Math.max(
        680,
        ...draft.rooms.map((r) => (r.origin.x + r.lengthM) * SCALE + PAD * 2),
      ),
      height: Math.max(
        460,
        ...draft.rooms.map((r) => (r.origin.y + r.widthM) * SCALE + PAD * 2),
      ),
    }),
    [draft.rooms],
  );
  const startDrag = (
    event: ReactPointerEvent,
    id: string,
    x: number,
    y: number,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
    };
    onSelect(id);
  };
  const move = (event: ReactPointerEvent) => {
    if (!drag.current) return;
    const nextX =
      Math.round(
        (drag.current.originX + (event.clientX - drag.current.startX) / SCALE) *
          4,
      ) / 4;
    const nextY =
      Math.round(
        (drag.current.originY + (event.clientY - drag.current.startY) / SCALE) *
          4,
      ) / 4;
    onMove(drag.current.id, Math.max(0, nextX), Math.max(0, nextY));
  };
  return (
    <div
      className="floor-scroll"
      role="application"
      aria-label={tr("Trình chỉnh sửa mặt bằng 2D", "2D floor-plan editor")}
    >
      <svg
        className="floor-plan"
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="minorGrid"
            width={SCALE / 4}
            height={SCALE / 4}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${SCALE / 4} 0 L 0 0 0 ${SCALE / 4}`}
              fill="none"
              stroke="#dbe6e8"
              strokeWidth="0.6"
            />
          </pattern>
          <pattern
            id="grid"
            width={SCALE}
            height={SCALE}
            patternUnits="userSpaceOnUse"
          >
            <rect width={SCALE} height={SCALE} fill="url(#minorGrid)" />
            <path
              d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`}
              fill="none"
              stroke="#b8cccf"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {draft.rooms.map((room) => (
          <g
            key={room.id}
            transform={`translate(${PAD + room.origin.x * SCALE},${PAD + room.origin.y * SCALE})`}
            onPointerDown={(e) =>
              startDrag(e, room.id, room.origin.x, room.origin.y)
            }
            onClick={() => onSelect(room.id)}
            className={selectedId === room.id ? "selected" : ""}
          >
            <rect
              width={room.lengthM * SCALE}
              height={room.widthM * SCALE}
              rx="3"
              className="room-rect"
            />
            <text x="12" y="24" className="room-name">
              {room.name}
            </text>
            <text x="12" y="42" className="room-size">
              {dimension(room.lengthM)} × {dimension(room.widthM)} ×{" "}
              {dimension(room.heightM)} {lengthUnit}
            </text>
            {draft.openings
              .filter((o) => o.roomId === room.id)
              .map((o) => {
                const vertical = o.wall === "east" || o.wall === "west";
                const wallL = vertical ? room.widthM : room.lengthM;
                const start = (o.position01 * wallL - o.widthM / 2) * SCALE;
                const x =
                  o.wall === "west"
                    ? 0
                    : o.wall === "east"
                      ? room.lengthM * SCALE
                      : start;
                const y =
                  o.wall === "north"
                    ? 0
                    : o.wall === "south"
                      ? room.widthM * SCALE
                      : start;
                return (
                  <g
                    key={o.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(o.id);
                    }}
                    className={selectedId === o.id ? "selected" : ""}
                  >
                    <line
                      x1={x}
                      y1={y}
                      x2={vertical ? x : y + o.widthM * SCALE}
                      y2={vertical ? y + o.widthM * SCALE : y}
                      className={`opening-line ${o.type} ${o.state}`}
                    />
                    <circle cx={x} cy={y} r="5" className="opening-dot" />
                  </g>
                );
              })}
            {draft.furniture
              .filter((f) => f.roomId === room.id)
              .map((f) => (
                <g
                  key={f.id}
                  transform={`translate(${f.position.x * SCALE},${f.position.y * SCALE}) rotate(${f.rotationDeg} ${(f.widthM * SCALE) / 2} ${(f.depthM * SCALE) / 2})`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag(e, f.id, f.position.x, f.position.y);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(f.id);
                  }}
                  className={selectedId === f.id ? "selected" : ""}
                >
                  <rect
                    width={f.widthM * SCALE}
                    height={f.depthM * SCALE}
                    rx="5"
                    className={`furniture-shape ${f.type}`}
                  />
                  <text
                    x={(f.widthM * SCALE) / 2}
                    y={(f.depthM * SCALE) / 2 + 4}
                    textAnchor="middle"
                    className="furniture-label"
                  >
                    {f.type}
                  </text>
                </g>
              ))}
            {draft.acUnits
              .filter((a) => a.roomId === room.id)
              .map((a) => {
                const vertical = a.wall === "east" || a.wall === "west";
                const x =
                  a.wall === "west"
                    ? 5
                    : a.wall === "east"
                      ? room.lengthM * SCALE - 5
                      : a.position01 * room.lengthM * SCALE;
                const y =
                  a.wall === "north"
                    ? 5
                    : a.wall === "south"
                      ? room.widthM * SCALE - 5
                      : a.position01 * room.widthM * SCALE;
                return (
                  <g
                    key={a.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(a.id);
                    }}
                    className={selectedId === a.id ? "selected" : ""}
                  >
                    <rect
                      x={x - (vertical ? 5 : 22)}
                      y={y - (vertical ? 22 : 5)}
                      width={vertical ? 10 : 44}
                      height={vertical ? 44 : 10}
                      rx="3"
                      className="ac-shape"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      className="ac-label"
                    >
                      AC
                    </text>
                  </g>
                );
              })}
          </g>
        ))}
        <g
          transform={`translate(${PAD},${bounds.height - 20})`}
          className="scale"
        >
          <line x1="0" x2={SCALE} y1="0" y2="0" />
          <line x1="0" x2="0" y1="-4" y2="4" />
          <line x1={SCALE} x2={SCALE} y1="-4" y2="4" />
          <text x={SCALE / 2} y="-7" textAnchor="middle">
            1 m
          </text>
        </g>
      </svg>
    </div>
  );
};
