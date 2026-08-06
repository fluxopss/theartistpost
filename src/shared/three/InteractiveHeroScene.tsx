"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function seededPositions(count: number) {
  const arr = new Float32Array(count * 3);
  let seed = 42;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (next() - 0.5) * 14;
    arr[i * 3 + 1] = (next() - 0.5) * 8;
    arr[i * 3 + 2] = (next() - 0.5) * 8;
  }
  return arr;
}

function ParticleField({ count = 900 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => seededPositions(count), [count]);

  useFrame(({ clock, pointer }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime() * 0.1;
    points.current.rotation.y = t + pointer.x * 0.12;
    points.current.rotation.x = pointer.y * 0.06;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#dfe0e4"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function DriftPlanes() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.18) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh position={[-2.2, 0.4, -2]} rotation={[0.4, 0.6, 0.2]}>
        <planeGeometry args={[3.2, 2.1]} />
        <meshBasicMaterial color="#0a2748" transparent opacity={0.65} />
      </mesh>
      <mesh position={[2.4, -0.6, -1.5]} rotation={[-0.3, -0.5, 0.1]}>
        <planeGeometry args={[2.6, 1.8]} />
        <meshBasicMaterial color="#23406e" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Navy particle field for brand hero — mount behind WebGLGate only. */
export function InteractiveHeroScene() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#031a37"]} />
        <ambientLight intensity={0.45} />
        <ParticleField />
        <DriftPlanes />
      </Canvas>
      <div className="grain" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/10 via-transparent to-ink" />
    </div>
  );
}

export { HeroFallback } from "./HeroFallback";
