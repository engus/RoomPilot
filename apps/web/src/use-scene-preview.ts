import { useMemo, useState } from 'react';
import type { Project } from '@roompilot/domain';
import { getPreviewTargets, previewEnabled, setPreviewLights, togglePreviewTarget, type PreviewOverrides } from './scene-preview';

export function useScenePreview(project: Project | null, documentGeneration: number) {
  const key = `${project?.id ?? ''}:${documentGeneration}`;
  const targets = useMemo(() => getPreviewTargets(project?.sceneObjects ?? []), [project?.sceneObjects]);
  const [state, setState] = useState<{ key: string; overrides: PreviewOverrides; lastId: string | null }>({ key, overrides: {}, lastId: null });
  const overrides = state.key === key ? state.overrides : {};
  const lastId = state.key === key && targets.some(target => target.id === state.lastId) ? state.lastId : null;
  const anyLightOn = targets.some(target => target.type === 'light' && previewEnabled(target, overrides));
  function toggle(id: string) {
    if (!targets.some(target => target.id === id)) return;
    setState(current => ({ key, lastId: id, overrides: togglePreviewTarget(targets, current.key === key ? current.overrides : {}, id) }));
  }
  function toggleAllLights() {
    setState(current => {
      const prior = current.key === key ? current.overrides : {};
      const any = targets.some(target => target.type === 'light' && previewEnabled(target, prior));
      return { key, lastId: null, overrides: setPreviewLights(targets, prior, !any) };
    });
  }
  return { targets, overrides, lastId, anyLightOn, toggle, toggleAllLights };
}
export type ScenePreview = ReturnType<typeof useScenePreview>;
