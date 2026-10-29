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
 assert.equal(city.stats(state).connected.has(16+10*20),false);
 city.build(state,15,11,'road');
 assert.equal(city.stats(state).connected.has(16+10*20),true);
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
