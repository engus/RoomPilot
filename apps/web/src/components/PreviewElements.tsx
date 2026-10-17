import { useInterface } from '../i18n';
import { previewEnabled } from '../scene-preview';
import type { ScenePreview } from '../use-scene-preview';

export default function PreviewElements({ preview }: { preview: ScenePreview }) {
  const { t } = useInterface();
  const last = preview.targets.find(target => target.id === preview.lastId);
  const label = (target: typeof preview.targets[number]) => `${t(target.labelKey)} ${target.ordinal}`;
  const stateLabel = (target: typeof preview.targets[number]) => t(previewEnabled(target, preview.overrides) ? 'previewOn' : 'previewOff');
  return <><details className="scene-preview-elements" data-testid="preview-elements">
    <summary>{t('previewElements')}</summary><small>{t('previewLocalOnly')}</small>
    <div className="preview-element-list">{preview.targets.map(target => <button key={target.id} aria-label={label(target)} aria-pressed={previewEnabled(target, preview.overrides)} onClick={() => preview.toggle(target.id)}>
      <span>{label(target)}</span><span aria-hidden="true">{stateLabel(target)}</span>
    </button>)}</div>
  </details><output className="scene-preview-status" aria-live="polite" data-testid="preview-last-action">{last ? `${label(last)} · ${stateLabel(last)}` : t('previewClickHint')}</output></>;
}
