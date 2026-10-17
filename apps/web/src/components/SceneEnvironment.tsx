import { Color } from 'three';
import type { SolarEnvironment } from '@roompilot/domain';
import type { OutdoorMode } from '../preferences';

export default function SceneEnvironment({ mode, solar, size }: { mode: OutdoorMode; solar: SolarEnvironment | null; size: number }) {
  const automatic = mode === 'auto' && solar !== null;
  const daylight = automatic ? Math.max(0, Math.min(1, (solar.solarElevationDeg + 6) / 20)) : mode === 'night' ? 0 : 1;
  const sky = new Color('#0b1329').lerp(new Color('#bed9ed'), daylight);
  const ground = new Color('#18243b').lerp(new Color('#b9c9b8'), daylight);
  const sunAboveHorizon = automatic ? solar.solarElevationDeg > 0 : mode !== 'night';
  const position: [number, number, number] = automatic && sunAboveHorizon
    ? solar.sunDirection.map(value => value * size * 2) as [number, number, number]
    : sunAboveHorizon ? [size * .65, size * 1.4, size * .8] : [-size * .7, size, -size * .4];
  return <>
    <color attach="background" args={[sky]} />
    <ambientLight intensity={.2 + daylight * .55} color={new Color('#a7bcdf').lerp(new Color('#fff2dd'), daylight)} />
    <hemisphereLight args={['#b9d5ff', '#35465b', .35 + daylight * .4]} />
    <directionalLight position={position} intensity={sunAboveHorizon ? .45 + daylight * 1.8 : .25} color={sunAboveHorizon ? '#fff0d4' : '#9ebdff'}
      castShadow shadow-mapSize={[1024, 1024]} shadow-normalBias={.025}
      shadow-camera-left={-size} shadow-camera-right={size} shadow-camera-top={size} shadow-camera-bottom={-size} shadow-camera-far={size * 6} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.165, 0]} receiveShadow>
      <circleGeometry args={[size * 2.5, 64]} /><meshStandardMaterial color={ground} roughness={1} />
    </mesh>
  </>;
}
