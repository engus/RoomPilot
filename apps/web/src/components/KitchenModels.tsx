import { Box, Cylinder, C, Rod } from './model-parts';

function CabinetRun({ lights }: { lights: boolean }) {
  return <>
    <Box p={[0, .177, 0]} s={[1, .32, 1]} color={C.taupe} />
    <Box p={[0, .012, 0]} s={[.97, .024, .92]} color={C.dark} />
    <Box p={[0, .352, 0]} s={[1, .025, 1]} color={C.wood} />
    <Box p={[0, .349, .49]} s={[1, .012, .025]} color={C.dark} />
    <Box p={[0, .49, -.475]} s={[1, .255, .05]} color={C.wood} />
    <Box p={[0, .79, -.16]} s={[1, .42, .66]} color={C.taupe} />
    <Box p={[0, .578, .15]} s={[1, .005, .018]} color={lights ? C.warm : C.ivory} glow={lights} />
    {[-.25, 0, .25].map(x => <group key={x}><Box p={[x, .178, .501]} s={[.003, .3, .003]} color={C.dark} /><Box p={[x, .79, .172]} s={[.003, .41, .003]} color={C.dark} /></group>)}
  </>;
}
function Microwave() {
  return <group position={[.26, .366, -.05]}>
    <Box p={[0, .06, 0]} s={[.26, .12, .51]} color={C.dark} /><Box p={[-.02, .06, .259]} s={[.19, .09, .009]} color="#121b20" />
    <Box p={[.106, .083, .265]} s={[.024, .015, .009]} color="#68a7d0" />
    <Box p={[0, .16, 0]} s={[.23, .08, .38]} color={C.paleWood} />
    {[0, 1, 2, 3, 4].map(i => <Box key={i} p={[0, .144 + i * .012, .193]} s={[.23, .002, .006]} color={C.wood} />)}
    <Box p={[-.22, .047, .025]} s={[.13, .094, .32]} color="#cbd0cb" />
    {[-.24, -.205].map(x => <Box key={x} p={[x, .097, .025]} s={[.012, .003, .21]} color={C.dark} />)}
  </group>;
}
export function KitchenCook({ lights }: { lights: boolean }) {
  return <>
    <CabinetRun lights={lights} />
    <Box p={[-.02, .19, .511]} s={[.3, .23, .018]} color={C.dark} />
    <Box p={[-.02, .18, .523]} s={[.25, .15, .008]} color="#344049" />
    <Box p={[-.02, .28, .54]} s={[.25, .012, .025]} color="#b6b6ae" />
    <Box p={[-.02, .369, -.015]} s={[.17, .012, .78]} color={C.dark} />
    {[-.2, .18].map(z => <group key={z}><Cylinder p={[-.02, .382, z]} s={[.1, .008, .21]} color="#626864" /><Box p={[-.02, .39, z]} s={[.13, .006, .02]} color={C.dark} /><Box p={[-.02, .39, z]} s={[.01, .006, .26]} color={C.dark} /></group>)}
    <Box p={[-.02, .582, .18]} s={[.35, .018, .04]} color={C.dark} />
    <Box p={[-.29, .428, .02]} s={[.15, .13, .5]} color="#686c69" /><Box p={[-.29, .43, .276]} s={[.13, .09, .01]} color={C.dark} />
    <Cylinder p={[-.29, .387, .33]} s={[.055, .04, .1]} />
    <Microwave />
    <Box p={[-.429, .68, .17]} s={[.135, .61, .018]} color={C.dark} />
    <Box p={[-.429, .68, .185]} s={[.115, .59, .012]} color="#bdd0bb" />
    {[.4, .57, .75, .91].map(y => <Box key={y} p={[-.429, y, -.05]} s={[.118, .006, .48]} color="#d2dfd2" />)}
    <Box p={[-.488, .68, .19]} s={[.005, .6, .01]} color={C.warm} glow={lights} />
    {[.41, .44, .47].map(x => <Cylinder key={x} p={[-x, .598, .12]} s={[.018, .045, .04]} />)}
  </>;
}
export function KitchenSink({ lights }: { lights: boolean }) {
  return <>
    <CabinetRun lights={lights} />
    <Box p={[-.08, .37, .04]} s={[.3, .016, .64]} color={C.dark} /><Box p={[-.08, .379, .04]} s={[.25, .004, .5]} color="#253e43" />
    <Rod a={[-.08, .377, -.32]} b={[-.08, .48, -.32]} radius={.008} />
    <Rod a={[-.08, .48, -.32]} b={[-.08, .5, -.14]} radius={.008} /><Rod a={[-.08, .5, -.14]} b={[-.08, .465, -.12]} radius={.008} />
    <Box p={[.19, .374, .08]} s={[.2, .006, .55]} color="#d9d6bb" />
    <Cylinder p={[.37, .406, -.23]} s={[.05, .08, .13]} color={C.ivory} />
    {[-.02, 0, .02].map((x, i) => <Rod key={i} a={[.37 + x, .43, -.23]} b={[.36 + x, .5, -.2]} radius={.004} color={C.paleWood} />)}
    <Cylinder p={[.28, .54, -.37]} s={[.04, .16, .04]} rotation={[0, 0, Math.PI / 2]} />
  </>;
}
export function Fridge() {
  return <><Box p={[0, .5, 0]} s={[1, 1, 1]} color={C.taupe} /><Box p={[0, .64, .51]} s={[.94, .69, .025]} /><Box p={[0, .15, .51]} s={[.94, .27, .025]} /><Box p={[0, .294, .52]} s={[.94, .012, .012]} color={C.dark} /></>;
}
