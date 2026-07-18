# User guide

## Design and simulate

1. Create a blank project or open the two-room sample.
2. In **Mặt bằng / Floor plan**, add up to six rooms, drag them on the 0.25 m grid and set dimensions/insulation in the inspector. Overlapping rooms block confirmation.
3. Add an outside door/window or a connecting door. Choose its wall, position and open/closed state.
4. Add furniture. Drag, rotate and size it. Furniture outside a room or blocking an opening clearance is an error.
5. Add at least one wall AC and set cooling capacity, setpoint, fan and direction. Configure outside and target temperatures.
6. Review estimated per-room/total heat load and warnings. Only a valid configuration enables **Hoàn tất thiết kế & Bắt đầu mô phỏng**.
7. The confirmation deep-clones and freezes a revisioned snapshot, resets time to zero and starts the worker. Use Play/Pause/Reset or 0/5/15/30/60-minute markers. Adjust thermal slice height and opacity.
8. To edit, choose **Chỉnh sửa thiết kế**. If time advanced, confirm that the current field will be discarded. The worker is terminated; setup has no Play control. Reconfirming always starts at minute zero.

## Scenarios, exports and sharing

- Save simulation results as named scenarios and compare them at the same 60-minute horizon/color semantics.
- Reports can export schema-versioned JSON, the visible PNG canvas and a PDF with the mandatory limitation statement.
- Authenticated deployments create read-only share tokens. The raw token is returned only once; expiry and revoke invalidate access.

## Offline and conflicts

The editable draft saves locally first. The app shell, recently opened project and core editor/simulator work offline. Mutations queue in IndexedDB and retry with exponential backoff. If the server revision changed, the conflict dialog offers: keep local, use server, or preserve local as a copy.

## Accessibility

All primary actions are native buttons/inputs with visible focus. Setup steps are directly reachable, controls have labels, motion respects reduced-motion, touch targets are at least 44 px, thermal colors are always paired with °C values, and the core path supports a 360 px viewport.
