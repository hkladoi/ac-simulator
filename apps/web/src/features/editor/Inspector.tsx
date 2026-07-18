import type {
  AcUnit,
  FurnitureItem,
  Opening,
  Room,
  SetupDraft,
} from "../../domain/types";
import { useI18n } from "../../i18n/I18n";
import {
  btuhToKw,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  feetToMeters,
  kwToBtuh,
  metersToFeet,
} from "../../calculations/unitConversion";
type Props = {
  draft: SetupDraft;
  selectedId: string | null;
  mutate: (fn: (draft: SetupDraft) => void) => void;
};
const NumberField = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) => (
  <label>
    {label}
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);
export const Inspector = ({ draft, selectedId, mutate }: Props) => {
  const { t, units, locale } = useI18n();
  const room = draft.rooms.find((x) => x.id === selectedId);
  const opening = draft.openings.find((x) => x.id === selectedId);
  const furniture = draft.furniture.find((x) => x.id === selectedId);
  const ac = draft.acUnits.find((x) => x.id === selectedId);
  const imperial = units === "imperial";
  const length = (m: number) =>
    imperial ? Number(metersToFeet(m).toFixed(2)) : m;
  const canonicalLength = (v: number) => (imperial ? feetToMeters(v) : v);
  const temp = (c: number) =>
    imperial ? Number(celsiusToFahrenheit(c).toFixed(1)) : c;
  const canonicalTemp = (v: number) => (imperial ? fahrenheitToCelsius(v) : v);
  const lengthUnit = imperial ? "ft" : "m";
  const tempUnit = imperial ? "°F" : "°C";
  if (!selectedId)
    return (
      <aside className="inspector empty">
        <div className="inspector-icon">↖</div>
        <h3>{locale === "vi" ? "Chọn một đối tượng" : "Select an object"}</h3>
        <p>
          {locale === "vi"
            ? "Chọn phòng, cửa, đồ đạc hoặc điều hòa trên mặt bằng để chỉnh thuộc tính."
            : "Select a room, opening, furniture item or AC on the plan to edit it."}
        </p>
      </aside>
    );
  const change = <T extends Room | Opening | FurnitureItem | AcUnit>(
    list: keyof SetupDraft,
    id: string,
    patch: Partial<T>,
  ) =>
    mutate((d) => {
      const item = (d[list] as unknown as T[]).find((x) => x.id === id);
      if (item) Object.assign(item, patch);
    });
  const remove = (list: keyof SetupDraft, id: string) =>
    mutate((d) => {
      (d[list] as unknown as { id: string }[]) = (
        d[list] as unknown as { id: string }[]
      ).filter((x) => x.id !== id) as never;
    });
  if (room)
    return (
      <aside className="inspector">
        <span className="eyebrow">ROOM</span>
        <h2>{room.name}</h2>
        <label>
          {locale === "vi" ? "Tên phòng" : "Room name"}
          <input
            value={room.name}
            onChange={(e) =>
              change<Room>("rooms", room.id, { name: e.target.value })
            }
          />
        </label>
        <div className="field-grid">
          <NumberField
            label={`${locale === "vi" ? "Dài" : "Length"} (${lengthUnit})`}
            value={length(room.lengthM)}
            min={length(2)}
            max={length(20)}
            onChange={(v) =>
              change<Room>("rooms", room.id, { lengthM: canonicalLength(v) })
            }
          />
          <NumberField
            label={`${locale === "vi" ? "Rộng" : "Width"} (${lengthUnit})`}
            value={length(room.widthM)}
            min={length(2)}
            max={length(20)}
            onChange={(v) =>
              change<Room>("rooms", room.id, { widthM: canonicalLength(v) })
            }
          />
          <NumberField
            label={`${locale === "vi" ? "Cao" : "Height"} (${lengthUnit})`}
            value={length(room.heightM)}
            min={length(2)}
            max={length(6)}
            onChange={(v) =>
              change<Room>("rooms", room.id, { heightM: canonicalLength(v) })
            }
          />
          <NumberField
            label={`${locale === "vi" ? "Nhiệt độ đầu" : "Initial temp"} (${tempUnit})`}
            value={temp(room.initialTempC)}
            min={temp(10)}
            max={temp(50)}
            onChange={(v) =>
              change<Room>("rooms", room.id, { initialTempC: canonicalTemp(v) })
            }
          />
          <NumberField
            label={locale === "vi" ? "Số người" : "Occupants"}
            value={room.occupants}
            min={0}
            max={30}
            step={1}
            onChange={(v) => change<Room>("rooms", room.id, { occupants: v })}
          />
          <NumberField
            label={`${locale === "vi" ? "Thiết bị" : "Equipment"} (W)`}
            value={room.equipmentGainW}
            min={0}
            max={10000}
            step={10}
            onChange={(v) =>
              change<Room>("rooms", room.id, { equipmentGainW: v })
            }
          />
        </div>
        <label>
          {locale === "vi" ? "Cách nhiệt" : "Insulation"}
          <select
            value={room.insulationLevel}
            onChange={(e) =>
              change<Room>("rooms", room.id, {
                insulationLevel: e.target.value as Room["insulationLevel"],
              })
            }
          >
            <option value="low">{locale === "vi" ? "Thấp" : "Low"}</option>
            <option value="medium">
              {locale === "vi" ? "Trung bình" : "Medium"}
            </option>
            <option value="high">{locale === "vi" ? "Cao" : "High"}</option>
          </select>
        </label>
        <label>
          {locale === "vi" ? "Độ dày tường" : "Wall thickness"}
          <select
            value={room.wallThicknessMm}
            onChange={(e) =>
              change<Room>("rooms", room.id, {
                wallThicknessMm: Number(
                  e.target.value,
                ) as Room["wallThicknessMm"],
              })
            }
          >
            {[50, 75, 100, 125, 150, 200].map((x) => (
              <option key={x} value={x}>
                {imperial ? `${(x / 25.4).toFixed(1)} in` : `${x} mm`}
              </option>
            ))}
          </select>
        </label>
        <button
          className="danger secondary"
          onClick={() => remove("rooms", room.id)}
        >
          {t("delete")}
        </button>
      </aside>
    );
  if (opening)
    return (
      <aside className="inspector">
        <span className="eyebrow">{opening.type.toUpperCase()}</span>
        <h2>
          {opening.type === "door"
            ? locale === "vi"
              ? "Cửa ra vào"
              : "Door"
            : locale === "vi"
              ? "Cửa sổ"
              : "Window"}
        </h2>
        <label>
          {locale === "vi" ? "Trạng thái" : "State"}
          <select
            value={opening.state}
            onChange={(e) =>
              change<Opening>("openings", opening.id, {
                state: e.target.value as Opening["state"],
              })
            }
          >
            <option value="open">{t("open")}</option>
            <option value="closed">{t("closed")}</option>
          </select>
        </label>
        <label>
          {locale === "vi" ? "Tường" : "Wall"}
          <select
            value={opening.wall}
            onChange={(e) =>
              change<Opening>("openings", opening.id, {
                wall: e.target.value as Opening["wall"],
              })
            }
          >
            {["north", "south", "east", "west"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <NumberField
          label={locale === "vi" ? "Vị trí trên tường" : "Position on wall"}
          value={opening.position01}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) =>
            change<Opening>("openings", opening.id, { position01: v })
          }
        />
        <NumberField
          label={`${locale === "vi" ? "Rộng" : "Width"} (${lengthUnit})`}
          value={length(opening.widthM)}
          min={length(0.5)}
          max={length(4)}
          onChange={(v) =>
            change<Opening>("openings", opening.id, {
              widthM: canonicalLength(v),
            })
          }
        />
        <NumberField
          label={`${locale === "vi" ? "Cao" : "Height"} (${lengthUnit})`}
          value={length(opening.heightM)}
          min={length(0.5)}
          max={length(3)}
          onChange={(v) =>
            change<Opening>("openings", opening.id, {
              heightM: canonicalLength(v),
            })
          }
        />
        <button
          className="danger secondary"
          onClick={() => remove("openings", opening.id)}
        >
          {t("delete")}
        </button>
      </aside>
    );
  if (furniture)
    return (
      <aside className="inspector">
        <span className="eyebrow">FURNITURE</span>
        <h2>{furniture.type}</h2>
        <div className="field-grid">
          <NumberField
            label={`X (${lengthUnit})`}
            value={length(furniture.position.x)}
            min={0}
            step={imperial ? 0.5 : 0.25}
            onChange={(v) =>
              change<FurnitureItem>("furniture", furniture.id, {
                position: { ...furniture.position, x: canonicalLength(v) },
              })
            }
          />
          <NumberField
            label={`Y (${lengthUnit})`}
            value={length(furniture.position.y)}
            min={0}
            step={imperial ? 0.5 : 0.25}
            onChange={(v) =>
              change<FurnitureItem>("furniture", furniture.id, {
                position: { ...furniture.position, y: canonicalLength(v) },
              })
            }
          />
          <NumberField
            label={`${locale === "vi" ? "Rộng" : "Width"} (${lengthUnit})`}
            value={length(furniture.widthM)}
            min={length(0.3)}
            max={length(5)}
            onChange={(v) =>
              change<FurnitureItem>("furniture", furniture.id, {
                widthM: canonicalLength(v),
              })
            }
          />
          <NumberField
            label={`${locale === "vi" ? "Sâu" : "Depth"} (${lengthUnit})`}
            value={length(furniture.depthM)}
            min={length(0.3)}
            max={length(5)}
            onChange={(v) =>
              change<FurnitureItem>("furniture", furniture.id, {
                depthM: canonicalLength(v),
              })
            }
          />
        </div>
        <NumberField
          label={locale === "vi" ? "Xoay (°)" : "Rotation (°)"}
          value={furniture.rotationDeg}
          min={0}
          max={359}
          step={15}
          onChange={(v) =>
            change<FurnitureItem>("furniture", furniture.id, { rotationDeg: v })
          }
        />
        <button
          className="danger secondary"
          onClick={() => remove("furniture", furniture.id)}
        >
          {t("delete")}
        </button>
      </aside>
    );
  if (ac)
    return (
      <aside className="inspector">
        <span className="eyebrow">AIR CONDITIONER</span>
        <h2>{t("coolingCapacity")}</h2>
        <NumberField
          label={imperial ? "BTU/h" : "kW"}
          value={
            imperial
              ? Math.round(kwToBtuh(ac.coolingCapacityKw))
              : ac.coolingCapacityKw
          }
          min={imperial ? Math.round(kwToBtuh(0.5)) : 0.5}
          max={imperial ? Math.round(kwToBtuh(20)) : 20}
          step={imperial ? 100 : 0.1}
          onChange={(v) =>
            change<AcUnit>("acUnits", ac.id, {
              coolingCapacityKw: imperial ? btuhToKw(v) : v,
            })
          }
        />
        <NumberField
          label={`Setpoint (${tempUnit})`}
          value={temp(ac.setpointC)}
          min={temp(16)}
          max={temp(30)}
          step={1}
          onChange={(v) =>
            change<AcUnit>("acUnits", ac.id, { setpointC: canonicalTemp(v) })
          }
        />
        <label>
          {locale === "vi" ? "Tốc độ quạt" : "Fan speed"}
          <select
            value={ac.fanSpeed}
            onChange={(e) =>
              change<AcUnit>("acUnits", ac.id, {
                fanSpeed: e.target.value as AcUnit["fanSpeed"],
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <NumberField
          label={locale === "vi" ? "Góc ngang (°)" : "Horizontal angle (°)"}
          value={ac.horizontalAngleDeg}
          min={-45}
          max={45}
          step={5}
          onChange={(v) =>
            change<AcUnit>("acUnits", ac.id, { horizontalAngleDeg: v })
          }
        />
        <NumberField
          label={locale === "vi" ? "Góc dọc (°)" : "Vertical angle (°)"}
          value={ac.verticalAngleDeg}
          min={-45}
          max={15}
          step={5}
          onChange={(v) =>
            change<AcUnit>("acUnits", ac.id, { verticalAngleDeg: v })
          }
        />
        <button
          className="danger secondary"
          onClick={() => remove("acUnits", ac.id)}
        >
          {t("delete")}
        </button>
      </aside>
    );
  return null;
};
