const test=require('node:test'),assert=require('node:assert/strict');
let size;try{size=require('../celestial-size.js');}catch(_){}
const types={planet:{base:40,rk:1.7},gasGiant:{base:70,rk:3.4},ringplanet:{base:55,rk:1.7},star:{base:600,rk:2.2},brownDwarf:{base:90,rk:1.15},whiteDwarf:{base:3000,rk:.3},neutron:{base:6000,rk:.18}};
test('reference sizes reproduce approximate Earth Jupiter and Sun diameter ratios',()=>{
  assert.ok(size,'celestial size model exists');const r=t=>size.radiusFor(t,types[t].base,types,'reference');
  assert.ok(Math.abs(r('gasGiant')/r('planet')-11)<.1);assert.ok(Math.abs(r('star')/r('planet')-109)<.1);
  assert.ok(Math.abs(r('brownDwarf')/r('gasGiant')-1)<.01);assert.ok(Math.abs(r('whiteDwarf')/r('planet')-1)<.01);assert.ok(r('neutron')<r('planet')*.01);
  assert.ok(Math.abs(size.volume(r('star'))/size.volume(r('planet'))-109**3)<1e-6);
});
test('mass changes follow type-dependent radii and the display-friendly mode remains available',()=>{
  const planet=m=>size.radiusFor('planet',m,types,'reference');
  assert.ok(Math.abs(planet(320)/planet(40)-2)<1e-10);
  assert.ok(Math.abs(size.radiusFor('planet',40,types,'display')-1.7*Math.cbrt(40))<1e-10);
  const gas=size.radiusFor('gasGiant',70,types,'reference'),twice=size.radiusFor('gasGiant',140,types,'reference');assert.ok(twice/gas<1.2);
});
test('shape deformation changes the axis lengths but preserves the physical volume',()=>{
  for(const [d,t,w] of [[0,0,0],[.28,0,0],[0,.3,.01],[.28,.3,-.01]]){
    const s=size.shapeScale(10,d,t,w);assert.ok(s.every(x=>x>0));assert.ok(Math.abs(s[0]*s[1]*s[2]-1000)<1e-8);
  }
});

test('quasar and black hole use the same horizon radius at equal game mass',()=>{
  const models={blackhole:{base:2500,rk:.85},quasar:{base:12000,rk:1.2}};
  assert.ok(Math.abs(size.radiusFor('quasar',12000,models,'reference')-size.radiusFor('blackhole',12000,models,'reference'))<1e-12);
});
