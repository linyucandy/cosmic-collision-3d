const test=require('node:test');
const assert=require('node:assert/strict');
let city;
try {city=require('../pixel-city-engine.js');} catch(_) {}
function fresh(){assert.ok(city,'City simulation engine is missing');return city.createCity(42);}
test('construction charges once and rejects water, occupied land and insufficient funds',()=>{
 const state=fresh(),money=state.money;
 assert.equal(city.build(state,6,10,'house').ok,true);
 assert.equal(state.money,money-city.BUILDINGS.house.cost);
 assert.equal(city.build(state,6,10,'house').ok,false);
 assert.equal(state.money,money-city.BUILDINGS.house.cost);
 assert.equal(city.build(state,0,0,'house').ok,false);
 state.money=0;assert.equal(city.build(state,6,9,'shop').ok,false);assert.equal(state.money,0);
});
test('a detached road cannot make housing active until connected to town hall',()=>{
 const state=fresh();state.money=5000;
 city.build(state,16,11,'road');city.build(state,16,10,'house');
 assert.equal(city.stats(state).connected.has(city.index(16,10)),false);
 city.build(state,15,11,'road');
 assert.equal(city.stats(state).connected.has(city.index(16,10)),true);
});
test('new districts remain locked until the correct stage and charge only once',()=>{
 const state=fresh();state.money=5000;
 assert.equal(city.SIZE,96);assert.equal(city.build(state,21,5,'road').ok,false);
 assert.equal(city.unlockArea(state,'north').ok,false);
 state.stage=1;const money=state.money;
 assert.equal(city.unlockArea(state,'north').ok,true);
 assert.equal(state.money,money-city.AREAS.find(a=>a.id==='north').cost);
 assert.equal(city.build(state,21,5,'road').ok,true);
 const after=state.money;assert.equal(city.unlockArea(state,'north').ok,false);assert.equal(state.money,after);
 assert.equal(city.unlockArea(state,'east').ok,false);
});
test('stage rewards are claimed once and later tasks cannot be skipped',()=>{
 const state=fresh();state.money=5000;
 assert.equal(city.claimStage(state).ok,false);city.build(state,6,10,'house');city.build(state,14,10,'shop');state.population=20;
 assert.ok(city.stageGoals(state).every(g=>g.value>=g.target));const money=state.money;
 const result=city.claimStage(state);assert.equal(result.ok,true);assert.equal(state.stage,1);assert.equal(state.money,money+city.STAGES[0].reward);
 assert.equal(city.claimStage(state).ok,false);assert.equal(state.stage,1);
});
test('new buildings require their stage, and connected services change capacity and coverage',()=>{
 const state=fresh();state.money=10000;
 assert.equal(city.build(state,6,10,'apartment').ok,false);state.stage=2;
 assert.equal(city.build(state,6,10,'apartment').ok,true);assert.equal(city.build(state,14,10,'school').ok,true);
 let report=city.stats(state);assert.equal(report.totalCapacity,40);assert.ok(report.educationCoverage>0);
 assert.equal(city.build(state,14,10,'bulldoze').ok,true);report=city.stats(state);assert.equal(report.educationCoverage,0);
});
test('financial stability requires consecutive supplied, happy, profitable months',()=>{
 const state=fresh();state.money=10000;city.build(state,6,10,'house');city.build(state,14,10,'shop');state.population=20;
 for(let i=0;i<3;i++)city.advance(state);assert.ok(state.stableMonths>=3);
 city.build(state,12,10,'bulldoze');city.advance(state);assert.equal(state.stableMonths,0);
});
test('old 20×20 saves migrate without moving tiles or losing progress',()=>{
 const modern=fresh(),tiles=[];for(let y=0;y<20;y++)for(let x=0;x<20;x++)tiles.push(modern.tiles[city.index(x,y)]);
 const legacy={...modern,version:1,tiles,money:1234,population:12,month:18,achievements:['neighbors']};
 delete legacy.stage;delete legacy.areas;delete legacy.stableMonths;
 const restored=city.restore(JSON.stringify(legacy));assert.ok(restored);assert.equal(restored.version,3);assert.equal(restored.tiles.length,96*96);
 assert.equal(restored.tiles[city.index(10,10)].type,'townhall');assert.equal(restored.tiles[city.index(8,10)].type,'house');
 assert.equal(restored.money,1234);assert.equal(restored.month,18);assert.ok(restored.achievements.includes('neighbors'));
 assert.equal(city.build(restored,21,5,'road').ok,false);
});
test('removing utilities reduces capacity and restoring them restores supply',()=>{
 const state=fresh(),before=city.stats(state);
 assert.equal(city.build(state,12,10,'bulldoze').ok,true);
 const shortage=city.stats(state);
 assert.ok(shortage.powerCapacity<shortage.powerDemand);
 assert.ok(shortage.activeCapacity<before.activeCapacity);
 city.build(state,12,10,'solar');
 assert.equal(city.stats(state).activeCapacity,before.activeCapacity);
});
test('monthly cash flow and growth are computed from functioning buildings',()=>{
 const state=fresh(),before=state.money,pop=state.population;
 city.advance(state);
 assert.equal(state.month,2);
 assert.equal(state.money,before+state.lastFinance.net);
 assert.ok(state.population>=pop);
 assert.ok(state.population<=city.stats(state).activeCapacity);
});
test('disconnected businesses do not earn revenue or provide jobs',()=>{
 const state=fresh(),before=city.stats(state);
 city.build(state,16,10,'shop');
 const after=city.stats(state);
 assert.equal(after.income,before.income);
 assert.equal(after.jobs,before.jobs);
 assert.ok(after.expense>before.expense);
});
test('demolition protects town hall and empty cells cannot generate refunds',()=>{
 const state=fresh(),money=state.money;
 assert.equal(city.build(state,10,10,'bulldoze').ok,false);
 assert.equal(city.build(state,5,5,'bulldoze').ok,false);
 assert.equal(state.money,money);
 city.build(state,8,10,'bulldoze');const refunded=state.money;
 city.build(state,8,10,'bulldoze');assert.equal(state.money,refunded);
});
test('milestones and emergency assistance can only pay once',()=>{
 const state=fresh();state.money=5000;
 city.build(state,6,10,'house');city.build(state,14,10,'shop');
 for(let i=0;i<30;i++)city.advance(state);
 assert.ok(state.achievements.includes('neighbors'));
 const count=state.achievements.length;
 city.advance(state);assert.equal(new Set(state.achievements).size,state.achievements.length);
 assert.ok(state.achievements.length>=count);
 state.money=0;assert.equal(city.grant(state).ok,true);
 const money=state.money;assert.equal(city.grant(state).ok,false);assert.equal(state.money,money);
});
test('saved towns round-trip, malformed or nonfinite saves are rejected',()=>{
 const state=fresh();city.build(state,6,10,'house');city.advance(state);
 const restored=city.restore(JSON.stringify(state));
 assert.equal(restored.money,state.money);assert.equal(restored.population,state.population);
 assert.deepEqual(restored.tiles,state.tiles);
 assert.equal(city.restore('{bad json'),null);
 assert.equal(city.restore(JSON.stringify({...state,money:null})),null);
 assert.equal(city.restore(JSON.stringify({...state,tiles:[]})),null);
 assert.equal(city.restore(JSON.stringify({...state,population:-1})),null);
});
