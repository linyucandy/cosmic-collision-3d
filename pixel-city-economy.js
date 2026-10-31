/* District inventories and monthly production. No DOM, timers or network access. */
(() => {
  'use strict';
  const GOODS={grain:{name:'粮食',price:3},vegetables:{name:'蔬菜',price:5},milk:{name:'牛奶',price:6},eggs:{name:'鸡蛋',price:5},flour:{name:'面粉',price:5},bread:{name:'面包',price:10},cheese:{name:'奶酪',price:12}};
  const BUILDINGS={
    field:{name:'粮田',cost:140,upkeep:3,jobs:4,power:1,water:3,unlock:2,category:'farm',description:'按季节每月收获 4–8 份粮食，供应牧场与磨坊。'},
    vegetable:{name:'蔬菜农场',cost:170,upkeep:4,jobs:5,power:2,water:4,unlock:2,category:'farm',description:'按季节每月收获 3–7 份蔬菜，可在商场出售。'},
    barn:{name:'奶牛牧场',cost:260,upkeep:6,jobs:6,power:3,water:4,unlock:3,category:'ranch',description:'每月消耗本区 2 份粮食，产出 3 份牛奶。'},
    coop:{name:'养鸡场',cost:190,upkeep:4,jobs:4,power:2,water:2,unlock:3,category:'ranch',description:'每月消耗本区 1 份粮食，产出 3 份鸡蛋。'},
    mill:{name:'磨坊',cost:240,upkeep:5,jobs:6,power:4,water:2,unlock:3,category:'industry',description:'每月消耗本区 3 份粮食，制成 3 份面粉。'},
    bakery:{name:'面包坊',cost:280,upkeep:6,jobs:8,power:4,water:3,unlock:4,category:'industry',description:'每月消耗本区 2 份面粉，制成 3 份面包。'},
    dairy:{name:'乳品工坊',cost:300,upkeep:6,jobs:8,power:4,water:3,unlock:4,category:'industry',description:'每月消耗本区 2 份牛奶，制成 3 份奶酪。'},
    warehouse:{name:'仓储中心',cost:220,upkeep:3,jobs:3,power:1,water:1,unlock:2,category:'logistics',description:'增加本区 160 份仓储。商业线路两端都需要已接通的仓库。'},
    depot:{name:'货运站',cost:320,upkeep:5,jobs:6,power:3,water:1,unlock:4,category:'logistics',description:'本区有接通的货运站时，发出线路运力从 12 提高到 24 份/月。'},
    mall:{name:'购物商场',cost:380,upkeep:8,jobs:16,power:6,water:4,unlock:3,category:'retail',description:'每月最多销售 12 份本区货物，顾客需求随全市人口增长。优先销售面包和奶酪。'},
    greenhouse:{name:'恒温温室',cost:460,upkeep:9,jobs:8,power:8,water:6,unlock:7,category:'farm',description:'不受季节减产影响，每月固定收获 8 份蔬菜。'},
    tradeport:{name:'国际贸易港',cost:1100,upkeep:16,jobs:20,power:8,water:4,unlock:7,category:'logistics',description:'本地零售后，每月最多出口 24 份剩余货物，售价为零售价的 80% 向下取整。港湾区运力为 40。'}
  };
  const RECIPES=[
    {building:'barn',input:'grain',amount:2,output:'milk',yield:3},
    {building:'coop',input:'grain',amount:1,output:'eggs',yield:3},
    {building:'mill',input:'grain',amount:3,output:'flour',yield:3},
    {building:'bakery',input:'flour',amount:2,output:'bread',yield:3},
    {building:'dairy',input:'milk',amount:2,output:'cheese',yield:3}
  ];
  const emptyGoods=()=>Object.fromEntries(Object.keys(GOODS).map(id=>[id,0]));
  const total=stock=>Object.values(stock).reduce((sum,n)=>sum+n,0);
  const blankLast=()=>({revenue:0,exportRevenue:0,transported:0,sold:emptyGoods(),produced:emptyGoods(),exported:emptyGoods()});
  const create=areas=>({version:1,stock:Object.fromEntries(areas.map(id=>[id,emptyGoods()])),routes:[],nextRouteId:1,revenueTotal:0,soldTotal:0,exportedTotal:0,transportedTotal:0,last:blankLast()});
  const season=month=>{const i=Math.floor(((month-1)%12)/3);return {name:['春','夏','秋','冬'][i],grain:[6,7,8,4][i],vegetables:[5,7,6,3][i]};};
  const integer=(value,min=0,max=1000000000)=>Number.isInteger(value)&&value>=min&&value<=max;
  function restore(raw,areas,openAreas){
    if(raw===undefined)return create(areas);
    if(!raw||raw.version!==1||!raw.stock||typeof raw.stock!=='object')return null;
    if(Object.keys(raw.stock).some(id=>!areas.includes(id))||!areas.slice(0,5).every(id=>Object.hasOwn(raw.stock,id)))return null;
    const validGoods=goods=>goods&&Object.keys(goods).length===Object.keys(GOODS).length&&Object.keys(GOODS).every(id=>integer(goods[id],0,1000000));
    if(!areas.every(id=>raw.stock[id]===undefined||validGoods(raw.stock[id])&&(openAreas.includes(id)||total(raw.stock[id])===0)))return null;
    if(!Array.isArray(raw.routes)||raw.routes.length>80||!integer(raw.nextRouteId,1,1000000))return null;
    const ids=new Set(),links=new Set();
    for(const r of raw.routes){
      if(!r||!integer(r.id,1,raw.nextRouteId-1)||ids.has(r.id)||!openAreas.includes(r.from)||!openAreas.includes(r.to)||r.from===r.to||!Object.hasOwn(GOODS,r.good)||!integer(r.quota??24,1,60)||typeof r.enabled!=='boolean')return null;
      const key=r.from+':'+r.to+':'+r.good;if(links.has(key))return null;ids.add(r.id);links.add(key);
    }
    if(!['revenueTotal','soldTotal','transportedTotal'].every(k=>integer(raw[k])))return null;
    const last=raw.last;if(!last||!integer(last.revenue)||!integer(last.transported)||!validGoods(last.sold)||!validGoods(last.produced)||!validGoods(last.exported??emptyGoods())||!integer(last.exportRevenue??0)||!integer(raw.exportedTotal??0))return null;
    return {version:1,stock:Object.fromEntries(areas.map(id=>[id,{...(raw.stock[id]||emptyGoods())}])),routes:raw.routes.map(r=>({id:r.id,from:r.from,to:r.to,good:r.good,quota:r.quota??24,enabled:r.enabled})),nextRouteId:raw.nextRouteId,revenueTotal:raw.revenueTotal,soldTotal:raw.soldTotal,exportedTotal:raw.exportedTotal??0,transportedTotal:raw.transportedTotal,last:{revenue:last.revenue,exportRevenue:last.exportRevenue??0,transported:last.transported,sold:{...last.sold},produced:{...last.produced},exported:{...(last.exported||emptyGoods())}}};
  }
  function simulate(state,report){
    const source=state.economy,stock=Object.fromEntries(Object.entries(source.stock).map(([id,goods])=>[id,{...goods}])),last=blankLast(),areas={},warnings=[],flows=[],weather=season(state.month);
    for(const id of Object.keys(stock)){
      const counts=report.areaActive[id],capacity=40+(counts.warehouse||0)*160;
      areas[id]={counts,capacity,used:total(stock[id]),revenue:0,sold:0};
      if(!state.areas.includes(id))continue;
      if(report.supply<1){if(Object.keys(counts).some(type=>Object.hasOwn(BUILDINGS,type)))warnings.push({area:id,text:'水电不足，生产与销售暂停。'});continue;}
      const bonus=id==='meadow'?2:0;
      for(const [type,good,yieldAmount] of [['field','grain',weather.grain+bonus],['vegetable','vegetables',weather.vegetables+bonus],['greenhouse','vegetables',8]]){
        const amount=Math.min((counts[type]||0)*yieldAmount,Math.max(0,capacity-total(stock[id])));
        stock[id][good]+=amount;last.produced[good]+=amount;
      }
      for(const recipe of RECIPES){
        const wanted=counts[recipe.building]||0;
        const yieldAmount=recipe.yield+(id==='highland'&&['barn','coop'].includes(recipe.building)?1:0);
        let done=0;
        while(done<wanted&&stock[id][recipe.input]>=recipe.amount&&total(stock[id])-recipe.amount+yieldAmount<=capacity){
          stock[id][recipe.input]-=recipe.amount;stock[id][recipe.output]+=yieldAmount;last.produced[recipe.output]+=yieldAmount;done++;
        }
        if(done<wanted)warnings.push({area:id,text:BUILDINGS[recipe.building].name+'等待'+(stock[id][recipe.input]<recipe.amount?GOODS[recipe.input].name:'仓储空位')+'。'});
      }
      if(total(stock[id])>=capacity)warnings.push({area:id,text:'仓储已满，增建仓库或将货物运往商场。'});
    }
    // Source budgets prevent same-month multi-hop delivery and duplicate goods.
    const available=Object.fromEntries(Object.entries(stock).map(([id,goods])=>[id,{...goods}])),incoming=Object.fromEntries(Object.keys(stock).map(id=>[id,emptyGoods()]));
    for(const route of source.routes){
      const from=areas[route.from],to=areas[route.to],limit=Math.min(route.quota??24,from.counts.metro&&to.counts.metro?60:(from.counts.depot||0)>0?24:12);
      let status=!route.enabled?'手动暂停':report.supply<1?'水电不足':!from.counts.warehouse||!to.counts.warehouse?'两端仓库需接通道路':'';
      let moved=0;
      if(!status){
        const room=Math.max(0,to.capacity-total(stock[route.to])-total(incoming[route.to]));
        moved=Math.min(limit,available[route.from][route.good],room);
        if(!moved)status=room<=0?'目的地仓储已满':'等待货源';
        available[route.from][route.good]-=moved;stock[route.from][route.good]-=moved;incoming[route.to][route.good]+=moved;last.transported+=moved;
      }
      flows.push({id:route.id,from:route.from,to:route.to,good:route.good,amount:moved,limit,status:status||'运输中'});
    }
    for(const id of Object.keys(stock))for(const good of Object.keys(GOODS))stock[id][good]+=incoming[id][good];
    // Each district draws from one shared city-wide customer budget.
    let demand=state.population>0?Math.max(1,Math.floor(state.population/8)):0;
    for(const id of Object.keys(stock)){
      if(report.supply<1)continue;
      let capacity=Math.min((areas[id].counts.mall||0)*(id==='cbd'?18:12),demand);
      for(const good of ['cheese','bread','milk','eggs','vegetables','flour','grain']){
        const sold=Math.min(stock[id][good],capacity);stock[id][good]-=sold;capacity-=sold;demand-=sold;
        last.sold[good]+=sold;last.revenue+=sold*GOODS[good].price;areas[id].revenue+=sold*GOODS[good].price;areas[id].sold+=sold;
      }
      if(areas[id].counts.mall&&!areas[id].sold)warnings.push({area:id,text:total(stock[id])?'商场客流不足。':'商场缺货，请建设本地产业或接入商业线路。'});
      areas[id].used=total(stock[id]);
    }
    for(const id of Object.keys(stock)){
      if(report.supply<1)continue;
      let capacity=(areas[id].counts.tradeport||0)*(id==='harbor'?40:24);
      for(const good of ['cheese','bread','milk','eggs','vegetables','flour','grain']){
        const amount=Math.min(stock[id][good],capacity),revenue=amount*Math.floor(GOODS[good].price*.8);stock[id][good]-=amount;capacity-=amount;last.exported[good]+=amount;last.revenue+=revenue;last.exportRevenue+=revenue;areas[id].revenue+=revenue;
      }
      areas[id].used=total(stock[id]);
    }
    const expense=source.routes.filter(r=>r.enabled).length*4;
    const next={...source,stock,last,revenueTotal:Math.min(1000000000,source.revenueTotal+last.revenue),soldTotal:Math.min(1000000000,source.soldTotal+total(last.sold)),exportedTotal:Math.min(1000000000,source.exportedTotal+total(last.exported)),transportedTotal:Math.min(1000000000,source.transportedTotal+last.transported)};
    return {next,areas,flows,warnings,season:weather,revenue:last.revenue,expense,sold:total(last.sold),transported:last.transported};
  }
  const api={GOODS,BUILDINGS,RECIPES,create,restore,simulate,season};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.CityEconomy=api;
})();
