const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let P;const source=fs.readFileSync('pickFish.html','utf8').match(/<script id="fishing-progression">([\s\S]*?)<\/script>/);
if(source){const context={module:{exports:{}}};vm.runInNewContext(source[1],context);P=context.module.exports;}
const fresh=()=>{assert.ok(P,'Missing fishing progression engine');return P.create();};
test('caught fish enter inventory and discovery records exactly once per catch token',()=>{
 const state=fresh();let a=P.catchFish(state,'crucian','cast-1',()=>0);
 assert.equal(a.ok,true);assert.equal(state.inventory.crucian,1);assert.equal(state.caught,1);assert.equal(state.gold,4);
 assert.equal(P.catchFish(state,'crucian','cast-1').ok,false);assert.equal(state.caught,1);
});
test('equipment consumes available fish atomically and improves real modifiers',()=>{
 const state=fresh();const before=P.modifiers(state);
 assert.equal(P.upgrade(state,'rod').ok,false);assert.equal(state.rod,0);
 for(let i=0;i<5;i++)P.catchFish(state,'crucian','c'+i);
 assert.equal(P.upgrade(state,'rod').ok,true);assert.equal(state.inventory.crucian,3);
 assert.ok(P.modifiers(state).progress>before.progress);assert.ok(P.modifiers(state).tension<before.tension);
 assert.equal(state.discovered.crucian,5);
 assert.equal(P.upgrade(state,'boat').ok,true);assert.ok(P.modifiers(state).speed>before.speed);
 const copy=JSON.stringify(state);assert.equal(P.upgrade(state,'rod').ok,false);assert.equal(JSON.stringify(state),copy);
});
test('zone gates, unlocks and completion rewards cannot be bypassed or repeated',()=>{
 const state=fresh();assert.equal(P.travel(state,1).ok,false);assert.equal(P.complete(state).ok,false);
 for(let i=0;i<5;i++)P.catchFish(state,'crucian','q'+i);
 P.upgrade(state,'rod');P.upgrade(state,'boat');
 assert.equal(P.complete(state).ok,true);const money=state.gold;
 assert.equal(P.complete(state).ok,false);assert.equal(state.gold,money);
 assert.equal(P.travel(state,1).ok,true);assert.equal(state.zone,1);
});
test('consuming fish preserves encyclopedia and best-size records',()=>{
 const state=fresh();for(let i=0;i<2;i++)P.catchFish(state,'bluegill','b'+i,()=>.75);
 const best=state.best.bluegill;P.upgrade(state,'rod');assert.equal(state.inventory.bluegill,0);
 assert.equal(state.discovered.bluegill,2);assert.equal(state.best.bluegill,best);
});
test('later waters alter difficulty, species pools and have rare fish safeguards',()=>{
 const state=fresh();state.cleared=[true,true,true,false];state.rod=3;state.boat=3;
 assert.equal(P.travel(state,3).ok,true);assert.ok(P.area(state).tension>1);assert.ok(P.area(state).current>0);
 state.zoneCatch[3]=8;assert.equal(P.chooseFish(state,()=>0).id,'koi-king');
});
test('valid saves round-trip and invalid or inconsistent saves are rejected',()=>{
 const state=fresh();P.catchFish(state,'crucian','save1');const restored=P.restore(JSON.stringify(state));assert.ok(restored);assert.equal(restored.caught,1);
 for(const patch of [{gold:-1},{rod:4},{zone:3},{inventory:{crucian:999}},{cleared:[false,true,false,false]},{caught:999}])assert.equal(P.restore(JSON.stringify({...state,...patch})),null);
 assert.equal(P.restore('{bad'),null);
 assert.equal(P.restore(JSON.stringify({...state,cleared:[true,true,true,true]})),null);
});
test('all four waters can be completed without a random progression dead end',()=>{
 const state=fresh();let catches=0;
 for(let zone=0;zone<4;zone++){
  assert.equal(P.travel(state,zone).ok,true);let finished=false;
  for(let attempt=0;attempt<150;attempt++){
   const fish=P.chooseFish(state,()=>0);assert.equal(P.catchFish(state,fish.id,'run-'+(++catches),()=>.5).ok,true);
   P.upgrade(state,'rod');P.upgrade(state,'boat');
   if(P.complete(state).ok){finished=true;break;}
  }
  assert.ok(finished,'Water '+zone+' is unreachable');
 }
 assert.equal(state.cleared.every(Boolean),true);assert.ok(state.discovered['koi-king']>=1);assert.ok(P.restore(JSON.stringify(state)));
});
