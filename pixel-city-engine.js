/* The simulation is independent of the renderer and browser storage. */
(() => {
  const SIZE=20;
  const BUILDINGS={
    road:{name:'道路',cost:10,upkeep:0.15,description:'连接市政厅与建筑。按住拖动可连续铺设。',key:'1'},
    house:{name:'住宅',cost:60,upkeep:0.8,capacity:8,power:2,water:2,description:'提供 8 人住所，需要连接道路、水和电。',key:'2'},
    shop:{name:'商店',cost:90,upkeep:2,jobs:6,power:3,water:1,description:'提供 6 个岗位，让街区有工作也有烟火气。',key:'3'},
    factory:{name:'工厂',cost:130,upkeep:4,jobs:12,power:5,water:3,description:'提供 12 个岗位。远离住宅，减少污染影响。',key:'4'},
    park:{name:'公园',cost:40,upkeep:1,description:'提升 3 格范围内住宅的幸福感。',key:'5'},
    solar:{name:'太阳能',cost:110,upkeep:2,description:'为接通道路的城市提供 32 单位电力。',key:'6'},
    water:{name:'水塔',cost:90,upkeep:2,description:'为接通道路的城市提供 32 单位供水。',key:'7'},
    clinic:{name:'诊所',cost:160,upkeep:5,power:3,water:2,description:'改善 5 格范围内住宅的公共服务。',key:'8'},
    bulldoze:{name:'拆除',cost:0,description:'拆除已有建筑，收回建造费用的四分之一。',key:'B'},
    hand:{name:'移动',cost:0,description:'拖动画布平移。也可右键拖动或按住空格。',key:'H'},
    townhall:{name:'市政厅',cost:0,upkeep:2,description:'城市的道路网络从这里出发。不能拆除。'}
  };
  const GOALS=[
    {id:'neighbors',name:'欢迎新邻居',description:'人口达到 20 人',target:20,reward:120},
    {id:'town',name:'热闹的小镇',description:'人口达到 50 人',target:50,reward:250},
    {id:'city',name:'我们的城市',description:'人口达到 100 人',target:100,reward:500},
    {id:'green',name:'绿色宜居城',description:'30 人、3 座公园、幸福度 85%',target:30,reward:180}
  ];
  const index=(x,y)=>y*SIZE+x;
  const inBounds=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
  const neighbors=id=>{const x=id%SIZE,y=Math.floor(id/SIZE);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inBounds(a,b)).map(([a,b])=>index(a,b));};
  const distance=(a,b)=>Math.abs(a%SIZE-b%SIZE)+Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function createCity(seed=42) {
    const tiles=Array.from({length:SIZE*SIZE},(_,id)=>{
      const x=id%SIZE,y=Math.floor(id/SIZE);
      return {terrain:x<2+(y>13?1:0)||(x>16&&y>14)?'water':'grass',type:'empty'};
    });
    const put=(x,y,type)=>{tiles[index(x,y)]={terrain:'grass',type};};
    for(let x=6;x<=14;x++)put(x,11,'road');
    for(let y=8;y<=14;y++)if(y!==10)put(10,y,'road');
    put(10,10,'townhall');put(8,10,'house');put(9,10,'house');put(11,10,'shop');
    put(12,10,'solar');put(13,10,'water');put(7,10,'park');
    return {version:1,seed:seed>>>0,tiles,money:900,population:12,month:1,achievements:[],grantUsed:false,
      lastFinance:{income:0,expense:0,net:0},lastGrowth:0};
  }
  function stats(state) {
    const hall=state.tiles.findIndex(tile=>tile.type==='townhall'),roadSet=new Set(),queue=hall<0?[]:[hall];
    for(let head=0;head<queue.length;head++)for(const id of neighbors(queue[head])) {
      if(state.tiles[id].type==='road'&&!roadSet.has(id)) {roadSet.add(id);queue.push(id);}
    }
    const connected=new Set(hall>=0?[hall]:[]),counts={},homes=[],parks=[],clinics=[],factories=[];
    let powerDemand=0,waterDemand=0,rawJobs=0,totalCapacity=0,rawCapacity=0,powerCapacity=0,waterCapacity=0,expense=0,disconnected=0,businessIncome=0;
    for(let id=0;id<state.tiles.length;id++) {
      const type=state.tiles[id].type,definition=BUILDINGS[type];
      if(!definition)continue;
      counts[type]=(counts[type]||0)+1;expense+=definition.upkeep||0;
      if(type==='house')totalCapacity+=8;
      const active=type==='townhall'||roadSet.has(id)||neighbors(id).some(next=>roadSet.has(next));
      if(!active){if(type!=='road')disconnected++;continue;}
      connected.add(id);
      if(type==='shop')businessIncome+=3;
      if(type==='factory')businessIncome+=4;
      powerDemand+=definition.power||0;waterDemand+=definition.water||0;rawJobs+=definition.jobs||0;
      if(type==='house'){rawCapacity+=8;homes.push(id);}
      if(type==='park')parks.push(id);
      if(type==='clinic')clinics.push(id);
      if(type==='factory')factories.push(id);
      if(type==='solar')powerCapacity+=32;
      if(type==='water')waterCapacity+=32;
    }
    const supply=Math.min(powerDemand?powerCapacity/powerDemand:1,waterDemand?waterCapacity/waterDemand:1,1);
    const activeCapacity=Math.floor(rawCapacity*supply),jobs=Math.floor(rawJobs*supply);
    const parkCoverage=homes.length?homes.filter(home=>parks.some(park=>distance(home,park)<=3)).length/homes.length:0;
    const clinicCoverage=homes.length?homes.filter(home=>clinics.some(clinic=>distance(home,clinic)<=5)).length/homes.length:0;
    const pollution=homes.length?homes.filter(home=>factories.some(factory=>distance(home,factory)<=4)).length/homes.length:0;
    const employment=state.population?Math.min(1,jobs/state.population):1;
    const happiness=Math.round(clamp(60+parkCoverage*20+clinicCoverage*12*supply+employment*14-pollution*24-(1-supply)*45-Math.min(15,disconnected*2),10,100));
    const employed=Math.min(state.population,jobs);
    const income=Math.round(state.population*1.1+employed*1.2+businessIncome*supply);
    expense=Math.round(expense);
    return {connected,roads:roadSet,counts,totalCapacity,activeCapacity,jobs,employed,happiness,powerDemand,waterDemand,powerCapacity,waterCapacity,
      supply,parkCoverage,clinicCoverage,pollution,disconnected,income,expense,net:income-expense};
  }
  function canBuild(state,x,y,type) {
    if(!inBounds(x,y))return {ok:false,message:'请在城市地图内建设。'};
    const tile=state.tiles[index(x,y)],definition=BUILDINGS[type];
    if(!definition||['hand','townhall'].includes(type))return {ok:false,message:'选择一种建筑再点击地图。'};
    if(type==='bulldoze') {
      if(tile.type==='townhall')return {ok:false,message:'市政厅是城市的起点，不能拆除。'};
      if(tile.type==='empty')return {ok:false,message:'这里没有需要拆除的建筑。'};
      return {ok:true,cost:0};
    }
    if(tile.terrain==='water')return {ok:false,message:'这里是水面，请选择草地。'};
    if(tile.type!=='empty')return {ok:false,message:'这块地已有建筑，可以先用拆除工具清理。'};
    if(state.money<definition.cost)return {ok:false,message:`资金不足，${definition.name}需要 ${definition.cost} 城币。`};
    return {ok:true,cost:definition.cost};
  }
  function build(state,x,y,type) {
    const result=canBuild(state,x,y,type);if(!result.ok)return result;
    const id=index(x,y),tile=state.tiles[id];
    if(type==='bulldoze') {
      const refund=Math.floor((BUILDINGS[tile.type]?.cost||0)*0.25);
      tile.type='empty';state.money+=refund;
      state.population=Math.min(state.population,stats(state).totalCapacity);
      return {ok:true,message:`已拆除，回收 ${refund} 城币。`};
    }
    state.money-=BUILDINGS[type].cost;tile.type=type;
    const connected=stats(state).connected.has(id);
    return {ok:true,message:`${BUILDINGS[type].name}建成 · −${BUILDINGS[type].cost} 城币${!connected&&type!=='road'?' · 还需要连接市政道路':''}`};
  }
  function advance(state) {
    let report=stats(state),growth=0;
    if(state.population>report.activeCapacity||report.happiness<35)growth=-Math.min(8,Math.max(1,Math.ceil((state.population-report.activeCapacity)*0.3)));
    else if(state.population<report.activeCapacity&&report.happiness>=45&&report.jobs>state.population*0.45)growth=Math.min(report.activeCapacity-state.population,Math.max(1,Math.floor((report.happiness-40)/18)));
    state.population=Math.max(0,state.population+growth);state.lastGrowth=growth;state.month++;
    report=stats(state);state.lastFinance={income:report.income,expense:report.expense,net:report.net};state.money+=report.net;
    const rewards=[];
    for(const goal of GOALS) {
      const met=state.population>=goal.target&&(goal.id!=='green'||((report.counts.park||0)>=3&&report.happiness>=85));
      if(met&&!state.achievements.includes(goal.id)){state.achievements.push(goal.id);state.money+=goal.reward;rewards.push(goal);}
    }
    return {growth,rewards,...report};
  }
  function grant(state) {
    if(state.grantUsed)return {ok:false,message:'这座城市已经领取过一次援助。'};
    if(state.money>=150)return {ok:false,message:'资金低于 150 时，可申请一次 250 城币援助。'};
    state.grantUsed=true;state.money+=250;return {ok:true,message:'获得一次性市政援助 +250。合理安排接下来的建设吧！'};
  }
  function restore(raw) {
    try {
      const value=typeof raw==='string'?JSON.parse(raw):raw;
      if(!value||value.version!==1||!Array.isArray(value.tiles)||value.tiles.length!==SIZE*SIZE)return null;
      for(const [key,min,max] of [['money',-1000000,1000000000],['population',0,3200],['month',1,1000000],['seed',0,4294967295]])if(!Number.isInteger(value[key])||value[key]<min||value[key]>max)return null;
      if(!value.tiles.every(tile=>tile&&['grass','water'].includes(tile.terrain)&&['empty','road','house','shop','factory','park','solar','water','clinic','townhall'].includes(tile.type)&&(tile.terrain!=='water'||tile.type==='empty')))return null;
      if(value.tiles.filter(tile=>tile.type==='townhall').length!==1)return null;
      if(!Array.isArray(value.achievements)||value.achievements.some(id=>!GOALS.some(goal=>goal.id===id)))return null;
      const result=createCity(value.seed);
      for(const key of ['money','population','month'])result[key]=value[key];
      result.tiles=value.tiles.map(tile=>({terrain:tile.terrain,type:tile.type}));
      result.achievements=[...new Set(value.achievements)];result.grantUsed=value.grantUsed===true;
      return result;
    }catch(_){return null;}
  }
  const api={SIZE,BUILDINGS,GOALS,index,inBounds,createCity,stats,canBuild,build,advance,grant,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PixelCity=api;
})();
