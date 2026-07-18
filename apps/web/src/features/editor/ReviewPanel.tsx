import { capacityStatus } from "../../calculations/capacity";
import { estimateHeatLoads } from "../../calculations/heatLoad";
import { kwToBtuh, metersToFeet } from "../../calculations/unitConversion";
import type { SetupDraft, ValidationIssue } from "../../domain/types";
import { useI18n } from "../../i18n/I18n";
export const ReviewPanel = ({
  draft,
  issues,
}: {
  draft: SetupDraft;
  issues: ValidationIssue[];
}) => {
  const { t, units, locale } = useI18n();
  const loads = estimateHeatLoads(draft);
  const imperial = units === "imperial";
  const dim = (m: number) => (imperial ? metersToFeet(m) : m).toFixed(1);
  const statusLabel = (status: string) =>
    locale === "vi"
      ? ({ undersized: "thiếu", suitable: "phù hợp", oversized: "dư" }[
          status
        ] ?? status)
      : status;
  return (
    <div className="review-panel">
      <section className="review-summary">
        <span className="eyebrow">{t("estimated").toUpperCase()}</span>
        <div className="big-metric">
          <strong>
            {imperial
              ? Math.round(kwToBtuh(loads.totalKw)).toLocaleString()
              : loads.totalKw.toFixed(2)}
          </strong>
          <span>{imperial ? "BTU/h" : "kW"}</span>
        </div>
        <small>
          {imperial
            ? `${loads.totalKw.toFixed(2)} kW`
            : `${Math.round(kwToBtuh(loads.totalKw)).toLocaleString()} BTU/h`}{" "}
          · {draft.rooms.length} {locale === "vi" ? "phòng" : "rooms"}
        </small>
      </section>
      <section>
        <h2>{t("validation")}</h2>
        {issues.length === 0 ? (
          <div className="success-callout">✓ {t("noErrors")}</div>
        ) : (
          <ul className="issue-list">
            {issues.map((issue, i) => (
              <li
                key={`${issue.code}-${issue.objectId}-${i}`}
                className={issue.severity}
              >
                <span>{issue.severity === "error" ? "!" : "i"}</span>
                <div>
                  <strong>
                    {locale === "vi"
                      ? issue.severity === "error"
                        ? "Cần sửa"
                        : "Lưu ý"
                      : issue.severity === "error"
                        ? "Fix required"
                        : "Note"}
                  </strong>
                  <p>{t(issue.messageKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>{locale === "vi" ? "Tải lạnh theo phòng" : "Heat load by room"}</h2>
        <div className="room-loads">
          {loads.rooms.map((load) => {
            const room = draft.rooms.find((r) => r.id === load.roomId)!;
            const capacity = draft.acUnits
              .filter((a) => a.roomId === room.id)
              .reduce((s, a) => s + a.coolingCapacityKw, 0);
            const status = capacityStatus(capacity, load.totalKw);
            return (
              <article key={room.id}>
                <div>
                  <strong>{room.name}</strong>
                  <small>
                    {dim(room.lengthM)} × {dim(room.widthM)} ×{" "}
                    {dim(room.heightM)} {imperial ? "ft" : "m"}
                  </small>
                </div>
                <div className="load-value">
                  <strong>
                    {imperial
                      ? `${Math.round(kwToBtuh(load.totalKw)).toLocaleString()} BTU/h`
                      : `${load.totalKw.toFixed(2)} kW`}
                  </strong>
                  <span className={`capacity ${status.status}`}>
                    {statusLabel(status.status)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <p className="disclaimer">ⓘ {t("disclaimer")}</p>
    </div>
  );
};
