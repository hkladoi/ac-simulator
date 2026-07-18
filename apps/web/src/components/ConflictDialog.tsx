import { useEffect, useRef } from "react";
import type { SyncConflict } from "../state/useProjectSync";
import { useI18n } from "../i18n/I18n";

export const ConflictDialog = ({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve: (choice: "local" | "server" | "copy") => void;
}) => {
  const { tr } = useI18n();
  const firstAction = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstAction.current?.focus();
  }, []);
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-description"
      >
        <span className="eyebrow">SYNC CONFLICT</span>
        <h2 id="conflict-title">
          {tr(
            "Có phiên bản mới hơn trên máy chủ",
            "A newer server version exists",
          )}
        </h2>
        <p id="conflict-description">
          {tr(
            "Không có dữ liệu nào bị ghi đè tự động. Chọn phiên bản bạn muốn giữ.",
            "Nothing is overwritten automatically. Choose the version to keep.",
          )}
        </p>
        <dl>
          <div>
            <dt>{tr("Bản cục bộ", "Local version")}</dt>
            <dd>
              {conflict.local.rooms.length}{" "}
              {tr("phòng · thay đổi chưa đồng bộ", "rooms · unsynced changes")}
            </dd>
          </div>
          <div>
            <dt>{tr("Bản máy chủ", "Server version")}</dt>
            <dd>
              Revision {conflict.server.revision} ·{" "}
              {new Date(conflict.server.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button ref={firstAction} onClick={() => onResolve("local")}>
            {tr("Giữ bản cục bộ", "Keep local")}
          </button>
          <button className="secondary" onClick={() => onResolve("server")}>
            {tr("Dùng bản máy chủ", "Use server")}
          </button>
          <button className="secondary" onClick={() => onResolve("copy")}>
            {tr("Lưu local thành bản copy", "Save local as a copy")}
          </button>
        </div>
      </section>
    </div>
  );
};
