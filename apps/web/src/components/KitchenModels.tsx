import { Box, Cylinder, C, Rod, CurvedRod } from './model-parts';
import PreviewPart, { type ModelInteractions } from './PreviewPart';

function CabinetRun({ lights, display = false, interactions }: { lights: boolean; display?: boolean; interactions?: ModelInteractions }) {
  return <>
    <Box p={[0, .177, 0]} s={[1, .32, 1]} color={C.taupe} />
    <Box p={[0, .012, 0]} s={[.97, .024, .92]} color={C.dark} />
    <Box p={[0, .352, 0]} s={[1, .025, 1]} color={C.wood} />
    <Box p={[0, .349, .49]} s={[1, .012, .025]} color={C.dark} />
    <Box p={[0, .49, -.475]} s={[1, .255, .05]} color={C.wood} />
    <Box p={[display ? .095 : 0, .79, -.16]} s={[display ? .81 : 1, .42, .66]} color={C.taupe} />
    <PreviewPart channel="task-light" interactions={interactions}><Box p={[display ? .095 : 0, .578, .15]} s={[display ? .81 : 1, .005, .025]} color={lights ? C.warm : C.ivory} glow={lights} /></PreviewPart>
    {[-.25, 0, .25].map(x => <group key={x}><Box p={[x, .178, .501]} s={[.003, .3, .003]} color={C.dark} />{(!display || x > -.25) && <Box p={[x, .79, .172]} s={[.003, .41, .003]} color={C.dark} />}</group>)}
  </>;
}
function Microwave() {
  return <group position={[.35, .366, -.05]}>
    <Box p={[0, .06, 0]} s={[.26, .12, .51]} color={C.dark} /><Box p={[-.02, .06, .259]} s={[.19, .09, .009]} color="#121b20" />
    <Box p={[.106, .083, .265]} s={[.024, .015, .009]} color="#68a7d0" />
    <Box p={[0, .16, 0]} s={[.23, .08, .38]} color={C.paleWood} />
    {[0, 1, 2, 3, 4].map(i => <Box key={i} p={[0, .144 + i * .012, .193]} s={[.23, .002, .006]} color={C.wood} />)}
    <Box p={[-.22, .047, .025]} s={[.13, .094, .32]} color="#cbd0cb" />
    {[-.24, -.205].map(x => <Box key={x} p={[x, .097, .025]} s={[.012, .003, .21]} color={C.dark} />)}
  </group>;
}
export function KitchenCook({ lights, displayLight, interactions }: { lights: boolean; displayLight: boolean; interactions?: ModelInteractions }) {
  return <>
    <CabinetRun lights={lights} display interactions={interactions} />
    <Box p={[-.02, .19, .511]} s={[.3, .23, .018]} color={C.dark} />
    <Box p={[-.02, .18, .523]} s={[.25, .15, .008]} color="#344049" />
    <Box p={[-.02, .28, .54]} s={[.25, .012, .025]} color="#b6b6ae" />
    <Box p={[-.02, .369, -.015]} s={[.17, .012, .78]} color={C.dark} />
    {[-.2, .18].map(z => <group key={z}><Cylinder p={[-.02, .382, z]} s={[.1, .008, .21]} color="#626864" /><Box p={[-.02, .39, z]} s={[.13, .006, .02]} color={C.dark} /><Box p={[-.02, .39, z]} s={[.01, .006, .26]} color={C.dark} /></group>)}
    <Box p={[-.02, .582, .18]} s={[.35, .018, .04]} color={C.dark} />
    <Box p={[-.23, .428, .02]} s={[.13, .13, .5]} color="#686c69" /><Box p={[-.23, .43, .276]} s={[.11, .09, .01]} color={C.dark} />
    <Cylinder p={[-.23, .387, .33]} s={[.055, .04, .1]} />
    <Microwave />
    <PreviewPart channel="display-light" interactions={interactions}>
      <Box p={[-.405, .68, -.46]} s={[.19, .63, .035]} />
      {[-.495, -.315].map(x => <Box key={x} p={[x, .68, -.05]} s={[.009, .63, .84]} color={C.dark} />)}
      {[.37, .995].map(y => <Box key={y} p={[-.405, y, -.05]} s={[.19, .009, .84]} color={C.dark} />)}
      {[.4, .57, .75, .91].map(y => <mesh key={y} position={[-.405, y, -.05]} scale={[.17, .006, .76]}><boxGeometry /><meshStandardMaterial color="#d4e3dc" transparent opacity={.5} roughness={.15} /></mesh>)}
      <mesh position={[-.405, .68, .382]} scale={[.17, .61, .01]}><boxGeometry /><meshStandardMaterial color="#cde2d9" transparent opacity={.14} depthWrite={false} roughness={.1} /></mesh>
      <Box p={[-.485, .68, -.43]} s={[.005, .6, .01]} color={displayLight ? C.warm : C.ivory} glow={displayLight} />
      {[.36, .4, .44].map(x => <Cylinder key={x} p={[-x, .598, .12]} s={[.024, .045, .05]} />)}
      <Cylinder p={[-.405, .77, 0]} s={[.035, .04, .08]} /><Cylinder p={[-.405, .803, 0]} s={[.07, .035, .13]} color="#6c924c" />
    </PreviewPart>
  </>;
}
export function KitchenSink({ lights, interactions }: { lights: boolean; interactions?: ModelInteractions }) {
  return <>
    <CabinetRun lights={lights} interactions={interactions} />
    <Box p={[-.05, .37, .04]} s={[.42, .016, .7]} color={C.dark} /><Box p={[-.05, .379, .04]} s={[.36, .004, .57]} color="#253e43" />
    <CurvedRod points={[[-.05, .377, -.34], [-.05, .47, -.34], [-.05, .51, -.27], [-.05, .5, -.13], [-.05, .46, -.11]]} radius={.009} />
    <Box p={[.3, .374, .08]} s={[.22, .006, .55]} color="#d9d6bb" />
    <Cylinder p={[.37, .406, -.23]} s={[.05, .08, .13]} color={C.ivory} />
    {[-.02, 0, .02].map((x, i) => <Rod key={i} a={[.37 + x, .43, -.23]} b={[.36 + x, .5, -.2]} radius={.004} color={C.paleWood} />)}
    <Cylinder p={[.28, .54, -.37]} s={[.04, .16, .04]} rotation={[0, 0, Math.PI / 2]} />
  </>;
}
export function Fridge() {
  return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.taupe} /><Box p={[0, .64, .51]} s={[.94, .69, .025]} /><Box p={[0, .15, .51]} s={[.94, .27, .025]} /><Box p={[0, .294, .52]} s={[.94, .012, .012]} color={C.dark} /></>;
}
