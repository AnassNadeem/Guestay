"use client";

import { ContactShadows, Environment, Float } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { HouseMark } from "./HouseMark";

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[4.5, 7, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 2, -2]} intensity={0.4} color="#E7E7D6" />
      <pointLight position={[0, 2, 3]} intensity={0.25} color="#A6AC7E" />
    </>
  );
}

export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 5.4], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <SceneLights />
        <Environment preset="apartment" />
        <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.3}>
          <HouseMark />
        </Float>
        <ContactShadows
          position={[0, -1.4, 0]}
          opacity={0.28}
          scale={9}
          blur={2.6}
          far={4.5}
          color="#3B4430"
        />
      </Suspense>
    </Canvas>
  );
}
