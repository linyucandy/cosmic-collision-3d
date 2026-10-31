const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../pixel-city-engine');
function city(){const s=C.createCity();s.stage=7;s.areas=C.AREAS.map(a=>a.id);s.money=100000;
  for(let x=3;x<=30;x++)if(s.tiles[C.index(x,13)].type==='empty')assert.equal(C.build(s,x,13,'road').ok,true);
  assert.equal(C.build(s,14,12,'road').ok,true);C.build(s,6,12,'wind');C.build(s,7,12,'pump');return s;}
function build(s,x,y,type){assert.equal(C.build(s,x,y,type).ok,true,`${type} at ${x},${y}`);}

test('farms produce seasonal inventory, while ranches require real feed',()=>{
  const s=city();build(s,3,12,'barn');C.advance(s);assert.equal(s.economy.stock.center.milk,0);
  build(s,4,12,'field');build(s,5,12,'vegetable');C.advance(s);
  assert.ok(s.economy.stock.center.grain>0);assert.equal(s.economy.stock.center.milk,3);assert.ok(s.economy.stock.center.vegetables>0);
  const before=s.economy.stock.center.grain;build(s,16,4,'field');C.advance(s);
  assert.ok(s.economy.stock.center.grain-before<=8,'unconnected fields do not produce');
});

test('processing consumes inputs, storage caps output, and sales enter monthly finance once',()=>{
  const s=city();build(s,3,12,'field');build(s,4,12,'mill');build(s,5,12,'bakery');build(s,8,12,'mall');
  C.advance(s);assert.ok(s.economy.last.revenue>0);assert.ok(s.economy.last.sold.bread>0);
  assert.equal(s.lastFinance.tradeRevenue,s.economy.last.revenue);
  const balance=s.money;C.stats(s);C.stats(s);assert.equal(s.money,balance,'forecast is read only');
  build(s,8,12,'bulldoze');for(let i=0;i<40;i++)C.advance(s);
  assert.ok(Object.values(s.economy.stock.center).reduce((a,b)=>a+b,0)<=40);
});

test('commercial routes need warehouses, move actual goods, pause on disconnection and survive reload',()=>{
  const s=city();assert.equal(C.addRoute(s,'center','east','vegetables').ok,false);
  build(s,3,12,'vegetable');build(s,4,12,'warehouse');build(s,21,12,'warehouse');build(s,22,12,'mall');
  const before=s.money;assert.equal(C.addRoute(s,'center','east','vegetables').ok,true);assert.equal(s.money,before-120);
  assert.equal(C.addRoute(s,'center','east','vegetables').ok,false);
  C.advance(s);assert.ok(s.economy.last.transported>0);assert.ok(s.economy.last.sold.vegetables>0);
  const restored=C.restore(JSON.stringify(s));assert.deepEqual(restored.economy,s.economy);
  const held=s.economy.stock.east.vegetables;build(s,21,12,'bulldoze');C.advance(s);assert.equal(s.economy.last.transported,0);
  assert.ok(s.economy.stock.east.vegetables<=held,'existing mall stock may still be sold');
  for(let i=0;i<20;i++)C.advance(s);assert.equal(s.economy.last.revenue,0);
  assert.equal(C.removeRoute(s,s.economy.routes[0].id).ok,true);assert.equal(s.economy.routes.length,0);
});

test('old city saves receive empty district inventories without losing built city or rewards',()=>{
  const s=city();delete s.economy;s.projectDone=['health'];const r=C.restore(JSON.stringify(s));
  assert.equal(r.money,s.money);assert.deepEqual(r.tiles,s.tiles);assert.deepEqual(r.projectDone,['health']);assert.equal(r.economy.stock.center.grain,0);
  r.economy.stock.center.grain=-1;assert.equal(C.restore(JSON.stringify(r)),null);
});

test('routes respect source inventory and cannot carry newly arrived goods a second hop in one month',()=>{
  const s=city();for(let x=11;x<=26;x++)if(s.tiles[C.index(x,9)].type==='empty')build(s,x,9,'road');
  build(s,3,12,'warehouse');build(s,21,12,'warehouse');build(s,22,8,'warehouse');
  s.economy.stock.center.grain=30;
  assert.equal(C.addRoute(s,'center','east','grain').ok,true);assert.equal(C.addRoute(s,'east','north','grain').ok,true);
  C.advance(s);assert.equal(s.economy.stock.center.grain,18);assert.equal(s.economy.stock.east.grain,12);assert.equal(s.economy.stock.north.grain,0);
  C.advance(s);assert.equal(s.economy.stock.north.grain,12);
  assert.equal(C.toggleRoute(s,s.economy.routes[0].id).ok,true);const held=s.economy.stock.center.grain;C.advance(s);assert.equal(s.economy.stock.center.grain,held);
});

test('short utilities pause every operating step and a full warehouse preserves its stock',()=>{
  const s=city();build(s,3,12,'field');build(s,4,12,'warehouse');s.economy.stock.center.grain=200;
  C.advance(s);assert.equal(s.economy.stock.center.grain,200);
  build(s,4,12,'bulldoze');C.advance(s);assert.equal(s.economy.stock.center.grain,200,'demolition must not delete stored goods');
  for(const [x,y] of [[12,10],[6,12]])build(s,x,y,'bulldoze');
  s.economy.stock.center.grain=0;C.advance(s);assert.equal(s.economy.stock.center.grain,0);
});

test('route quotas split a harvest between multiple businesses',()=>{
  const s=city();for(let x=11;x<=26;x++)if(s.tiles[C.index(x,9)].type==='empty')build(s,x,9,'road');
  build(s,3,12,'warehouse');build(s,21,12,'warehouse');build(s,22,8,'warehouse');s.economy.stock.center.grain=10;
  assert.equal(C.addRoute(s,'center','east','grain',4).ok,true);assert.equal(C.addRoute(s,'center','north','grain',6).ok,true);
  C.advance(s);assert.equal(s.economy.stock.east.grain,4);assert.equal(s.economy.stock.north.grain,6);
});
