/// <reference lib="webworker" />
import { ThermalEngine } from "./thermalEngine";
import type { WorkerRequest, WorkerResponse } from "./protocol";

let engine: ThermalEngine | null = null;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === "init") {
      engine = new ThermalEngine(event.data.snapshot);
      post({ type: "ready", frame: engine.frame() });
    } else if (event.data.type === "step" && engine)
      post({ type: "frame", frame: engine.step(event.data.minutes) });
    else if (event.data.type === "reset" && engine)
      post({ type: "frame", frame: engine.reset() });
    else if (event.data.type === "dispose") {
      engine = null;
      close();
    }
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Simulation failed",
    });
  }
};
const post = (message: WorkerResponse) => {
  if (message.type === "error") self.postMessage(message);
  else
    self.postMessage(message, {
      transfer: message.frame.rooms.map((room) => room.temperatures.buffer),
    });
};
