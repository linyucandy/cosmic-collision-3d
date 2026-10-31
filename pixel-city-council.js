/* Local civic planning: every action uses the same rules and money as manual play. */
(() => {
  'use strict';
  const MEMBERS=[
    {id:'mayor',name:'顾城',role:'市长',motto:'统筹阶段目标，先稳收支再发展。',color:'#b68d67'},
    {id:'planner',name:'林禾',role:'城市规划师',motto:'把住房、岗位与新街区连成一座城。',color:'#739e91'},
    {id:'engineer',name:'陆桥',role:'工程师',motto:'先接通道路，留足水电，再改善交通。',color:'#7d9eae'},
    {id:'industry',name:'苏苗',role:'产业主管',motto:'让农场、牧场、工坊和商场互相供货。',color:'#a5ae72'},
    {id:'welfare',name:'叶青',role:'民生代表',motto:'照顾每个街区的医疗、教育与环境。',color:'#c29181'},
    {id:'finance',name:'周衡',role:'财政官',motto:'保留应急资金，如实报告花费和成果。',color:'#9a91ad'}
  ];
  const FOCUSES={balanced:'均衡发展',growth:'人口与城区',food:'农牧与商业',green:'宜居与交通'};
  const create=()=>({version:1,enabled:false,focus:'balanced',reserve:200,budgetPercent:35,startedMonth:0,sequence:0,plan:null,proposal:null,reports:[],lastActions:[],lastBlock:'',decisions:{},totalSpent:0});
  const number=(n,min=0,max=1000000000)=>Number.isFinite(n)&&n>=min&&n<=max;
  const integer=(n,min=0,max=1000000000)=>number(n,min,max)&&Number.isInteger(n);
  const text=(s,max=400)=>typeof s==='string'&&s.length<=max;
  const metricKeys=['population','jobs','happiness','supply','net','money','areas','sales','exports','transit','visitors'];
  function metrics(s,r){return {population:s.population,jobs:r.jobs,happiness:r.happiness,supply:Math.round(r.supply*100),net:r.net,money:s.money,areas:s.areas.length,sales:s.economy.soldTotal,exports:s.economy.exportedTotal,transit:Math.round(r.transitCoverage*100),visitors:r.visitors};}
  function phase(s,C){return s.stage<C.STAGES.length?'stage:'+s.stage:s.metroStage<C.METRO_PLANS.length?'metro:'+s.metroStage:'free';}
  const phaseGoals=(s,C,r)=>s.stage<C.STAGES.length?C.stageGoals(s,r):C.metroGoals(s,r);
  function plan(s,C,r){
    const a=s.autonomy,m=metrics(s,r),goals=phaseGoals(s,C,r),pop=goals.find(g=>g.kind==='population')?.target||Math.ceil(s.population*1.15)+8;
    const targets=[['population','常住居民',Math.max(s.population,pop),'人'],['jobs','就业岗位',Math.max(r.jobs,Math.ceil(pop*.65)),'个'],['happiness','幸福度',Math.max(75,goals.find(g=>g.kind==='happiness')?.target||0),'%'],['supply','水电供应',100,'%'],['net','预计月结余',Math.max(15,Math.min(1000,Math.ceil(pop*.5))),'城币']].map(([metric,label,target,unit])=>({metric,label,target,start:m[metric],unit}));
    if(a.focus==='food')targets.push({metric:'sales',label:'累计商场销量',start:m.sales,target:m.sales+Math.max(12,Math.ceil(s.population/20)),unit:'份'});
    if(a.focus==='green'&&s.stage>=5)targets.push({metric:'transit',label:'交通覆盖',start:m.transit,target:Math.min(100,Math.max(60,m.transit+10)),unit:'%'});
    a.sequence++;
    return {id:a.sequence,phase:phase(s,C),focus:a.focus,title:(s.stage<C.STAGES.length?C.STAGES[s.stage].name:s.metroStage<C.METRO_PLANS.length?C.METRO_PLANS[s.metroStage].name:'持续发展')+' · '+FOCUSES[a.focus],startMonth:s.month,dueMonth:s.month+12,baseline:m,targets};
  }
  function configure(s,C,patch){
    if(!patch||typeof patch!=='object'||Object.keys(patch).some(k=>!['enabled','focus','reserve','budgetPercent'].includes(k)))return {ok:false,message:'自治设置无效。'};
    if(patch.enabled!==undefined&&typeof patch.enabled!=='boolean'||patch.focus!==undefined&&!Object.hasOwn(FOCUSES,patch.focus)||patch.reserve!==undefined&&!integer(patch.reserve,0,1000000)||patch.budgetPercent!==undefined&&!integer(patch.budgetPercent,10,70))return {ok:false,message:'储备须为非负整数，月度建设预算为资金的 10%–70%。'};
    const a=s.autonomy,changed=patch.focus!==undefined&&patch.focus!==a.focus,starting=patch.enabled===true&&!a.enabled;
    Object.assign(a,patch);if(changed)a.proposal=null;if(starting&&a.startedMonth===0)a.startedMonth=s.month;
    if(a.enabled&&(!a.plan||changed||a.plan.focus!==a.focus))a.plan=plan(s,C,C.stats(s));
    return {ok:true,message:a.enabled?'自治团队已就位，将按月执行计划并按季汇报。':'自治建设已暂停，现有城市继续由你管理。'};
  }
  function restore(raw){
    if(raw===undefined)return create();
    if(!raw||raw.version!==1||typeof raw.enabled!=='boolean'||!Object.hasOwn(FOCUSES,raw.focus)||!integer(raw.reserve,0,1000000)||!integer(raw.budgetPercent,10,70)||!integer(raw.startedMonth,0,1000000)||!integer(raw.sequence)||!integer(raw.totalSpent)||!text(raw.lastBlock)||!raw.decisions||typeof raw.decisions!=='object'||Object.entries(raw.decisions).some(([id,s])=>!MEMBERS.some(m=>m.id===id)||!text(s)))return null;
    const validMetrics=m=>m&&metricKeys.every(k=>integer(m[k],-1000000000,1000000000));
    const validTarget=t=>t&&metricKeys.includes(t.metric)&&text(t.label,100)&&text(t.unit,12)&&integer(t.target)&&integer(t.start,-1000000000);
    if(raw.enabled&&(!raw.plan||raw.startedMonth<1))return null;
    if(raw.proposal!=null&&(!['build','area','route','connect','wait'].includes(raw.proposal.kind)||!MEMBERS.some(m=>m.id===raw.proposal.actor)||!text(raw.proposal.reason)||!text(raw.proposal.status)||raw.proposal.type!==undefined&&!text(raw.proposal.type,80)||raw.proposal.area!==undefined&&!text(raw.proposal.area,80)||raw.proposal.x!==undefined&&(!integer(raw.proposal.x,0,95)||!integer(raw.proposal.y,0,95))))return null;
    if(raw.plan!=null&&(!integer(raw.plan.id,1)||!Object.hasOwn(FOCUSES,raw.plan.focus)||!text(raw.plan.phase,40)||!text(raw.plan.title,150)||!integer(raw.plan.startMonth,1,1000000)||!integer(raw.plan.dueMonth,1,1000012)||raw.plan.dueMonth<=raw.plan.startMonth||!validMetrics(raw.plan.baseline)||!Array.isArray(raw.plan.targets)||raw.plan.targets.length<1||raw.plan.targets.length>8||!raw.plan.targets.every(validTarget)))return null;
    const validAction=a=>a&&MEMBERS.some(m=>m.id===a.actor)&&['build','road','area','route','reward'].includes(a.kind)&&text(a.message)&&integer(a.cost)&&(!Object.hasOwn(a,'x')||integer(a.x,0,95)&&integer(a.y,0,95));
    if(!Array.isArray(raw.lastActions)||raw.lastActions.length>30||!raw.lastActions.every(validAction)||!Array.isArray(raw.reports)||raw.reports.length>24)return null;
    for(const r of raw.reports)if(!r||!integer(r.month,1,1000000)||!['month','quarter','annual'].includes(r.kind)||!text(r.title,150)||!text(r.summary,600)||!text(r.blocked)||!integer(r.spent)||!integer(r.rewards)||!integer(r.budget)||!integer(r.periodSpent)||!integer(r.periodRewards)||!integer(r.progress,0,100)||!validMetrics(r.metrics)||!validMetrics(r.before)||!Array.isArray(r.actions)||r.actions.length>30||!r.actions.every(validAction)||!Array.isArray(r.targets)||r.targets.length>8||!r.targets.every(t=>validTarget(t)&&integer(t.value,-1000000000)&&typeof t.done==='boolean'))return null;
    const result=JSON.parse(JSON.stringify(raw));if(result.proposal===undefined)result.proposal=null;return result;
  }
  function role(type,C){const d=C.BUILDINGS[type];return d?.category==='farm'||d?.category==='ranch'||d?.category==='industry'||d?.category==='retail'||['shop','office','hub','tech'].includes(type)?'industry':['solar','water','wind','pump','solarfield','reservoir','bus','metro','depot','warehouse','bridge','road'].includes(type)?'engineer':d?.capacity?'planner':'welfare';}
  function tick(s,C){
    const a=s.autonomy,result={spent:0,rewards:0,actions:[],blocked:''};if(!a.enabled)return result;
    let r=C.stats(s);if(!a.plan)a.plan=plan(s,C,r);const activePlan=a.plan,before={...(a.reports[0]?.metrics||activePlan.baseline)};
    a.decisions={mayor:'执行「'+activePlan.title+'」，观察年度目标进展。',planner:'现有有效住房 '+r.activeCapacity+' 人、居民 '+s.population+' 人，统筹新区与住宅。',engineer:'电力 '+r.powerCapacity+'/'+r.powerDemand+'，供水 '+r.waterCapacity+'/'+r.waterDemand+'，优先保障基础设施。',industry:'商场累计销售 '+s.economy.soldTotal+' 份，检查原料与跨区供货。',welfare:'医疗覆盖 '+Math.round(r.clinicCoverage*100)+'%，教育覆盖 '+Math.round(r.educationCoverage*100)+'%，关注服务空白。',finance:'依据现有资金和应急储备安排本月预算。'};
    const record=(actor,kind,message,cost=0,extra={})=>{result.actions.push({actor,kind,message,cost,...extra});if(cost)result.spent+=cost;a.decisions[actor]=message;};
    const reward=(res,amount)=>{if(res.ok){result.rewards+=amount;record('mayor','reward',res.message);}};
    if(s.stage<C.STAGES.length){const amount=C.STAGES[s.stage].reward;reward(C.claimStage(s),amount);}
    if(s.stage>=C.STAGES.length&&s.metroStage<C.METRO_PLANS.length){const amount=C.METRO_PLANS[s.metroStage].reward;reward(C.claimMetroPlan(s),amount);}
    for(const p of C.PROJECTS)if(!s.projectDone.includes(p.id))reward(C.claimProject(s,p.id),p.reward);
    if(s.contract){const amount=C.CONTRACTS.find(c=>c.id===s.contract.id).reward;reward(C.claimContract(s),amount);}
    const budget=Math.max(0,Math.min(s.money-a.reserve,Math.floor(s.money*a.budgetPercent/100)));
    let roadsMade=0,isolatedNote='',preview=false;
    const canSpend=cost=>preview?cost<=Math.max(0,Math.min(s.money-a.reserve,Math.floor(s.money*a.budgetPercent/100))):result.spent+cost<=budget&&s.money-cost>=a.reserve;
    const adjacent=id=>{const x=id%C.SIZE,y=Math.floor(id/C.SIZE);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([x,y])=>C.inBounds(x,y)).map(([x,y])=>C.index(x,y));};
    const chooseType=types=>types.find(t=>(C.BUILDINGS[t].unlock||0)<=s.stage&&canSpend(C.BUILDINGS[t].cost))||types.find(t=>(C.BUILDINGS[t].unlock||0)<=s.stage);
    const housing=()=>chooseType(['block','tower','apartment','house']);
    const jobs=()=>chooseType(['hub','office','shop']);
    const task=(type,area,reason)=>({kind:'build',type,area,reason,actor:role(type,C)});
    function district(){const g=phaseGoals(s,C,r).find(g=>g.kind==='district'&&g.value<g.target&&s.areas.includes(g.area));return g?.area||'center';}
    function services(){
      if(r.parkCoverage<.6)return task('park',undefined,'居民希望附近有公园。');
      if(r.clinicCoverage<.65)return task(s.stage>=7?'hospital':'clinic',undefined,'改善住宅医疗覆盖。');
      if(s.stage>=1&&r.educationCoverage<.65)return task(s.stage>=7?'university':'school',undefined,'居民需要教育服务。');
      if(s.stage>=3&&r.safetyCoverage<.65)return task('police',undefined,'补齐安全服务。');
      if(s.stage>=3&&r.cultureCoverage<.65)return task('library',undefined,'补齐文化服务。');
      if(s.stage>=2&&r.pollution>.1)return task('recycling',undefined,'减少住宅附近污染。');
      return null;
    }
    function foodTask(){
      const chain=['field','vegetable','warehouse','barn','coop','mill','bakery','dairy','mall'];
      const missing=chain.find(t=>(C.BUILDINGS[t].unlock||0)<=s.stage&&!r.activeCounts[t]);if(missing)return task(missing,'center','产业主管提出完善农牧食品供应链。');
      const connection=logisticsTask();if(connection)return connection;
      for(const area of s.areas){
        const counts=r.areaActive[area],stock=s.economy.stock[area],grainNeed=(counts.barn||0)*2+(counts.coop||0)+(counts.mill||0)*3,grainYield=(counts.field||0)*(r.economy.season.grain+(area==='meadow'?2:0));
        if(grainNeed>grainYield&&stock.grain<grainNeed)return task('field',area,'饲养或磨坊缺粮，补充本区粮田产能。');
        if((counts.bakery||0)*2>(counts.mill||0)*3&&stock.flour<2)return task('mill',area,'面包坊缺少面粉，补充上游加工。');
        if((counts.dairy||0)*2>(counts.barn||0)*(area==='highland'?4:3)&&stock.milk<2)return task('barn',area,'乳品工坊缺奶，补充牧场产能。');
        const inventory=Object.values(stock).reduce((sum,n)=>sum+n,0);
        if(inventory>24&&r.economy.sold<Math.floor(s.population/8))return task('mall',area,'库存积压且仍有顾客需求，增加零售能力。');
        if(inventory>40&&s.stage>=7&&!counts.tradeport)return task('tradeport',area,'将本地消费后的剩余库存用于出口。');
      }
      return null;
    }
    function logisticsTask(){
      for(const from of s.areas)for(const to of s.areas){if(from===to)continue;for(const good of Object.keys(C.GOODS)){
        if(s.economy.stock[from][good]<12||s.economy.stock[to][good]>6||s.economy.routes.some(route=>route.from===from&&route.to===to&&route.good===good))continue;
        const counts=r.areaActive[to],needs=C.RECIPES.some(rec=>rec.input===good&&counts[rec.building])||counts.mall||counts.tradeport;if(!needs)continue;
        if(!r.areaActive[from].warehouse)return task('warehouse',from,'为跨区供货建立发货仓库。');
        if(!counts.warehouse)return task('warehouse',to,'为跨区供货建立收货仓库。');
        return {kind:'route',from,to,good,actor:'industry',reason:'将积压库存送往缺货企业。'};
      }}return null;
    }
    function decide(){
      if(r.powerCapacity<r.powerDemand+2)return task(chooseType(['solarfield','wind','solar']),undefined,'电力余量不足，先补充供电。');
      if(r.waterCapacity<r.waterDemand+2)return task(chooseType(['reservoir','pump','water']),undefined,'供水余量不足，先补充供水。');
      const isolated=s.tiles.flatMap((tile,id)=>!['empty','road','bridge','townhall'].includes(tile.type)&&!r.connected.has(id)?[id]:[]);
      if(isolated.length){
        const spots=isolated.flatMap(id=>adjacent(id)).filter(id=>s.tiles[id].type==='empty'&&s.areas.includes(C.areaAt(id%C.SIZE,Math.floor(id/C.SIZE))));
        const path=findRoadPath(spots);
        if(path)return {kind:'connect',path,actor:'engineer',reason:'将已有建筑接入市政道路。'};
        isolatedNote='部分旧建筑被包围或没有可用道路走廊，请调整附近布局；团队继续处理其他规划。';
      }
      if(r.happiness<(a.focus==='green'?90:65)){const t=services();if(t)return t;}
      const goals=phaseGoals(s,C,r).filter(g=>g.value<g.target),area=goals.find(g=>g.kind==='area');
      if(area)return {kind:'area',area:area.area,actor:'planner',reason:'阶段规划需要拓展新城区。'};
      if(s.stage>=3&&s.money>a.reserve+800&&a.focus!=='growth'&&(a.focus==='food'||s.month%4===0)){const t=foodTask()||logisticsTask();if(t)return t;}
      const regionGoal=goals.find(g=>g.kind==='district');
      if(regionGoal){const count=r.areaBuildings[regionGoal.area],pattern=[housing(),jobs(),'park','clinic',s.stage>=1?'school':'shop'];return task(pattern[count%pattern.length],regionGoal.area,'完成新区的住宅、岗位与服务配套。');}
      const building=goals.find(g=>g.kind==='building');if(building)return task(building.building,undefined,'落实阶段中的'+C.BUILDINGS[building.building].name+'建设目标。');
      const happy=goals.find(g=>g.kind==='happiness');if(happy){const t=services();if(t)return t;}
      const transit=goals.find(g=>g.kind==='transit');if(transit)return task(chooseType(['metro','bus']),undefined,'扩大住宅公共交通覆盖。');
      if(goals.some(g=>g.kind==='tourism'))return task((r.activeCounts.hotel||0)*80<=r.visitors+40?'hotel':'resort',s.areas.includes('forest')?'forest':undefined,'提高游客接待与景点吸引力。');
      if(goals.some(g=>g.kind==='exports')){const area=s.areas.includes('harbor')?'harbor':district();return task(!r.areaActive[area].tradeport?'tradeport':!r.areaActive[area].warehouse?'warehouse':'greenhouse',area,'形成可持续的产品出口来源。');}
      if(goals.some(g=>g.kind==='areas')){const next=C.AREAS.find(ar=>!s.areas.includes(ar.id)&&s.stage>=ar.stage&&(!ar.requires||ar.requires.some(id=>s.areas.includes(id))));if(next)return {kind:'area',area:next.id,actor:'planner',reason:'连接尚未开发的区域。'};}
      const jobGoal=goals.find(g=>g.kind==='jobs');if(r.jobs<Math.ceil(s.population*.8)||jobGoal)return task(jobs(),undefined,'为居民增加就业岗位。');
      const populationGoal=goals.find(g=>g.kind==='population');
      if(populationGoal){if(r.activeCapacity<populationGoal.target)return task(housing(),undefined,'预留下一阶段的居住空间。');if(r.jobs<populationGoal.target*.6)return task(jobs(),undefined,'确保新增居民有工作。');return {kind:'wait',reason:'住房、水电和岗位已准备，等待居民自然迁入。',actor:'planner'};}
      if(goals.some(g=>g.kind==='profit')){if(r.jobs<s.population)return task(jobs(),undefined,'提高就业和城市税收。');if(r.activeCapacity<=s.population+4)return task(housing(),undefined,'扩大稳定税源，改善长期经营收支。');return {kind:'wait',reason:'保留资金，等待人口和经营收入增长。',actor:'finance'};}
      if(goals.some(g=>g.kind==='stability'))return {kind:'wait',reason:'维持现有供给和收支，完成连续稳定经营目标。',actor:'finance'};
      if(a.focus==='green'){const t=services();if(t)return t;if(s.stage>=5&&r.transitCoverage<.8)return task(chooseType(['metro','bus']),undefined,'改善自治城市的出行条件。');}
      const industry=foodTask()||logisticsTask();if(s.stage>=3&&industry)return industry;
      const futurePopulation=a.plan.targets.find(t=>t.metric==='population')?.target||s.population+8;
      if(r.jobs<futurePopulation*.65)return task(jobs(),undefined,'为下一年度发展预留就业岗位。');
      if(r.activeCapacity<futurePopulation)return task(housing(),undefined,'为下一年度发展预留住宅。');
      return {kind:'wait',reason:'当前目标暂时具备条件，维持经营并观察下月变化。',actor:'mayor'};
    }
    function plots(type,area){
      const candidates=new Set();for(const road of r.roads)for(const id of adjacent(road)){
        const x=id%C.SIZE,y=Math.floor(id/C.SIZE),district=C.AREAS.find(a=>a.id===C.areaAt(x,y));
        // Keep the district's two main avenues available for future roads.
        if(x===district.center[0]||y===district.center[1]||y===11)continue;
        if(s.tiles[id].type==='empty'&&s.tiles[id].terrain==='grass'&&s.areas.includes(district.id)&&(!area||district.id===area))candidates.add(id);
      }
      const def=C.BUILDINGS[type],homes=s.tiles.flatMap((t,id)=>C.BUILDINGS[t.type]?.capacity?[id]:[]),serviceRadius={park:3,clinic:5,hospital:8,school:5,university:8,police:5,library:4,bus:6,metro:12}[type];
      const existing=serviceRadius?s.tiles.flatMap((t,id)=>t.type===type&&r.connected.has(id)?[id]:[]):[];
      const dist=(a,b)=>Math.abs(a%C.SIZE-b%C.SIZE)+Math.abs(Math.floor(a/C.SIZE)-Math.floor(b/C.SIZE));
      const uncovered=serviceRadius?homes.filter(id=>!existing.some(e=>dist(id,e)<=serviceRadius)):[];
      const score=id=>{let value=dist(id,C.index(...C.AREAS.find(a=>a.id===(area||'center')).center));if(serviceRadius)value-=uncovered.filter(h=>dist(h,id)<=serviceRadius).length*100;if(def.capacity)value+=s.tiles.some((t,i)=>t.type==='factory'&&dist(id,i)<5)?1000:0;return value;};
      return [...candidates].map(id=>({id,score:score(id)})).sort((a,b)=>a.score-b.score).map(p=>p.id);
    }
    function findRoadPath(targets){
      const wanted=new Set(targets);if(!wanted.size)return null;
      const parents=new Int32Array(C.SIZE*C.SIZE);parents.fill(-2);const queue=[...r.roads],hall=s.tiles.findIndex(tile=>tile.type==='townhall');if(hall>=0)queue.push(hall);for(const id of queue)parents[id]=-1;
      let target=-1;
      for(let head=0;head<queue.length&&target<0;head++)for(const id of adjacent(queue[head])){
        const tile=s.tiles[id];if(parents[id]!==-2||!s.areas.includes(C.areaAt(id%C.SIZE,Math.floor(id/C.SIZE)))||!['empty','road','bridge'].includes(tile.type)||tile.terrain==='water'&&s.stage<2)continue;parents[id]=queue[head];queue.push(id);
        if(wanted.has(id)){target=id;break;}
      }
      if(target<0)return null;
      const path=[];for(let id=target;parents[id]!==-1;id=parents[id])path.push(id);return path.reverse();
    }
    function roadTo(path,reason){
      let changed=false;
      for(const id of path){
        const tile=s.tiles[id];if(['road','bridge'].includes(tile.type))continue;const type=tile.terrain==='water'?'bridge':'road',cost=C.BUILDINGS[type].cost;
        if(roadsMade>=18||!canSpend(cost)){result.blocked='道路按预算分期铺设，下月继续。';break;}
        const x=id%C.SIZE,y=Math.floor(id/C.SIZE),res=C.build(s,x,y,type);if(!res.ok){result.blocked=res.message;break;}roadsMade++;changed=true;record('engineer','road',reason+' '+C.BUILDINGS[type].name+'（'+(x+1)+','+(y+1)+'）',cost,{x,y,type,area:C.areaAt(x,y)});
      }return changed;
    }
    function prepareLand(area){
      const ar=C.AREAS.find(a=>a.id===area),center=C.index(...ar.center),distance=id=>Math.abs(id%C.SIZE-ar.center[0])+Math.abs(Math.floor(id/C.SIZE)-ar.center[1]);
      const candidates=[];for(let id=0;id<s.tiles.length;id++)if(C.areaAt(id%C.SIZE,Math.floor(id/C.SIZE))===area&&s.tiles[id].type==='empty'&&s.tiles[id].terrain==='grass'&&!adjacent(id).some(n=>r.roads.has(n))&&adjacent(id).filter(n=>s.tiles[n].type==='empty').length>=2)candidates.push(id);
      candidates.sort((a,b)=>distance(a)-distance(b));if(!candidates.length){result.blocked='本区缺少可扩展的空地，保留现有建筑并等待调整。';return false;}
      const path=findRoadPath(candidates);if(!path){result.blocked='没有可用的空地道路走廊，需要玩家调整布局。';return false;}return roadTo(path,'按规划扩展街区道路。');
    }
    for(let pass=0;pass<2;pass++){
      r=C.stats(s);let t=decide();a.decisions[t.actor]=t.reason;
      if(t.kind==='wait'){result.blocked=t.reason;break;}
      if(t.kind==='area'){
        const ar=C.AREAS.find(ar=>ar.id===t.area);if(!canSpend(ar.cost)){result.blocked='正在为'+ar.name+'积累 '+ar.cost+' 城币；月度预算或应急储备尚不足。';break;}
        const res=C.unlockArea(s,t.area);if(!res.ok){result.blocked=res.message;break;}record(t.actor,'area',res.message,ar.cost,{area:t.area});continue;
      }
      if(t.kind==='route'){
        if(!canSpend(120)){result.blocked='商业连接等待下月建设预算。';break;}const res=C.addRoute(s,t.from,t.to,t.good,6);if(res.ok)record(t.actor,'route',res.message+' '+C.GOODS[t.good].name+'跨区供货。',120,{area:t.from});else result.blocked=res.message;continue;
      }
      if(t.kind==='connect'){
        roadTo(t.path,t.reason);break;
      }
      const def=C.BUILDINGS[t.type];if(!def){result.blocked='尚未解锁所需建筑。';break;}
      if(def.power&&r.powerCapacity<r.powerDemand+def.power){t=task(chooseType(['solarfield','wind','solar']),t.area,'先为计划建筑准备电力。');}
      else if(def.water&&r.waterCapacity<r.waterDemand+def.water){t=task(chooseType(['reservoir','pump','water']),t.area,'先为计划建筑准备供水。');}
      const cost=C.BUILDINGS[t.type].cost;if(!canSpend(cost)){result.blocked='计划建设'+C.BUILDINGS[t.type].name+'，等待 '+cost+' 城币预算并保留应急资金。';break;}
      const preferred=t.area||district(),publicService=['park','clinic','hospital','school','university','police','library','bus','metro','recycling'].includes(t.type);let choices=plots(t.type,t.area||(!publicService?preferred:undefined));
      if(!choices.length&&!t.area)choices=plots(t.type,undefined);
      if(!choices.length){const expansion=t.area||[...s.areas].sort((a,b)=>r.areaBuildings[a]-r.areaBuildings[b])[0];prepareLand(expansion);break;}
      const id=choices[0],x=id%C.SIZE,y=Math.floor(id/C.SIZE),res=C.build(s,x,y,t.type);
      if(!res.ok){result.blocked=res.message;break;}record(t.actor,'build',t.reason+' 已建成'+C.BUILDINGS[t.type].name+'（'+(x+1)+','+(y+1)+'）。',cost,{x,y,type:t.type,area:C.areaAt(x,y)});
    }
    if(isolatedNote)result.blocked=(result.blocked?result.blocked+' ':'')+isolatedNote;
    r=C.stats(s);const after=metrics(s,r),targets=activePlan.targets.map(t=>({...t,value:after[t.metric],done:after[t.metric]>=t.target})),progress=Math.round(targets.filter(t=>t.done).length/targets.length*100),elapsed=s.month-a.startedMonth,kind=elapsed>0&&elapsed%12===0?'annual':elapsed>0&&elapsed%3===0?'quarter':'month';
    const months=kind==='annual'?12:kind==='quarter'?3:1,rows=a.reports.filter(r=>r.month>s.month-months),periodBefore=a.reports.find(r=>r.month<=s.month-months)?.metrics||a.reports[a.reports.length-1]?.before||before,periodSpent=result.spent+rows.reduce((sum,r)=>sum+r.spent,0),periodRewards=result.rewards+rows.reduce((sum,r)=>sum+r.rewards,0);
    const summary=(months===1?'本月':'本期 '+months+' 个月')+'居民 '+periodBefore.population+' → '+after.population+'，岗位 '+periodBefore.jobs+' → '+after.jobs+'，建设投入 '+periodSpent+'，阶段奖励 '+periodRewards+'，期末资金 '+s.money+'。'+(result.blocked?'当前说明：'+result.blocked:'计划已按预算执行。');
    a.lastActions=result.actions;a.lastBlock=result.blocked;a.totalSpent=Math.min(1000000000,a.totalSpent+result.spent);a.decisions.finance='本月预算 '+budget+'，实际投入 '+result.spent+'，保留应急储备 '+a.reserve+'。';
    a.reports.unshift({month:s.month,kind,title:activePlan.title,summary,blocked:result.blocked,spent:result.spent,rewards:result.rewards,periodSpent,periodRewards,budget,before,metrics:after,progress,targets,actions:result.actions});a.reports.length=Math.min(a.reports.length,24);
    if(s.month>=activePlan.dueMonth||progress===100||phase(s,C)!==activePlan.phase)a.plan=plan(s,C,r);
    preview=true;let next=decide();
    if(next.kind==='build'){
      const def=C.BUILDINGS[next.type];
      if(def.power&&r.powerCapacity<r.powerDemand+def.power)next=task(chooseType(['solarfield','wind','solar']),next.area,'为规划建筑准备电力。');
      else if(def.water&&r.waterCapacity<r.waterDemand+def.water)next=task(chooseType(['reservoir','pump','water']),next.area,'为规划建筑准备供水。');
      const preferred=next.area||district(),service=['park','clinic','hospital','school','university','police','library','bus','metro','recycling'].includes(next.type);
      let choices=plots(next.type,next.area||(!service?preferred:undefined));if(!choices.length&&!next.area)choices=plots(next.type,undefined);
      const id=choices[0],area=id===undefined?preferred:C.areaAt(id%C.SIZE,Math.floor(id/C.SIZE)),cost=C.BUILDINGS[next.type].cost;
      a.proposal={kind:'build',actor:next.actor,type:next.type,area,reason:next.reason,status:!canSpend(cost)?'等待预算或应急储备。':id===undefined?'需要先铺路连接可用地块。':'已选可用地块，下月将重新核验条件。',...(id===undefined?{}:{x:id%C.SIZE,y:Math.floor(id/C.SIZE)})};
    }else{
      const first=next.kind==='connect'?next.path.find(id=>s.tiles[id].type==='empty'):undefined;
      const nextArea=next.area&&C.AREAS.find(item=>item.id===next.area),from=next.from&&C.AREAS.find(item=>item.id===next.from),to=next.to&&C.AREAS.find(item=>item.id===next.to);
      const status=next.kind==='area'?'准备开放'+nextArea.name+'，费用 '+nextArea.cost+' 城币。':next.kind==='route'?'拟从'+from.name+'向'+to.name+'运送'+C.GOODS[next.good].name+'，线路费用 120 城币。':next.kind==='connect'?'准备铺设连接道路。':'等待下月重新评估。';
      a.proposal={kind:next.kind,actor:next.actor,reason:next.reason,status,...(next.area?{area:next.area}:{}),...(first===undefined?{}:{x:first%C.SIZE,y:Math.floor(first/C.SIZE)})};
    }
    return result;
  }
  const api={MEMBERS,FOCUSES,create,configure,restore,tick,metrics};if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.CityCouncilRules=api;
})();
