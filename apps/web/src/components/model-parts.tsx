import { useMemo } from 'react';
import { Vector3, Quaternion, Shape, CatmullRomCurve3 } from 'three';

export type V3 = [number, number, number];
export const C = { ivory: '#e2ddcf', taupe: '#b9b1a4', wood: '#aa7952', paleWood: '#c59b6c', dark: '#23282c', fabric: '#d4d4cc', brass: '#b6984c', warm: '#ffdc93' };
export function Box({ p, s, color = C.ivory, glow = false }: { p: V3; s: V3; color?: string; glow?: boolean }) {
  return <mesh position={p} scale={s} castShadow receiveShadow><boxGeometry /><meshStandardMaterial color={color} roughness={.7} emissive={glow ? color : '#000'} emissiveIntensity={glow ? 1.6 : 0} /></mesh>;
}
export function Cylinder({ p, s, color = C.ivory, glow = false, rotation }: { p: V3; s: V3; color?: string; glow?: boolean; rotation?: V3 }) {
  return <mesh position={p} scale={s} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[.5, .5, 1, 20]} /><meshStandardMaterial color={color} roughness={.65} emissive={glow ? color : '#000'} emissiveIntensity={glow ? 1.8 : 0} /></mesh>;
}
export function Rod({ a, b, radius = .015, color = C.dark }: { a: V3; b: V3; radius?: number; color?: string }) {
  const transform = useMemo(() => {
    const from = new Vector3(...a), to = new Vector3(...b), delta = to.clone().sub(from);
    return { position: from.add(to).multiplyScalar(.5), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize()), length: delta.length() };
  }, [...a, ...b]);
  return <mesh position={transform.position} quaternion={transform.quaternion} castShadow><cylinderGeometry args={[radius, radius, transform.length, 8]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>;
}
export function CurvedRod({ points, radius = .012, color = C.dark }: { points: V3[]; radius?: number; color?: string }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(point => new Vector3(...point))), points.flat());
  return <mesh castShadow><tubeGeometry args={[curve, 18, radius, 8, false]} /><meshStandardMaterial color={color} roughness={.55} /></mesh>;
}
export function RoundSlab({ p, s, color = C.ivory }: { p: V3; s: V3; color?: string }) {
  const shape = useMemo(() => {
    const outline = new Shape(), r = .13;
    outline.moveTo(-.5 + r, -.5); outline.lineTo(.5 - r, -.5); outline.quadraticCurveTo(.5, -.5, .5, -.5 + r);
    outline.lineTo(.5, .5 - r); outline.quadraticCurveTo(.5, .5, .5 - r, .5); outline.lineTo(-.5 + r, .5);
    outline.quadraticCurveTo(-.5, .5, -.5, .5 - r); outline.lineTo(-.5, -.5 + r); outline.quadraticCurveTo(-.5, -.5, -.5 + r, -.5); return outline;
  }, []);
  const options = useMemo(() => ({ depth: 1, bevelEnabled: false, curveSegments: 4 }), []);
  return <mesh position={[p[0], p[1] - s[1] / 2, p[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[s[0], s[2], s[1]]} castShadow receiveShadow><extrudeGeometry args={[shape, options]} /><meshStandardMaterial color={color} roughness={.8} /></mesh>;
}
