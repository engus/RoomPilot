import { useRef, useState } from 'react';
import { getOpeningSegment, type OpeningKind, type Point, type Project, type Room, type Zone, validatePolygon } from '@roompilot/domain';
import { ZONE_COLORS } from '../zone-colors';
import { useInterface } from '../i18n';

export type EditorMode = 'select' | 'draw' | 'draw-zone' | 'calibrate';
export const ROOM_COLORS = ['#98b8a1', '#e8bb7d', '#b5bed7', '#d4b5b0', '#b7c9c5', '#d4c993'];
type Props = {
  project: Project; selectedId: string | null; mode: EditorMode; draft: Point[]; calibrationPoints: Point[];
  onSelect: (id: string) => void; onPoint: (point: Point) => void;
  onEdit: (room: Room) => void; onError: (message: string) => void;
  placementKind?: OpeningKind | null; onWallClick?: (roomId: string, edgeIndex: number, positionT: number) => void;
  selectedOpeningId?: string | null; onOpeningSelect?: (id: string) => void;
  selectedZoneId?: string | null; onZoneSelect?: (id: string) => void; onZoneEdit?: (zone: Zone) => void;
};

export default function PlanCanvas({ project, selectedId, mode, draft, calibrationPoints, onSelect, onPoint, onEdit, onError,
  placementKind = null, onWallClick, selectedOpeningId = null, onOpeningSelect, selectedZoneId = null, onZoneSelect, onZoneEdit }: Props) {
  const { t, theme } = useInterface();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ room: Room; vertex: number } | null>(null);
  const [draggedRoom, setDraggedRoom] = useState<Room | null>(null);
  const zoneDrag = useRef<{ zone: Zone; vertex: number } | null>(null);
  const [draggedZone, setDraggedZone] = useState<Zone | null>(null);
  const toPoint = (event: { clientX: number; clientY: number }): Point => {
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
    if (draggedZone) {
      if (validatePolygon(draggedZone.polygon)) onZoneEdit?.(draggedZone);
      else onError(t('invalidZone'));
    }
    drag.current = null; setDraggedRoom(null);
    zoneDrag.current = null; setDraggedZone(null);
  };
  const points = (items: Point[]) => items.map(point => `${point.x},${point.y}`).join(' ');
  const markerSize = Math.max(project.source.width, project.source.height) / 115;
  const calibration = calibrationPoints.length ? calibrationPoints : project.calibration?.points ?? [];
  const activeRoom = draggedRoom ?? project.rooms.find(room => room.id === selectedId);
  const activeZone = draggedZone ?? project.zones.find(zone => zone.id === selectedZoneId);
  const displayedProject = draggedRoom ? { ...project, rooms: project.rooms.map(room => room.id === draggedRoom.id ? draggedRoom : room) } : project;
  const placing = mode === 'select' && placementKind !== null;
  return <svg ref={svgRef} className={`plan-svg mode-${mode}`} data-testid="plan-canvas" aria-label={t('planCanvas')} role="img"
    viewBox={`0 0 ${project.source.width} ${project.source.height}`}
    onPointerDown={event => { if (mode !== 'select') { event.preventDefault(); onPoint(toPoint(event)); } }}
    onPointerMove={event => { if (drag.current) { const polygon = [...drag.current.room.polygon]; polygon[drag.current.vertex] = toPoint(event); setDraggedRoom({ ...drag.current.room, polygon }); } if (zoneDrag.current) { const polygon = [...zoneDrag.current.zone.polygon]; polygon[zoneDrag.current.vertex] = toPoint(event); setDraggedZone({ ...zoneDrag.current.zone, polygon }); } }}
    onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; setDraggedRoom(null); zoneDrag.current = null; setDraggedZone(null); }}>
    <image href={project.source.dataUrl} width={project.source.width} height={project.source.height} />
    {project.rooms.map((saved, index) => {
      const room = draggedRoom?.id === saved.id ? draggedRoom : saved;
      const active = room.id === selectedId;
      const center = room.polygon.reduce((sum, point) => ({ x: sum.x + point.x / room.polygon.length, y: sum.y + point.y / room.polygon.length }), { x: 0, y: 0 });
      return <g key={room.id}>
        <polygon points={points(room.polygon)} fill={ROOM_COLORS[index % ROOM_COLORS.length]} fillOpacity={active ? .42 : .22}
          stroke={active ? '#224e40' : '#61756b'} strokeWidth={active ? 3 : 1.5} vectorEffect="non-scaling-stroke"
          role="button" tabIndex={0} aria-label={t('selectRoom', { name: room.name })}
          onClick={() => { if (mode === 'select' && !placing) onSelect(room.id); }}
          onKeyDown={event => { if (mode === 'select' && !placing && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(room.id); } }} />
        {!project.zones.some(zone => zone.roomId === room.id) && <text className="room-label" x={center.x} y={center.y} textAnchor="middle" fontSize={markerSize * 1.65} pointerEvents="none">{room.name}</text>}
      </g>;
    })}
    {project.zones.map((saved, index) => {
      const zone = draggedZone?.id === saved.id ? draggedZone : saved;
      const center = zone.polygon.reduce((sum, point) => ({ x: sum.x + point.x / zone.polygon.length, y: sum.y + point.y / zone.polygon.length }), { x: 0, y: 0 });
      return <g key={zone.id}>
        <polygon data-testid="zone-shape" data-zone-id={zone.id} points={points(zone.polygon)} fill={ZONE_COLORS[index % ZONE_COLORS.length]} fillOpacity={selectedZoneId === zone.id ? .6 : .35}
          stroke={selectedZoneId === zone.id ? '#d48332' : '#647c87'} strokeWidth={selectedZoneId === zone.id ? 2.5 : 1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke"
          role="button" tabIndex={mode === 'select' && !placing ? 0 : -1} aria-label={t('zoneOnPlan', { name: zone.name })}
          pointerEvents={mode === 'select' && !placing ? 'auto' : 'none'}
          onClick={event => { if (mode === 'select' && !placing) { event.stopPropagation(); onZoneSelect?.(zone.id); } }}
          onKeyDown={event => { if (mode === 'select' && !placing && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); onZoneSelect?.(zone.id); } }} />
        <text className="room-label" x={center.x} y={center.y} textAnchor="middle" fontSize={markerSize * 1.5} pointerEvents="none">{zone.name}</text>
      </g>;
    })}
    {placing && project.calibration && activeRoom && onWallClick && <g>
      {activeRoom.polygon.map((a, edgeIndex) => {
        const b = activeRoom.polygon[(edgeIndex + 1) % activeRoom.polygon.length];
        return <line key={edgeIndex} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18}
          vectorEffect="non-scaling-stroke" pointerEvents="stroke" style={{ cursor: 'crosshair' }}
          data-testid="opening-wall-hit" data-room-id={activeRoom.id} data-edge-index={edgeIndex}
          onPointerDown={event => { event.stopPropagation(); event.preventDefault(); }}
          onClick={event => {
            event.stopPropagation(); event.preventDefault();
            const point = toPoint(event), dx = b.x - a.x, dy = b.y - a.y;
            const position = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
            onWallClick(activeRoom.id, edgeIndex, position);
          }} />;
      })}
    </g>}
    {project.openings.map((opening, index) => {
      const [a, b] = getOpeningSegment(displayedProject, opening.spans[0]);
      const width = Math.hypot(b.x - a.x, b.y - a.y);
      const selected = selectedOpeningId === opening.id;
      const label = t(opening.kind === 'door' ? 'openingDoor' : opening.kind === 'window' ? 'openingWindow' : 'openingPassage');
      const room = displayedProject.rooms.find(room => room.id === opening.spans[0].roomId)!;
      const winding = Math.sign(room.polygon.reduce((area, point, pointIndex) => {
        const next = room.polygon[(pointIndex + 1) % room.polygon.length];
        return area + point.x * next.y - next.x * point.y;
      }, 0));
      const color = selected ? '#d77b24' : opening.kind === 'window' ? '#267eac' : opening.kind === 'passage' ? '#7e5ca3' : '#705137';
      return <g key={opening.id} data-testid="opening-symbol" data-opening-id={opening.id} data-opening-kind={opening.kind}
        role="button" tabIndex={mode === 'select' && !placing && onOpeningSelect ? 0 : -1} aria-label={`${label} ${index + 1}`}
        pointerEvents={mode === 'select' && !placing ? 'auto' : 'none'}
        onPointerDown={event => { if (mode === 'select') event.stopPropagation(); }}
        onClick={event => { if (mode === 'select' && !placing) { event.stopPropagation(); onOpeningSelect?.(opening.id); } }}
        onKeyDown={event => { if (mode === 'select' && !placing && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); onOpeningSelect?.(opening.id); } }}>
        <title>{label} {index + 1}</title>
        <g transform={`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI})`}>
          <line x1={0} y1={0} x2={width} y2={0} stroke={theme === 'dark' ? '#1b2621' : '#fffefa'} strokeWidth={selected ? 11 : 8} vectorEffect="non-scaling-stroke" />
          {opening.kind === 'window' ? <g stroke={color} strokeWidth={selected ? 3 : 2} vectorEffect="non-scaling-stroke">
            <line x1={0} y1={-markerSize * .3} x2={width} y2={-markerSize * .3} vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={markerSize * .3} x2={width} y2={markerSize * .3} vectorEffect="non-scaling-stroke" />
          </g> : opening.kind === 'door' ? <g transform={`scale(1 ${winding})`} stroke={color} fill="none" strokeWidth={selected ? 3 : 2}>
            <line x1={0} y1={0} x2={0} y2={width} vectorEffect="non-scaling-stroke" />
            <path d={`M ${width} 0 A ${width} ${width} 0 0 1 0 ${width}`} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          </g> : <line x1={0} y1={0} x2={width} y2={0} stroke={color} strokeWidth={selected ? 4 : 3} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          <line x1={0} y1={-markerSize * .6} x2={0} y2={markerSize * .6} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1={width} y1={-markerSize * .6} x2={width} y2={markerSize * .6} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={0} x2={width} y2={0} stroke="transparent" strokeWidth={18} vectorEffect="non-scaling-stroke" />
        </g>
      </g>;
    })}
    {activeRoom && !activeZone && mode === 'select' && !placing && activeRoom.polygon.map((point, vertex) => <circle key={vertex} cx={point.x} cy={point.y} r={markerSize * .6}
      className="vertex" fill="#fffefa" stroke="#224e40" strokeWidth={2} vectorEffect="non-scaling-stroke"
      onPointerDown={event => { event.stopPropagation(); event.preventDefault(); drag.current = { room: activeRoom, vertex }; event.currentTarget.setPointerCapture(event.pointerId); }} />)}
    {activeZone && mode === 'select' && !placing && activeZone.polygon.map((point, vertex) => <circle key={`zone-${vertex}`} cx={point.x} cy={point.y} r={markerSize * .65}
      className="vertex" fill="#fffefa" stroke="#d48332" strokeWidth={2} vectorEffect="non-scaling-stroke"
      onPointerDown={event => { event.stopPropagation(); event.preventDefault(); zoneDrag.current = { zone: activeZone, vertex }; event.currentTarget.setPointerCapture(event.pointerId); }} />)}
    {draft.length > 0 && <g pointerEvents="none"><polyline points={points(draft)} fill="rgba(34,78,64,.15)" stroke="#224e40" strokeWidth={2} strokeDasharray="7 4" vectorEffect="non-scaling-stroke" />
      {draft.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r={markerSize / 2} fill="#224e40" />)}</g>}
    {calibration.length > 0 && <g pointerEvents="none">
      {calibration.length === 2 && <line x1={calibration[0].x} y1={calibration[0].y} x2={calibration[1].x} y2={calibration[1].y} stroke="#b36a37" strokeWidth={3} strokeDasharray="8 4" vectorEffect="non-scaling-stroke" />}
      {calibration.map((point, i) => <g key={i}><circle cx={point.x} cy={point.y} r={markerSize * .7} fill="#b36a37" stroke="white" strokeWidth={2} /><text x={point.x + markerSize} y={point.y - markerSize} fontSize={markerSize * 1.5} fill="#9b5324">{i + 1}</text></g>)}
    </g>}
  </svg>;
}
