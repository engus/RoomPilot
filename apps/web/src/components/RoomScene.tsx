import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Shape, DoubleSide } from 'three';
import { type Project, type Room } from '@roompilot/domain';
import { ROOM_COLORS } from './PlanCanvas';
import { useInterface } from '../i18n';

function CameraControls({ size }: { size: number }) {
  const { camera, gl } = useThree();
  const controlRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true; controls.minDistance = size * .2; controls.maxDistance = size * 3; controls.maxPolarAngle = Math.PI / 2.05;
    controlRef.current = controls;
    return () => { controls.dispose(); controlRef.current = null; };
  }, [camera, gl, size]);
  useFrame(() => controlRef.current?.update());
  return null;
}

function RoomVolume({ room, scale, height, origin, color, selected, onSelect }: {
  room: Room; scale: number; height: number; origin: [number, number]; color: string; selected: boolean; onSelect: () => void;
}) {
  const { theme } = useInterface();
  const points = useMemo(() => room.polygon.map(point => ({ x: point.x * scale - origin[0], z: point.y * scale - origin[1] })), [room.polygon, scale, origin]);
  const shape = useMemo(() => { const outline = new Shape(); points.forEach((point, i) => { if (i === 0) outline.moveTo(point.x, -point.z); else outline.lineTo(point.x, -point.z); }); outline.closePath(); return outline; }, [points]);
  return <group onClick={event => { event.stopPropagation(); onSelect(); }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]} receiveShadow>
      <shapeGeometry args={[shape]} /><meshStandardMaterial color={color} side={DoubleSide} roughness={.85} />
    </mesh>
    {points.map((point, i) => { const next = points[(i + 1) % points.length]; const length = Math.hypot(next.x - point.x, next.z - point.z);
      return <mesh key={i} position={[(point.x + next.x) / 2, height / 2, (point.z + next.z) / 2]} rotation={[0, -Math.atan2(next.z - point.z, next.x - point.x), 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, .07]} /><meshStandardMaterial color={selected ? '#658a70' : theme === 'dark' ? '#8f9c8d' : '#f1ece2'} transparent opacity={selected ? .65 : .82} roughness={.9} />
      </mesh>;
    })}
  </group>;
}

export default function RoomScene({ project, selectedId, onSelect }: { project: Project; selectedId: string | null; onSelect: (id: string) => void }) {
  const { t, theme } = useInterface();
  const scale = project.calibration!.metresPerPixel;
  const width = project.source.width * scale, depth = project.source.height * scale;
  const size = Math.max(width, depth, 5);
  const origin: [number, number] = [width / 2, depth / 2];
  return <div className="scene-wrapper" data-testid="scene-3d" aria-label={t('sceneLabel')}>
    <Canvas shadows camera={{ position: [size * .65, size * .85, size * .9], fov: 42, near: .1, far: size * 20 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme === 'dark' ? '#1b2621' : '#ebece5']} /><ambientLight intensity={1.5} /><directionalLight position={[8, 18, 10]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        {project.rooms.map((room, i) => <RoomVolume key={room.id} room={room} scale={scale} height={project.ceilingHeightM!} origin={origin} color={ROOM_COLORS[i % ROOM_COLORS.length]} selected={selectedId === room.id} onSelect={() => onSelect(room.id)} />)}
        <gridHelper position={[0, -.025, 0]} args={[size * 3, Math.min(120, Math.ceil(size * 3)), theme === 'dark' ? '#52695a' : '#aab4a2', theme === 'dark' ? '#36483b' : '#c1c7b9']} />
        <CameraControls size={size} />
    </Canvas>
    <span className="scene-hint">{t('sceneHint')}</span>
  </div>;
}
