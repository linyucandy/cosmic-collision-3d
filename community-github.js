/* GitHub Pages edition: visitors confirm all writes on GitHub using their own account. */
const M=globalThis.CommunityGitHub;
const categories=M.categories,params=new URLSearchParams(location.search),pageType=document.body.dataset.page;
const forced=params.get('source')==='github';
const e=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const symbols={sandbox:'◎',puzzle:'◇',action:'ϟ',adventure:'✧',casual:'✿',other:'✳'};
const date=value=>new Date(value).toLocaleDateString('zh-CN');
const external='target="_blank" rel="noopener noreferrer"';
function local(file,values={}) {const query=new URLSearchParams(values);if(forced)query.set('source','github');return file+(query.size?'?'+query:'');}
let data,category=params.get('category')||'',page=1,detailPage=1,searchTimer;
document.getElementById('accountArea').innerHTML=`<a class="button small" href="${M.base}/issues" ${external}>用 GitHub 账号参与 ↗</a>`;
if(forced) document.querySelectorAll('a[href="community.html"],a[href="publish.html"]').forEach(link=>link.href=local(link.getAttribute('href')));

function errorState(node,error,retry) {
  node.innerHTML=`<div class="error-state"><div class="state-icon" aria-hidden="true">↻</div><h2>${e(error.message)}</h2><p>目前没有载入完整社区记录，因此不显示可能不准确的评分。</p><button class="button" data-retry>重新同步</button> <a class="button" href="${M.base}/issues" ${external}>直接在 GitHub 查看 ↗</a></div>`;
  node.querySelector('[data-retry]').addEventListener('click',retry);
}
async function getData(force=false) {
  if(!data||force)data=await M.read(force);
  let notice=document.getElementById('snapshotNotice');
  if(data.snapshot_at) {
    if(!notice) {notice=document.createElement('div');notice.id='snapshotNotice';notice.className='status-banner';document.querySelector('main').prepend(notice);}
    notice.textContent='GitHub 暂时无法直连，当前显示 '+new Date(data.snapshot_at).toLocaleString('zh-CN')+' 的公开快照。提交后需等待自动同步，再点击“同步最新”。';
  } else notice?.remove();
  return data;
}
function card(game) {
  return `<article class="game-card"><a class="game-art ${e(game.category)}" href="${local('game.html',{id:game.id})}" tabindex="-1" aria-hidden="true"><span class="card-badge">${e(categories[game.category])}</span><span class="art-symbol">${symbols[game.category]}</span></a><div class="card-content"><h2 class="card-title"><a href="${local('game.html',{id:game.id})}">${e(game.title)}</a></h2><p class="card-description">${e(game.description)}</p><div class="card-meta"><span class="card-author">by ${e(game.author_name)}</span><span class="rating-text">${game.rating_count?'★ '+game.rating_average.toFixed(1)+' · '+game.rating_count+' 人':'尚无评分'}</span></div></div></article>`;
}
function pagination(node,current,pages,change) {
  node.innerHTML=pages>1?`<button class="button small" data-prev ${current<=1?'disabled':''}>上一页</button><span>${current} / ${pages}</span><button class="button small" data-next ${current>=pages?'disabled':''}>下一页</button>`:'';
  node.querySelector('[data-prev]')?.addEventListener('click',()=>change(current-1));
  node.querySelector('[data-next]')?.addEventListener('click',()=>change(current+1));
}
async function catalogue(force=false) {
  const node=document.getElementById('catalogueContent');
  try {
    const result=await getData(force);
    const q=document.getElementById('gameSearch').value.trim().toLowerCase();
    let games=result.games.filter(game=>(!category||game.category===category)&&(!q||[game.title,game.description,game.author_name].join(' ').toLowerCase().includes(q)));
    games.sort(document.getElementById('gameSort').value==='rating'?(a,b)=>(b.rating_average||0)-(a.rating_average||0)||b.rating_count-a.rating_count:(a,b)=>String(b.created_at).localeCompare(String(a.created_at))||b.id.localeCompare(a.id));
    const pages=Math.max(1,Math.ceil(games.length/12));page=Math.min(page,pages);
    document.getElementById('statGames').textContent=result.stats.games;
    document.getElementById('statCreators').textContent=result.stats.creators;
    document.getElementById('statReviews').textContent=result.stats.reviews;
    document.getElementById('resultCount').textContent=`发现 ${games.length} 款游戏`;
    node.innerHTML=games.length?`<div class="game-grid">${games.slice((page-1)*12,page*12).map(card).join('')}</div>`:'<div class="empty-state"><div class="state-icon">◇</div><h2>暂时没有匹配的游戏</h2><p>换个关键词，或发布你的第一款作品。</p></div>';
    pagination(document.getElementById('cataloguePagination'),page,pages,next=>{page=next;catalogue();});
  } catch(error) {errorState(node,error,()=>catalogue(true));}
}

function draftReady(node,url,label) {
  node.innerHTML=`<p class="field-note">草稿已准备好，尚未发布。请在 GitHub 页面确认并提交，完成后返回广场点击“同步最新”。</p><a class="button primary" href="${e(url)}" ${external}>${label} ↗</a>`;
}
function editor(game) {
  return `<section class="section-card review-form-card"><h2>留下评分，聊聊体验。</h2><p class="field-note">使用 GitHub 账号确认提交；本站不收集 GitHub 密码或令牌。同一账户的最新一份评价计入评分，作者的自评不计分。</p><form id="githubReviewForm"><fieldset class="star-picker"><legend>你的评分</legend>${[1,2,3,4,5].map(rating=>`<label class="star-choice"><input type="radio" name="rating" value="${rating}" required aria-label="${rating} 星"><span>${rating} ★</span></label>`).join('')}</fieldset><label class="sr-only" for="reviewBody">评价内容</label><textarea id="reviewBody" required minlength="2" maxlength="500" placeholder="你喜欢哪里？还有什么建议？（最多 500 字）"></textarea><p class="form-error" id="githubReviewError" role="alert"></p><button class="button primary" id="reviewSubmit" type="submit">准备评价草稿</button><div id="githubReviewReady"></div></form><p class="field-note">只想交流也可以：无需选择星级。</p><button class="button small" id="discussionDraft" type="button">准备讨论草稿</button><div id="discussionReady"></div></section>`;
}
function reviewCard(review,game) {
  return `<article class="review-item"><div class="review-head"><span class="avatar-small" aria-hidden="true">${e(review.username.slice(0,1))}</span><div><div class="review-author">${e(review.username)}${review.username.toLowerCase()===game.author_login.toLowerCase()?' · 作者':''}</div><div class="review-date">${date(review.updated_at)}</div></div><span class="review-rating">${review.rating===null?'交流':'★'.repeat(review.rating)+'☆'.repeat(5-review.rating)}</span></div><p class="review-body">${e(review.body)}</p><div class="review-tools"><a class="text-button" href="${review.issue_url}#new_comment_field" ${external}>用 GitHub 回复 ↗</a><a class="text-button" href="${review.issue_url}" ${external}>查看 / 管理原帖 ↗</a>${review.reply_count?`<button class="text-button" data-comments="${review.id}">展开交流 · ${review.reply_count} 条</button>`:''}</div><div class="replies" id="comments-${review.id}"></div></article>`;
}
async function detail(force=false) {
  const node=document.getElementById('detailContent');
  try {
    const result=await getData(force),game=result.games.find(game=>game.id===params.get('id'));
    if(!game) throw new Error('没有找到这个游戏，作品可能已下架。');
    document.title=game.title+' · 星游游戏广场';
    const reviews=result.reviews.filter(review=>review.game_id===game.id);
    const pages=Math.max(1,Math.ceil(reviews.length/20));detailPage=Math.min(detailPage,pages);
    const visibleReviews=reviews.slice((detailPage-1)*20,detailPage*20);
    const distribution=Object.fromEntries([1,2,3,4,5].map(rating=>[rating,reviews.filter(review=>review.rating===rating).length]));
    node.innerHTML=`<section class="detail-hero"><div class="game-art detail-art ${e(game.category)}" aria-hidden="true"><span class="art-symbol">${symbols[game.category]}</span></div><div class="game-info"><span class="badge">${e(categories[game.category])}</span><h1>${e(game.title)}</h1><p class="meta">由 ${e(game.author_name)} 创作 · ${date(game.created_at)} 发布</p><div class="detail-actions"><a class="button primary" id="playGame" href="${e(game.play_url)}" target="_blank" rel="noopener noreferrer nofollow">开始游戏 ↗</a>${game.source_url?`<a class="button" href="${e(game.source_url)}" ${external}>GitHub 源码 ↗</a>`:''}${game.issue_url?`<a class="button" href="${game.issue_url}" ${external}>在 GitHub 管理作品 ↗</a>`:''}<button class="button small" id="detailSync">同步最新 ⟳</button></div><p class="external-hint">游戏在新标签页打开；发布、评价与交流由 GitHub 账号确认。</p></div></section><div class="detail-layout"><div class="detail-main"><section class="section-card"><h2>关于这个游戏</h2><div class="game-description">${e(game.description)}</div></section><section class="review-section"><div class="review-heading"><h2>玩家评价与交流</h2><span>${game.discussion_count} 条评价及回复</span></div><div id="reviewsList">${reviews.length?visibleReviews.map(review=>reviewCard(review,game)).join(''):'<div class="empty-state"><div class="state-icon">✧</div><h2>第一条反馈，等你来写。</h2><p>评分、建议或一个新点子，都值得分享。</p></div>'}</div><nav id="publicReviewPagination" class="pagination" aria-label="Review pages"></nav></section></div><aside class="detail-sidebar"><section class="section-card rating-summary"><h2>玩家评分</h2><div class="rating-number" id="averageRating">${game.rating_count?game.rating_average.toFixed(1):'—'}</div><p id="ratingCount">${game.rating_count} 位 GitHub 玩家评分 · 满分 5 星</p><div class="rating-distribution">${[5,4,3,2,1].map(rating=>`<span>${rating} ★</span><meter min="0" max="${Math.max(1,game.rating_count)}" value="${distribution[rating]}" aria-label="${rating} 星 ${distribution[rating]} 人"></meter><span>${distribution[rating]}</span>`).join('')}</div></section>${editor(game)}</aside></div>`;
    pagination(document.getElementById('publicReviewPagination'),detailPage,pages,next=>{detailPage=next;detail();});
    document.getElementById('detailSync').addEventListener('click',()=>detail(true));
    document.getElementById('githubReviewForm').addEventListener('submit',event=>{
      event.preventDefault();const error=document.getElementById('githubReviewError');error.textContent='';
      try {const rating=Number(new FormData(event.currentTarget).get('rating')),body=document.getElementById('reviewBody').value.trim();
        draftReady(document.getElementById('githubReviewReady'),M.issueDraft('review',{game_id:game.id,rating,body},game.title),'前往 GitHub 确认评价');}
      catch(problem) {error.textContent=problem.message;}
    });
    document.getElementById('discussionDraft').addEventListener('click',()=>{
      const body=document.getElementById('reviewBody').value.trim(),error=document.getElementById('githubReviewError');error.textContent='';
      if(body.length<2) {error.textContent='请先在上方写下想交流的内容。';return;}
      try {draftReady(document.getElementById('discussionReady'),M.issueDraft('discussion',{game_id:game.id,body},game.title),'前往 GitHub 参与交流');}
      catch(problem) {error.textContent=problem.message;}
    });
    node.querySelectorAll('[data-comments]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      const target=document.getElementById('comments-'+button.dataset.comments);
      try {
        const comments=await M.comments(button.dataset.comments);
        target.innerHTML=(comments.snapshot_at?`<p class="field-note">交流快照：${e(date(comments.snapshot_at))}</p>`:'')+(comments.map(comment=>`<div class="reply"><div class="review-date"><span class="review-author">${e(comment.user?.login||'GitHub 用户')}</span> · ${date(comment.created_at)}</div><p>${e((comment.body||'').slice(0,4000))}${comment.body?.length>4000?'…':''}</p></div>`).join('')||'<p class="field-note">暂时还没有回复。</p>');
        button.textContent='交流已展开';
      } catch(problem) {target.textContent=problem.message;button.disabled=false;}
    }));
  } catch(error) {errorState(node,error,()=>detail(true));}
}

async function publish() {
  const gate=document.getElementById('publishGate'),form=document.getElementById('publishForm');
  gate.innerHTML=`<p>使用你的 GitHub 账号确认发布。作品与评价将公开展示，本站不需要密码或令牌。</p><a class="button small" href="${M.base}/issues" ${external}>查看社区记录 ↗</a>`;
  document.getElementById('publishFields').disabled=false;
  document.getElementById('publishSubmit').textContent='准备发布草稿 ↗';
  document.getElementById('gameDescription').maxLength=500;
  document.querySelector('label[for="gameDescription"] small').textContent='20–500 字';
  const updateCount=()=>document.getElementById('descriptionCount').textContent=document.getElementById('gameDescription').value.length+' / 500';
  document.getElementById('gameDescription').addEventListener('input',updateCount);updateCount();
  document.querySelector('.publish-guide .optional-guide').innerHTML='<div class="step">02 / 确认发布</div><p>填写后会生成 GitHub 发布草稿。请在 GitHub 登录并点击 Submit new issue，才会真正发布。</p><div class="step">03 / 管理与交流</div><p>在自己的发布原帖编辑信息或关闭作品。修改后回到广场点击“同步最新”。评价和讨论也由 GitHub 账号确认。</p>';
  const ready=document.createElement('div');ready.id='githubPublishReady';form.querySelector('.section-card').appendChild(ready);
  form.addEventListener('submit',event=>{
    event.preventDefault();const error=document.getElementById('publishError');error.textContent='';
    try {
      const game={title:document.getElementById('gameTitle').value.trim(),description:document.getElementById('gameDescription').value.trim(),
        category:document.getElementById('gameCategory').value,play_url:document.getElementById('gameUrl').value.trim()};
      if(!M.validUrl(game.play_url)) throw new Error('请填写有效 HTTP/HTTPS 网址，不能包含账号或密码。');
      draftReady(ready,M.issueDraft('game',game,game.title),'前往 GitHub 确认发布');
    } catch(problem) {error.textContent=problem.message;ready.replaceChildren();}
  });
}

if(pageType==='catalogue') {
  const mine=document.getElementById('mineOnly');
  mine.parentElement.outerHTML=`<a class="text-button" href="${M.base}/issues?q=${encodeURIComponent('is:issue is:open author:@me')}" ${external}>查看我的发布 ↗</a>`;
  document.querySelector('.library-caption>span:last-child').innerHTML='<button class="text-button" id="githubSync">同步最新 ⟳</button>';
  document.getElementById('githubSync').addEventListener('click',()=>catalogue(true));
  document.querySelector('.hero-action small').textContent='GitHub 账号参与 · 完成后同步最新';
  document.getElementById('gameSearch').value=params.get('q')||'';
  if(!Object.hasOwn(categories,category))category='';
  const filters=document.getElementById('categoryFilters');
  filters.innerHTML=Object.entries({'':'全部游戏',...categories}).map(([key,label])=>`<button class="category ${key===category?'active':''}" data-category="${key}" aria-pressed="${key===category}">${label}</button>`).join('');
  filters.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    category=button.dataset.category;page=1;
    filters.querySelectorAll('button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
    catalogue();
  }));
  document.getElementById('gameSort').addEventListener('change',()=>{page=1;catalogue();});
  document.getElementById('gameSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;catalogue();},250);});
  await catalogue();
} else if(pageType==='detail') await detail();
else if(pageType==='publish') await publish();
