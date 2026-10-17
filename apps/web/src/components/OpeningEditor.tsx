import { useEffect, useState } from 'react';
import { getOpeningWidthM, ProjectSchema, resizeOpening, type OpeningKind, type Project } from '@roompilot/domain';
import { useInterface } from '../i18n';

type Props = {
  project: Project; selectedRoomId: string | null; selectedOpeningId: string | null;
  placementKind: OpeningKind | null; disabled: boolean;
  onSelect: (id: string | null) => void; onPlacement: (kind: OpeningKind | null) => void;
  onChange: (project: Project) => void; onError: () => void;
};

export default function OpeningEditor({ project, selectedRoomId, selectedOpeningId, placementKind, disabled, onSelect, onPlacement, onChange, onError }: Props) {
  const { t } = useInterface();
  const opening = project.openings.find(item => item.id === selectedOpeningId) ?? null;
  const measuredWidth = opening && project.calibration ? getOpeningWidthM(project, opening) : null;
  const [width, setWidth] = useState(''), [height, setHeight] = useState(''), [sill, setSill] = useState('');
  useEffect(() => {
    setWidth(measuredWidth === null ? '' : String(Number(measuredWidth.toFixed(4))));
    setHeight(opening ? String(opening.heightM) : ''); setSill(opening ? String(opening.sillHeightM) : '');
  }, [opening, measuredWidth]);
  const canPlace = !disabled && !!selectedRoomId && !!project.calibration && project.ceilingHeightM !== null && project.openings.length < 200;
  const kindName = (kind: OpeningKind) => t(kind === 'door' ? 'openingDoor' : kind === 'window' ? 'openingWindow' : 'openingPassage');

  function apply() {
    if (!opening || !project.calibration) return;
    try {
      if (![width, height, sill].every(value => value.trim() && Number.isFinite(Number(value)))) throw new Error('Invalid dimensions');
      const resized = resizeOpening(project, opening.id, Number(width));
      const next = ProjectSchema.parse({ ...resized, openings: resized.openings.map(item => item.id === opening.id ? { ...item, heightM: Number(height), sillHeightM: opening.kind === 'window' ? Number(sill) : 0 } : item) });
      onChange(next);
    } catch { onError(); }
  }

  return <section className="opening-editor" aria-label={t('openingsTitle')}>
    <div className="opening-placement">
      <h3>{t('openingsTitle')} <span className="count-badge">{project.openings.length}</span></h3>
      <p>{placementKind ? t('openingPlacementHint') : t('openingManualHint')}</p>
      <div className="opening-actions">
        <button className={`button outline ${placementKind === 'door' ? 'active' : ''}`} disabled={!canPlace} onClick={() => onPlacement('door')}>{t('addDoor')}</button>
        <button className={`button outline ${placementKind === 'window' ? 'active' : ''}`} disabled={!canPlace} onClick={() => onPlacement('window')}>{t('addWindow')}</button>
        <button className={`button outline ${placementKind === 'passage' ? 'active' : ''}`} disabled={!canPlace} onClick={() => onPlacement('passage')}>{t('addPassage')}</button>
      </div>
      {placementKind && <button className="text-button" onClick={() => onPlacement(null)}>{t('cancelOpeningPlacement')}</button>}
      {(!project.calibration || project.ceilingHeightM === null) && <p>{t('openingPrerequisites')}</p>}
    </div>
    <div className="opening-selection inline-form">
      <label htmlFor="opening-select">{t('openingSelect')}</label>
      <select id="opening-select" value={opening?.id ?? ''} disabled={disabled || !project.openings.length} onChange={event => onSelect(event.target.value || null)}>
        <option value="">{t('chooseOpening')}</option>
        {project.openings.map((item, index) => <option key={item.id} value={item.id}>{kindName(item.kind)} {index + 1}</option>)}
      </select>
      {opening && <><p>{opening.spans.length === 2 ? t('openingTwoFaces') : t('openingOneFace')}</p><button className="text-button danger small" disabled={disabled} onClick={() => { onChange({ ...project, openings: project.openings.filter(item => item.id !== opening.id) }); onSelect(null); }}>{t('removeOpening')}</button></>}
    </div>
    {opening ? <div className="opening-properties inline-form">
      <div className="opening-dimensions">
        <label htmlFor="opening-width">{t('openingWidth')}<input id="opening-width" type="number" min="0.01" step="0.01" value={width} disabled={disabled || !project.calibration} onChange={event => setWidth(event.target.value)} /></label>
        <label htmlFor="opening-height">{t('openingHeight')}<input id="opening-height" type="number" min="0.01" max="10" step="0.01" value={height} disabled={disabled} onChange={event => setHeight(event.target.value)} /></label>
        {opening.kind === 'window' && <label htmlFor="opening-sill">{t('openingSill')}<input id="opening-sill" type="number" min="0" max="10" step="0.01" value={sill} disabled={disabled} onChange={event => setSill(event.target.value)} /></label>}
      </div>
      <button className="button outline" disabled={disabled || !project.calibration} onClick={apply}>{t('applyOpeningDimensions')}</button>
    </div> : <p className="opening-empty">{t('openingSelectHint')}</p>}
  </section>;
}
