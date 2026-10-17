import { useMemo } from 'react';
import { DoubleSide, Shape } from 'three';
import type { Project, Zone } from '@roompilot/domain';
import { ZONE_COLORS } from '../zone-colors';

function ZoneFloor({ zone, scale, origin, color, selected, onSelect }: { zone: Zone; scale: number; origin: [number, number]; color: string; selected: boolean; onSelect: () => void }) {
  const shape = useMemo(() => {
    const shape = new Shape();
    zone.polygon.forEach((point, i) => { const x = point.x * scale - origin[0], y = -(point.y * scale - origin[1]); if (i) shape.lineTo(x, y); else shape.moveTo(x, y); });
    shape.closePath(); return shape;
  }, [zone.polygon, scale, origin[0], origin[1]]);
  const outline = useMemo(() => new Float32Array(zone.polygon.flatMap(point => [point.x * scale - origin[0], .035, point.y * scale - origin[1]])), [zone.polygon, scale, origin[0], origin[1]]);
  return <group onClick={event => { event.stopPropagation(); onSelect(); }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .026, 0]} renderOrder={1} receiveShadow>
      <shapeGeometry args={[shape]} /><meshStandardMaterial color={color} side={DoubleSide} transparent opacity={selected ? .92 : .65} depthWrite={false} roughness={.9} />
    </mesh>
    <lineLoop><bufferGeometry><bufferAttribute attach="attributes-position" args={[outline, 3]} /></bufferGeometry><lineBasicMaterial color={selected ? '#df8b37' : color} /></lineLoop>
  </group>;
}

export default function ZoneMeshes({ project, origin, selectedId, onSelect }: { project: Project; origin: [number, number]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <group>{project.zones.map((zone, i) => <ZoneFloor key={zone.id} zone={zone} scale={project.calibration!.metresPerPixel} origin={origin} color={ZONE_COLORS[i % ZONE_COLORS.length]} selected={selectedId === zone.id} onSelect={() => onSelect(zone.id)} />)}</group>;
}
