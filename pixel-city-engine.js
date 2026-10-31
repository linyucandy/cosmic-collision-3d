/* The simulation is independent of the renderer and browser storage. */
(() => {
  const SIZE=32,OLD_SIZE=20;
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
    apartment:{name:'公寓',cost:160,upkeep:3,capacity:24,power:5,water:5,unlock:1,description:'提供 24 人住所，适合人口增长后的街区。'},
    school:{name:'学校',cost:200,upkeep:5,power:3,water:2,unlock:1,description:'改善 5 格内住宅的教育服务与幸福度。'},
    office:{name:'办公楼',cost:220,upkeep:6,jobs:20,power:5,water:3,unlock:2,description:'提供 20 个岗位，运营后可获得商业收入。'},
    recycling:{name:'回收站',cost:240,upkeep:5,power:4,water:2,unlock:2,description:'减少 5 格内住宅受到的工厂污染。'},
    police:{name:'警局',cost:210,upkeep:5,power:3,water:1,unlock:3,description:'改善 5 格内住宅的安全服务与幸福度。'},
    library:{name:'图书馆',cost:180,upkeep:4,power:2,water:1,unlock:3,description:'改善 4 格内住宅的文化服务与幸福度。'},
    wind:{name:'风力电站',cost:240,upkeep:4,unlock:4,description:'为接通道路的城市提供 64 单位电力。'},
    pump:{name:'供水站',cost:220,upkeep:4,unlock:4,description:'为接通道路的城市提供 64 单位供水。'},
    townhall:{name:'市政厅',cost:0,upkeep:2,description:'城市的道路网络从这里出发。不能拆除。'}
  };
  const GOALS=[
    {id:'neighbors',name:'欢迎新邻居',description:'人口达到 20 人',target:20,reward:120},
    {id:'town',name:'热闹的小镇',description:'人口达到 50 人',target:50,reward:250},
    {id:'city',name:'我们的城市',description:'人口达到 100 人',target:100,reward:500},
    {id:'green',name:'绿色宜居城',description:'30 人、3 座公园、幸福度 85%',target:30,reward:180}
  ];
  const AREAS=[
    {id:'center',name:'中心城区',cost:0,stage:0,center:[10,10],description:'原有城市与市政厅所在地。'},
    {id:'north',name:'北岸产业园',cost:220,stage:1,center:[25,5],description:'适合连接产业和教育设施。'},
    {id:'east',name:'东部新城',cost:350,stage:2,center:[25,15],description:'规划住宅与工作岗位的新街区。'},
    {id:'south',name:'南部滨水区',cost:500,stage:3,center:[10,25],description:'延伸道路，建设滨水生活区。'},
    {id:'valley',name:'绿谷新城',cost:700,stage:4,center:[25,25],description:'城市远期扩张与绿色公共服务。'}
  ];
  const STAGES=[
    {id:'start',name:'邻里起步',reward:180,description:'迎接居民，建立稳定的街区。'},
    {id:'north',name:'北岸拓展',reward:300,description:'开放北岸，让公共服务覆盖新街区。'},
    {id:'east',name:'就业与教育',reward:450,description:'开放东部，增加教育与工作岗位。'},
    {id:'south',name:'安全与循环',reward:650,description:'建设南部，关注安全、文化与污染。'},
    {id:'valley',name:'绿谷基础设施',reward:900,description:'开放绿谷，扩充能源与供水。'},
    {id:'metropolis',name:'多中心城市',reward:1200,description:'让四个新区共同成长。'},
    {id:'capital',name:'繁荣宜居之城',reward:1800,description:'维持长期收支，打造更大的宜居城市。'}
  ];
  const areaAt=(x,y)=>x<20&&y<20?'center':x>=20&&y<10?'north':x>=20&&y<20?'east':x<20?'south':'valley';
  const index=(x,y)=>y*SIZE+x;
  const inBounds=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
  const neighbors=id=>{const x=id%SIZE,y=Math.floor(id/SIZE);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inBounds(a,b)).map(([a,b])=>index(a,b));};
  const distance=(a,b)=>Math.abs(a%SIZE-b%SIZE)+Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function createCity(seed=42) {
    const tiles=Array.from({length:SIZE*SIZE},(_,id)=>{
      const x=id%SIZE,y=Math.floor(id/SIZE);
      const water=x<20&&y<20?(x<2+(y>13?1:0)||(x>16&&y>14)):(x<2||(y>=30&&(x<5||x>29))||(x===31&&y>7&&y<13));
      return {terrain:water?'water':'grass',type:'empty'};
    });
    const put=(x,y,type)=>{tiles[index(x,y)]={terrain:'grass',type};};
    for(let x=6;x<=14;x++)put(x,11,'road');
    for(let y=8;y<=14;y++)if(y!==10)put(10,y,'road');
    put(10,10,'townhall');put(8,10,'house');put(9,10,'house');put(11,10,'shop');
    put(12,10,'solar');put(13,10,'water');put(7,10,'park');
    return {version:2,seed:seed>>>0,tiles,money:900,population:12,month:1,achievements:[],grantUsed:false,stage:0,areas:['center'],stableMonths:0,
      lastFinance:{income:0,expense:0,net:0},lastGrowth:0};
  }
  function stats(state) {
    const hall=state.tiles.findIndex(tile=>tile.type==='townhall'),roadSet=new Set(),queue=hall<0?[]:[hall];
    for(let head=0;head<queue.length;head++)for(const id of neighbors(queue[head])) {
      if(state.tiles[id].type==='road'&&!roadSet.has(id)) {roadSet.add(id);queue.push(id);}
    }
    const connected=new Set(hall>=0?[hall]:[]),counts={},activeCounts={},homes=[],parks=[],clinics=[],factories=[],schools=[],police=[],libraries=[],recyclers=[];
    const areaBuildings=Object.fromEntries(AREAS.map(area=>[area.id,0]));
    let powerDemand=0,waterDemand=0,rawJobs=0,totalCapacity=0,rawCapacity=0,powerCapacity=0,waterCapacity=0,expense=0,disconnected=0,businessIncome=0;
    for(let id=0;id<state.tiles.length;id++) {
      const type=state.tiles[id].type,definition=BUILDINGS[type];
      if(!definition)continue;
      counts[type]=(counts[type]||0)+1;expense+=definition.upkeep||0;
      totalCapacity+=definition.capacity||0;
      const active=type==='townhall'||roadSet.has(id)||neighbors(id).some(next=>roadSet.has(next));
      if(!active){if(type!=='road')disconnected++;continue;}
      connected.add(id);
      activeCounts[type]=(activeCounts[type]||0)+1;
      if(!['road','townhall'].includes(type))areaBuildings[areaAt(id%SIZE,Math.floor(id/SIZE))]++;
      if(type==='shop')businessIncome+=3;
      if(type==='factory')businessIncome+=4;
      if(type==='office')businessIncome+=6;
      powerDemand+=definition.power||0;waterDemand+=definition.water||0;rawJobs+=definition.jobs||0;
      if(definition.capacity){rawCapacity+=definition.capacity;homes.push(id);}
      if(type==='park')parks.push(id);
      if(type==='clinic')clinics.push(id);
      if(type==='factory')factories.push(id);
      if(type==='school')schools.push(id);
      if(type==='police')police.push(id);
      if(type==='library')libraries.push(id);
      if(type==='recycling')recyclers.push(id);
      if(type==='solar')powerCapacity+=32;
      if(type==='water')waterCapacity+=32;
      if(type==='wind')powerCapacity+=64;
      if(type==='pump')waterCapacity+=64;
    }
    const supply=Math.min(powerDemand?powerCapacity/powerDemand:1,waterDemand?waterCapacity/waterDemand:1,1);
    const activeCapacity=Math.floor(rawCapacity*supply),jobs=Math.floor(rawJobs*supply);
    const parkCoverage=homes.length?homes.filter(home=>parks.some(park=>distance(home,park)<=3)).length/homes.length:0;
    const clinicCoverage=homes.length?homes.filter(home=>clinics.some(clinic=>distance(home,clinic)<=5)).length/homes.length:0;
    const coverage=(services,radius)=>homes.length?homes.filter(home=>services.some(service=>distance(home,service)<=radius)).length/homes.length:0;
    const educationCoverage=coverage(schools,5),safetyCoverage=coverage(police,5),cultureCoverage=coverage(libraries,4);
    const pollution=homes.length?homes.reduce((sum,home)=>sum+(factories.some(factory=>distance(home,factory)<=4)?(recyclers.some(recycler=>distance(home,recycler)<=5)&&supply===1?.35:1):0),0)/homes.length:0;
    const employment=state.population?Math.min(1,jobs/state.population):1;
    const happiness=Math.round(clamp(60+parkCoverage*20+clinicCoverage*12*supply+employment*14+(educationCoverage*8+safetyCoverage*8+cultureCoverage*4)*supply-pollution*24-(1-supply)*45-Math.min(15,disconnected*2),10,100));
    const employed=Math.min(state.population,jobs);
    const income=Math.round(state.population*1.1+employed*1.2+businessIncome*supply);
    expense=Math.round(expense);
    return {connected,roads:roadSet,counts,activeCounts,areaBuildings,totalCapacity,activeCapacity,jobs,employed,happiness,powerDemand,waterDemand,powerCapacity,waterCapacity,
      supply,parkCoverage,clinicCoverage,educationCoverage,safetyCoverage,cultureCoverage,pollution,disconnected,income,expense,net:income-expense};
  }
  function canBuild(state,x,y,type) {
    if(!inBounds(x,y))return {ok:false,message:'请在城市地图内建设。'};
    const tile=state.tiles[index(x,y)],definition=BUILDINGS[type];
    if(!definition||['hand','townhall'].includes(type))return {ok:false,message:'选择一种建筑再点击地图。'};
    const area=AREAS.find(a=>a.id===areaAt(x,y));
    if(!state.areas.includes(area.id))return {ok:false,message:`${area.name}尚未开放，请在城市报告中解锁。`};
    if(definition.unlock&&state.stage<definition.unlock)return {ok:false,message:`${definition.name}将在完成第 ${definition.unlock} 阶段后解锁。`};
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
  function unlockArea(state,id) {
    const area=AREAS.find(item=>item.id===id);
    if(!area||id==='center')return {ok:false,message:'请选择可扩建的城区。'};
    if(state.areas.includes(id))return {ok:false,message:area.name+'已经开放。'};
    if(state.stage<area.stage)return {ok:false,message:`请先完成第 ${area.stage} 阶段。`};
    if(state.money<area.cost)return {ok:false,message:`开放${area.name}需要 ${area.cost} 城币。`};
    state.money-=area.cost;state.areas.push(id);
    return {ok:true,message:`${area.name}已开放 · −${area.cost} 城币。请铺路接入市政厅。`,area};
  }
  function stageGoals(state,report=stats(state)) {
    const count=type=>report.activeCounts[type]||0,inside=id=>report.areaBuildings[id]||0,
      open=id=>state.areas.includes(id)?1:0,goal=(name,value,target,unit='')=>({name,value,target,unit});
    const pop=n=>goal('常住居民',state.population,n,'人'),happy=n=>goal('幸福度',report.happiness,n,'%'),
      buildings=(name,type,n)=>goal(name,count(type),n,'座'),district=(id,n)=>goal(AREAS.find(a=>a.id===id).name+'接通建筑',inside(id),n,'座'),
      unlocked=id=>goal('开放'+AREAS.find(a=>a.id===id).name,open(id),1),
      services=()=>goal('水电供应',Math.round(report.supply*100),100,'%'),
      net=n=>goal('预计月结余',report.net,n,'城币'),stable=n=>goal('连续稳定月数',state.stableMonths,n,'月');
    switch(state.stage){
      case 0:return [pop(20),buildings('接通商店','shop',1),happy(65),services()];
      case 1:return [pop(45),buildings('接通公园','park',2),buildings('接通诊所','clinic',1),unlocked('north'),district('north',3),services()];
      case 2:return [pop(90),buildings('接通学校','school',1),buildings('接通办公楼','office',1),unlocked('east'),district('east',3),net(15),stable(3),services()];
      case 3:return [pop(150),happy(80),buildings('接通警局','police',1),buildings('接通图书馆','library',1),buildings('接通回收站','recycling',1),unlocked('south'),district('south',4),services()];
      case 4:return [pop(220),buildings('接通风力电站','wind',1),buildings('接通供水站','pump',1),buildings('接通公园','park',3),buildings('接通诊所','clinic',2),unlocked('valley'),district('valley',5),net(60),stable(3),services()];
      case 5:return [pop(300),happy(85),goal('就业岗位',report.jobs,150,'个'),buildings('接通学校','school',2),buildings('接通诊所','clinic',2),buildings('接通公园','park',4),...['north','east','south','valley'].map(id=>district(id,4)),net(80),stable(6),services()];
      case 6:return [pop(400),happy(85),goal('就业岗位',report.jobs,240,'个'),...['north','east','south','valley'].map(id=>district(id,8)),net(120),stable(12),services()];
      default:return [];
    }
  }
  function claimStage(state) {
    const stage=STAGES[state.stage];
    if(!stage)return {ok:false,message:'全部建设阶段已完成，继续自由建设吧！'};
    if(!stageGoals(state).every(goal=>goal.value>=goal.target))return {ok:false,message:'还有建设目标未完成，请查看城市报告。'};
    state.stage++;state.money+=stage.reward;
    return {ok:true,stage,message:`完成「${stage.name}」！奖励 +${stage.reward} 城币。${state.stage===STAGES.length?'全部阶段已完成！':'新的建设步骤已开启。'}`};
  }
  function advance(state) {
    let report=stats(state),growth=0;
    if(state.population>report.activeCapacity||report.happiness<35)growth=-Math.min(8,Math.max(1,Math.ceil((state.population-report.activeCapacity)*0.3)));
    else if(state.population<report.activeCapacity&&report.happiness>=45&&report.jobs>state.population*0.45)growth=Math.min(report.activeCapacity-state.population,Math.max(1,Math.floor((report.happiness-40)/18)));
    state.population=Math.max(0,state.population+growth);state.lastGrowth=growth;state.month++;
    report=stats(state);state.lastFinance={income:report.income,expense:report.expense,net:report.net};state.money+=report.net;
    state.stableMonths=report.net>=15&&report.supply>=1&&report.happiness>=65?Math.min(1000000,state.stableMonths+1):0;
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
      if(!value||![1,2].includes(value.version)||!Array.isArray(value.tiles)||value.tiles.length!==(value.version===1?OLD_SIZE*OLD_SIZE:SIZE*SIZE))return null;
      for(const [key,min,max] of [['money',-1000000,1000000000],['population',0,24576],['month',1,1000000],['seed',0,4294967295]])if(!Number.isInteger(value[key])||value[key]<min||value[key]>max)return null;
      const validTypes=['empty',...Object.keys(BUILDINGS).filter(type=>!['hand','bulldoze'].includes(type))];
      if(!value.tiles.every(tile=>tile&&['grass','water'].includes(tile.terrain)&&validTypes.includes(tile.type)&&(tile.terrain!=='water'||tile.type==='empty')))return null;
      if(value.tiles.filter(tile=>tile.type==='townhall').length!==1)return null;
      if(!Array.isArray(value.achievements)||value.achievements.some(id=>!GOALS.some(goal=>goal.id===id)))return null;
      if(value.version===2){
        if(!Number.isInteger(value.stage)||value.stage<0||value.stage>STAGES.length||!Number.isInteger(value.stableMonths)||value.stableMonths<0||value.stableMonths>1000000)return null;
        if(!Array.isArray(value.areas)||!value.areas.includes('center')||new Set(value.areas).size!==value.areas.length||value.areas.some(id=>!AREAS.some(area=>area.id===id&&area.stage<=value.stage)))return null;
        if(value.tiles.some((tile,id)=>tile.type!=='empty'&&!value.areas.includes(areaAt(id%SIZE,Math.floor(id/SIZE)))))return null;
      }
      const result=createCity(value.seed);
      for(const key of ['money','population','month'])result[key]=value[key];
      if(value.version===1){for(let y=0;y<OLD_SIZE;y++)for(let x=0;x<OLD_SIZE;x++){const tile=value.tiles[y*OLD_SIZE+x];result.tiles[index(x,y)]={terrain:tile.terrain,type:tile.type};}}
      else{result.tiles=value.tiles.map(tile=>({terrain:tile.terrain,type:tile.type}));result.stage=value.stage;result.areas=[...value.areas];result.stableMonths=value.stableMonths;}
      result.achievements=[...new Set(value.achievements)];result.grantUsed=value.grantUsed===true;
      return result;
    }catch(_){return null;}
  }
  const api={SIZE,BUILDINGS,GOALS,AREAS,STAGES,index,inBounds,areaAt,createCity,stats,canBuild,build,unlockArea,stageGoals,claimStage,advance,grant,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PixelCity=api;
})();
