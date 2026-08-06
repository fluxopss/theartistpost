"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import type * as THREE from "three";

function FloatingCard({
  color = "#031a37",
  imageUrl,
}: {
  color?: string;
  imageUrl?: string | null;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ pointer }) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = pointer.x * 0.35;
    mesh.current.rotation.x = -pointer.y * 0.2;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
      <RoundedBox
        ref={mesh}
        args={[2.4, 1.6, 0.08]}
        radius={0.06}
        smoothness={4}
      >
        <meshStandardMaterial
          color={imageUrl ? "#1e2433" : color}
          metalness={0.2}
          roughness={0.35}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </RoundedBox>
    </Float>
  );
}

/**
 * Optional 3D post visualization for detail pages.
 * Content (title/media) stays in DOM; this is a depth accent only.
 */
export function PostCard3D({
  accent = "#031a37",
  mediaUrl,
}: {
  accent?: string;
  mediaUrl?: string | null;
}) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-lg border border-line bg-ink sm:h-72">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.2], fov: 40 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <FloatingCard color={accent} imageUrl={mediaUrl} />
      </Canvas>
    </div>
  );
}
