import { Canvas, useFrame } from "@react-three/fiber";
import {
  Edges,
  Grid,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AcUnit, Room, SetupDraft, ThermalFrame } from "../domain/types";
import { useI18n } from "../i18n/I18n";

const webglSupported = () => {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};
const lowCapability = () =>
  navigator.hardwareConcurrency <= 4 ||
  ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
const acPosition = (room: Room, ac: AcUnit): [number, number, number] =>
  ac.wall === "north"
    ? [
        room.origin.x + ac.position01 * room.lengthM,
        ac.heightM,
        room.origin.y + 0.08,
      ]
    : ac.wall === "south"
      ? [
          room.origin.x + ac.position01 * room.lengthM,
          ac.heightM,
          room.origin.y + room.widthM - 0.08,
        ]
      : ac.wall === "west"
        ? [
            room.origin.x + 0.08,
            ac.heightM,
            room.origin.y + ac.position01 * room.widthM,
          ]
        : [
            room.origin.x + room.lengthM - 0.08,
            ac.heightM,
            room.origin.y + ac.position01 * room.widthM,
          ];
const RoomShell = ({ room }: { room: Room }) => (
  <group
    position={[
      room.origin.x + room.lengthM / 2,
      0,
      room.origin.y + room.widthM / 2,
    ]}
  >
    <mesh position={[0, 0.03, 0]} receiveShadow>
      <boxGeometry args={[room.lengthM, 0.06, room.widthM]} />
      <meshStandardMaterial color="#e8f1ef" />
    </mesh>
    <Grid
      args={[room.lengthM, room.widthM]}
      cellSize={0.5}
      cellColor="#b7d0cf"
      sectionColor="#8eb3b2"
      position={[0, 0.07, 0]}
    />
    <mesh position={[0, room.heightM / 2, 0]}>
      <boxGeometry args={[room.lengthM, room.heightM, room.widthM]} />
      <meshBasicMaterial
        transparent
        opacity={0.025}
        color="#78aeb4"
        depthWrite={false}
      />
      <Edges color="#558893" />
    </mesh>
  </group>
);
const Airflow = ({
  room,
  ac,
  active,
  reduced,
}: {
  room: Room;
  ac: AcUnit;
  active: boolean;
  reduced: boolean;
}) => {
  const points = useRef<THREE.Points>(null);
  const count = reduced ? 18 : 46;
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (i % 9) * 0.22;
      a[i * 3 + 1] = Math.sin(i) * 0.12;
      a[i * 3 + 2] = (i % 5) * 0.06 - 0.15;
    }
    return a;
  }, [count]);
  useFrame((_, d) => {
    if (active && points.current)
      points.current.position.x =
        (points.current.position.x + d * (ac.fanSpeed === "high" ? 1.2 : 0.7)) %
        3;
  });
  const origin = acPosition(room, ac);
  return (
    <points ref={points} position={origin}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#54e8ff"
        size={0.08}
        transparent
        opacity={active ? 0.72 : 0.28}
      />
    </points>
  );
};
const ThermalPlane = ({
  room,
  frame,
  height,
  opacity,
}: {
  room: Room;
  frame: ThermalFrame["rooms"][number];
  height: number;
  opacity: number;
}) => {
  const texture = useMemo(() => {
    const { nx, ny, nz } = frame.dimensions;
    const z = Math.min(nz - 1, Math.round(height * (nz - 1)));
    const data = new Uint8Array(nx * ny * 4);
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const temp = frame.temperatures[x + nx * (y + ny * z)];
        const t = Math.max(0, Math.min(1, (temp - 18) / 18));
        const color = new THREE.Color().setHSL((1 - t) * 0.66, 0.9, 0.5);
        const i = (x + nx * y) * 4;
        data[i] = color.r * 255;
        data[i + 1] = color.g * 255;
        data[i + 2] = color.b * 255;
        data[i + 3] = 255;
      }
    const tex = new THREE.DataTexture(data, nx, ny, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [frame, height]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={[
        room.origin.x + room.lengthM / 2,
        height * room.heightM + 0.08,
        room.origin.y + room.widthM / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[room.lengthM, room.widthM]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};
const Scene = ({
  draft,
  thermal,
  active,
  sliceHeight,
  opacity,
  overlay,
}: {
  draft: SetupDraft;
  thermal?: ThermalFrame | null;
  active: boolean;
  sliceHeight: number;
  opacity: number;
  overlay: boolean;
}) => {
  const maxX = Math.max(4, ...draft.rooms.map((r) => r.origin.x + r.lengthM));
  const maxY = Math.max(4, ...draft.rooms.map((r) => r.origin.y + r.widthM));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <>
      <color attach="background" args={["#eff6f4"]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[8, 12, 5]} intensity={2.2} />
      <PerspectiveCamera
        makeDefault
        position={[maxX * 0.9, Math.max(maxX, maxY) * 0.85, maxY * 1.15]}
        fov={42}
      />
      <OrbitControls
        makeDefault
        target={[maxX / 2, 0, maxY / 2]}
        minDistance={4}
        maxDistance={45}
      />
      {draft.rooms.map((r) => (
        <RoomShell key={r.id} room={r} />
      ))}
      {draft.furniture.map((f) => {
        const room = draft.rooms.find((r) => r.id === f.roomId);
        return room ? (
          <mesh
            key={f.id}
            position={[
              room.origin.x + f.position.x + f.widthM / 2,
              f.heightM / 2,
              room.origin.y + f.position.y + f.depthM / 2,
            ]}
            rotation={[0, (-f.rotationDeg * Math.PI) / 180, 0]}
            castShadow
          >
            <boxGeometry args={[f.widthM, f.heightM, f.depthM]} />
            <meshStandardMaterial
              color={f.type === "bed" ? "#d6c9b5" : "#a9bdb6"}
            />
            <Edges color="#607c76" />
          </mesh>
        ) : null;
      })}
      {draft.openings.map((o) => {
        const r = draft.rooms.find((x) => x.id === o.roomId);
        if (!r) return null;
        const vertical = o.wall === "east" || o.wall === "west";
        const pos: [number, number, number] = vertical
          ? [
              r.origin.x + (o.wall === "east" ? r.lengthM : 0),
              o.sillHeightM + o.heightM / 2,
              r.origin.y + o.position01 * r.widthM,
            ]
          : [
              r.origin.x + o.position01 * r.lengthM,
              o.sillHeightM + o.heightM / 2,
              r.origin.y + (o.wall === "south" ? r.widthM : 0),
            ];
        return (
          <mesh key={o.id} position={pos}>
            <boxGeometry
              args={
                vertical
                  ? [0.07, o.heightM, o.widthM]
                  : [o.widthM, o.heightM, 0.07]
              }
            />
            <meshStandardMaterial
              transparent
              opacity={o.state === "open" ? 0.22 : 0.65}
              color={o.type === "window" ? "#5bd9ec" : "#e0ae6d"}
            />
          </mesh>
        );
      })}
      {draft.acUnits.map((ac) => {
        const r = draft.rooms.find((x) => x.id === ac.roomId);
        if (!r) return null;
        return (
          <group key={ac.id}>
            <mesh position={acPosition(r, ac)}>
              <boxGeometry args={[0.9, 0.28, 0.22]} />
              <meshStandardMaterial color="#f9ffff" />
              <Edges color="#5197a0" />
            </mesh>
            <Airflow room={r} ac={ac} active={active} reduced={reduced} />
          </group>
        );
      })}
      {overlay &&
        thermal?.rooms.map((f) => {
          const r = draft.rooms.find((x) => x.id === f.roomId);
          return r ? (
            <ThermalPlane
              key={f.roomId}
              room={r}
              frame={f}
              height={sliceHeight}
              opacity={opacity}
            />
          ) : null;
        })}
    </>
  );
};
export const BuildingScene = ({
  draft,
  thermal = null,
  active = false,
  sliceHeight = 0.45,
  opacity = 0.78,
  overlay = false,
}: {
  draft: SetupDraft;
  thermal?: ThermalFrame | null;
  active?: boolean;
  sliceHeight?: number;
  opacity?: number;
  overlay?: boolean;
}) => {
  const { tr } = useI18n();
  return webglSupported() ? (
    <div className="scene-canvas">
      <Canvas
        dpr={lowCapability() ? [1, 1.25] : [1, 1.75]}
        gl={{
          antialias: !lowCapability(),
          powerPreference: "high-performance",
        }}
      >
        <Scene
          draft={draft}
          thermal={thermal}
          active={active}
          sliceHeight={sliceHeight}
          opacity={opacity}
          overlay={overlay}
        />
      </Canvas>
    </div>
  ) : (
    <div className="webgl-fallback" role="alert">
      <strong>{tr("WebGL không khả dụng", "WebGL is unavailable")}</strong>
      <p>
        {tr(
          "Mặt bằng 2D và số liệu vẫn dùng được; preview 3D/thermal bị giới hạn trên thiết bị này.",
          "The 2D plan and calculations remain available; 3D and thermal previews are limited on this device.",
        )}
      </p>
    </div>
  );
};
