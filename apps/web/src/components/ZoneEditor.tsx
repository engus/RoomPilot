import { getZoneArea, type Project, type Zone } from '@roompilot/domain';
import { useInterface } from '../i18n';

export default function ZoneEditor({ project, roomId, selectedZoneId, disabled, onAdd, onEdit, onDelete }: {
  project: Project; roomId: string | null; selectedZoneId: string | null; disabled: boolean;
  onAdd: () => void; onEdit: (zone: Zone) => void; onDelete: (id: string) => void;
}) {
  const { t, language } = useInterface();
  const room = project.rooms.find(room => room.id === roomId);
  const zone = project.zones.find(zone => zone.id === selectedZoneId && zone.roomId === roomId);
  const area = zone ? getZoneArea(zone, project) : null;
  return <section className="zone-editor" aria-label={t('zonesTitle')}>
    <div><h3>{t('zonesTitle')} <span className="count-badge">{project.zones.filter(zone => zone.roomId === roomId).length}</span></h3>
      <p>{room ? `${room.name} · ${t('zonesHint')}` : t('zonesSelectRoom')}</p>
      <button className="button outline" disabled={disabled || !room || project.zones.length >= 200} onClick={onAdd}>{t('addZone')}</button>
    </div>
    {zone ? <div className="inline-form"><label htmlFor="zone-name">{t('zoneName')}</label>
      <input id="zone-name" key={zone.id + zone.name} defaultValue={zone.name} disabled={disabled} maxLength={120} onBlur={event => {
        const name = event.target.value.trim(); event.target.value = name || zone.name;
        if (name && name !== zone.name) onEdit({ ...zone, name });
      }} />
      <div className="computed-area"><span>{t('zoneArea')}</span><strong>{area === null ? t('unknown') : `${area.toLocaleString(language, { maximumFractionDigits: 2 })} ${language === 'ru' ? 'м²' : 'm²'}`}</strong></div>
      <button className="text-button danger" disabled={disabled} onClick={() => onDelete(zone.id)}>{t('removeZone')}</button>
    </div> : <p>{t('zoneSelectHint')}</p>}
  </section>;
}
