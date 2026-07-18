# Calculation and simulation model

Engine version: `visual-thermal-2.0.0`.

## Estimated heat load

For each room, `Q = envelope + occupants + equipment + infiltration`. Wall U-values depend on declared insulation/thickness. The model subtracts opening area, does not treat a shared wall as outside, and increases infiltration for an open outside opening. Person gain is 120 W. Capacity status uses `<0.85` undersized, `0.85–1.15` suitable and `>1.15` oversized. Cooling capacity is not electrical consumption; `BTU/h = kW × 3412.142`.

## Visual thermal engine

Each room gets an adaptive bounded 3D `Float32Array` grid. A Web Worker performs diffusion, outside boundary gain, internal gains, directional AC sinks, open/closed inter-room exchange, outside-opening exchange and solid furniture attenuation. Constants in `simulationConstants` are tuned for visual stability and clamped to 8–55°C. Same input and engine version produce the same output.

Golden invariants covered by tests:

- opening a hot outside window increases load;
- increasing room size does not reduce load;
- better insulation reduces envelope load;
- greater AC capacity does not make the result warmer;
- reset restores initial temperatures;
- deterministic inputs produce identical arrays.

## Accepted limitations

No Navier–Stokes solver, humidity/condensation, solar orientation/time series, curved geometry, leakage calibration, fan pressure curve, latent load, real sensor data, IoT, CAD/BIM or equipment certification. Furniture attenuation and airflow particles are qualitative. Reports must retain the disclaimer.
