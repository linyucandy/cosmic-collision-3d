const test=require('node:test'),assert=require('node:assert/strict'),C=require('../pixel-city-engine');
const full=()=>{const s=C.createCity();s.stage=7;s.money=100000;s.areas=C.AREAS.map(a=>a.id);return s;};

test('world has nine times the land and preserves the original district coordinates',()=>{
  const s=C.createCity();assert.equal(C.SIZE,96);assert.equal(s.tiles.length,9216);assert.equal(C.AREAS.length,13);
  assert.equal(C.areaAt(25,5),'north');assert.equal(C.areaAt(25,25),'valley');assert.equal(C.areaAt(48,16),'meadow');assert.equal(C.areaAt(80,80),'frontier');
  assert.equal(C.build(s,48,16,'road').ok,false);
});

test('32x32 cities migrate each coordinate and keep business stock, routes and completed projects',()=>{
  const s=full();s.areas=s.areas.filter(id=>['center','north','east','south','valley'].includes(id));s.economy.stock.center.grain=23;s.projectDone=['health'];
  for(let x=15;x<=21;x++)assert.equal(C.build(s,x,11,'road').ok,true);assert.equal(C.build(s,6,10,'warehouse').ok,true);assert.equal(C.build(s,21,10,'warehouse').ok,true);assert.equal(C.addRoute(s,'center','east','grain',4).ok,true);
  const old={...s,version:2,tiles:Array.from({length:1024},(_,i)=>s.tiles[C.index(i%32,Math.floor(i/32))])};
  old.economy={...s.economy,stock:Object.fromEntries(Object.entries(s.economy.stock).filter(([id])=>s.areas.includes(id)))};
  const r=C.restore(JSON.stringify(old));assert.ok(r);assert.equal(r.version,3);assert.equal(r.tiles.length,9216);assert.equal(r.tiles[C.index(10,10)].type,'townhall');assert.deepEqual(r.projectDone,['health']);assert.equal(r.economy.stock.center.grain,23);assert.equal(r.economy.stock.frontier.grain,0);
  assert.deepEqual(r.economy.routes,s.economy.routes);assert.equal(r.money,s.money);
});

test('new district acquisition requires a neighboring open region and charges once',()=>{
  const s=C.createCity();s.stage=7;s.money=100000;s.areas=['center','north','east','south','valley'];
  assert.equal(C.unlockArea(s,'highland').ok,false);const before=s.money;assert.equal(C.unlockArea(s,'meadow').ok,true);assert.ok(s.money<before);
  assert.equal(C.unlockArea(s,'highland').ok,true);const money=s.money;assert.equal(C.unlockArea(s,'highland').ok,false);assert.equal(s.money,money);
});

test('bridges connect roads over water and restore without losing the water terrain',()=>{
  const s=full();for(let x=2;x<=5;x++)assert.equal(C.build(s,x,11,'road').ok,true);
  assert.equal(C.build(s,1,11,'road').ok,false);assert.equal(C.build(s,1,11,'bridge').ok,true);assert.equal(C.build(s,0,11,'bridge').ok,true);
  assert.ok(C.stats(s).roads.has(C.index(0,11)));assert.ok(C.restore(JSON.stringify(s)));
  assert.equal(C.build(s,1,11,'bulldoze').ok,true);assert.equal(s.tiles[C.index(1,11)].terrain,'water');assert.ok(!C.stats(s).roads.has(C.index(0,11)));
});

test('large utilities and public transport support larger homes and tourism generates real monthly income',()=>{
  const s=full();const add=(x,y,t)=>assert.equal(C.build(s,x,y,t).ok,true,t);
  add(6,10,'block');add(14,10,'bus');add(6,12,'solarfield');add(7,12,'reservoir');add(8,12,'hotel');add(9,12,'museum');add(11,12,'resort');
  const r=C.stats(s);assert.ok(r.totalCapacity>=136);assert.ok(r.transitCoverage>0);assert.ok(r.visitors>0);assert.ok(r.tourismIncome>0);assert.ok(r.powerCapacity>=256);
  const before=s.money;C.advance(s);assert.equal(s.lastFinance.tourismIncome,C.stats(s).tourismIncome);assert.equal(s.money,before+s.lastFinance.net);
});

test('trade ports export remaining goods and preserve export history in saves',()=>{
  const s=full();assert.equal(C.build(s,6,10,'tradeport').ok,true);assert.equal(C.build(s,14,10,'warehouse').ok,true);s.economy.stock.center.cheese=40;
  const forecast=C.stats(s);assert.equal(forecast.economy.next.last.exported.cheese,24);assert.equal(s.economy.stock.center.cheese,40);
  C.advance(s);assert.equal(s.economy.stock.center.cheese,16);assert.equal(s.economy.exportedTotal,24);assert.equal(s.economy.last.exportRevenue,24*9);
  assert.equal(C.restore(JSON.stringify(s)).economy.exportedTotal,24);
});

test('new land specialties change harvest and animal yields with connected buildings',()=>{
  const s=full();for(let x=15;x<=80;x++)assert.equal(C.build(s,x,11,s.tiles[C.index(x,11)].terrain==='water'?'bridge':'road').ok,true);
  for(let y=12;y<=16;y++)for(const x of [48,80])assert.equal(C.build(s,x,y,'road').ok,true);
  for(const [x,y,type] of [[6,10,'field'],[47,16,'field'],[79,16,'barn']])assert.equal(C.build(s,x,y,type).ok,true);
  s.economy.stock.highland.grain=10;C.advance(s);
  assert.equal(s.economy.stock.center.grain,6);assert.equal(s.economy.stock.meadow.grain,8);assert.equal(s.economy.stock.highland.milk,4);
});

test('paired metro freight terminals carry sixty real units per route',()=>{
  const s=full();for(let x=3;x<=24;x++)if(s.tiles[C.index(x,13)].type==='empty')assert.equal(C.build(s,x,13,'road').ok,true);
  for(const [x,y,type] of [[3,12,'warehouse'],[21,12,'warehouse'],[4,12,'metro'],[22,12,'metro']])assert.equal(C.build(s,x,y,type).ok,true);
  s.economy.stock.center.grain=80;assert.equal(C.addRoute(s,'center','east','grain',60).ok,true);C.advance(s);
  assert.equal(s.economy.stock.center.grain,20);assert.equal(s.economy.stock.east.grain,60);assert.ok(C.restore(JSON.stringify(s)));
});
