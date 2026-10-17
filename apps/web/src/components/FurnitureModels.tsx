import type { SceneObject } from '@roompilot/domain';
import { Box, Cylinder, Rod, RoundSlab, C } from './model-parts';
import { Fridge, KitchenCook, KitchenSink } from './KitchenModels';

function Legs({ top = .9, color = C.wood }: { top?: number; color?: string }) {
  return <>{[-.38, .38].flatMap(x => [-.35, .35].map(z => <Rod key={`${x}-${z}`} a={[x, .02, z]} b={[x * .9, top, z * .9]} radius={.027} color={color} />))}</>;
}
function Chair() {
  return <><Legs top={.51} /><RoundSlab p={[0, .53, .04]} s={[.94, .14, .85]} color={C.fabric} />
    <RoundSlab p={[0, .78, -.33]} s={[.95, .44, .2]} color={C.fabric} />
    {[-1, 1].map(sign => <RoundSlab key={sign} p={[sign * .4, .66, -.12]} s={[.17, .23, .58]} color={C.fabric} />)}
  </>;
}
function Sideboard({ tall = false }: { tall?: boolean }) {
  return <><Legs top={.2} color={C.brass} /><Box p={[0, .57, 0]} s={[1, .82, 1]} /><Box p={[0, .995, 0]} s={[1, .01, 1]} color={C.wood} />
    {[-.25, .25].map(x => <Box key={x} p={[x, .57, .505]} s={[.48, .77, .015]} color={C.ivory} />)}
    {[-.08, .08].map(x => <Cylinder key={x} p={[x, .65, .53]} s={[.018, .035, .03]} color={C.brass} rotation={[Math.PI / 2, 0, 0]} />)}
    {tall && [.38, .63, .86].map(y => <Box key={y} p={[0, y, .52]} s={[.97, .008, .012]} color={C.taupe} />)}
  </>;
}
function Pendant({ lights }: { lights: boolean }) {
  return <>
    <Cylinder p={[0, .98, 0]} s={[.16, .035, .16]} color={C.dark} /><Rod a={[0, .43, 0]} b={[0, .97, 0]} radius={.008} />
    <Cylinder p={[0, .16, 0]} s={[.15, .15, .15]} color={lights ? C.warm : C.ivory} glow={lights} />
    {[0, 1, 2, 3].map(i => <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, .06 + i * .105, 0]} scale={[1 - i * .16, 1 - i * .16, 1]}><torusGeometry args={[.47, .012, 4, 24]} /><meshStandardMaterial color={C.paleWood} /></mesh>)}
    {Array.from({ length: 24 }, (_, i) => {
      const angle = i / 24 * Math.PI * 2;
      return <Rod key={i} a={[Math.cos(angle) * .47, .06, Math.sin(angle) * .47]} b={[Math.cos(angle + .24) * .2, .4, Math.sin(angle + .24) * .2]} radius={.012} color={C.paleWood} />;
    })}
  </>;
}
function FloorLamp({ lights }: { lights: boolean }) {
  return <>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2; return <Rod key={i} a={[Math.cos(a) * .47, .01, Math.sin(a) * .47]} b={[0, .82, 0]} radius={.026} color={C.paleWood} />; })}
    <mesh position={[0, .87, 0]}><cylinderGeometry args={[.4, .49, .25, 20]} /><meshStandardMaterial color={C.ivory} emissive={C.warm} emissiveIntensity={lights ? .5 : 0} /></mesh>
  </>;
}
function TVConsole() {
  return <>
    <group scale={[1, .37, 1]}><Sideboard /><Box p={[0, 1, 0]} s={[1.01, .06, 1.04]} color={C.wood} />
      {[-.35, 0, .35].map(x => <Box key={x} p={[x, .76, .53]} s={[.15, .025, .025]} color={C.dark} />)}
    </group>
    <Box p={[0, .69, -.1]} s={[.87, .56, .075]} color={C.dark} /><Box p={[0, .69, -.054]} s={[.83, .52, .008]} color="#17262c" />
    {[-.34, .34].map(x => <Rod key={x} a={[x * .85, .43, -.1]} b={[x, .39, .18]} radius={.014} />)}
    <Box p={[0, .409, .24]} s={[.58, .035, .17]} color={C.dark} />
    <Cylinder p={[-.42, .425, .15]} s={[.05, .06, .13]} color={C.ivory} /><Cylinder p={[-.42, .47, .15]} s={[.09, .06, .18]} color="#6e9d47" />
  </>;
}
function Bike() {
  const a: [number, number, number] = [-.15, .38, 0], b: [number, number, number] = [.1, .35, 0];
  return <>
    {[-.32, .32].map(x => <group key={x} position={[x, .29, 0]} scale={[.9, 1.4, 1]}>
      <mesh><torusGeometry args={[.19, .025, 6, 24]} /><meshStandardMaterial color={C.dark} /></mesh>
      {Array.from({ length: 10 }, (_, i) => { const angle = i * Math.PI / 5; return <Rod key={i} a={[0, 0, 0]} b={[Math.cos(angle) * .19, Math.sin(angle) * .19, 0]} radius={.003} color="#a4aca8" />; })}
    </group>)}
    <Rod a={[-.32, .29, 0]} b={a} /><Rod a={a} b={b} /><Rod a={b} b={[-.32, .29, 0]} />
    <Rod a={a} b={[-.05, .64, 0]} /><Rod a={[-.05, .64, 0]} b={[.23, .64, 0]} /><Rod a={b} b={[.23, .64, 0]} />
    <Rod a={[.23, .64, 0]} b={[.32, .29, 0]} /><Rod a={[-.05, .64, 0]} b={b} />
    <Rod a={[-.05, .64, 0]} b={[-.07, .83, 0]} /><Box p={[-.07, .84, 0]} s={[.14, .05, .23]} color={C.dark} />
    <Rod a={[.23, .64, 0]} b={[.24, .91, 0]} /><Rod a={[.24, .91, -.45]} b={[.24, .91, .45]} />
  </>;
}
export default function FurnitureModel({ kind, lights }: { kind: SceneObject['kind']; lights: boolean }) {
  switch (kind) {
    case 'kitchen-cook': return <KitchenCook lights={lights} />;
    case 'kitchen-sink': return <KitchenSink lights={lights} />;
    case 'fridge': return <Fridge />;
    case 'table': return <><Legs /><Box p={[0, .89, 0]} s={[.86, .12, .79]} color={C.wood} /><RoundSlab p={[0, .97, 0]} s={[1, .06, 1]} /></>;
    case 'chair': return <Chair />;
    case 'pendant': return <Pendant lights={lights} />;
    case 'floor-lamp': return <FloorLamp lights={lights} />;
    case 'sideboard': return <Sideboard />;
    case 'shoe-cabinet': return <Sideboard tall />;
    case 'moss-art': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.dark} /><Box p={[0, .5, .51]} s={[.88, .92, .04]} color="#2c5935" />{Array.from({ length: 15 }, (_, i) => <Cylinder key={i} p={[(i % 3 - 1) * .27, .12 + Math.floor(i / 3) * .18, .58]} s={[.27, .1, .17]} color={['#4e782e', '#73994b', '#1c4935'][i % 3]} rotation={[Math.PI / 2, 0, 0]} />)}</>;
    case 'air-conditioner': return <><RoundSlab p={[0, .5, 0]} s={[1, 1, 1]} color={C.dark} /><Box p={[0, .21, .51]} s={[.85, .09, .02]} color="#101a1d" /></>;
    case 'air-unit': return <RoundSlab p={[0, .5, 0]} s={[1, 1, 1]} color="#d0d1c7" />;
    case 'radiator': return <>{Array.from({ length: 10 }, (_, i) => <Box key={i} p={[-.45 + i * .1, .5, 0]} s={[.07, .9, .7]} />)}<Box p={[0, .87, 0]} s={[1, .06, .5]} /><Box p={[0, .15, 0]} s={[1, .06, .5]} /></>;
    case 'rug': return <RoundSlab p={[0, .5, 0]} s={[1, 1, 1]} color="#c9c1aa" />;
    case 'tv-console': return <TVConsole />;
    case 'subwoofer': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.dark} /><Cylinder p={[0, .55, .51]} s={[.6, .02, .6]} color="#0e171b" rotation={[Math.PI / 2, 0, 0]} /></>;
    case 'sconce': return <><Box p={[0, .5, -.25]} s={[.3, .23, .5]} color={C.brass} /><Cylinder p={[0, .5, .05]} s={[.8, 1, .8]} color={lights ? '#ffe4ac' : '#e0e3db'} glow={lights} /><Cylinder p={[0, .5, .05]} s={[.85, .17, .85]} color={C.brass} /></>;
    case 'ceiling-light': return <><mesh position={[0, .5, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.45, .045, 6, 28]} /><meshStandardMaterial color="#ab53c8" emissive="#a047c3" emissiveIntensity={lights ? 1.2 : 0} /></mesh><Cylinder p={[0, .5, 0]} s={[.84, .4, .84]} color={C.ivory} glow={lights} /></>;
    case 'track': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.dark} />{[-.24, .24].map(x => <Box key={x} p={[x, .15, 0]} s={[.35, .3, 1]} color={lights ? C.warm : C.ivory} glow={lights} />)}</>;
    case 'mirror': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.warm} glow={lights} /><Box p={[0, .5, .52]} s={[.96, .98, .06]} color="#91a8a8" /></>;
    case 'bike': return <Bike />;
    case 'bench': return <><Legs top={.85} /><Box p={[0, .93, 0]} s={[1, .14, 1]} color={C.fabric} /><Box p={[0, .27, 0]} s={[.9, .04, .9]} color={C.wood} /></>;
    case 'coat-hooks': return <><Box p={[0, .5, -.4]} s={[1, 1, .2]} color={C.wood} />{[-.3, 0, .3].map((x, i) => <group key={x}><Cylinder p={[x, .88, 0]} s={[.04, .1, .4]} color={C.dark} rotation={[Math.PI / 2, 0, 0]} /><RoundSlab p={[x, .4, .15]} s={[.27, .73, .6]} color={['#bb9b55', '#a8593c', '#3e6380'][i]} /></group>)}</>;
    case 'downlight': return <Cylinder p={[0, .5, 0]} s={[1, 1, 1]} color={lights ? C.warm : C.ivory} glow={lights} />;
    case 'wall-panel': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.wood} />{[-.32, 0, .32].map(x => <Box key={x} p={[x, .5, .51]} s={[.002, 1, .015]} color={C.paleWood} />)}</>;
    case 'robot-vacuum': return <><RoundSlab p={[0, .55, -.15]} s={[.9, .9, .65]} /><Cylinder p={[0, .08, .14]} s={[1, .16, .7]} /><Cylinder p={[0, .17, .14]} s={[.24, .06, .17]} color="#d0d4cb" /></>;
    case 'wall-control': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} /><Box p={[0, .5, .52]} s={[.84, .8, .04]} color="#3c7c9e" /></>;
    case 'print': return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.dark} /><Box p={[0, .5, .51]} s={[.9, .92, .02]} /><Box p={[0, .62, .54]} s={[.72, .43, .02]} color="#718576" /><Box p={[0, .23, .54]} s={[.65, .025, .02]} color={C.dark} /></>;
  }
}
