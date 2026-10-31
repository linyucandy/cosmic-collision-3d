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
