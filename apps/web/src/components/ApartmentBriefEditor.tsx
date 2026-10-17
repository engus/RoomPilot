import { useState } from 'react';
import { ApartmentBriefOrNullSchema, ApartmentBriefSchema, createApartmentBrief, type ApartmentBrief } from '@roompilot/domain';
import { useInterface } from '../i18n';
import type { TranslationKey } from '../translations';

type Draft = Record<keyof ApartmentBrief, string>;
const toDraft = (brief: ApartmentBrief | null): Draft => Object.fromEntries(Object.entries(brief ?? createApartmentBrief()).map(([key, value]) => [key, value === null ? '' : String(value)])) as Draft;
const numeric = (value: string): number | null => value.trim() === '' ? null : /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
const numericFields = ['livingRooms', 'approximateAreaM2', 'bathrooms', 'kitchens', 'balconies', 'storageRooms'] as const;
type NumericField = typeof numericFields[number];

export default function ApartmentBriefEditor({ value, onChange }: { value: ApartmentBrief | null; onChange: (brief: ApartmentBrief | null, valid: boolean) => void }) {
  const { t } = useInterface();
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));
  const [expanded, setExpanded] = useState(false);
  const [valid, setValid] = useState(true);
  function edit(key: keyof ApartmentBrief, value: string) {
    const next = { ...draft, [key]: value }; setDraft(next);
    const data = { ...next, ...Object.fromEntries(numericFields.map(field => [field, numeric(next[field])])) };
    const parsed = ApartmentBriefOrNullSchema.safeParse(data);
    setValid(parsed.success); onChange(parsed.success ? parsed.data : null, parsed.success);
  }
  const input = (field: NumericField, label: TranslationKey) => <label key={field} htmlFor={`brief-${field}`}>{t(label)}
    <input id={`brief-${field}`} type="text" inputMode={field === 'approximateAreaM2' ? 'decimal' : 'numeric'} maxLength={12} placeholder={t('unknown')} value={draft[field]}
      aria-invalid={!ApartmentBriefSchema.shape[field].safeParse(numeric(draft[field])).success || undefined} onChange={event => edit(field, event.target.value)} />
  </label>;
  return <section className="apartment-brief" aria-label={t('briefTitle')}>
    <div className="brief-heading"><div><h2>{t('briefTitle')}</h2><p>{t('briefHint')}</p></div><button className="text-button" onClick={() => { setDraft(toDraft(null)); setValid(true); onChange(null, true); }}>{t('briefClear')}</button></div>
    <div className="brief-fields">
      {input('livingRooms', 'briefLivingRooms')}{input('approximateAreaM2', 'briefArea')}
      <label htmlFor="brief-balconyArea">{t('briefBalconyArea')}<select aria-label={t('briefBalconyArea')} id="brief-balconyArea" value={draft.balconyArea} onChange={event => edit('balconyArea', event.target.value)}><option value="unknown">{t('unknown')}</option><option value="excluded">{t('briefAreaExcluded')}</option><option value="included">{t('briefAreaIncluded')}</option></select></label>
      {input('bathrooms', 'briefBathrooms')}
      <label htmlFor="brief-bathroomLayout">{t('briefBathroomLayout')}<select aria-label={t('briefBathroomLayout')} id="brief-bathroomLayout" value={draft.bathroomLayout} onChange={event => edit('bathroomLayout', event.target.value)}><option value="unknown">{t('unknown')}</option><option value="combined">{t('briefCombined')}</option><option value="separate">{t('briefSeparate')}</option><option value="mixed">{t('briefMixed')}</option></select></label>
    </div>
    <p>{t('briefCountsHint')}</p>
    <button className="text-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{t('briefExtras')}</button>
    {expanded && <div className="brief-fields brief-extra-fields">{input('kitchens', 'briefKitchens')}{input('balconies', 'briefBalconies')}{input('storageRooms', 'briefStorage')}</div>}
    {!valid && <p className="area-warning" role="alert">{t('briefInvalid')}</p>}
  </section>;
}
