"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";

/** Exact logo samples */
const OLIVE = "#4D503B";
const SAGE = "#A1A580";
const CREAM = "#DDDED0";

function houseShape() {
  const s = new THREE.Shape();
  // Wide base, soft roof — matches logo silhouette
  s.moveTo(-0.95, -1.1);
  s.lineTo(-1.15, -1.05);
  s.quadraticCurveTo(-1.28, -0.98, -1.22, -0.72);
  s.lineTo(-1.22, 0.05);
  s.lineTo(-0.02, 1.05);
  s.lineTo(1.22, 0.05);
  s.lineTo(1.22, -0.72);
  s.quadraticCurveTo(1.28, -0.98, 1.15, -1.05);
  s.lineTo(0.95, -1.1);
  s.quadraticCurveTo(0, -1.22, -0.95, -1.1);
  return s;
}

function HouseBody({
  color,
  position,
  scale = 1,
  headX = 0,
  showHead = true,
  depth = 0.32,
}: {
  color: string;
  position: [number, number, number];
  scale?: number;
  headX?: number;
  showHead?: boolean;
  depth?: number;
}) {
  const shape = useMemo(() => houseShape(), []);
  const extrude = useMemo(
    () => ({
      depth,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
    }),
    [depth],
  );

  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0, -depth / 2]}>
        <extrudeGeometry args={[shape, extrude]} />
        <meshStandardMaterial color={color} roughness={0.68} metalness={0.04} />
      </mesh>
      {showHead && (
        <mesh position={[headX, 1.22, 0.06]} castShadow>
          <sphereGeometry args={[0.26, 40, 40]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.06} />
        </mesh>
      )}
    </group>
  );
}

export function HouseMark() {
  const group = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!group.current) return;
    // Gentle yaw only — Float handles vertical motion
    group.current.rotation.y = Math.sin(t * 0.32) * 0.2;
  });

  return (
    <group ref={group} position={[0, -0.05, 0]} scale={1.12}>
      <HouseBody
        color={OLIVE}
        position={[-0.52, 0, -0.18]}
        scale={0.94}
        headX={-0.08}
      />
      <HouseBody
        color={SAGE}
        position={[0.52, 0.04, -0.12]}
        scale={0.94}
        headX={0.08}
      />
      {/* Negative-space house — cream, slightly forward */}
      <HouseBody
        color={CREAM}
        position={[0, 0.06, 0.28]}
        scale={0.72}
        showHead={false}
        depth={0.22}
      />
    </group>
  );
}
