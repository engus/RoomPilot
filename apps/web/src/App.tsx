import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Box, Check, ChevronRight, CircleHelp, FileImage, Layers2, LoaderCircle, Maximize2, MousePointer2, Plus, Ruler, ScanLine, ShieldCheck, Sparkles, SquareDashed, Trash2, Upload, X } from 'lucide-react';
import { calibrateProject, createProject, findRoomOverlaps, getComputedArea, getZoneArea, isReadyFor3D, placeOpening, removeRoom, ProjectSchema, validatePolygon, type OpeningKind, type Point, type Project, type Room, type Zone } from '@roompilot/domain';
import PlanCanvas, { ROOM_COLORS, type EditorMode } from './components/PlanCanvas';
import OpeningEditor from './components/OpeningEditor';
import ZoneEditor from './components/ZoneEditor';
import { ZONE_COLORS } from './zone-colors';
import { createDemo } from './demo';
import { readImage, recognize, recognizeOpenings, verifyImportedSource, PROVIDER_IDS, PROVIDER_NAMES, type ProviderId, type ProviderStatus, type ProviderHealth } from './api';
import { MAX_PROJECT_BYTES, parseProjectText, updateCeiling } from './editor';
import { useInterface } from './i18n';
import { ApiError } from './api';
import type { TranslationKey } from './translations';

const RoomScene = lazy(() => import('./components/RoomScene'));
function SceneError() { const { t } = useInterface(); return <div className="empty-scene"><Box size={40} /><h3>{t('noWebGL')}</h3><p>{t('noWebGLHint')}</p></div>; }
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <SceneError /> : this.props.children; }
}

export default function App() {
  const { t, language, setLanguage, themePreference, setThemePreference } = useInterface();
  const area = (value: number | null) => value === null ? t('unknown') : `${value.toLocaleString(language, { maximumFractionDigits: 2 })} ${language === 'ru' ? 'м²' : 'm²'}`;
  const [project, setProjectState] = useState<Project | null>(null);
  const revision = useRef(0);
  const setProject = (next: Project | null | ((current: Project | null) => Project | null)) => {
    revision.current += 1;
    setProjectState(next);
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('select');
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [draft, setDraft] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [knownLength, setKnownLength] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [message, setMessage] = useState<{ key: TranslationKey; error: boolean } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [provider, setProvider] = useState<ProviderId>('openai');
  const selectedProvider = providers?.find(item => item.id === provider);
  const recognitionConfigured = Boolean(selectedProvider?.configured);
  const [isDemo, setIsDemo] = useState(false);
  const [placementKind, setPlacementKind] = useState<OpeningKind | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), jsonInput = useRef<HTMLInputElement>(null);
  const canvasColumn = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const busyOperation = useRef(0);
  useEffect(() => {
    let active = true;
    void fetch('/api/health').then(response => { if (!response.ok) throw new Error('Health unavailable'); return response.json(); }).then((data: ProviderHealth) => {
      if (!active) return;
      setProviders(Array.isArray(data.providers) ? data.providers.filter(item => PROVIDER_IDS.includes(item.id)) : []);
      if (PROVIDER_IDS.includes(data.defaultProvider)) setProvider(data.defaultProvider);
    }).catch(() => { if (active) setProviders([]); });
    return () => { active = false; };
  }, []);
  const notify = (key: TranslationKey, error = false) => setMessage({ key, error });
  const selected = project?.rooms.find(room => room.id === selectedId) ?? null;
  const overlaps = useMemo(() => findRoomOverlaps(project?.rooms ?? []), [project?.rooms]);
  const ready = project ? isReadyFor3D(project) : false;
  const missing = project ? [!project.rooms.length && t('missingRooms'), !project.calibration && t('missingScale'), (!project.ceilingHeightM || !project.ceilingHeightConfirmed) && t('missingHeight')].filter(Boolean) : [];
  const replace = (next: Project, demo = false) => {
    generation.current += 1;
    setProject(next); setSelectedId(next.rooms[0]?.id ?? null); setMode('select'); setView('2d'); setDraft([]); setCalibrationPoints([]);
    setKnownLength(''); setHeightInput(next.ceilingHeightM?.toString() ?? ''); setWarnings([]); setIsDemo(demo);
    setPlacementKind(null); setSelectedOpeningId(null); setSelectedZoneId(null);
  };
  const changeRoom = (room: Room) => {
    if (!project) return;
    const next = ProjectSchema.safeParse({ ...project, rooms: project.rooms.map(item => item.id === room.id ? room : item) });
    if (next.success) setProject(next.data);
    else notify(project.zones.some(zone => zone.roomId === room.id) ? 'roomZonesConflict' : 'invalidVertex', true);
  };
  const cancelMode = () => { setMode('select'); setDraft([]); setCalibrationPoints([]); setPlacementKind(null); };
  const selectRoom = (id: string) => { cancelMode(); setSelectedId(id); setSelectedZoneId(null); };
  const selectZone = (id: string) => { const zone = project?.zones.find(zone => zone.id === id); if (zone) { cancelMode(); setSelectedId(zone.roomId); setSelectedZoneId(id); setSelectedOpeningId(null); } };
  const changeZone = (zone: Zone) => {
    if (!project) return;
    const next = ProjectSchema.safeParse({ ...project, zones: project.zones.map(item => item.id === zone.id ? zone : item) });
    if (next.success) { setProject(next.data); notify('zoneUpdated'); } else notify('invalidZone', true);
  };
  const beginOpening = (kind: OpeningKind | null) => { cancelMode(); setSelectedZoneId(null); setView('2d'); setPlacementKind(kind); if (kind) canvasColumn.current?.scrollIntoView({ block: 'center' }); };
  const beginZone = () => { cancelMode(); setView('2d'); setSelectedZoneId(null); setSelectedOpeningId(null); setMode('draw-zone'); canvasColumn.current?.scrollIntoView({ block: 'center' }); };
  function addOpening(roomId: string, edgeIndex: number, position: number) {
    if (!project || !placementKind || busy || roomId !== selectedId) return;
    try {
      const opening = placeOpening(project, roomId, edgeIndex, position, placementKind);
      setProject({ ...project, openings: [...project.openings, opening] });
      setSelectedOpeningId(opening.id); setPlacementKind(null); notify('openingAdded');
    } catch { notify('invalidOpening', true); }
  }
  const openDemo = () => { replace(createDemo(language), true); notify('demoOpened'); };

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const token = ++generation.current; const operation = ++busyOperation.current; setBusy(true);
    try {
      const source = await readImage(file);
      if (generation.current !== token) return;
      const next = createProject(source, { rooms: [], ceilingHeightM: null, warnings: [] });
      next.name = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || t('myApartment');
      replace(next); notify('planUploaded');
    } catch (error) { if (generation.current === token) notify(error instanceof ApiError ? error.key : 'planLoadFailed', true); }
    finally { if (busyOperation.current === operation) setBusy(false); }
  }
  async function runRecognition(openingsOnly = false) {
    if (!project || busy) return;
    const token = generation.current; const startedAtRevision = revision.current;
    const operation = ++busyOperation.current; setBusy(true); setMessage(null);
    try {
      const result = await (async () => {
        if (openingsOnly) return recognizeOpenings(project);
        const blob = await (await fetch(project.source.dataUrl)).blob();
        const mime = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        return recognize(new File([blob], mime === 'image/jpeg' ? 'plan.jpeg' : 'plan.png', { type: mime }), provider);
      })();
      if (generation.current !== token) return;
      if (revision.current !== startedAtRevision) { notify('recognitionStale'); return; }
      if (openingsOnly) {
        setProject(result.project); cancelMode(); setSelectedOpeningId(null);
      } else replace({ ...result.project, name: project.name });
      setWarnings(result.warnings); notify(openingsOnly ? 'openingRecognitionDone' : 'recognitionDone');
    } catch (error) { if (generation.current === token) notify(error instanceof ApiError ? error.key : 'recognitionFailed', true); }
    finally { if (busyOperation.current === operation) setBusy(false); }
  }
  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const token = ++generation.current; const operation = ++busyOperation.current; setBusy(true);
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error('Project exceeds 20 MiB.');
      const next = parseProjectText(await file.text());
      await verifyImportedSource(next.source);
      if (generation.current !== token) return;
      replace(next); notify('projectImported');
    } catch { if (generation.current === token) notify('importFailed', true); }
    finally { if (busyOperation.current === operation) setBusy(false); }
  }
  function exportProject() {
    if (!project) return;
    const parsed = ProjectSchema.safeParse(project);
    if (!parsed.success) { notify('correctBeforeExport', true); return; }
    const blob = new Blob([JSON.stringify(parsed.data, null, 2)], { type: 'application/json' });
    if (blob.size > MAX_PROJECT_BYTES) { notify('projectTooLarge', true); return; }
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'my-home.roompilot.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('projectExported');
  }
  function addPoint(point: Point) {
    if (mode === 'draw' || mode === 'draw-zone') setDraft(current => current.length < 100 ? [...current, point] : current);
    if (mode === 'calibrate') setCalibrationPoints(current => current.length >= 2 ? [point] : [...current, point]);
  }
  function finishRoom() {
    if (!project || !validatePolygon(draft)) { notify('invalidPolygon', true); return; }
    if (project.rooms.length >= 100) { notify('tooManyRooms', true); return; }
    const room: Room = { id: crypto.randomUUID(), name: t('roomNumber', { number: project.rooms.length + 1 }), polygon: draft, reportedAreaM2: null };
    setProject({ ...project, rooms: [...project.rooms, room] }); setSelectedId(room.id); cancelMode(); notify('roomAdded');
  }
  function finishZone() {
    if (!project || !selectedId) return;
    const zone: Zone = { id: crypto.randomUUID(), roomId: selectedId, name: t('zoneNumber', { number: project.zones.length + 1 }), polygon: draft };
    const next = ProjectSchema.safeParse({ ...project, zones: [...project.zones, zone] });
    if (!next.success) { notify('invalidZone', true); return; }
    setProject(next.data); cancelMode(); setSelectedZoneId(zone.id); notify('zoneAdded');
  }
  function confirmScale() {
    if (!project || calibrationPoints.length !== 2) return;
    try { setProject(calibrateProject(project, [calibrationPoints[0], calibrationPoints[1]], Number(knownLength))); cancelMode(); notify('scaleSet'); }
    catch { notify('invalidScale', true); }
  }
  function confirmHeight() {
    if (!project) return; const value = Number(heightInput);
    if (!heightInput.trim() || !Number.isFinite(value) || value < 1.5 || value > 10) { notify('invalidHeight', true); return; }
    const next = ProjectSchema.safeParse({ ...project, ceilingHeightM: value, ceilingHeightConfirmed: true });
    if (!next.success) { notify('openingHeightConflict', true); return; }
    setProject(next.data); notify('heightSet');
  }
  const computed = selected && project ? getComputedArea(selected, project) : null;
  const difference = selected?.reportedAreaM2 && computed !== null ? Math.abs(computed - selected.reportedAreaM2) / selected.reportedAreaM2 > .15 : false;

  return <div className="app-shell">
    <input className="visually-hidden" ref={fileInput} type="file" accept="image/png,image/jpeg" aria-label={t('planFile')} onChange={event => void upload(event)} />
    <input className="visually-hidden" ref={jsonInput} type="file" accept="application/json,.json" aria-label={t('projectFile')} onChange={event => void importProject(event)} />
    <header className="app-header">
      <a className="brand" href="#" onClick={event => event.preventDefault()} aria-label="RoomPilot"><span className="brand-mark"><Layers2 size={23} strokeWidth={1.6} /></span><span>room<span className="brand-light">pilot</span><small>{t('brandTagline')}</small></span></a>
      <span className="workspace-label">{t('studio')} <span className="version-pill">MVP 01</span></span>
      <div className="interface-preferences"><label className="visually-hidden" htmlFor="language-select">{t('language')}</label><select id="language-select" data-testid="language-select" value={language} onChange={event => setLanguage(event.target.value === 'ru' ? 'ru' : 'en')}><option value="en">EN</option><option value="ru">RU</option></select><label className="visually-hidden" htmlFor="theme-select">{t('theme')}</label><select id="theme-select" data-testid="theme-select" value={themePreference} onChange={event => setThemePreference(event.target.value === 'dark' ? 'dark' : event.target.value === 'light' ? 'light' : 'system')}><option value="light">{t('light')}</option><option value="dark">{t('dark')}</option><option value="system">{t('system')}</option></select></div><div className="header-actions"><button className="button ghost" disabled={busy} onClick={() => jsonInput.current?.click()}><ArrowUpFromLine size={16} />{t('importProject')}</button><button className="button outline" disabled={!project || busy} onClick={exportProject}><ArrowDownToLine size={16} />{t('exportProject')}</button></div>
    </header>
    <main>
      <section className="page-heading"><div><div className="eyebrow"><span className="tiny-line" />{t('eyebrow')}</div><h1>{project ? project.name : t('startHome')}<span className="heading-dot">.</span></h1><p>{project ? t('reviewIntroduction') : t('introduction')}</p></div>
        <div className="heading-actions"><button className="button outline" onClick={openDemo} disabled={busy}><Sparkles size={16} />{t('openDemo')}</button><button className="button primary" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{t('uploadPlan')}</button></div>
      </section>
      {message && <div className={`notice ${message.error ? 'notice-error' : ''}`} role={message.error ? 'alert' : 'status'}><span>{t(message.key)}</span><button aria-label={t('closeMessage')} onClick={() => setMessage(null)}><X size={16} /></button></div>}
      {warnings.length > 0 && <div className="notice notice-warning"><span>{warnings.join(' · ')}</span></div>}
      {overlaps.length > 0 && <div className="notice notice-warning" role="status" data-testid="room-overlap-warning"><span>{t('roomOverlapWarning', { count: overlaps.length })} {overlaps.slice(0, 5).map(pair => pair.map(id => { const index = project!.rooms.findIndex(room => room.id === id); return `#${index + 1} «${project!.rooms[index].name}»`; }).join(' / ')).join(' · ')}{overlaps.length > 5 ? ' …' : ''}</span></div>}
      <section className="editor-workspace" aria-label={t('editor')}>
        <aside className="room-sidebar"><div className="panel-heading"><h2>{t('rooms')}</h2><span className="count-badge">{project?.rooms.length ?? 0}</span></div>
          <p className="panel-description">{t('roomsDescription')}</p>
          <div className="room-list">{project?.rooms.map((room, i) => <div key={room.id}><button className={`room-item ${selectedId === room.id ? 'selected' : ''}`} onClick={() => selectRoom(room.id)}><span className="room-swatch" style={{ background: ROOM_COLORS[i % ROOM_COLORS.length] }}>{String(i + 1).padStart(2, '0')}</span><span><strong>{room.name}</strong><small>{room.reportedAreaM2 === null ? t('reportedUnknown') : t('areaFromPlan', { area: area(room.reportedAreaM2) })}</small></span><ChevronRight size={14} /></button><div className="zone-list">{project.zones.filter(zone => zone.roomId === room.id).map(zone => <button key={zone.id} aria-label={t('selectZone', { name: zone.name })} className={selectedZoneId === zone.id ? 'selected' : ''} onClick={() => selectZone(zone.id)}><span className="zone-dot" style={{ background: ZONE_COLORS[project.zones.indexOf(zone) % ZONE_COLORS.length] }} /><span>{zone.name}<small>{area(getZoneArea(zone, project))}</small></span></button>)}</div></div>)}</div>
          {!project?.rooms.length && <div className="sidebar-empty"><SquareDashed size={28} strokeWidth={1.3} /><p>{project ? t('roomsManualHint') : t('roomsUploadHint')}</p></div>}
          <button className="button add-room" disabled={!project || busy || view === '3d'} onClick={() => { cancelMode(); setSelectedZoneId(null); setMode('draw'); }}><Plus size={17} />{t('addRoom')}</button>
          <div className="sidebar-bottom"><div className="status-heading"><ShieldCheck size={16} /><span>{t('localProject')}</span></div><p>{t('noAutosave')}</p></div>
        </aside>
        <div className="canvas-column" ref={canvasColumn}><div className="canvas-toolbar"><div className="segmented" aria-label={t('viewingMode')}><button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}><SquareDashed size={15} />2D</button><button className={view === '3d' ? 'active' : ''} disabled={!ready} title={missing.join(' · ')} onClick={() => { cancelMode(); setView('3d'); }}><Box size={15} />3D</button></div><span className="canvas-file">{project ? <><FileImage size={14} />{project.source.width} × {project.source.height} px</> : t('workspace')}</span><span className="toolbar-badge">{isDemo ? t('demo') : project ? t('draft') : t('newProject')}</span></div>
          <div className="canvas-area">
            {!project ? <div className="empty-canvas"><div className="empty-illustration"><div className="plan-paper"><div className="paper-room room-one" /><div className="paper-room room-two" /><div className="paper-room room-three" /><div className="paper-door" /><span className="paper-cross">+</span></div><span className="illustration-badge"><Layers2 size={23} strokeWidth={1.5} /></span></div><span className="eyebrow">{t('cleanSlate')}</span><h2>{t('giveVolume')}</h2><p>{t('emptyPlanHint')}</p><button className="button primary" onClick={() => fileInput.current?.click()} disabled={busy}><Plus size={17} />{t('selectImage')}</button><span className="file-hint">{t('fileHint')}</span><button className="text-button" onClick={openDemo} disabled={busy}>{t('exploreDemo')} <ChevronRight size={14} /></button></div> : view === '2d' ? <PlanCanvas project={project} selectedId={selectedId} mode={mode} draft={draft} calibrationPoints={calibrationPoints} onSelect={selectRoom} onPoint={addPoint} onEdit={changeRoom} onError={() => notify(selectedZoneId ? 'invalidZone' : 'invalidVertex', true)} placementKind={placementKind} onWallClick={addOpening} selectedOpeningId={selectedOpeningId} onOpeningSelect={id => { setSelectedZoneId(null); setSelectedOpeningId(id); }} selectedZoneId={selectedZoneId} onZoneSelect={selectZone} onZoneEdit={changeZone} /> : <SceneBoundary key={project.id}><Suspense fallback={<div className="loading-scene"><LoaderCircle className="spin" />{t('loading3D')}</div>}><RoomScene project={project} selectedId={selectedId} onSelect={selectRoom} selectedZoneId={selectedZoneId} onZoneSelect={selectZone} /></Suspense></SceneBoundary>}
            {project && view === '2d' && <div className="canvas-corner"><span><span className="green-dot" />{project.calibration ? t('pixelScale', { value: project.calibration.metresPerPixel.toLocaleString(language, { maximumFractionDigits: 4 }) }) : t('scaleMissing')}</span><Maximize2 size={15} /></div>}
          </div>
          <div className={`canvas-instructions ${mode !== 'select' ? 'instruction-active' : ''}`}>
            {placementKind ? <><MousePointer2 size={15} /><span>{t('openingPlacementHint')}</span></> : mode === 'draw-zone' ? <><Plus size={16} /><span>{t('zoneDrawInstruction', { count: draft.length })}</span><button className="text-button" disabled={draft.length < 3} onClick={finishZone}>{t('finishZone')}</button><button className="icon-button" aria-label={t('cancelZoneDrawing')} onClick={cancelMode}><X size={16} /></button></> : mode === 'draw' ? <><Plus size={16} /><span>{t('drawInstruction', { count: draft.length })}</span><button className="text-button" disabled={draft.length < 3} onClick={finishRoom}>{t('finishRoom')}</button><button className="icon-button" aria-label={t('cancelDrawing')} onClick={cancelMode}><X size={16} /></button></> : mode === 'calibrate' ? <><Ruler size={16} /><span>{t('calibrationInstruction', { count: calibrationPoints.length })}</span><button className="icon-button" aria-label={t('cancelCalibration')} onClick={cancelMode}><X size={16} /></button></> : <><MousePointer2 size={15} /><span>{view === '3d' ? t('sceneSelectInstruction') : project ? t('planSelectInstruction') : t('localImageHint')}</span></>}
          </div>
        </div>
        <aside className="properties-sidebar"><div className="panel-heading"><h2>{t('parameters')}</h2><CircleHelp size={17} /></div>
          <section className="property-section"><div className="section-label"><span>01</span><h3>{t('planScale')}</h3>{project?.calibration && <Check size={16} className="confirmed-icon" />}</div><p>{project?.calibration ? t('segmentLength', { value: project.calibration.lengthM }) : t('scaleHint')}</p><button className="button outline full" disabled={!project || busy} onClick={() => { cancelMode(); setView('2d'); setMode('calibrate'); }}><Ruler size={16} />{t('setScale')}</button>
            {mode === 'calibrate' && <div className="inline-form"><label htmlFor="known-length">{t('knownLength')}</label><input id="known-length" type="number" min="0.01" max="10000" step="any" placeholder={t('lengthExample')} value={knownLength} onChange={event => setKnownLength(event.target.value)} /><button className="button primary full" disabled={calibrationPoints.length !== 2} onClick={confirmScale}>{t('confirmScale')}</button></div>}
            {project?.calibration && <button className="text-button muted small" onClick={() => { setProject({ ...project, calibration: null }); setView('2d'); cancelMode(); }}>{t('resetScale')}</button>}
          </section>
          <section className="property-section"><div className="section-label"><span>02</span><h3>{t('ceilingHeight')}</h3>{project?.ceilingHeightConfirmed && <Check size={16} className="confirmed-icon" />}</div><p>{project?.ceilingHeightM === null || !project ? t('ceilingUnknown') : project.ceilingHeightConfirmed ? t('heightConfirmed') : t('heightReview')}</p><label className="visually-hidden" htmlFor="ceiling-height">{t('ceilingHeightLabel')}</label><div className="input-with-unit"><input id="ceiling-height" type="number" min="1.5" max="10" step="0.01" value={heightInput} placeholder={t('unknown')} disabled={!project} onChange={event => { const value = event.target.value; setHeightInput(value); setView('2d'); if (project) { const number = Number(value); const fits = project.openings.every(opening => opening.sillHeightM + opening.heightM <= number + 1e-8); setProject(updateCeiling(project, Number.isFinite(number) && number >= 1.5 && number <= 10 && fits ? value : '')); } }} /><span>{language === 'ru' ? 'м' : 'm'}</span></div><button className="button outline full" disabled={!project || !heightInput} onClick={confirmHeight}>{project?.ceilingHeightConfirmed ? <Check size={15} /> : null}{t('confirmHeight')}</button></section>
          <section className="property-section room-properties"><div className="section-label"><span>03</span><h3>{selected ? t('selectedRoom') : t('roomProperties')}</h3></div>
            {selected ? <div className="inline-form"><label htmlFor="room-name">{t('roomName')}</label><input key={`${project!.id}-${selected.id}`} id="room-name" maxLength={120} defaultValue={selected.name} onChange={event => { if (event.target.value.trim()) changeRoom({ ...selected, name: event.target.value }); }} onBlur={event => { const name = event.target.value.trim(); event.target.value = name || selected.name; if (name) changeRoom({ ...selected, name }); }} /><label htmlFor="reported-area">{t('reportedArea')}</label><input id="reported-area" type="number" min="0.01" max="100000" step="any" placeholder={t('unknown')} value={selected.reportedAreaM2 ?? ''} onChange={event => { const value = event.target.value; const numeric = Number(value); if (value === '' || (numeric > 0 && numeric <= 100_000)) changeRoom({ ...selected, reportedAreaM2: value === '' ? null : numeric }); }} /><div className="computed-area"><span>{t('computedArea')}</span><strong>{area(computed)}</strong></div>{difference && <p className="area-warning">{t('areaDifference')}</p>}<button className="text-button danger small" onClick={() => { if (project) { setProject(removeRoom(project, selected.id)); setSelectedZoneId(null); setSelectedId(project.rooms.find(room => room.id !== selected.id)?.id ?? null); if (project.rooms.length === 1) setView('2d'); } }}><Trash2 size={14} />{t('removeRoom')}</button></div> : <p>{t('selectRoomHint')}</p>}
          </section>
        </aside>
      </section>
      {project && <ZoneEditor project={project} roomId={selectedId} selectedZoneId={selectedZoneId} disabled={busy} onAdd={beginZone} onEdit={changeZone} onDelete={id => { setProject({ ...project, zones: project.zones.filter(zone => zone.id !== id) }); setSelectedZoneId(null); notify('zoneUpdated'); }} />}
      {project && <OpeningEditor project={project} selectedRoomId={selectedId} selectedOpeningId={selectedOpeningId} placementKind={placementKind} disabled={busy} onSelect={setSelectedOpeningId} onPlacement={beginOpening} onChange={next => { setProject(next); notify('openingUpdated'); }} onError={() => notify('invalidOpening', true)} />}
      <section className="below-workspace">
        <div className="recognition-card">
          <span className="recognition-icon"><ScanLine size={24} strokeWidth={1.4} /></span>
          <div className="recognition-content">
            <h3>{t('recognitionHelp')}</h3>
            <div className="provider-controls">
              <label htmlFor="ai-provider">{t('aiProvider')}</label>
              <select id="ai-provider" value={provider} disabled={busy || providers === null} onChange={event => { if (PROVIDER_IDS.includes(event.target.value as ProviderId)) { setProvider(event.target.value as ProviderId); setMessage(null); } }}>
                {PROVIDER_IDS.map(id => <option key={id} value={id}>{PROVIDER_NAMES[id]}</option>)}
              </select>
              {selectedProvider?.model && <span className="provider-model">{t('providerModel')}: <code>{selectedProvider.model}</code></span>}
            </div>
            <p>{t('selectedProviderDisclosure', { provider: PROVIDER_NAMES[provider] })}</p>
            {provider === 'gemini' && <p className="provider-note">{t('geminiPrivacy')}</p>}
            {provider === 'openrouter' && <p className="provider-note">{t('openrouterPrivacy')}</p>}
            {provider === 'openrouter' && <p className="provider-note">{t('openingRecognitionHint')}</p>}
            <span className={`provider-status ${recognitionConfigured ? 'available' : ''}`}><span className="green-dot" />{providers === null ? t('checkingProvider') : recognitionConfigured ? t('providerConfigOnly') : t('providerUnavailable')}</span>
            {providers !== null && !recognitionConfigured && <p className="provider-note">{t('providerSetupHint')}</p>}
          </div>
          <div className="recognition-actions"><button className="button outline" disabled={!project || busy || !recognitionConfigured} onClick={() => void runRecognition()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{t('recognizePlan')}</button>
          {provider === 'openrouter' && <button className="button outline" disabled={!project?.rooms.length || busy || !recognitionConfigured} onClick={() => void runRecognition(true)}><ScanLine size={16} />{t('recognizeOpenings')}</button>}</div>
        </div>
        <div className="readiness-card"><Box size={21} strokeWidth={1.4} /><div><h3>{ready ? t('ready3D') : t('steps3D')}</h3><p>{project ? ready ? t('open3DHint') : missing.join(' · ') : t('steps3DHint')}</p></div></div>
      </section>
      <footer><span>ROOMPILOT <span className="footer-separator">/</span> {t('footerTagline')}</span><span>{t('previewLimitation')}</span></footer>
    </main>
  </div>;
}
