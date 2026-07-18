import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createSampleDraft } from "../features/editor/defaults";
import { ConflictDialog } from "./ConflictDialog";
import { I18nProvider } from "../i18n/I18n";

describe("ConflictDialog", () => {
  it("never auto-resolves and exposes all three explicit choices", () => {
    const onResolve = vi.fn();
    render(
      <I18nProvider><ConflictDialog
        conflict={{
          local: createSampleDraft(),
          server: {
            id: "project",
            name: "Server",
            revision: 8,
            currentVersionId: "version",
            configJson: "{}",
            updatedAt: "2026-07-18T00:00:00Z",
          },
        }}
        onResolve={onResolve}
      /></I18nProvider>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onResolve).not.toHaveBeenCalled();
    const local = screen.getByRole("button", { name: "Giữ bản cục bộ" });
    expect(local).toHaveFocus();
    fireEvent.click(local);
    expect(onResolve).toHaveBeenCalledWith("local");
    fireEvent.click(screen.getByRole("button", { name: "Dùng bản máy chủ" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Lưu local thành bản copy" }),
    );
    expect(onResolve.mock.calls.map((call) => call[0])).toEqual([
      "local",
      "server",
      "copy",
    ]);
  });
});
