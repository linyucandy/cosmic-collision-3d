/* Public GitHub data only. No access tokens, credentials or private data are stored here. */
(() => {
  const repo = 'linyucandy/cosmic-collision-3d';
  const base = 'https://github.com/'+repo;
  const apiBase = 'https://api.github.com/repos/'+repo;
  const categories = {sandbox:'沙盒模拟',puzzle:'益智解谜',action:'动作挑战',adventure:'冒险探索',casual:'休闲小游戏',other:'其他'};
  function validUrl(value) {
    if(typeof value!=='string' || value.length>1000 || /[\x00-\x20\x7f\\]/.test(value)) return false;
    try {const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password;}
    catch(_) {return false;}
  }
  function makeBody(kind,data) {
    if(!['game','review','discussion'].includes(kind)) throw new Error('未知发布类型');
    return `<!-- cosmic-${kind}:v1 -->\n\n\`\`\`json\n${JSON.stringify(data,null,2)}\n\`\`\`\n\n此记录来自星游游戏广场。请保留上方标记和 JSON 字段，修改内容后返回游戏广场点击“同步最新”。关闭此 Issue 可撤下本条记录。`;
  }
  function parseBody(body) {
    if(typeof body!=='string' || body.length>20000) return null;
    const match=body.match(/<!-- cosmic-(game|review|discussion):v1 -->\s*```json[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/);
    if(!match) return null;
    try {const data=JSON.parse(match[2]);return data&&typeof data==='object'&&!Array.isArray(data)?{kind:match[1],data}:null;}
    catch(_) {return null;}
  }
  const shortText=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
  function build(issues) {
    const stamp='2026-10-29T00:00:00Z';
    const games=[
      {id:'1',title:'宇宙碰撞 · 3D 宇宙',description:'创造天体，探索三维空间的引力、轨道和碰撞。观察黑洞、冲击波和行星环境指数。',category:'sandbox',play_url:'cosmic-collision-3d.html',author_name:'晨晨',author_login:'linyucandy',created_at:stamp,updated_at:stamp,published:1},
      {id:'2',title:'宇宙碰撞 · 2D 引力沙盒',description:'拖动发射天体，在轻量二维沙盒里观察引力、星系演化与碰撞。随时开始一场宇宙实验。',category:'sandbox',play_url:'cosmic-collision-simulator.html',author_name:'晨晨',author_login:'linyucandy',created_at:stamp,updated_at:stamp,published:1}
    ];
    const parsed=[];
    for(const issue of issues) {
      if(issue.state!=='open'||issue.pull_request||!Number.isSafeInteger(issue.number)||issue.number<1||!shortText(issue.user?.login,1,100)) continue;
      const record=parseBody(issue.body);
      if(!record) continue;
      const {kind,data}=record;
      if(kind==='game'&&shortText(data.title,2,80)&&shortText(data.description,20,4000)&&typeof data.category==='string'&&Object.hasOwn(categories,data.category)&&validUrl(data.play_url)) {
        games.push({id:'gh-'+issue.number,title:data.title.trim(),description:data.description.trim(),category:data.category,
          play_url:data.play_url,author_name:issue.user.login,author_login:issue.user.login,issue_number:issue.number,
          issue_url:base+'/issues/'+issue.number,created_at:issue.created_at,updated_at:issue.updated_at,published:1});
      } else if(['review','discussion'].includes(kind)&&shortText(data.body,2,2000)&&
        (typeof data.game_id==='string'||Number.isInteger(data.game_id))&&
        (kind==='discussion'||(Number.isInteger(data.rating)&&data.rating>=1&&data.rating<=5))) {
        parsed.push({id:issue.number,game_id:String(data.game_id),username:issue.user.login,
          rating:kind==='review'?data.rating:null,body:data.body,created_at:issue.created_at,updated_at:issue.updated_at,
          issue_url:base+'/issues/'+issue.number,reply_count:Number(issue.comments)||0,kind});
      }
    }
    const byId=new Map(games.map(game=>[game.id,game])),latest=new Map(),discussions=[];
    for(const record of parsed) {
      const game=byId.get(record.game_id); if(!game) continue;
      if(record.username.toLowerCase()===game.author_login.toLowerCase()) record.rating=null;
      if(record.kind==='discussion') {discussions.push(record);continue;}
      const key=record.game_id+':'+record.username.toLowerCase(),previous=latest.get(key);
      // Comments also advance issue.updated_at. Only a newer publication can replace a vote.
      if(!previous||record.id>previous.id) latest.set(key,record);
    }
    const reviews=[...latest.values(),...discussions].sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))||b.id-a.id);
    for(const game of games) {
      const records=reviews.filter(review=>review.game_id===game.id),votes=records.filter(review=>review.rating!==null);
      game.rating_count=votes.length;
      game.rating_average=votes.length?votes.reduce((sum,review)=>sum+review.rating,0)/votes.length:null;
      game.discussion_count=records.reduce((sum,review)=>sum+1+review.reply_count,0);
    }
    return {games,reviews,stats:{games:games.length,creators:new Set(games.map(game=>game.author_login.toLowerCase())).size,
      reviews:reviews.filter(review=>review.rating!==null).length}};
  }
  function issueDraft(kind,data,title) {
    const url=new URL(base+'/issues/new');
    const prefix={game:'游戏发布',review:'游戏评价',discussion:'游戏交流'}[kind];
    url.searchParams.set('title',`[${prefix}] ${title}`);
    url.searchParams.set('body',makeBody(kind,data));
    if(url.href.length>7500) throw new Error('内容较长，请缩短介绍、评价或游戏网址后再试。');
    return url.href;
  }
  async function requestAll(path,maxPages=20) {
    let url=apiBase+path,records=[];
    for(let page=0;page<maxPages;page++) {
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
      let response;
      try {response=await fetch(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:controller.signal});}
      catch(_) {throw new Error('暂时无法连接 GitHub，请稍后重试。');}
      finally {clearTimeout(timer);}
      if(!response.ok) throw new Error([403,429].includes(response.status)?'GitHub 公开接口访问受限，请稍后再试或直接打开仓库。':'GitHub 记录加载失败，请稍后再试。');
      const data=await response.json();
      if(!Array.isArray(data)) throw new Error('GitHub 返回的数据格式不正确。');
      records.push(...data);
      const next=response.headers.get('Link')?.match(/<([^>]+)>;\s*rel="next"/);
      if(!next) return records;
      const parsed=new URL(next[1]);
      if(parsed.origin!=='https://api.github.com') throw new Error('分页地址无效。');
      url=parsed.href;
    }
    throw new Error('公开记录较多，暂未能完整载入，请前往 GitHub 查看。');
  }
  let cached=null,snapshotComments={},snapshotTime=null;
  async function loadSnapshot() {
    const response=await fetch('./community-snapshot.json',{cache:'no-store'});
    if(!response.ok) throw new Error('同站点社区快照暂不可用。');
    const result=await response.json();
    if(result.schema!==1||!Array.isArray(result.issues)||!Number.isFinite(Date.parse(result.generated_at))) throw new Error('社区快照格式无效。');
    snapshotComments=result.comments||{};snapshotTime=result.generated_at;
    return result;
  }
  function fromCache(entry) {
    const result=build(entry.issues);
    if(entry.snapshot_at) {
      result.snapshot_at=entry.snapshot_at;snapshotTime=entry.snapshot_at;snapshotComments=entry.comments||{};
    }
    return result;
  }
  async function read(force=false) {
    if(!force&&cached&&Date.now()-cached.time<120000) return fromCache(cached);
    if(!force) {
      try {const saved=JSON.parse(sessionStorage.getItem('cosmic-github-community')||'null');
        if(saved&&Array.isArray(saved.issues)&&Date.now()-saved.time<120000) {cached=saved;return fromCache(saved);}}
      catch(_) { /* Storage may be disabled. Public loading still works. */ }
    }
    try {
      const issues=await requestAll('/issues?state=open&per_page=100&sort=created&direction=desc');
      cached={time:Date.now(),issues};
    } catch(error) {
      try {const snapshot=await loadSnapshot();cached={time:Date.now(),issues:snapshot.issues,snapshot_at:snapshot.generated_at,comments:snapshot.comments};}
      catch(_) {throw error;}
    }
    try {sessionStorage.setItem('cosmic-github-community',JSON.stringify(cached));} catch(_) { /* Optional cache. */ }
    return fromCache(cached);
  }
  const model={repo,base,categories,validUrl,makeBody,parseBody,build,issueDraft,read,
    comments:async number=>{
      try {return await requestAll(`/issues/${Number(number)}/comments?per_page=100`,10);}
      catch(error) {
        if(!Object.hasOwn(snapshotComments,String(number))) await loadSnapshot();
        if(!Array.isArray(snapshotComments[String(number)])) throw error;
        const result=[...snapshotComments[String(number)]];result.snapshot_at=snapshotTime;return result;
      }
    }};
  if(typeof module!=='undefined'&&module.exports) module.exports=model;
  else globalThis.CommunityGitHub=model;
})();
