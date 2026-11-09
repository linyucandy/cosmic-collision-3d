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

test('white hole reference horizon uses the same illustrative scale as a black hole',()=>{
  const models={blackhole:{base:2500,rk:.85},whitehole:{base:2500,rk:.85}};
  assert.equal(size.radiusFor('whitehole',2500,models,'reference'),size.radiusFor('blackhole',2500,models,'reference'));
  assert.ok(size.radiusFor('whitehole',2500,models,'display')>1);
});

test('new stellar classes have representative relative sizes',()=>{
  const t={star:{base:600,rk:2.2},redDwarf:{base:180,rk:1.3},orangeDwarf:{base:450,rk:1.8},hotSubdwarf:{base:300,rk:1.6},wolfRayet:{base:2200,rk:3}};
  const r=k=>size.radiusFor(k,t[k].base,t,'reference');
  assert.ok(r('hotSubdwarf')<r('redDwarf')); assert.ok(r('redDwarf')<r('orangeDwarf'));
  assert.ok(r('orangeDwarf')<r('star')); assert.ok(r('wolfRayet')>r('star'));
});

test('red supergiant examples are hundreds to over a thousand times the Sun radius',()=>{
  const t={star:{base:600,rk:2.2},redSupergiant:{base:1800,rk:6},redHypergiant:{base:2600,rk:8}};
  const r=k=>size.radiusFor(k,t[k].base,t,'reference');
  assert.equal(r('redSupergiant')/r('star'),700);
  assert.equal(r('redHypergiant')/r('star'),1400);
});

test('galaxy aggregate types have a finite sandbox size',()=>{
  const t={galaxySpiral:{base:2400,rk:12},galaxyElliptical:{base:2400,rk:12},galaxyIrregular:{base:2400,rk:12}};
  for(const k of Object.keys(t)) assert.ok(Number.isFinite(size.radiusFor(k,2400,t,'reference')) && size.radiusFor(k,2400,t,'reference')>0);
});

test('galaxies remain much larger than a red hypergiant in both size modes',()=>{
  const t={galaxySpiral:{base:2400,rk:1200},redHypergiant:{base:2600,rk:8}};
  for(const mode of ['reference','display']) {
    const galaxy=size.radiusFor('galaxySpiral',2400,t,mode);
    const star=size.radiusFor('redHypergiant',2600,t,mode);
    assert.ok(galaxy>star*100,`${mode}: galaxy ${galaxy}, star ${star}`);
  }
});

test('representative star clusters are between giant stars and galaxies',()=>{
  const t={redHypergiant:{base:2600,rk:8},openCluster:{base:1000,rk:100},globularCluster:{base:2000,rk:200},galaxySpiral:{base:2400,rk:1200}};
  for(const mode of ['reference','display']) {
    const r=k=>size.radiusFor(k,t[k].base,t,mode);
    assert.ok(r('redHypergiant')<r('openCluster') && r('openCluster')<r('globularCluster') && r('globularCluster')<r('galaxySpiral'));
  }
});

test('dark matter distributions are extended and gravastar is compact',()=>{
  const t={darkMatter:{base:1000,rk:80},darkHalo:{base:4000,rk:1800},gravastar:{base:2500,rk:.85},blackhole:{base:2500,rk:.85}};
  const r=k=>size.radiusFor(k,t[k].base,t,'reference');
  assert.ok(r('darkHalo')>r('darkMatter')); assert.ok(r('darkMatter')>r('gravastar')*1e6);
  assert.ok(r('gravastar')>r('blackhole'));
});
