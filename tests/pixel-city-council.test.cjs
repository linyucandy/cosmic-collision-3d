const test=require('node:test'),assert=require('node:assert/strict'),C=require('../pixel-city-engine');

test('autonomy starts off and can be enabled with a real fixed-target plan',()=>{
  const s=C.createCity();assert.equal(s.autonomy.enabled,false);
  assert.equal(C.setAutonomy(s,{enabled:true}).ok,true);assert.ok(s.autonomy.plan.targets.length>=4);
  const targets=JSON.stringify(s.autonomy.plan.targets);C.advance(s);assert.equal(JSON.stringify(s.autonomy.plan.targets),targets);
});

test('citizens build through city rules and report their actual investment',()=>{
  const s=C.createCity();C.setAutonomy(s,{enabled:true});const before=s.money,tiles=s.tiles.filter(t=>t.type!=='empty').length,r=C.advance(s);
  assert.ok(r.civic.spent>0);assert.ok(s.tiles.filter(t=>t.type!=='empty').length>tiles);
  assert.equal(s.money,before+r.net-r.civic.spent+r.civic.rewards+r.rewards.reduce((sum,g)=>sum+g.reward,0));
  const entry=s.autonomy.reports[0];assert.equal(entry.spent,r.civic.spent);assert.equal(entry.metrics.population,s.population);assert.ok(entry.actions.length>0);
});

test('reserve and pause are enforced without hidden spending',()=>{
  const s=C.createCity();C.setAutonomy(s,{enabled:true,reserve:1000});const r=C.advance(s);assert.equal(r.civic.spent,0);
  C.setAutonomy(s,{enabled:false});const before=JSON.stringify(s.tiles),reports=s.autonomy.reports.length;C.advance(s);
  assert.equal(JSON.stringify(s.tiles),before);assert.equal(s.autonomy.reports.length,reports);
});

test('autonomous cities develop over time and produce quarterly factual reports',()=>{
  const s=C.createCity();C.setAutonomy(s,{enabled:true,focus:'balanced'});
  const originals=s.tiles.flatMap((t,id)=>t.type!=='empty'?[[id,t.type]]:[]);
  for(let i=0;i<360;i++)C.advance(s);
  assert.ok(s.population>=4000,`population ${s.population}`);assert.equal(s.stage,7);assert.equal(s.metroStage,5);assert.equal(s.areas.length,13);assert.ok(s.economy.soldTotal>0);
  assert.ok(originals.every(([id,type])=>s.tiles[id].type===type),'autonomy never demolishes the existing town');
  assert.ok(s.autonomy.reports.some(r=>r.kind==='quarter'||r.kind==='annual'));assert.ok(s.autonomy.reports.length<=24);
  assert.ok(s.money>=s.autonomy.reserve);const r=C.restore(JSON.stringify(s));assert.ok(r);assert.deepEqual(r.autonomy,s.autonomy);
});

test('quarterly reports aggregate three real months and targets survive pause and resume',()=>{
  const s=C.createCity();C.setAutonomy(s,{enabled:true});const costs=[];
  for(let i=0;i<3;i++)costs.push(C.advance(s).civic.spent);
  const report=s.autonomy.reports[0];assert.equal(report.kind,'quarter');assert.equal(report.periodSpent,costs.reduce((a,b)=>a+b,0));assert.ok(report.metrics.population>report.before.population);
  const plan=JSON.stringify(s.autonomy.plan);C.setAutonomy(s,{enabled:false});C.setAutonomy(s,{enabled:true});assert.equal(JSON.stringify(s.autonomy.plan),plan);
  C.setAutonomy(s,{enabled:false,focus:'food'});C.setAutonomy(s,{enabled:true});assert.equal(s.autonomy.plan.focus,'food');
});

test('industry directors arrange real interdistrict supply when enterprises lack goods',()=>{
  const s=C.createCity();s.stage=7;s.metroStage=5;s.money=50000;s.areas=C.AREAS.map(a=>a.id);
  for(let x=3;x<=24;x++)if(s.tiles[C.index(x,13)].type==='empty')C.build(s,x,13,'road');
  for(const [x,y,type] of [[3,12,'vegetable'],[4,12,'warehouse'],[21,12,'warehouse'],[22,12,'mall'],[6,12,'solarfield'],[7,12,'reservoir']])assert.equal(C.build(s,x,y,type).ok,true);
  C.setAutonomy(s,{enabled:true,focus:'food'});for(let i=0;i<36;i++)C.advance(s);
  assert.ok(s.economy.routes.length>0);assert.ok(s.economy.transportedTotal>0);assert.ok(s.economy.soldTotal>0);
});

test('older cities receive a disabled council and malformed autonomy settings are rejected',()=>{
  const s=C.createCity();delete s.autonomy;const r=C.restore(JSON.stringify(s));assert.ok(r);assert.equal(r.autonomy.enabled,false);
  assert.equal(C.setAutonomy(r,{reserve:-1}).ok,false);r.autonomy.reports=[{month:1,kind:'invented'}];assert.equal(C.restore(JSON.stringify(r)),null);
});

test('an enclosed disconnected building does not block other autonomous construction',()=>{
  const s=C.createCity();s.money=100000;s.stage=7;s.metroStage=5;s.areas=C.AREAS.map(a=>a.id);
  for(let x=11;x<=17;x++)C.build(s,x,13,'road');
  for(let y=15;y<=17;y++)C.build(s,10,y,'road');
  for(let x=11;x<=17;x++)C.build(s,x,17,'road');
  for(let y=14;y<=16;y++)for(const x of [13,17])C.build(s,x,y,'road');
  for(const [x,y] of [[15,14],[15,16],[14,15],[16,15],[15,15]])assert.equal(C.build(s,x,y,'house').ok,true);
  assert.equal(C.stats(s).connected.has(C.index(15,15)),false);
  const originals=s.tiles.map(t=>t.type);C.setAutonomy(s,{enabled:true});
  let built=0;for(let i=0;i<4;i++)built+=C.advance(s).civic.actions.filter(a=>a.kind==='build').length;
  assert.ok(built>0,'other viable construction must continue');
  assert.equal(s.tiles[C.index(15,15)].type,'house');assert.ok(originals.every((t,id)=>t==='empty'||s.tiles[id].type===t));
});

test('autonomous city can restart its road network from town hall after all roads are removed',()=>{
  const s=C.createCity();for(let y=0;y<C.SIZE;y++)for(let x=0;x<C.SIZE;x++)if(s.tiles[C.index(x,y)].type==='road')C.build(s,x,y,'bulldoze');
  assert.equal(C.stats(s).roads.size,0);C.setAutonomy(s,{enabled:true});
  const result=C.advance(s);assert.ok(result.civic.actions.some(a=>a.kind==='road'));assert.ok(C.stats(s).roads.size>0);
});

test('the council publishes a real next building proposal and preserves it in the save',()=>{
  const s=C.createCity();s.money=10000;s.stage=7;s.metroStage=5;s.areas=C.AREAS.map(a=>a.id);C.setAutonomy(s,{enabled:true,focus:'food'});const before=s.money,result=C.advance(s);
  assert.equal(s.money,before+result.net-result.civic.spent+result.civic.rewards+result.rewards.reduce((sum,g)=>sum+g.reward,0),'preview must not spend or build');
  const p=s.autonomy.proposal;assert.ok(p);assert.equal(p.kind,'build');assert.ok(C.BUILDINGS[p.type]);
  assert.ok(p.x!==undefined,'available land must be identified');assert.equal(s.tiles[C.index(p.x,p.y)].type,'empty');
  assert.equal(C.canBuild(s,p.x,p.y,p.type).ok,true);assert.deepEqual(C.restore(JSON.stringify(s)).autonomy.proposal,p);
});

test('previously enabled autonomy saves migrate without losing plans or reports',()=>{
  const s=C.createCity();C.setAutonomy(s,{enabled:true});C.advance(s);delete s.autonomy.proposal;
  const restored=C.restore(JSON.stringify(s));assert.ok(restored);assert.equal(restored.autonomy.enabled,true);assert.equal(restored.autonomy.reports.length,1);assert.equal(restored.autonomy.proposal,null);
  C.advance(restored);assert.ok(restored.autonomy.proposal);assert.equal(restored.autonomy.reports.length,2);
});
