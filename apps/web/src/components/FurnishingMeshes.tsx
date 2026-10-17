import { memo, useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { Project } from '@roompilot/domain';
import FurnitureModel from './FurnitureModels';
import { getPreviewLightGroups, previewEnabled } from '../scene-preview';
import type { ScenePreview } from '../use-scene-preview';

/** Parent ownership stays independent of any future entity/device binding. */
export default memo(function FurnishingMeshes({ project, origin, preview, onSelect }: { project: Project; origin: [number, number]; preview: ScenePreview; onSelect: (id: string) => void }) {
  const scale = project.calibration!.metresPerPixel;
  const { gl } = useThree(); const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => () => { gl.domElement.style.cursor = ''; }, [gl]);
  const groups = useMemo(() => getPreviewLightGroups(project, preview.targets, preview.overrides), [project, preview.targets, preview.overrides]);
  const hover = (id: string | null) => { setHovered(id); gl.domElement.style.cursor = id ? 'pointer' : ''; };
  return <group>
    {project.sceneObjects.map(object => {
      const targets = preview.targets.filter(target => target.objectId === object.id);
      const main = targets.find(target => !['task-light', 'display-light'].includes(target.channel));
      const channelOn = (channel: string) => { const target = targets.find(target => target.channel === channel); return target ? previewEnabled(target, preview.overrides) : false; };
      return <group key={object.id} name={object.id} userData={{ sceneObjectId: object.id, roomId: object.roomId }}
      position={[object.position.x * scale - origin[0], object.elevationM + .02, object.position.y * scale - origin[1]]}
      rotation={[0, object.rotationRad, 0]} onClick={event => { event.stopPropagation(); if (event.delta > 4) return; if (main) preview.toggle(main.id); else onSelect(object.roomId); }}
      onPointerOver={main ? event => { event.stopPropagation(); hover(main.id); } : undefined} onPointerOut={main ? event => { event.stopPropagation(); hover(null); } : undefined}>
      <group scale={object.sizeM}><FurnitureModel kind={object.kind} lights={main?.type === 'light' && previewEnabled(main, preview.overrides)} deviceOn={main?.type === 'device' && previewEnabled(main, preview.overrides)} taskLight={channelOn('task-light')} displayLight={channelOn('display-light')}
        interactions={{ toggle: channel => { const target = targets.find(target => target.channel === channel); if (target) preview.toggle(target.id); }, hover: channel => hover(channel ? `${object.id}:${channel}` : null) }} />
        {main && hovered === main.id && <mesh position={[0, .5, 0]} scale={[1.04, 1.04, 1.04]} raycast={() => {}}><boxGeometry /><meshBasicMaterial color="#d8ae53" wireframe transparent opacity={.5} /></mesh>}
      </group>
    </group>; })}
    {groups.map(group => <pointLight key={group.id} position={[group.x * scale - origin[0], 1.8, group.y * scale - origin[1]]} color="#ffe0a0" intensity={group.intensity} distance={4} decay={2} />)}
  </group>;
});
