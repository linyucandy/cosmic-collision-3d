const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../pixel-city-engine');
test('all seven stages are reachable from the normal budget with road-connected districts',()=>{
const s=C.createCity();
function ensure(cost){let n=0;while(s.money<cost&&n++<400){if(C.stats(s).net<=0&&s.money<150&&!s.grantUsed)C.grant(s);C.advance(s)}if(s.money<cost)throw Error("Funding stalled stage "+s.stage+" balance "+s.money+" net "+C.stats(s).net)}
function unlock(id){const area=C.AREAS.find(a=>a.id===id);ensure(area.cost);let r=C.unlockArea(s,id);if(!r.ok)throw Error(r.message)}
function road(x,y){const t=s.tiles[C.index(x,y)];if(t.type==='road')return;if(t.type!=='empty')throw Error(`road occupied ${x},${y} ${t.type}`);ensure(C.BUILDINGS.road.cost);let r=C.build(s,x,y,'road');if(!r.ok)throw Error(r.message+' '+x+','+y);}
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
});
