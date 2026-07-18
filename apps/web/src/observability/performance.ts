type Telemetry = {
  type: "performance" | "error";
  name: string;
  value?: number;
  route: string;
  at: string;
};
const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT as string | undefined;
const emit = (payload: Telemetry) => {
  window.dispatchEvent(new CustomEvent("ac:telemetry", { detail: payload }));
  if (!endpoint) return;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon)
    navigator.sendBeacon(
      endpoint,
      new Blob([body], { type: "application/json" }),
    );
  else
    void fetch(endpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      credentials: "omit",
    });
};
export const registerPerformanceObservers = () => {
  if ("PerformanceObserver" in window)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          emit({
            type: "performance",
            name: entry.entryType === "longtask" ? "long_task_ms" : entry.name,
            value: Math.round(entry.duration),
            route: location.pathname,
            at: new Date().toISOString(),
          });
      });
      observer.observe({
        type: "longtask",
        buffered: true,
      } as PerformanceObserverInit);
    } catch {
      /* unsupported observer type */
    }
  window.addEventListener("error", (event) =>
    emit({
      type: "error",
      name: event.message.slice(0, 160),
      route: location.pathname,
      at: new Date().toISOString(),
    }),
  );
  window.addEventListener("unhandledrejection", () =>
    emit({
      type: "error",
      name: "unhandled_rejection",
      route: location.pathname,
      at: new Date().toISOString(),
    }),
  );
};
