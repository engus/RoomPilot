import { useRef, useState, type PointerEvent } from 'react';
import { type Point, type Project, type Room, validatePolygon } from '@roompilot/domain';
import { useInterface } from '../i18n';

export type EditorMode = 'select' | 'draw' | 'calibrate';
export const ROOM_COLORS = ['#98b8a1', '#e8bb7d', '#b5bed7', '#d4b5b0', '#b7c9c5', '#d4c993'];
type Props = {
  project: Project; selectedId: string | null; mode: EditorMode; draft: Point[]; calibrationPoints: Point[];
  onSelect: (id: string) => void; onPoint: (point: Point) => void;
  onEdit: (room: Room) => void; onError: (message: string) => void;
};

export default function PlanCanvas({ project, selectedId, mode, draft, calibrationPoints, onSelect, onPoint, onEdit, onError }: Props) {
  const { t } = useInterface();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ room: Room; vertex: number } | null>(null);
  const [draggedRoom, setDraggedRoom] = useState<Room | null>(null);
  const toPoint = (event: PointerEvent<SVGElement>): Point => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    const transformed = matrix ? point.matrixTransform(matrix.inverse()) : point;
    return { x: Math.max(0, Math.min(project.source.width, transformed.x)), y: Math.max(0, Math.min(project.source.height, transformed.y)) };
  };
  const finishDrag = () => {
    if (draggedRoom) {
      if (validatePolygon(draggedRoom.polygon)) onEdit(draggedRoom);
      else onError(t('invalidVertex'));
    }
    drag.current = null; setDraggedRoom(null);
  };
  const points = (items: Point[]) => items.map(point => `${point.x},${point.y}`).join(' ');
  const markerSize = Math.max(project.source.width, project.source.height) / 115;
  const calibration = calibrationPoints.length ? calibrationPoints : project.calibration?.points ?? [];
  return <svg ref={svgRef} className={`plan-svg mode-${mode}`} data-testid="plan-canvas" aria-label={t('planCanvas')} role="img"
    viewBox={`0 0 ${project.source.width} ${project.source.height}`}
    onPointerDown={event => { if (mode !== 'select') { event.preventDefault(); onPoint(toPoint(event)); } }}
    onPointerMove={event => { if (drag.current) { const polygon = [...drag.current.room.polygon]; polygon[drag.current.vertex] = toPoint(event); setDraggedRoom({ ...drag.current.room, polygon }); } }}
    onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; setDraggedRoom(null); }}>
    <image href={project.source.dataUrl} width={project.source.width} height={project.source.height} />
    {project.rooms.map((saved, index) => {
      const room = draggedRoom?.id === saved.id ? draggedRoom : saved;
      const active = room.id === selectedId;
      const center = room.polygon.reduce((sum, point) => ({ x: sum.x + point.x / room.polygon.length, y: sum.y + point.y / room.polygon.length }), { x: 0, y: 0 });
      return <g key={room.id}>
        <polygon points={points(room.polygon)} fill={ROOM_COLORS[index % ROOM_COLORS.length]} fillOpacity={active ? .42 : .22}
          stroke={active ? '#224e40' : '#61756b'} strokeWidth={active ? 3 : 1.5} vectorEffect="non-scaling-stroke"
          role="button" tabIndex={0} aria-label={t('selectRoom', { name: room.name })}
          onClick={() => { if (mode === 'select') onSelect(room.id); }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(room.id); } }} />
        <text className="room-label" x={center.x} y={center.y} textAnchor="middle" fontSize={markerSize * 1.65} pointerEvents="none">{room.name}</text>
        {active && mode === 'select' && room.polygon.map((point, vertex) => <circle key={vertex} cx={point.x} cy={point.y} r={markerSize * .6}
          className="vertex" fill="#fffefa" stroke="#224e40" strokeWidth={2} vectorEffect="non-scaling-stroke"
          onPointerDown={event => { event.stopPropagation(); event.preventDefault(); drag.current = { room, vertex }; event.currentTarget.setPointerCapture(event.pointerId); }} />)}
      </g>;
    })}
    {draft.length > 0 && <g pointerEvents="none"><polyline points={points(draft)} fill="rgba(34,78,64,.15)" stroke="#224e40" strokeWidth={2} strokeDasharray="7 4" vectorEffect="non-scaling-stroke" />
      {draft.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r={markerSize / 2} fill="#224e40" />)}</g>}
    {calibration.length > 0 && <g pointerEvents="none">
      {calibration.length === 2 && <line x1={calibration[0].x} y1={calibration[0].y} x2={calibration[1].x} y2={calibration[1].y} stroke="#b36a37" strokeWidth={3} strokeDasharray="8 4" vectorEffect="non-scaling-stroke" />}
      {calibration.map((point, i) => <g key={i}><circle cx={point.x} cy={point.y} r={markerSize * .7} fill="#b36a37" stroke="white" strokeWidth={2} /><text x={point.x + markerSize} y={point.y - markerSize} fontSize={markerSize * 1.5} fill="#9b5324">{i + 1}</text></g>)}
    </g>}
  </svg>;
}
