const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../pixel-city-engine');
test('all seven stages are reachable from the normal budget with road-connected districts',()=>{
const s=C.createCity();
function ensure(cost){let n=0;while(s.money<cost&&n++<400){if(C.stats(s).net<=0&&s.money<150&&!s.grantUsed)C.grant(s);C.advance(s)}if(s.money<cost)throw Error("Funding stalled stage "+s.stage+" balance "+s.money+" net "+C.stats(s).net)}
function unlock(id){const area=C.AREAS.find(a=>a.id===id);ensure(area.cost);let r=C.unlockArea(s,id);if(!r.ok)throw Error(r.message)}
function road(x,y){const t=s.tiles[C.index(x,y)];if(['road','bridge'].includes(t.type))return;if(t.type!=='empty')throw Error(`road occupied ${x},${y} ${t.type}`);const type=t.terrain==='water'?'bridge':'road';ensure(C.BUILDINGS[type].cost);let r=C.build(s,x,y,type);if(!r.ok)throw Error(r.message+' '+x+','+y);}
function line(x1,y1,x2,y2){let x=x1,y=y1;road(x,y);while(x!==x2||y!==y2){x+=Math.sign(x2-x);y+=Math.sign(y2-y);road(x,y)}}
function plot(type,area='center',n=1){for(let k=0;k<n;k++){const r=C.stats(s);let spots=[];for(let y=0;y<C.SIZE;y++)for(let x=0;x<C.SIZE;x++){if(C.areaAt(x,y)!==area||s.tiles[C.index(x,y)].type!=='empty'||s.tiles[C.index(x,y)].terrain!=='grass')continue;if(area==='center'&&x===10&&y>=18)continue;if(area==='south'&&x===16&&y>=22)continue;const adjacent=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>C.inBounds(a,b)&&r.roads.has(C.index(a,b)));if(adjacent)spots.push([x,y]);}spots.sort((a,b)=>(Math.abs(a[0]-9)+Math.abs(a[1]-13))-(Math.abs(b[0]-9)+Math.abs(b[1]-13)));if(!spots.length)throw Error('no space '+type+' '+area);let [x,y]=spots[0];ensure(C.BUILDINGS[type].cost);let res=C.build(s,x,y,type);if(!res.ok)throw Error(res.message);}}
function grow(target){let n=0;while(s.population<target&&n++<300)C.advance(s);if(s.population<target)throw Error('growth stalled '+JSON.stringify({target,pop:s.population,stats:C.stats(s)}));for(let i=0;i<12;i++)C.advance(s)}
function claim(){const goals=C.stageGoals(s),missing=goals.filter(g=>g.value<g.target);if(missing.length)throw Error('goals');if(!C.claimStage(s).ok)throw Error('claim')}
line(3,13,19,13);line(10,14,10,17);line(3,17,16,17);line(10,9,19,9);
plot('house');plot('shop');grow(20);claim();
unlock('north');line(19,9,30,9);plot('park','north');plot('clinic','north');plot('school','north');plot('apartment','north');plot('apartment','center',2);plot('shop','center',2);plot('solar');plot('water');grow(45);claim();
unlock('east');line(19,13,30,13);plot('office','east',3);plot('apartment','center',4);plot('office','center',2);plot('solar');plot('water');grow(90);claim();
unlock('south');line(10,17,10,21);line(3,21,16,21);plot('police','south');plot('library','south');plot('recycling','south');plot('park','south');grow(150);claim();
unlock('valley');line(16,21,16,23);line(16,23,30,23);plot('wind','valley');plot('pump','valley');plot('park','valley');plot('clinic','valley');plot('school','valley');plot('apartment','center',4);grow(220);claim();
plot('office','east');plot('school','center');plot('clinic','center');plot('park','center');plot('office','center',3);plot('apartment','center',3);grow(300);claim();
for(const area of ['north','east','south','valley'])while(C.stats(s).areaBuildings[area]<8)plot('park',area);
plot('apartment','center',4);plot('office','center',5);plot('wind','center');plot('pump','center');grow(400);claim();
assert.equal(s.stage,C.STAGES.length);assert.ok(s.population>=400);assert.ok(s.stableMonths>=12);assert.ok(C.restore(JSON.stringify(s)));
// Continue the same earned city through every new long-term project.
plot('hospital');plot('university');plot('tech','center',3);plot('tower','center',5);plot('wind','center',3);plot('pump','center',3);plot('recycling','center',2);
grow(600);
for(const project of C.PROJECTS){const missing=C.projectGoals(s,project.id).filter(g=>g.value<g.target);assert.deepEqual(missing,[],project.name);assert.equal(C.claimProject(s,project.id).ok,true);}
assert.equal(s.projectDone.length,4);assert.equal(C.acceptContract(s,'budget').ok,true);
for(let i=0;i<3;i++)C.advance(s);
assert.equal(C.claimContract(s).ok,true);assert.equal(C.restore(JSON.stringify(s)).contractsCompleted,1);
// Use the same earned city to combine separate farming, ranching and retail districts.
for(let y=8;y>=3;y--){const tile=s.tiles[C.index(25,y)];if(tile.type!=='empty'&&tile.type!=='road')assert.equal(C.build(s,25,y,'bulldoze').ok,true);road(25,y);}
plot('field','north',2);plot('vegetable','north');plot('warehouse','north');plot('depot','north');
plot('barn','south');plot('coop','south');plot('dairy','south');plot('warehouse','south');
plot('mill','east');plot('bakery','east');plot('mall','east');plot('warehouse','east');
plot('wind','valley',2);plot('pump','valley',2);
for(const [from,to,good,quota] of [['north','south','grain',4],['north','east','grain',4],['north','east','vegetables',6],['south','east','eggs',3],['south','east','cheese',3]]){
  ensure(120);assert.equal(C.addRoute(s,from,to,good,quota).ok,true);
}
for(let i=0;i<24;i++)C.advance(s);
assert.ok(s.economy.last.produced.milk>0);assert.ok(s.economy.last.produced.bread>0);assert.ok(s.economy.last.produced.cheese>0);
assert.ok(s.economy.soldTotal>100);assert.ok(s.economy.transportedTotal>200);assert.ok(s.economy.revenueTotal>1000);
assert.ok(s.lastFinance.tradeRevenue>0);assert.deepEqual(C.restore(JSON.stringify(s)).economy,s.economy);
// Expand this same earned city into all eight large regions and finish the metro plans.
function connectTo(x,y){const target=C.index(x,y),parents=new Int32Array(C.SIZE*C.SIZE);parents.fill(-2);const q=[...C.stats(s).roads];for(const id of q)parents[id]=-1;
  for(let head=0;head<q.length&&parents[target]===-2;head++){const id=q[head],px=id%C.SIZE,py=Math.floor(id/C.SIZE);for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){if(!C.inBounds(nx,ny)||!s.areas.includes(C.areaAt(nx,ny)))continue;const next=C.index(nx,ny);if(parents[next]!==-2||!['empty','road','bridge'].includes(s.tiles[next].type))continue;parents[next]=id;q.push(next);}}
  assert.notEqual(parents[target],-2,'new region needs a buildable road connection');const path=[];for(let id=target;parents[id]!==-1;id=parents[id])path.push(id);for(const id of path.reverse())road(id%C.SIZE,Math.floor(id/C.SIZE));
}
function district(id){unlock(id);const a=C.AREAS.find(a=>a.id===id);connectTo(...a.center);for(let y=a.center[1]-11;y<=a.center[1]+11;y++)road(a.center[0],y);
  plot('solarfield',id);plot('reservoir',id);plot('block',id,4);plot('hub',id,3);plot('metro',id);plot('park',id,2);plot('clinic',id,2);plot('school',id,2);
}
function claimMetro(){assert.deepEqual(C.metroGoals(s).filter(g=>g.value<g.target),[],'all metro objectives must be genuinely met');assert.equal(C.claimMetroPlan(s).ok,true);}
district('meadow');district('lakeside');plot('bus','center',2);plot('metro','center',2);grow(800);claimMetro();
district('highland');district('cbd');grow(1200);claimMetro();
district('forest');plot('hotel','forest',2);plot('museum','forest',2);plot('resort','forest',2);grow(1600);claimMetro();
district('science');district('harbor');plot('tradeport','harbor',2);plot('greenhouse','harbor',8);grow(2400);claimMetro();
district('frontier');grow(4000);claimMetro();
assert.equal(s.metroStage,C.METRO_PLANS.length);assert.equal(s.areas.length,13);assert.ok(s.population>=4000);assert.ok(s.economy.exportedTotal>=200);assert.ok(C.restore(JSON.stringify(s)));
const finalBalance=s.money;assert.equal(C.claimMetroPlan(s).ok,false);assert.equal(s.money,finalBalance,'completed plans cannot pay twice');
});
