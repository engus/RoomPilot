import { useMemo } from 'react';
import { Path, Shape } from 'three';
import type { Point, Project, SolidWallModel, WallPolygon } from '@roompilot/domain';

const BASE_EXTRUSION = { depth: .14, bevelEnabled: false, steps: 1 };

function shapeFromPolygon(polygon: WallPolygon, origin: [number, number]) {
  const paths = polygon.map(ring => {
    const path = new Path();
    ring.forEach((point, i) => { const x = point.x - origin[0], y = origin[1] - point.y; if (i === 0) path.moveTo(x, y); else path.lineTo(x, y); });
    path.closePath(); return path;
  });
  const shape = new Shape(paths[0].getPoints()); shape.holes = paths.slice(1); return shape;
}

export default function SolidWalls({ model, project, origin, onSelect }: {
  model: SolidWallModel; project: Project; origin: [number, number]; onSelect: (id: string) => void;
}) {
  const [originX, originY] = origin;
  const layers = useMemo(() => model.layers.map(layer => ({ ...layer, shapes: layer.polygons.map(polygon => shapeFromPolygon(polygon, [originX, originY])), extrusion: { depth: layer.topM - layer.bottomM, bevelEnabled: false, steps: 1 } })), [model, originX, originY]);
  const base = useMemo(() => model.base.map(polygon => shapeFromPolygon(polygon, [originX, originY])), [model, originX, originY]);
  function selectNearest(point: Point) {
    const scale = project.calibration!.metresPerPixel;
    let nearest: string | undefined, distance = Infinity;
    for (const room of project.rooms) room.polygon.forEach((a, i) => {
      const b = room.polygon[(i + 1) % room.polygon.length], dx = (b.x - a.x) * scale, dy = (b.y - a.y) * scale;
      const x = a.x * scale, y = a.y * scale;
      const t = Math.max(0, Math.min(1, ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy)));
      const next = Math.hypot(point.x - x - t * dx, point.y - y - t * dy);
      if (next < distance) { distance = next; nearest = room.id; }
    });
    if (nearest) onSelect(nearest);
  }
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.14, 0]} receiveShadow castShadow>
      <extrudeGeometry args={[base, BASE_EXTRUSION]} />
      <meshStandardMaterial color="#c9c0b0" roughness={.95} />
    </mesh>
    {layers.map((layer, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, layer.bottomM, 0]} castShadow receiveShadow
      onClick={event => { event.stopPropagation(); selectNearest({ x: event.point.x + originX, y: event.point.z + originY }); }}>
      <extrudeGeometry args={[layer.shapes, layer.extrusion]} />
      <meshStandardMaterial color="#f1e9d8" roughness={.9} />
    </mesh>)}
  </group>;
}
