import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "vi" | "en";
export type Units = "metric" | "imperial";
const messages = {
  vi: {
    appName: "AC Thermal Studio",
    projects: "Dự án",
    setup: "Thiết kế không gian",
    simulation: "Mô phỏng",
    compare: "So sánh",
    reports: "Báo cáo",
    estimated: "Ước tính",
    disclaimer:
      "Mô hình trực quan gần đúng — không phải kết quả đo thực tế hoặc thiết kế HVAC được chứng nhận.",
    layout: "Mặt bằng",
    openings: "Cửa & cửa sổ",
    furniture: "Đồ đạc",
    ac: "Điều hòa & môi trường",
    review: "Kiểm tra",
    next: "Tiếp tục",
    back: "Quay lại",
    addRoom: "Thêm phòng",
    sample: "Dùng dự án mẫu",
    newProject: "Dự án mới",
    preview3d: "Xem 3D",
    floor2d: "Mặt bằng 2D",
    finish: "Hoàn tất thiết kế & Bắt đầu mô phỏng",
    editSetup: "Chỉnh sửa thiết kế",
    play: "Chạy",
    pause: "Tạm dừng",
    reset: "Đặt lại",
    noErrors: "Cấu hình hợp lệ và sẵn sàng mô phỏng.",
    heatLoad: "Tải lạnh",
    coolingCapacity: "Công suất lạnh",
    target: "Mục tiêu",
    outside: "Ngoài trời",
    thermalOverlay: "Lớp nhiệt",
    sliceHeight: "Độ cao lát cắt",
    opacity: "Độ trong suốt",
    inspectValue: "Nhiệt độ tại tâm lát cắt",
    validation: "Kiểm tra cấu hình",
    undo: "Hoàn tác",
    redo: "Làm lại",
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    local: "Đã lưu cục bộ",
    add: "Thêm",
    delete: "Xóa",
    open: "Mở",
    closed: "Đóng",
    "sync.local": "Đã lưu cục bộ",
    "sync.saving": "Đang đồng bộ…",
    "sync.synced": "Đã đồng bộ",
    "sync.offline": "Ngoại tuyến",
    "sync.conflict": "Cần xử lý xung đột",
    "sync.error": "Lỗi đồng bộ",
    "validation.roomRequired": "Cần ít nhất một phòng.",
    "validation.roomMax": "Tối đa 6 phòng.",
    "validation.duplicateId": "ID đối tượng bị trùng.",
    "validation.roomDimensions": "Kích thước phòng nằm ngoài giới hạn.",
    "validation.roomOverlap": "Các phòng không được chồng lấn.",
    "validation.invalidRelation": "Liên kết đối tượng không hợp lệ.",
    "validation.openingBounds": "Cửa nằm ngoài giới hạn tường.",
    "validation.furnitureBounds": "Đồ đạc phải nằm hoàn toàn trong phòng.",
    "validation.furnitureOpening": "Đồ đạc đang chặn khoảng thoáng của cửa.",
    "validation.acInvalid": "Cấu hình điều hòa không hợp lệ.",
    "validation.acMissing": "Phòng chưa có điều hòa riêng.",
    "validation.acRequired": "Cần ít nhất một điều hòa để mô phỏng.",
  },
  en: {
    appName: "AC Thermal Studio",
    projects: "Projects",
    setup: "Space setup",
    simulation: "Simulation",
    compare: "Compare",
    reports: "Reports",
    estimated: "Estimated",
    disclaimer:
      "Approximate visual model — not a real measurement or certified HVAC design result.",
    layout: "Floor plan",
    openings: "Doors & windows",
    furniture: "Furniture",
    ac: "AC & environment",
    review: "Review",
    next: "Continue",
    back: "Back",
    addRoom: "Add room",
    sample: "Use sample project",
    newProject: "New project",
    preview3d: "3D preview",
    floor2d: "2D plan",
    finish: "Finish design & Start simulation",
    editSetup: "Edit setup",
    play: "Play",
    pause: "Pause",
    reset: "Reset",
    noErrors: "Configuration is valid and ready to simulate.",
    heatLoad: "Heat load",
    coolingCapacity: "Cooling capacity",
    target: "Target",
    outside: "Outside",
    thermalOverlay: "Thermal overlay",
    sliceHeight: "Slice height",
    opacity: "Opacity",
    inspectValue: "Slice-center temperature",
    validation: "Configuration review",
    undo: "Undo",
    redo: "Redo",
    online: "Online",
    offline: "Offline",
    local: "Saved locally",
    add: "Add",
    delete: "Delete",
    open: "Open",
    closed: "Closed",
    "sync.local": "Saved locally",
    "sync.saving": "Syncing…",
    "sync.synced": "Synced",
    "sync.offline": "Offline",
    "sync.conflict": "Resolve conflict",
    "sync.error": "Sync error",
    "validation.roomRequired": "At least one room is required.",
    "validation.roomMax": "A maximum of six rooms is supported.",
    "validation.duplicateId": "Object ID is duplicated.",
    "validation.roomDimensions": "Room dimensions are outside allowed limits.",
    "validation.roomOverlap": "Rooms may not overlap.",
    "validation.invalidRelation": "Object relationship is invalid.",
    "validation.openingBounds": "Opening is outside its wall.",
    "validation.furnitureBounds":
      "Furniture must remain fully inside its room.",
    "validation.furnitureOpening": "Furniture blocks the opening clearance.",
    "validation.acInvalid": "AC configuration is invalid.",
    "validation.acMissing": "Room has no dedicated AC unit.",
    "validation.acRequired": "At least one AC unit is required.",
  },
} as const;

type MessageKey = keyof typeof messages.vi;
type I18nValue = {
  locale: Locale;
  units: Units;
  setLocale: (v: Locale) => void;
  setUnits: (v: Units) => void;
  t: (key: string) => string;
  tr: (vi: string, en: string) => string;
};
const Context = createContext<I18nValue | null>(null);
export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(
    () => (localStorage.getItem("ac:locale") as Locale) || "vi",
  );
  const [units, setUnitsState] = useState<Units>(
    () => (localStorage.getItem("ac:units") as Units) || "metric",
  );
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      units,
      setLocale: (v) => {
        localStorage.setItem("ac:locale", v);
        setLocaleState(v);
      },
      setUnits: (v) => {
        localStorage.setItem("ac:units", v);
        setUnitsState(v);
      },
      t: (key) => messages[locale][key as MessageKey] ?? key,
      tr: (vi, en) => (locale === "vi" ? vi : en),
    }),
    [locale, units],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
export const useI18n = () => {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider missing");
  return value;
};
