import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Box3, Shape, DoubleSide, PerspectiveCamera, Vector3 } from 'three';
import { getWallSections, type Project, type Room } from '@roompilot/domain';
import { ROOM_COLORS } from './PlanCanvas';
import OpeningMeshes from './OpeningMeshes';
import ZoneMeshes from './ZoneMeshes';
import { useInterface } from '../i18n';

type SceneBounds = [number, number, number, number, number, number];

function CameraControls({ bounds }: { bounds: SceneBounds }) {
  const { camera, gl, size: viewport } = useThree();
  const controlRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.05;
    controlRef.current = controls;
    return () => { controls.dispose(); controlRef.current = null; };
  }, [camera, gl]);
  const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
  useEffect(() => {
    const controls = controlRef.current;
    if (!controls || !(camera instanceof PerspectiveCamera) || viewport.width <= 0 || viewport.height <= 0) return;
    const box = new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ)).expandByScalar(.12);
    const center = box.getCenter(new Vector3());
    // Retain the user's orbit direction when the viewport or model dimensions change.
    const direction = camera.position.clone().sub(controls.target).normalize();
    const right = new Vector3().crossVectors(camera.up, direction).normalize();
    const up = new Vector3().crossVectors(direction, right).normalize();
    const tanVertical = Math.tan(camera.fov * Math.PI / 360);
    const tanHorizontal = tanVertical * viewport.width / viewport.height;
    let distance = .5;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const corner = new Vector3(x, y, z).sub(center);
      const towardCamera = corner.dot(direction);
      distance = Math.max(distance, towardCamera + Math.abs(corner.dot(right)) * 1.16 / tanHorizontal,
        towardCamera + Math.abs(corner.dot(up)) * 1.16 / tanVertical);
    }
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.minDistance = Math.max(.1, box.getSize(new Vector3()).length() * .05);
    controls.maxDistance = distance * 4;
    camera.near = Math.min(.1, distance / 100);
    camera.far = Math.max(100, distance + box.getSize(new Vector3()).length() * 10);
    camera.updateProjectionMatrix(); controls.update();
  }, [camera, viewport.width, viewport.height, minX, minY, minZ, maxX, maxY, maxZ]);
  useFrame(() => controlRef.current?.update());
  return null;
}

function RoomVolume({ room, project, scale, height, origin, color, selected, onSelect }: {
  room: Room; project: Project; scale: number; height: number; origin: [number, number]; color: string; selected: boolean; onSelect: () => void;
}) {
  const { theme } = useInterface();
  const points = useMemo(() => room.polygon.map(point => ({ x: point.x * scale - origin[0], z: point.y * scale - origin[1] })), [room.polygon, scale, origin]);
  const shape = useMemo(() => { const outline = new Shape(); points.forEach((point, i) => { if (i === 0) outline.moveTo(point.x, -point.z); else outline.lineTo(point.x, -point.z); }); outline.closePath(); return outline; }, [points]);
  return <group onClick={event => { event.stopPropagation(); onSelect(); }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]} receiveShadow>
      <shapeGeometry args={[shape]} /><meshStandardMaterial color={color} side={DoubleSide} roughness={.85} />
    </mesh>
    {points.map((point, i) => { const next = points[(i + 1) % points.length]; const length = Math.hypot(next.x - point.x, next.z - point.z);
      const apertures = project.openings.flatMap(opening => opening.spans
        .filter(span => span.roomId === room.id && span.edgeIndex === i)
        .map(span => ({ start: span.start, end: span.end, sillHeightM: opening.sillHeightM, heightM: opening.heightM })));
      return <group key={i} position={[point.x, 0, point.z]} rotation={[0, -Math.atan2(next.z - point.z, next.x - point.x), 0]}>
        {getWallSections(height, apertures).map((section, sectionIndex) => <mesh key={sectionIndex}
          position={[(section.start + section.end) / 2 * length, (section.bottomM + section.topM) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[(section.end - section.start) * length, section.topM - section.bottomM, .07]} />
          <meshStandardMaterial color={selected ? '#658a70' : theme === 'dark' ? '#8f9c8d' : '#f1ece2'} transparent opacity={selected ? .65 : .82} roughness={.9} />
        </mesh>)}
      </group>;
    })}
  </group>;
}

export default function RoomScene({ project, selectedId, onSelect, selectedZoneId = null, onZoneSelect = () => {} }: { project: Project; selectedId: string | null; onSelect: (id: string) => void; selectedZoneId?: string | null; onZoneSelect?: (id: string) => void }) {
  const { t, theme } = useInterface();
  const scale = project.calibration!.metresPerPixel;
  const width = project.source.width * scale, depth = project.source.height * scale;
  const size = Math.max(width, depth, 5);
  const origin: [number, number] = [width / 2, depth / 2];
  const vertices = project.rooms.flatMap(room => room.polygon);
  const bounds: SceneBounds = vertices.length ? [
    Math.min(...vertices.map(point => point.x * scale)) - origin[0], 0,
    Math.min(...vertices.map(point => point.y * scale)) - origin[1],
    Math.max(...vertices.map(point => point.x * scale)) - origin[0], project.ceilingHeightM!,
    Math.max(...vertices.map(point => point.y * scale)) - origin[1],
  ] : [-width / 2, 0, -depth / 2, width / 2, project.ceilingHeightM!, depth / 2];
  return <div className="scene-wrapper" data-testid="scene-3d" aria-label={t('sceneLabel')}>
    <Canvas shadows camera={{ position: [size * .65, size * .85, size * .9], fov: 42, near: .1, far: size * 20 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme === 'dark' ? '#1b2621' : '#ebece5']} /><ambientLight intensity={1.5} /><directionalLight position={[8, 18, 10]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        {project.rooms.map((room, i) => <RoomVolume key={room.id} room={room} project={project} scale={scale} height={project.ceilingHeightM!} origin={origin} color={ROOM_COLORS[i % ROOM_COLORS.length]} selected={selectedId === room.id} onSelect={() => onSelect(room.id)} />)}
        <OpeningMeshes project={project} origin={origin} onRoomSelect={onSelect} />
        <ZoneMeshes project={project} origin={origin} selectedId={selectedZoneId} onSelect={onZoneSelect} />
        <gridHelper position={[0, -.025, 0]} args={[size * 3, Math.min(120, Math.ceil(size * 3)), theme === 'dark' ? '#52695a' : '#aab4a2', theme === 'dark' ? '#36483b' : '#c1c7b9']} />
        <CameraControls bounds={bounds} />
    </Canvas>
    <span className="scene-hint">{t('sceneHint')}</span>
  </div>;
}
