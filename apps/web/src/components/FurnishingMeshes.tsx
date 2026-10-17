import { memo } from 'react';
import type { Project } from '@roompilot/domain';
import FurnitureModel from './FurnitureModels';

/** Parent ownership stays independent of any future entity/device binding. */
export default memo(function FurnishingMeshes({ project, origin, lights, onSelect }: { project: Project; origin: [number, number]; lights: boolean; onSelect: (id: string) => void }) {
  const scale = project.calibration!.metresPerPixel;
  // A fixed budget: one soft local light per functional region, never one light per mesh.
  const lightAnchors = ['dining-pendant-left', 'living-purple-ceiling-light', 'hall-downlight-5'];
  return <group>
    {project.sceneObjects.map(object => <group key={object.id} name={object.id} userData={{ sceneObjectId: object.id, roomId: object.roomId }}
      position={[object.position.x * scale - origin[0], object.elevationM + .02, object.position.y * scale - origin[1]]}
      rotation={[0, object.rotationRad, 0]} onClick={event => { event.stopPropagation(); onSelect(object.roomId); }}>
      <group scale={object.sizeM}><FurnitureModel kind={object.kind} lights={lights} /></group>
    </group>)}
    {lights && lightAnchors.flatMap(id => {
      const object = project.sceneObjects.find(object => object.id === id);
      return object ? [<pointLight key={id} position={[object.position.x * scale - origin[0], 1.8, object.position.y * scale - origin[1]]} color="#ffe0a0" intensity={id.startsWith('hall') ? 5 : 9} distance={4} decay={2} />] : [];
    })}
  </group>;
});
