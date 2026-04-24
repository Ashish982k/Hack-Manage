"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);

const THREE_CLOCK_DEPRECATION = "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";
const browserWindow = globalThis as typeof globalThis & {
  __threeClockDeprecationPatched?: boolean;
};

if (typeof window !== "undefined" && !browserWindow.__threeClockDeprecationPatched) {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === "string" && message.includes(THREE_CLOCK_DEPRECATION)) return;
    originalWarn(...args);
  };
  browserWindow.__threeClockDeprecationPatched = true;
}

const NODE_POSITIONS: Array<[number, number, number]> = [
  [-1.6, 0.7, -0.6],
  [-1.15, -0.45, 0.2],
  [-0.3, 1.25, 0.35],
  [0.35, -1.2, -0.35],
  [1.05, 0.4, 0.75],
  [1.45, -0.7, -0.65],
  [0.1, 0.15, 1.2],
];

const NODE_EDGES: Array<[number, number]> = [
  [0, 2],
  [0, 1],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 6],
  [2, 6],
  [1, 4],
];

const PANEL_DATA: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
}> = [
  { position: [1.45, 0.65, 0.2], rotation: [0.25, -0.35, 0.15] },
  { position: [-1.25, -0.75, 0.35], rotation: [-0.15, 0.35, -0.2] },
  { position: [0.3, 1.4, -0.45], rotation: [-0.35, -0.1, 0.25] },
  { position: [0.2, -1.55, -0.25], rotation: [0.35, 0.2, -0.2] },
];

const normalizedNoise = (seed: number, salt: number) => {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

function ParticleCloud() {
  const pointsRef = React.useRef<THREE.Points>(null);
  const geometry = React.useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const seed = i + 1;
      const radius = 1.75 + normalizedNoise(seed, 0.31) * 1.8;
      const theta = normalizedNoise(seed, 0.71) * Math.PI * 2;
      const phi = normalizedNoise(seed, 1.11) * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.7;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return particleGeometry;
  }, []);

  React.useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x += delta * 0.012;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#c4b5fd"
        size={0.03}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function NodeNetwork() {
  return (
    <group>
      {NODE_EDGES.map(([startIndex, endIndex], index) => (
        <Line
          key={`${startIndex}-${endIndex}`}
          points={[NODE_POSITIONS[startIndex], NODE_POSITIONS[endIndex]]}
          color={index % 2 === 0 ? "#7dd3fc" : "#c4b5fd"}
          transparent
          opacity={0.35}
        />
      ))}

      {NODE_POSITIONS.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#e9d5ff" : "#bae6fd"}
            emissive={index % 2 === 0 ? "#7c3aed" : "#0ea5e9"}
            emissiveIntensity={0.65}
            roughness={0.2}
            metalness={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

function DigitalHackathonCore({
  scrollProgressRef,
}: {
  scrollProgressRef: React.MutableRefObject<number>;
}) {
  const rootRef = React.useRef<THREE.Group>(null);
  const shellRef = React.useRef<THREE.Mesh>(null);
  const panelClusterRef = React.useRef<THREE.Group>(null);
  const timerRef = React.useRef<THREE.Timer>(new THREE.Timer());
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    const timer = timerRef.current;
    timer.connect(document);
    timer.reset();
    return () => {
      timer.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (!rootRef.current || !shellRef.current || !panelClusterRef.current) return;

    timerRef.current.update();
    const t = timerRef.current.getElapsed();
    const scrollProgress = scrollProgressRef.current;

    rootRef.current.position.y = Math.sin(t * 0.85) * 0.11;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(
      rootRef.current.rotation.x,
      state.pointer.y * 0.25 + scrollProgress * 0.12,
      0.07,
    );
    rootRef.current.rotation.y = THREE.MathUtils.lerp(
      rootRef.current.rotation.y,
      state.pointer.x * 0.4 + t * 0.35 + scrollProgress * 0.45,
      0.07,
    );

    shellRef.current.rotation.y -= delta * 0.25;
    shellRef.current.rotation.x += delta * 0.15;

    panelClusterRef.current.rotation.y += delta * 0.3;
    panelClusterRef.current.rotation.z = Math.sin(t * 0.5) * 0.12;
  });

  return (
    <group ref={rootRef}>
      {/* Main "Hackathon Core" object with glass-metal feel */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.04 : 1}
      >
        <icosahedronGeometry args={[0.92, 2]} />
        <meshPhysicalMaterial
          color="#9b8cff"
          metalness={0.62}
          roughness={0.16}
          transmission={0.55}
          thickness={1.4}
          clearcoat={1}
          clearcoatRoughness={0.12}
          emissive="#4c1d95"
          emissiveIntensity={hovered ? 0.7 : 0.45}
        />
      </mesh>

      <mesh ref={shellRef} scale={1.44}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#67e8f9" wireframe transparent opacity={0.36} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.23}>
        <torusGeometry args={[1, 0.02, 20, 120]} />
        <meshStandardMaterial
          color="#f0abfc"
          emissive="#a21caf"
          emissiveIntensity={0.8}
          roughness={0.25}
          metalness={0.8}
        />
      </mesh>

      <group ref={panelClusterRef}>
        {PANEL_DATA.map((panel, index) => (
          <group key={index} position={panel.position} rotation={panel.rotation}>
            <mesh>
              <boxGeometry args={[0.5, 0.42, 0.04]} />
              <meshStandardMaterial
                color="#c084fc"
                emissive="#312e81"
                emissiveIntensity={0.65}
                roughness={0.28}
                metalness={0.74}
              />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <planeGeometry args={[0.38, 0.3]} />
              <meshBasicMaterial color="#a5f3fc" transparent opacity={0.24} />
            </mesh>
          </group>
        ))}
      </group>

      <NodeNetwork />
      <ParticleCloud />
    </group>
  );
}

export function HackathonCore3D({ className = "" }: { className?: string }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const scrollProgressRef = React.useRef(0);

  React.useEffect(() => {
    if (!wrapperRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const heroSection = wrapperRef.current.closest("#hero") as HTMLElement | null;
    const triggerElement = heroSection ?? wrapperRef.current;
    const context = gsap.context(() => {
      gsap.fromTo(
        wrapperRef.current,
        { autoAlpha: 0, y: 46, scale: 0.95 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: triggerElement,
            start: "top 68%",
          },
        },
      );

      if (!prefersReducedMotion) {
        ScrollTrigger.create({
          trigger: triggerElement,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
          },
        });
      }
    }, wrapperRef);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`premium-card relative h-[440px] w-full overflow-hidden rounded-[28px] border border-white/12 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_220px_at_50%_18%,rgba(125,211,252,0.18),rgba(5,7,13,0))]" />

      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0.2, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#05070d"]} />
        <fog attach="fog" args={["#05070d", 5.5, 10.5]} />

        {/* Lighting stack: ambient + neon accents */}
        <ambientLight intensity={0.45} color="#dbeafe" />
        <pointLight position={[3.5, 2.6, 2.4]} intensity={1.15} color="#8b5cf6" />
        <pointLight position={[-3.6, -1.4, 1.8]} intensity={0.95} color="#06b6d4" />
        <spotLight position={[0, 4.6, 2.5]} intensity={0.55} angle={0.5} penumbra={0.7} color="#f5d0fe" />

        <DigitalHackathonCore scrollProgressRef={scrollProgressRef} />
      </Canvas>

      <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/14 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
        Digital Hackathon Core
      </div>
    </div>
  );
}

