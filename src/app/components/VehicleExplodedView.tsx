import { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ZoomIn, Eye, Rotate3d, Sparkles } from 'lucide-react';

// Type definitions
interface Part {
  id: string;
  name: string;
  color: string;
  basePos: [number, number, number];
  explodedPos: [number, number, number];
  size: [number, number, number];
  description: string;
}

interface PartMeshProps {
  part: Part;
  exploded: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  selected: string | null;
}

function PartMesh({ part, exploded, hovered, onHover, onClick, selected }: PartMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = useMemo(
    () => new THREE.Vector3(...(exploded ? part.explodedPos : part.basePos)),
    [exploded, part],
  );

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.lerp(targetPos, 0.07);

    // Dynamic emissive glow on hover or selection
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const isActive = hovered === part.id || selected === part.id;
    const targetEmissiveIntensity = isActive ? 0.35 : 0;
    mat.emissiveIntensity += (targetEmissiveIntensity - mat.emissiveIntensity) * 0.12;
  });

  const isSelected = selected === part.id;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={part.basePos}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(part.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(part.id);
        }}
        castShadow
        receiveShadow
      >
        {part.id === 'antenna' ? (
          <cylinderGeometry args={[0.2, 0.25, 0.05, 16]} />
        ) : (
          <boxGeometry args={part.size} />
        )}
        <meshStandardMaterial
          color={part.color}
          roughness={0.3}
          metalness={0.4}
          emissive={part.color}
          emissiveIntensity={0}
          transparent
          opacity={hovered && hovered !== part.id ? 0.45 : 1}
        />
      </mesh>

      {/* Glassmorphic part annotation label */}
      <AnimatePresence>
        {isSelected && exploded && (
          <Html
            position={exploded ? part.explodedPos : part.basePos}
            center
            distanceFactor={8}
            style={{ pointerEvents: 'none' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="backdrop-blur-md bg-white/92 border border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-xl px-5 py-3.5 whitespace-nowrap min-w-[210px] relative overflow-hidden"
            >
              {/* Premium Top Neon Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand via-amber-400 to-yellow-300" />
              
              <div className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse shrink-0" />
                {part.name}
              </div>
              <div className="text-xs text-neutral-500 mt-1 font-medium leading-relaxed whitespace-normal max-w-[240px]">
                {part.description}
              </div>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
}

function Scene({
  parts,
  exploded,
  hovered,
  onHover,
  selected,
  onSelect,
}: {
  parts: Part[];
  exploded: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 9, 6]} intensity={1.1} castShadow />
      <directionalLight position={[-4, 5, -3]} intensity={0.35} />

      {parts.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          exploded={exploded}
          hovered={hovered}
          onHover={onHover}
          onClick={(id) => onSelect(selected === id ? null : id)}
          selected={selected}
        />
      ))}

      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.35}
        scale={10}
        blur={2.2}
        far={4.5}
      />
      <Environment preset="city" />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4.5}
        maxDistance={11}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

interface VehicleExplodedViewProps {
  locale?: string;
  t: Record<string, string>;
}

export function VehicleExplodedView({ t }: VehicleExplodedViewProps) {
  const [exploded, setExploded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Localized vehicle parts built dynamically using the i18n dictionary
  const localizedParts = useMemo<Part[]>(() => [
    {
      id: 'chassis',
      name: t['part.chassis.name'] || '车身底盘',
      color: '#414141',
      basePos: [0, 0, 0],
      explodedPos: [0, -1.5, 0],
      size: [3.2, 0.3, 1.6],
      description: t['part.chassis.desc'] || '加固型越野底盘 · 承载 2.5T',
    },
    {
      id: 'body',
      name: t['part.body.name'] || '车厢主体',
      color: '#e4dacf',
      basePos: [0, 0.8, 0],
      explodedPos: [0, 0.8, 0],
      size: [2.8, 1.2, 1.5],
      description: t['part.body.desc'] || '铝合金框架 · 保温隔热层',
    },
    {
      id: 'solar',
      name: t['part.solar.name'] || '太阳能板组',
      color: '#1a3754',
      basePos: [0, 1.6, 0],
      explodedPos: [0, 3.4, 0],
      size: [2.6, 0.08, 1.4],
      description: t['part.solar.desc'] || '2×800W 可折叠 · JA Solar',
    },
    {
      id: 'server',
      name: t['part.server.name'] || 'AI 服务器',
      color: '#14b8a6',
      basePos: [-0.6, 0.8, 0],
      explodedPos: [-2.8, 0.8, 0],
      size: [0.6, 0.8, 0.5],
      description: t['part.server.desc'] || '4×L40 GPU · 80GB VRAM',
    },
    {
      id: 'battery',
      name: t['part.battery.name'] || '储能电池组',
      color: '#f3d230',
      basePos: [0.8, 0.3, 0],
      explodedPos: [2.8, -0.5, 0],
      size: [0.8, 0.5, 1.0],
      description: t['part.battery.desc'] || 'LiFePO₄ 2000Ah · 磷酸铁锂',
    },
    {
      id: 'printer',
      name: t['part.printer.name'] || '3D 打印机',
      color: '#f97316',
      basePos: [0.6, 0.8, 0.3],
      explodedPos: [2.8, 1.8, 1.5],
      size: [0.5, 0.5, 0.5],
      description: t['part.printer.desc'] || 'Bambu Lab X1C · 多色打印',
    },
    {
      id: 'antenna',
      name: t['part.antenna.name'] || '卫星天线',
      color: '#8b5cf6',
      basePos: [0, 1.7, -0.5],
      explodedPos: [0, 4.0, -2.0],
      size: [0.4, 0.05, 0.4],
      description: t['part.antenna.desc'] || 'Starlink Gen 3 · 低轨卫星',
    },
    {
      id: 'wheels',
      name: t['part.wheels.name'] || '越野轮组',
      color: '#2d2d2d',
      basePos: [0, -0.3, 0],
      explodedPos: [0, -2.9, 0],
      size: [3.4, 0.1, 2.0],
      description: t['part.wheels.desc'] || 'BFGoodrich AT · 33 inch',
    },
  ], [t]);

  const hoveredPart = localizedParts.find((p) => p.id === hovered);

  return (
    <div
      data-testid="vehicle-exploded-view"
      className="relative w-full rounded-2xl overflow-hidden border border-neutral-300/40 bg-gradient-to-b from-neutral-50 to-neutral-100/90 shadow-[0_24px_50px_rgba(0,0,0,0.06)]"
    >
      {/* 3D Canvas rendering window */}
      <div className="w-full h-[520px] md:h-[620px]">
        <Canvas
          shadows
          camera={{ position: [5, 3.2, 5], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => setSelected(null)}
        >
          <Scene
            parts={localizedParts}
            exploded={exploded}
            hovered={hovered}
            onHover={setHovered}
            selected={selected}
            onSelect={setSelected}
          />
        </Canvas>
      </div>

      {/* Premium Integrated Dashboard Overlay Panel */}
      <div className="absolute bottom-5 left-5 right-5 z-20">
        <div className="backdrop-blur-md bg-white/80 border border-white/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Action Explode/Assemble Button */}
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setExploded((v) => !v);
              setSelected(null);
            }}
            className="w-full md:w-auto bg-neutral-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-neutral-800 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5"
          >
            <motion.span 
              animate={exploded ? { scale: [1, 1.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
              className={`w-2.5 h-2.5 rounded-full ${exploded ? 'bg-brand' : 'bg-neutral-400'}`} 
            />
            {exploded ? t['3d.assemble'] : t['3d.explode']}
          </motion.button>

          {/* Contextual Info Node */}
          <div className="flex-1 flex items-center justify-center min-h-[30px]">
            <AnimatePresence mode="wait">
              {hoveredPart ? (
                <motion.div
                  key={`hover-${hoveredPart.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-brand/10 border border-brand/20 text-brand-dark px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  {hoveredPart.name}
                </motion.div>
              ) : (
                <motion.div
                  key="tips"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-neutral-400 font-medium hidden lg:flex items-center gap-4"
                >
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    {t['3d.tip'].split(' · ')[0]}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    {t['3d.tip'].split(' · ')[1]}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300" />
                  <span className="flex items-center gap-1">
                    <Rotate3d className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                    {t['3d.tip'].split(' · ')[2]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Simple operation hint indicator for mobile */}
          <div className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 font-bold bg-neutral-100 border border-neutral-200/50 px-2.5 py-1 rounded-md shrink-0 select-none md:block hidden">
            interactive 3d
          </div>
        </div>
      </div>
    </div>
  );
}
