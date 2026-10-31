/* The simulation is independent of the renderer and browser storage. */
(() => {
  const Economy=typeof module!=='undefined'&&module.exports?require('./pixel-city-economy.js'):CityEconomy;
  const SIZE=96,OLD_SIZE=20,PREVIOUS_SIZE=32;
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
    tower:{name:'摩天住宅',cost:420,upkeep:8,capacity:48,power:10,water:10,unlock:7,description:'高密度住宅，可容纳 48 位居民。'},
    tech:{name:'科技园',cost:440,upkeep:12,jobs:36,power:8,water:5,unlock:7,description:'提供 36 个岗位和科技产业收入。'},
    hospital:{name:'综合医院',cost:500,upkeep:12,power:8,water:6,unlock:7,description:'为 8 格范围的住宅提供医疗服务。'},
    university:{name:'大学',cost:480,upkeep:10,power:7,water:5,unlock:7,description:'为 8 格范围的住宅提供教育服务。'},
    bridge:{name:'桥梁',cost:35,upkeep:.4,unlock:2,category:'city',description:'在水面铺设桥梁，延伸连通市政厅的道路。'},
    bus:{name:'公交站',cost:260,upkeep:6,power:2,water:1,unlock:5,category:'services',description:'为 6 格内住宅提供公共交通，提高幸福度与大城市移民速度。'},
    metro:{name:'地铁货运枢纽',cost:900,upkeep:18,jobs:12,power:10,water:3,unlock:7,category:'logistics',description:'服务 12 格内住宅。线路两端都有接通枢纽时，运力上限提高到 60 份/月。'},
    solarfield:{name:'大型光伏园',cost:820,upkeep:12,unlock:7,category:'services',description:'提供 256 单位电力，支持远期大规模城区。'},
    reservoir:{name:'城市水库',cost:780,upkeep:12,unlock:7,category:'services',description:'提供 256 单位供水，为新城区持续供水。'},
    block:{name:'住宅组团',cost:1000,upkeep:22,capacity:120,power:18,water:18,unlock:7,category:'city',description:'提供 120 人住所，适合公共交通覆盖的卫星城区。'},
    hub:{name:'商务中心',cost:1100,upkeep:26,jobs:90,power:18,water:10,unlock:7,category:'city',description:'提供 90 个岗位，并带来商务收入。'},
    hotel:{name:'城市酒店',cost:650,upkeep:16,jobs:12,power:8,water:8,unlock:7,category:'tourism',description:'容纳 80 位游客。需要公园、博物馆或度假村吸引游客。'},
    museum:{name:'城市博物馆',cost:700,upkeep:14,jobs:10,power:6,water:3,unlock:7,category:'tourism',description:'增加 25 单位旅游吸引力，与酒店共同产生旅游收入。'},
    resort:{name:'生态度假村',cost:900,upkeep:20,jobs:16,power:8,water:8,unlock:7,category:'tourism',description:'增加 40 单位旅游吸引力。森林公园区内吸引力提高到 60。'},
    ...Economy.BUILDINGS,
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
    {id:'valley',name:'绿谷新城',cost:700,stage:4,center:[25,25],description:'城市远期扩张与绿色公共服务。'},
    {id:'meadow',name:'丰收平原',cost:2000,stage:5,center:[48,16],requires:['north','east'],theme:'农业',description:'粮田与蔬菜农场每座每月额外收获 2 份。'},
    {id:'highland',name:'高地牧场',cost:3000,stage:6,center:[80,16],requires:['meadow'],theme:'畜牧',description:'奶牛牧场与养鸡场每次产出额外增加 1 份。'},
    {id:'lakeside',name:'湖畔新城',cost:2200,stage:5,center:[16,48],requires:['south'],theme:'滨水',description:'辽阔的湖畔土地，适合住宅与旅游设施。'},
    {id:'cbd',name:'中央商务区',cost:4500,stage:7,center:[48,48],requires:['meadow','lakeside'],theme:'商业',description:'每座商场销售能力提高到 18 份/月，仍需充足客流。'},
    {id:'science',name:'科创新城',cost:5500,stage:7,center:[80,48],requires:['highland','cbd'],theme:'科研',description:'科技园每座每月增加 6 城币产业收入。'},
    {id:'forest',name:'森林公园区',cost:3500,stage:7,center:[16,80],requires:['lakeside'],theme:'生态',description:'度假村旅游吸引力提高 50%，可发展酒店与博物馆。'},
    {id:'harbor',name:'港湾贸易区',cost:6500,stage:7,center:[48,80],requires:['cbd','forest'],theme:'贸易',description:'贸易港出口能力从 24 提高到 40 份/月。'},
    {id:'frontier',name:'远景新区',cost:10000,stage:7,center:[80,80],requires:['science','harbor'],theme:'未来',description:'大片连贯土地，为区域都市群提供远期发展空间。'}
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
  const PROJECTS=[
    {id:'health',name:'健康都市',description:'建设综合医院，为更大的城市提供医疗服务。',reward:1800},
    {id:'knowledge',name:'知识与创新',description:'建设大学与科技园，培育新的就业中心。',reward:2200},
    {id:'vertical',name:'摩天生活',description:'建设高密度住宅，迎接更多居民。',reward:2500},
    {id:'sustainable',name:'循环能源城',description:'扩大风电、供水和回收设施，并保持经营盈余。',reward:2600}
  ];
  const CONTRACTS=[
    {id:'budget',name:'城市经营',description:'运营至少 3 个月，达到月结余 100、幸福度 75% 和充足水电。',reward:600},
    {id:'growth',name:'欢迎新居民',description:'运营至少 3 个月，人口比接取时增加 12 人，并保证充足水电。',reward:650},
    {id:'services',name:'宜居服务',description:'运营至少 3 个月，幸福度达到 85%，医疗和教育覆盖各达到 60%，水电充足。',reward:800}
  ];
  const METRO_PLANS=[
    {name:'区域开拓者',reward:5000,description:'把旧城市延伸到丰收平原和湖畔。'},
    {name:'都市交通网',reward:7500,description:'发展高地与中央商务区，建立轨道枢纽。'},
    {name:'生态旅游名城',reward:10000,description:'在森林中发展酒店、度假与文化旅游。'},
    {name:'港湾贸易圈',reward:15000,description:'连接科创新城与港湾，对外销售城市产品。'},
    {name:'未来都市群',reward:25000,description:'形成拥有十三片区域的四千人都市群。'}
  ];
  const areaAt=(x,y)=>x<32&&y<32?(x<20&&y<20?'center':x>=20&&y<10?'north':x>=20&&y<20?'east':x<20?'south':'valley'):
    [['center','meadow','highland'],['lakeside','cbd','science'],['forest','harbor','frontier']][Math.floor(y/32)]?.[Math.floor(x/32)];
  const index=(x,y)=>y*SIZE+x;
  const inBounds=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
  const neighbors=id=>{const x=id%SIZE,y=Math.floor(id/SIZE);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inBounds(a,b)).map(([a,b])=>index(a,b));};
  const distance=(a,b)=>Math.abs(a%SIZE-b%SIZE)+Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function createCity(seed=42) {
    const tiles=Array.from({length:SIZE*SIZE},(_,id)=>{
      const x=id%SIZE,y=Math.floor(id/SIZE);
      const oldWater=x<20&&y<20?(x<2+(y>13?1:0)||(x>16&&y>14)):(x<2||(y>=30&&(x<5||x>29))||(x===31&&y>7&&y<13));
      const lx=x%32,ly=y%32,water=x<32&&y<32?oldWater:Math.abs(lx-16)>2&&Math.abs(ly-16)>2&&((lx-7)**2+(ly-24)**2<20||(areaAt(x,y)==='lakeside'&&(lx-24)**2+(ly-8)**2<35));
      return {terrain:water?'water':'grass',type:'empty'};
    });
    const put=(x,y,type)=>{tiles[index(x,y)]={terrain:'grass',type};};
    for(let x=6;x<=14;x++)put(x,11,'road');
    for(let y=8;y<=14;y++)if(y!==10)put(10,y,'road');
    put(10,10,'townhall');put(8,10,'house');put(9,10,'house');put(11,10,'shop');
    put(12,10,'solar');put(13,10,'water');put(7,10,'park');
    return {version:3,seed:seed>>>0,tiles,money:900,population:12,month:1,achievements:[],grantUsed:false,stage:0,areas:['center'],stableMonths:0,metroStage:0,projectDone:[],contract:null,contractsCompleted:0,
      economy:Economy.create(AREAS.map(a=>a.id)),lastFinance:{income:0,expense:0,net:0},lastGrowth:0};
  }
  function stats(state) {
    const hall=state.tiles.findIndex(tile=>tile.type==='townhall'),roadSet=new Set(),queue=hall<0?[]:[hall];
    for(let head=0;head<queue.length;head++)for(const id of neighbors(queue[head])) {
      if(['road','bridge'].includes(state.tiles[id].type)&&!roadSet.has(id)) {roadSet.add(id);queue.push(id);}
    }
    const connected=new Set(hall>=0?[hall]:[]),counts={},activeCounts={},homes=[],parks=[],clinics=[],hospitals=[],factories=[],schools=[],universities=[],police=[],libraries=[],recyclers=[],buses=[],metros=[];
    const areaBuildings=Object.fromEntries(AREAS.map(area=>[area.id,0]));
    const areaActive=Object.fromEntries(AREAS.map(area=>[area.id,{}]));
    let powerDemand=0,waterDemand=0,rawJobs=0,totalCapacity=0,rawCapacity=0,powerCapacity=0,waterCapacity=0,expense=0,disconnected=0,businessIncome=0;
    for(let id=0;id<state.tiles.length;id++) {
      const type=state.tiles[id].type,definition=BUILDINGS[type];
      if(!definition)continue;
      counts[type]=(counts[type]||0)+1;expense+=definition.upkeep||0;
      totalCapacity+=definition.capacity||0;
      const active=type==='townhall'||roadSet.has(id)||neighbors(id).some(next=>roadSet.has(next));
      if(!active){if(!['road','bridge'].includes(type))disconnected++;continue;}
      connected.add(id);
      activeCounts[type]=(activeCounts[type]||0)+1;
      const districtCounts=areaActive[areaAt(id%SIZE,Math.floor(id/SIZE))];districtCounts[type]=(districtCounts[type]||0)+1;
      if(!['road','bridge','townhall'].includes(type))areaBuildings[areaAt(id%SIZE,Math.floor(id/SIZE))]++;
      if(type==='shop')businessIncome+=3;
      if(type==='factory')businessIncome+=4;
      if(type==='office')businessIncome+=6;
      if(type==='tech')businessIncome+=12;
      if(type==='tech'&&areaAt(id%SIZE,Math.floor(id/SIZE))==='science')businessIncome+=6;
      if(type==='hub')businessIncome+=24;
      powerDemand+=definition.power||0;waterDemand+=definition.water||0;rawJobs+=definition.jobs||0;
      if(definition.capacity){rawCapacity+=definition.capacity;homes.push(id);}
      if(type==='park')parks.push(id);
      if(type==='clinic')clinics.push(id);
      if(type==='hospital')hospitals.push(id);
      if(type==='factory')factories.push(id);
      if(type==='school')schools.push(id);
      if(type==='university')universities.push(id);
      if(type==='bus')buses.push(id);
      if(type==='metro')metros.push(id);
      if(type==='police')police.push(id);
      if(type==='library')libraries.push(id);
      if(type==='recycling')recyclers.push(id);
      if(type==='solar')powerCapacity+=32;
      if(type==='water')waterCapacity+=32;
      if(type==='wind')powerCapacity+=64;
      if(type==='pump')waterCapacity+=64;
      if(type==='solarfield')powerCapacity+=256;
      if(type==='reservoir')waterCapacity+=256;
    }
    const supply=Math.min(powerDemand?powerCapacity/powerDemand:1,waterDemand?waterCapacity/waterDemand:1,1);
    const activeCapacity=Math.floor(rawCapacity*supply),jobs=Math.floor(rawJobs*supply);
    const parkCoverage=homes.length?homes.filter(home=>parks.some(park=>distance(home,park)<=3)).length/homes.length:0;
    const clinicCoverage=homes.length?homes.filter(home=>clinics.some(clinic=>distance(home,clinic)<=5)||hospitals.some(hospital=>distance(home,hospital)<=8)).length/homes.length:0;
    const coverage=(services,radius)=>homes.length?homes.filter(home=>services.some(service=>distance(home,service)<=radius)).length/homes.length:0;
    const educationCoverage=homes.length?homes.filter(home=>schools.some(school=>distance(home,school)<=5)||universities.some(university=>distance(home,university)<=8)).length/homes.length:0,safetyCoverage=coverage(police,5),cultureCoverage=coverage(libraries,4);
    const transitCoverage=homes.length?homes.filter(home=>buses.some(bus=>distance(home,bus)<=6)||metros.some(metro=>distance(home,metro)<=12)).length/homes.length*supply:0;
    const pollution=homes.length?homes.reduce((sum,home)=>sum+(factories.some(factory=>distance(home,factory)<=4)?(recyclers.some(recycler=>distance(home,recycler)<=5)&&supply===1?.35:1):0),0)/homes.length:0;
    const employment=state.population?Math.min(1,jobs/state.population):1;
    const happiness=Math.round(clamp(60+parkCoverage*20+clinicCoverage*12*supply+employment*14+(educationCoverage*8+safetyCoverage*8+cultureCoverage*4)*supply+transitCoverage*6-pollution*24-(1-supply)*45-Math.min(15,disconnected*2),10,100));
    const employed=Math.min(state.population,jobs);
    const attraction=(activeCounts.museum||0)*25+(activeCounts.resort||0)*40+(areaActive.forest.resort||0)*20+(activeCounts.park||0)*2;
    const visitors=Math.floor(Math.min((activeCounts.hotel||0)*80,attraction)*(happiness/100)*supply),tourismIncome=visitors*3;
    const baseIncome=Math.round(state.population*1.1+employed*1.2+businessIncome*supply)+tourismIncome;
    expense=Math.round(expense);
    const economy=Economy.simulate(state,{areaActive,supply});
    expense+=economy.expense;const income=baseIncome+economy.revenue;
    return {connected,roads:roadSet,counts,activeCounts,areaBuildings,areaActive,totalCapacity,activeCapacity,jobs,employed,happiness,powerDemand,waterDemand,powerCapacity,waterCapacity,
      supply,parkCoverage,clinicCoverage,educationCoverage,safetyCoverage,cultureCoverage,transitCoverage,visitors,tourismIncome,pollution,disconnected,income,expense,net:income-expense,economy,baseIncome};
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
    if(type==='bridge'&&tile.terrain!=='water')return {ok:false,message:'桥梁只能建设在水面，陆地请使用道路。'};
    if(tile.terrain==='water'&&type!=='bridge')return {ok:false,message:'这里是水面，可以用桥梁延伸道路。'};
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
    if(area.requires&&!area.requires.some(id=>state.areas.includes(id)))return {ok:false,message:'请先开放相邻区域：'+area.requires.map(id=>AREAS.find(a=>a.id===id).name).join(' 或 ')+'。'};
    if(state.money<area.cost)return {ok:false,message:`开放${area.name}需要 ${area.cost} 城币。`};
    state.money-=area.cost;state.areas.push(id);
    return {ok:true,message:`${area.name}已开放 · −${area.cost} 城币。请铺路接入市政厅。`,area};
  }
  function addRoute(state,from,to,good,quota=24){
    if(state.stage<3)return {ok:false,message:'完成第 3 阶段后开放商业线路。'};
    if(from===to||!state.areas.includes(from)||!state.areas.includes(to)||!Object.hasOwn(Economy.GOODS,good))return {ok:false,message:'请选择两个已开放的不同城区和有效货物。'};
    if(!Number.isInteger(quota)||quota<1||quota>60)return {ok:false,message:'每月发货配额必须是 1–60 份。'};
    if(state.economy.routes.length>=80||state.economy.nextRouteId>=1000000)return {ok:false,message:'商业线路已达上限。'};
    if(state.economy.routes.some(r=>r.from===from&&r.to===to&&r.good===good))return {ok:false,message:'这条货物线路已存在。'};
    const report=stats(state);
    if(!report.areaActive[from].warehouse||!report.areaActive[to].warehouse)return {ok:false,message:'请先在两个城区分别建仓库，并接入市政道路。'};
    if(state.money<120)return {ok:false,message:'建立线路需要 120 城币。'};
    state.money-=120;state.economy.routes.push({id:state.economy.nextRouteId++,from,to,good,quota,enabled:true});return {ok:true,message:'商业线路已建立，每月维护 4 城币。'};
  }
  function toggleRoute(state,id){const route=state.economy.routes.find(r=>r.id===id);if(!route)return {ok:false,message:'线路不存在。'};route.enabled=!route.enabled;return {ok:true,message:route.enabled?'线路已恢复。':'线路已暂停，不再收取维护费。'};}
  function removeRoute(state,id){const i=state.economy.routes.findIndex(r=>r.id===id);if(i<0)return {ok:false,message:'线路不存在。'};state.economy.routes.splice(i,1);return {ok:true,message:'线路已移除，库存保留在各城区。'};}
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
  const aftergameOpen=state=>state.stage>=STAGES.length;
  function projectGoals(state,id,report=stats(state)) {
    const goal=(name,value,target,unit='')=>({name,value,target,unit}),count=type=>report.activeCounts[type]||0;
    switch(id){
      case 'health':return [goal('常住居民',state.population,500,'人'),goal('接通综合医院',count('hospital'),1,'座'),goal('水电供应',Math.round(report.supply*100),100,'%')];
      case 'knowledge':return [goal('接通大学',count('university'),1,'座'),goal('接通科技园',count('tech'),2,'座'),goal('就业岗位',report.jobs,300,'个'),goal('水电供应',Math.round(report.supply*100),100,'%')];
      case 'vertical':return [goal('常住居民',state.population,600,'人'),goal('接通摩天住宅',count('tower'),3,'座'),goal('幸福度',report.happiness,80,'%'),goal('水电供应',Math.round(report.supply*100),100,'%')];
      case 'sustainable':return [goal('接通风力电站',count('wind'),3,'座'),goal('接通供水站',count('pump'),3,'座'),goal('接通回收站',count('recycling'),2,'座'),goal('预计月结余',report.net,150,'城币'),goal('水电供应',Math.round(report.supply*100),100,'%')];
      default:return [];
    }
  }
  function claimProject(state,id){
    const project=PROJECTS.find(p=>p.id===id);
    if(!aftergameOpen(state)||!project)return {ok:false,message:'完成七个建设阶段后开放城市项目。'};
    if(state.projectDone.includes(id))return {ok:false,message:'这个城市项目已经完成。'};
    if(!projectGoals(state,id).every(g=>g.value>=g.target))return {ok:false,message:'项目目标尚未全部达成。'};
    state.projectDone.push(id);state.money+=project.reward;return {ok:true,message:`完成「${project.name}」！奖励 +${project.reward} 城币。`};
  }
  function acceptContract(state,id){
    const contract=CONTRACTS.find(c=>c.id===id);
    if(!aftergameOpen(state)||!contract)return {ok:false,message:'完成七个建设阶段后开放经营委托。'};
    if(state.contract)return {ok:false,message:'请先完成或放弃当前委托。'};
    state.contract={id,startMonth:state.month,startPopulation:state.population};return {ok:true,message:`已接取「${contract.name}」，请至少经营 3 个月。`};
  }
  function contractGoals(state,report=stats(state)){
    if(!state.contract)return [];
    const goal=(name,value,target,unit='')=>({name,value,target,unit}),c=state.contract,base=[goal('接取后运营',state.month-c.startMonth,3,'月')],supply=goal('水电供应',Math.round(report.supply*100),100,'%');
    if(c.id==='budget')return [...base,goal('预计月结余',report.net,100,'城币'),goal('幸福度',report.happiness,75,'%'),supply];
    if(c.id==='growth')return [...base,goal('新增居民',state.population-c.startPopulation,12,'人'),supply];
    if(c.id==='services')return [...base,goal('幸福度',report.happiness,85,'%'),goal('医疗覆盖',Math.round(report.clinicCoverage*100),60,'%'),goal('教育覆盖',Math.round(report.educationCoverage*100),60,'%'),supply];
    return [];
  }
  function claimContract(state){
    const contract=CONTRACTS.find(c=>c.id===state.contract?.id);
    if(!aftergameOpen(state)||!contract)return {ok:false,message:'请先接取经营委托。'};
    if(!contractGoals(state).every(g=>g.value>=g.target))return {ok:false,message:'委托目标尚未全部达成。'};
    state.contract=null;state.contractsCompleted++;state.money+=contract.reward;return {ok:true,message:`完成「${contract.name}」！奖励 +${contract.reward} 城币，可以继续接取委托。`};
  }
  function cancelContract(state){if(!state.contract)return {ok:false,message:'当前没有委托。'};state.contract=null;return {ok:true,message:'已放弃委托，可重新选择。'};}
  function metroGoals(state,report=stats(state)){
    const g=(name,value,target,unit='')=>({name,value,target,unit}),open=id=>g('开放'+AREAS.find(a=>a.id===id).name,state.areas.includes(id)?1:0,1),building=(type,n)=>g('接通'+BUILDINGS[type].name,report.activeCounts[type]||0,n,'座'),pop=n=>g('常住居民',state.population,n,'人'),supply=g('水电供应',Math.round(report.supply*100),100,'%');
    switch(state.metroStage){
      case 0:return [pop(800),open('meadow'),open('lakeside'),building('bus',2),g('丰收平原接通建筑',report.areaBuildings.meadow,6,'座'),g('湖畔接通建筑',report.areaBuildings.lakeside,6,'座'),supply];
      case 1:return [pop(1200),open('highland'),open('cbd'),building('metro',2),g('就业岗位',report.jobs,800,'个'),supply];
      case 2:return [pop(1600),open('forest'),building('hotel',2),building('museum',2),building('resort',2),g('到访游客',report.visitors,100,'人'),g('幸福度',report.happiness,85,'%'),supply];
      case 3:return [pop(2400),open('science'),open('harbor'),building('tradeport',2),g('累计出口',state.economy.exportedTotal,200,'份'),g('就业岗位',report.jobs,1600,'个'),supply];
      case 4:return [pop(4000),open('frontier'),g('开放区域',state.areas.length,AREAS.length,'区'),g('公共交通覆盖',Math.round(report.transitCoverage*100),60,'%'),g('预计月结余',report.net,1000,'城币'),g('连续稳定经营',state.stableMonths,12,'月'),...AREAS.filter(a=>a.requires).map(a=>g(a.name+'接通建筑',report.areaBuildings[a.id],10,'座')),supply];
      default:return [];
    }
  }
  function claimMetroPlan(state){const plan=METRO_PLANS[state.metroStage];if(!aftergameOpen(state)||!plan)return {ok:false,message:'完成原有七阶段后，可开启都市群计划。'};if(!metroGoals(state).every(g=>g.value>=g.target))return {ok:false,message:'都市群计划还有目标未达成。'};state.metroStage++;state.money+=plan.reward;return {ok:true,message:'完成「'+plan.name+'」！奖励 +'+plan.reward+' 城币。'};}
  function advance(state) {
    let report=stats(state),growth=0;
    if(state.population>report.activeCapacity||report.happiness<35)growth=-Math.min(8,Math.max(1,Math.ceil((state.population-report.activeCapacity)*0.3)));
    else if(state.population<report.activeCapacity&&report.happiness>=45&&report.jobs>state.population*0.45)growth=Math.min(report.activeCapacity-state.population,Math.min(80,Math.max(1,Math.floor((report.happiness-40)/18)+Math.floor(state.population/120)*(1+report.transitCoverage))));
    growth=Math.floor(growth);
    state.population=Math.max(0,state.population+growth);state.lastGrowth=growth;
    report=stats(state);state.economy=report.economy.next;state.month++;state.lastFinance={income:report.income,expense:report.expense,net:report.net,tradeRevenue:report.economy.revenue,tourismIncome:report.tourismIncome};state.money+=report.net;
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
      if(!value||![1,2,3].includes(value.version)||!Array.isArray(value.tiles))return null;
      const sourceSize=value.version===1?OLD_SIZE:value.version===2?PREVIOUS_SIZE:SIZE;
      if(value.tiles.length!==sourceSize*sourceSize)return null;
      for(const [key,min,max] of [['money',-1000000,1000000000],['population',0,SIZE*SIZE*120],['month',1,1000000],['seed',0,4294967295]])if(!Number.isInteger(value[key])||value[key]<min||value[key]>max)return null;
      const validTypes=['empty',...Object.keys(BUILDINGS).filter(type=>!['hand','bulldoze'].includes(type))];
      if(!value.tiles.every(tile=>tile&&['grass','water'].includes(tile.terrain)&&validTypes.includes(tile.type)&&(tile.terrain!=='water'||['empty','bridge'].includes(tile.type))&&(tile.type!=='bridge'||tile.terrain==='water')))return null;
      if(value.tiles.filter(tile=>tile.type==='townhall').length!==1)return null;
      if(!Array.isArray(value.achievements)||value.achievements.some(id=>!GOALS.some(goal=>goal.id===id)))return null;
      if(value.version>=2){
        if(!Number.isInteger(value.stage)||value.stage<0||value.stage>STAGES.length||!Number.isInteger(value.stableMonths)||value.stableMonths<0||value.stableMonths>1000000)return null;
        if(!Array.isArray(value.areas)||!value.areas.includes('center')||new Set(value.areas).size!==value.areas.length||value.areas.some(id=>!AREAS.some(area=>area.id===id&&area.stage<=value.stage)))return null;
        if(value.areas.some(id=>{const area=AREAS.find(a=>a.id===id);return area.requires&&!area.requires.some(parent=>value.areas.includes(parent));}))return null;
        if(value.tiles.some((tile,id)=>tile.type!=='empty'&&!value.areas.includes(areaAt(id%sourceSize,Math.floor(id/sourceSize)))))return null;
        if(value.projectDone!==undefined&&(!Array.isArray(value.projectDone)||new Set(value.projectDone).size!==value.projectDone.length||value.projectDone.some(id=>!PROJECTS.some(p=>p.id===id))))return null;
        if(value.contractsCompleted!==undefined&&(!Number.isInteger(value.contractsCompleted)||value.contractsCompleted<0||value.contractsCompleted>1000000))return null;
        if(value.contract!=null&&(!CONTRACTS.some(c=>c.id===value.contract.id)||!Number.isInteger(value.contract.startMonth)||value.contract.startMonth<1||value.contract.startMonth>value.month||!Number.isInteger(value.contract.startPopulation)||value.contract.startPopulation<0||value.contract.startPopulation>SIZE*SIZE*120))return null;
        if(value.metroStage!==undefined&&(!Number.isInteger(value.metroStage)||value.metroStage<0||value.metroStage>METRO_PLANS.length||value.metroStage>0&&value.stage<STAGES.length))return null;
        if(value.stage<STAGES.length&&((value.projectDone||[]).length||value.contract||(value.contractsCompleted||0)))return null;
      }
      const result=createCity(value.seed);
      for(const key of ['money','population','month'])result[key]=value[key];
      for(let y=0;y<sourceSize;y++)for(let x=0;x<sourceSize;x++){const tile=value.tiles[y*sourceSize+x];result.tiles[index(x,y)]={terrain:tile.terrain,type:tile.type};}
      if(value.version>=2){result.stage=value.stage;result.areas=[...value.areas];result.stableMonths=value.stableMonths;result.metroStage=value.metroStage||0;result.projectDone=[...(value.projectDone||[])];result.contract=value.contract?{id:value.contract.id,startMonth:value.contract.startMonth,startPopulation:value.contract.startPopulation}:null;result.contractsCompleted=value.contractsCompleted||0;}
      result.achievements=[...new Set(value.achievements)];result.grantUsed=value.grantUsed===true;
      const economy=Economy.restore(value.economy,AREAS.map(a=>a.id),result.areas);if(!economy)return null;result.economy=economy;
      return result;
    }catch(_){return null;}
  }
  const api={SIZE,BUILDINGS,GOALS,AREAS,STAGES,PROJECTS,CONTRACTS,METRO_PLANS,GOODS:Economy.GOODS,RECIPES:Economy.RECIPES,index,inBounds,areaAt,createCity,stats,canBuild,build,unlockArea,addRoute,toggleRoute,removeRoute,stageGoals,claimStage,projectGoals,claimProject,acceptContract,contractGoals,claimContract,cancelContract,metroGoals,claimMetroPlan,advance,grant,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PixelCity=api;
})();
