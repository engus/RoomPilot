import { getOpeningSegment, type Opening, type Project } from '@roompilot/domain';

function OpeningMesh({ project, opening, origin, onRoomSelect }: {
  project: Project; opening: Opening; origin: [number, number]; onRoomSelect: (roomId: string) => void;
}) {
  if (opening.kind === 'passage') return null;
  const span = opening.spans[0];
  const [a, b] = getOpeningSegment(project, span);
  const scale = project.calibration!.metresPerPixel;
  const width = Math.hypot(b.x - a.x, b.y - a.y) * scale;
  const height = opening.heightM;
  const trim = Math.min(.045, width / 6, height / 6);
  const room = project.rooms.find(room => room.id === span.roomId)!;
  const winding = Math.sign(room.polygon.reduce((area, point, index) => {
    const next = room.polygon[(index + 1) % room.polygon.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0));
  return <group position={[a.x * scale - origin[0], opening.sillHeightM, a.y * scale - origin[1]]}
    rotation={[0, -Math.atan2(b.y - a.y, b.x - a.x), 0]}
    onClick={event => { event.stopPropagation(); onRoomSelect(span.roomId); }}>
    {[trim / 2, width - trim / 2].map(x => <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[trim, height, .12]} /><meshStandardMaterial color={opening.kind === 'window' ? '#dbe5df' : '#8b7155'} roughness={.65} />
    </mesh>)}
    <mesh position={[width / 2, height - trim / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width - trim * 2, trim, .12]} /><meshStandardMaterial color={opening.kind === 'window' ? '#dbe5df' : '#8b7155'} roughness={.65} />
    </mesh>
    {opening.kind === 'window' ? <>
      <mesh position={[width / 2, trim / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - trim * 2, trim, .12]} /><meshStandardMaterial color="#dbe5df" roughness={.65} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[width - trim * 2, height - trim * 2, .015]} />
        <meshStandardMaterial color="#a2d5e5" transparent opacity={.28} roughness={.15} metalness={.05} depthWrite={false} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[trim * .7, height - trim * 2, .08]} /><meshStandardMaterial color="#dbe5df" roughness={.65} />
      </mesh>
    </> : <group position={[trim, 0, 0]} rotation={[0, -winding * Math.PI / 3, 0]}>
      <mesh position={[(width - trim * 2) / 2, (height - trim) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - trim * 2, height - trim, .035]} /><meshStandardMaterial color="#b69773" roughness={.75} />
      </mesh>
    </group>}
  </group>;
}

export default function OpeningMeshes({ project, origin, onRoomSelect }: {
  project: Project; origin: [number, number]; onRoomSelect: (roomId: string) => void;
}) {
  return <group>{project.openings.map(opening => <OpeningMesh key={opening.id} project={project} opening={opening} origin={origin} onRoomSelect={onRoomSelect} />)}</group>;
}
