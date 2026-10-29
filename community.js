'use strict';
(() => {
  if(location.hostname.endsWith('.github.io')||new URLSearchParams(location.search).get('source')==='github') {
    import('./community-github.js?v=community4').catch(() => {
      const target=document.getElementById('catalogueContent')||document.getElementById('detailContent')||document.getElementById('publishError');
      if(target) target.textContent='社区加载失败，请刷新页面重试。';
    });
    return;
  }
  const categories = {sandbox:'沙盒模拟',puzzle:'益智解谜',action:'动作挑战',adventure:'冒险探索',casual:'休闲小游戏',other:'其他'};
  const symbols = {sandbox:'◎',puzzle:'◇',action:'ϟ',adventure:'✧',casual:'✿',other:'✳'};
  const state = {user:null,csrf:null,detail:null};
  const params = new URLSearchParams(location.search);
  const pageType = document.body.dataset.page;
  const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const date = value => new Date(value).toLocaleDateString('zh-CN');
  const stars = value => '★'.repeat(value)+'☆'.repeat(5-value);
  let toastTimer, searchTimer, catalogueRequest = 0, detailRequest = 0, authRevision = 0;
  let category = params.get('category') || '';
  let cataloguePage = 1, reviewPage = 1;

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',
        ...(state.csrf ? {'X-CSRF-Token':state.csrf} : {}),...options.headers}});
    } catch (_) {
      throw new Error('暂时无法连接游戏社区');
    }
    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error('暂时无法连接游戏社区'); }
    if (!response.ok) {
      const error = new Error(result.error || '操作未完成，请重试。');
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function toast(message) {
    let node = document.getElementById('toast');
    if (!node) {
      node = document.createElement('div'); node.id = 'toast'; node.className = 'toast';
      node.setAttribute('role','status'); document.body.appendChild(node);
    }
    node.textContent = message; node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.hidden = true,3500);
  }

  function showError(container,error,retry) {
    container.innerHTML = `<div class="error-state"><div class="state-icon" aria-hidden="true">↻</div><h2>${e(error.message)}</h2><p>内容未能加载，请稍后重试。你的操作没有被记为成功。</p><button class="button" data-retry>重新加载</button></div>`;
    container.querySelector('[data-retry]').addEventListener('click',retry);
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'authDialog'; dialog.className = 'auth-dialog';
  dialog.setAttribute('aria-labelledby','authHeading');
  dialog.innerHTML = `<button class="dialog-close" type="button" aria-label="关闭登录窗口">×</button>
    <div class="eyebrow">JOIN THE COMMUNITY</div><h2 id="authHeading">欢迎回到星游</h2><p>一起发现好游戏，也让你的创意被看见。</p>
    <div class="auth-tabs" role="tablist" aria-label="登录方式"><button id="authLoginTab" role="tab" aria-selected="true" type="button">登录</button><button id="authRegisterTab" role="tab" aria-selected="false" type="button">注册</button></div>
    <form id="authForm"><label class="form-label" for="authUsername">昵称</label><input id="authUsername" name="username" minlength="2" maxlength="24" required autocomplete="username" placeholder="你的社区昵称">
    <label class="form-label" for="authPassword">密码</label><input id="authPassword" name="password" type="password" minlength="8" maxlength="128" required autocomplete="current-password" placeholder="至少 8 位">
    <p class="field-note" id="authNote">使用注册时的昵称和密码登录。</p><p class="form-error" id="authError" role="alert"></p><button class="button primary" id="authSubmit" type="submit">登录</button></form>`;
  document.body.appendChild(dialog);
  let authMode = 'login';
  function setAuthMode(mode) {
    authMode = mode;
    const register = mode === 'register';
    document.getElementById('authLoginTab').setAttribute('aria-selected',String(!register));
    document.getElementById('authRegisterTab').setAttribute('aria-selected',String(register));
    document.getElementById('authHeading').textContent = register ? '加入星游，分享你的热爱。' : '欢迎回到星游';
    document.getElementById('authSubmit').textContent = register ? '注册并加入' : '登录';
    document.getElementById('authNote').textContent = register ? '昵称会公开显示在作品和评价中。请妥善保存密码。' : '使用注册时的昵称和密码登录。';
    document.getElementById('authPassword').autocomplete = register ? 'new-password' : 'current-password';
    document.getElementById('authError').textContent = '';
  }
  function openAuth() {
    document.getElementById('authError').textContent = '';
    if (!dialog.open) dialog.showModal();
  }
  function bindAuthButtons(root = document) {
    root.querySelectorAll('[data-auth-open]').forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1'; button.addEventListener('click',openAuth);
    });
  }
  dialog.querySelector('.dialog-close').addEventListener('click',() => dialog.close());
  document.getElementById('authLoginTab').addEventListener('click',() => setAuthMode('login'));
  document.getElementById('authRegisterTab').addEventListener('click',() => setAuthMode('register'));
  dialog.addEventListener('click',event => { if (event.target === dialog && event.offsetX < 0) dialog.close(); });
  document.getElementById('authForm').addEventListener('submit',async event => {
    event.preventDefault();
    const button = document.getElementById('authSubmit'); button.disabled = true;
    document.getElementById('authError').textContent = '';
    try {
      const result = await api('/auth/'+authMode,{method:'POST',body:JSON.stringify({username:document.getElementById('authUsername').value,password:document.getElementById('authPassword').value})});
      authRevision++; state.user = result.user; state.csrf = result.csrf;
      document.getElementById('authPassword').value = '';
      dialog.close(); renderAccount(); await renderPage(); toast('欢迎，'+state.user.username);
    } catch (error) { document.getElementById('authError').textContent = error.message; }
    finally { button.disabled = false; }
  });

  function renderAccount() {
    const area = document.getElementById('accountArea');
    if (state.user) {
      area.innerHTML = `<a class="account-name" href="community.html?mine=1" title="${e(state.user.username)}的作品">${e(state.user.username)}</a><button class="text-button" id="logoutButton">退出</button>`;
      area.querySelector('#logoutButton').addEventListener('click',async () => {
        try {
          await api('/auth/logout',{method:'POST'}); authRevision++; state.user = null; state.csrf = null;
          loadedEditId = null; document.getElementById('publishForm')?.reset();
          renderAccount(); await renderPage(); toast('已退出登录');
        } catch (error) { toast(error.message); }
      });
    } else area.innerHTML = '<button class="button small" data-auth-open>登录 / 注册</button>';
    bindAuthButtons();
  }

  function gameCard(game) {
    return `<article class="game-card"><a href="game.html?id=${game.id}" class="game-art ${e(game.category)}" tabindex="-1" aria-hidden="true"><span class="card-badge">${e(categories[game.category])}${game.published ? '' : ' · 已下架'}</span><span class="art-symbol">${symbols[game.category] || '✳'}</span></a><div class="card-content"><h2 class="card-title"><a href="game.html?id=${game.id}">${e(game.title)}</a></h2><p class="card-description">${e(game.description)}</p><div class="card-meta"><span class="card-author">by ${e(game.author_name)}</span><span class="rating-text">${game.rating_count ? '★ '+Number(game.rating_average).toFixed(1)+' · '+game.rating_count+' 人' : '尚无评分'}</span></div></div></article>`;
  }

  function pagination(node,current,pages,load) {
    node.innerHTML = pages > 1 ? `<button class="button small" data-prev ${current <= 1 ? 'disabled' : ''}>上一页</button><span>${current} / ${pages}</span><button class="button small" data-next ${current >= pages ? 'disabled' : ''}>下一页</button>` : '';
    node.querySelector('[data-prev]')?.addEventListener('click',() => load(current-1));
    node.querySelector('[data-next]')?.addEventListener('click',() => load(current+1));
  }

  async function loadCatalogue() {
    const requestId = ++catalogueRequest;
    const content = document.getElementById('catalogueContent');
    content.innerHTML = '<div class="loading-state" role="status">正在加载游戏…</div>';
    const query = new URLSearchParams({page:String(cataloguePage),sort:document.getElementById('gameSort').value});
    const search = document.getElementById('gameSearch').value.trim();
    if (search) query.set('q',search);
    if (category) query.set('category',category);
    if (document.getElementById('mineOnly').checked && state.user) query.set('mine','1');
    history.replaceState(null,'','community.html?'+query.toString());
    try {
      const result = await api('/games?'+query);
      if (requestId !== catalogueRequest) return;
      cataloguePage = result.page;
      document.getElementById('statGames').textContent = result.stats.games;
      document.getElementById('statCreators').textContent = result.stats.creators;
      document.getElementById('statReviews').textContent = result.stats.reviews;
      document.getElementById('resultCount').textContent = `发现 ${result.total} 款游戏`;
      content.innerHTML = result.games.length ? `<div class="game-grid">${result.games.map(gameCard).join('')}</div>` :
        '<div class="empty-state"><div class="state-icon" aria-hidden="true">◇</div><h2>这里还没有游戏</h2><p>试试其他关键词，或把你的第一款作品带到这里。</p><a class="button" href="publish.html">发布一款游戏 ↗</a></div>';
      pagination(document.getElementById('cataloguePagination'),result.page,result.pages,page => {cataloguePage=page;loadCatalogue();});
    } catch (error) {
      if (requestId !== catalogueRequest) return;
      document.getElementById('resultCount').textContent = '暂时无法加载游戏';
      document.getElementById('cataloguePagination').replaceChildren();
      showError(content,error,loadCatalogue);
    }
  }

  function safePlayUrl(value) {
    if (['/cosmic-collision-3d.html','/cosmic-collision-simulator.html','/pixel-city.html'].includes(value)) return value;
    try {
      const parsed = new URL(value);
      if (['https:','http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.href;
    } catch (_) { /* Invalid links are not rendered as playable actions. */ }
    return null;
  }

  function renderReview(review,game) {
    return `<article class="review-item"><div class="review-head"><span class="avatar-small" aria-hidden="true">${e(review.username.slice(0,1))}</span><div><div class="review-author">${e(review.username)}${review.is_owner ? ' · 你的评价' : ''}</div><div class="review-date">${date(review.updated_at)}</div></div><span class="review-rating" aria-label="${review.rating} 星">${stars(review.rating)}</span></div><p class="review-body">${e(review.body)}</p><div class="review-tools"><button class="text-button" data-reply-open="${review.id}">回复${review.reply_count ? ' · '+review.reply_count : ''}</button>${review.is_owner ? `<button class="text-button" data-review-delete="${review.id}">删除我的评价</button>` : ''}</div><div class="replies">${review.replies.map(reply => `<div class="reply"><div class="review-date"><span class="review-author">${e(reply.username)}</span>${reply.user_id === game.user_id ? ' <span class="badge">作者</span>' : ''} · ${date(reply.created_at)} ${reply.is_owner ? `<button class="text-button" data-reply-delete="${reply.id}">删除回复</button>` : ''}</div><p>${e(reply.body)}</p></div>`).join('')}${review.reply_count > 50 ? '<p class="field-note">显示最近 50 条回复。</p>' : ''}</div><form class="reply-form" data-reply-form="${review.id}" hidden><label class="sr-only" for="reply-${review.id}">回复内容</label><textarea id="reply-${review.id}" name="reply" required maxlength="1000" placeholder="与玩家或作者聊聊你的想法…"></textarea><p class="form-error" role="alert"></p><button class="button small" data-reply-submit type="submit">发布回复</button></form></article>`;
  }

  function reviewEditor(game,myReview) {
    if (!game.published) return '<div class="section-card review-form-card"><h2>游戏已下架</h2><p class="muted">当前不开放新的评价和回复。</p></div>';
    if (!state.user) return '<div class="section-card review-form-card"><h2>你的体验，对创作者很重要。</h2><p class="muted">登录后留下评分、评价，与大家交流。</p><button class="button" data-auth-open>登录后评价</button></div>';
    if (game.is_owner) return '<div class="section-card review-form-card"><h2>听听玩家怎么说。</h2><p class="field-note">这是你的作品。你可以在下方回复玩家，与他们交流；作者不参与自己作品的评分。</p></div>';
    return `<div class="section-card review-form-card"><h2>${myReview ? '更新你的评价' : '说说你的游戏体验'}</h2><form class="review-form" id="reviewForm"><fieldset class="star-picker"><legend>你的评分</legend>${[1,2,3,4,5].map(rating => `<label class="star-choice"><input type="radio" name="rating" value="${rating}" required aria-label="${rating} 星" ${myReview?.rating === rating ? 'checked' : ''}><span>${rating} ★</span></label>`).join('')}</fieldset><label class="sr-only" for="reviewBody">评价内容</label><textarea id="reviewBody" required minlength="2" maxlength="2000" placeholder="喜欢哪里？哪些地方还能更好？请分享真实、具体的体验。">${e(myReview?.body || '')}</textarea><p class="field-note">每个账户一份评分，可随体验更新。</p><p class="form-error" id="reviewError" role="alert"></p><button class="button primary" id="reviewSubmit" type="submit">${myReview ? '更新评价' : '发布评价'}</button></form></div>`;
  }

  async function loadDetail() {
    const requestId = ++detailRequest;
    const content = document.getElementById('detailContent');
    const id = Number(params.get('id'));
    if (!Number.isSafeInteger(id) || id < 1) {
      showError(content,new Error('没有找到这个游戏'),() => location.href='community.html'); return;
    }
    try {
      const result = await api(`/games/${id}?page=${reviewPage}`);
      if (requestId !== detailRequest) return;
      reviewPage = result.page;
      const game = result.game; state.detail = result;
      document.title = game.title+' · 星游游戏广场';
      const playUrl = safePlayUrl(game.play_url);
      const destination = playUrl?.startsWith('/') ? '站内游戏' : playUrl ? new URL(playUrl).hostname : '';
      content.innerHTML = `${game.published ? '' : '<div class="status-banner">作品已下架，当前只有作者可以查看。重新上架后玩家可继续访问，原有评价会保留。</div>'}<section class="detail-hero"><div class="game-art detail-art ${e(game.category)}" aria-hidden="true"><span class="art-symbol">${symbols[game.category] || '✳'}</span></div><div class="game-info"><span class="badge">${e(categories[game.category])}</span><h1>${e(game.title)}</h1><p class="meta">由 ${e(game.author_name)} 创作 · ${date(game.created_at)} 发布</p><div class="detail-actions">${playUrl && game.published ? `<a class="button primary" id="playGame" href="${e(playUrl)}" target="_blank" rel="noopener noreferrer nofollow">开始游戏 ↗</a>` : ''}${game.is_owner ? `<a class="button" href="publish.html?id=${game.id}">编辑作品</a><button class="button small" id="togglePublication">${game.published ? '暂时下架' : '重新上架'}</button>` : ''}</div><p class="external-hint">${playUrl ? `游戏将在新标签页打开 · ${e(destination)}` : '游戏链接暂时不可用'}</p></div></section>
      <div class="detail-layout"><div class="detail-main"><section class="section-card"><h2>关于这个游戏</h2><div class="game-description">${e(game.description)}</div></section><section class="review-section"><div class="review-heading"><h2>玩家评价与交流</h2><span>${game.discussion_count} 条评价及回复</span></div><div id="reviewsList">${result.reviews.length ? result.reviews.map(review => renderReview(review,game)).join('') : '<div class="empty-state"><div class="state-icon" aria-hidden="true">✧</div><h2>第一条反馈，等你来写。</h2><p>玩一会儿，回来聊聊你的体验。</p></div>'}</div><nav id="reviewPagination" class="pagination" aria-label="评价翻页"></nav></section></div><aside class="detail-sidebar"><section class="section-card rating-summary"><h2>玩家评分</h2><div class="rating-number" id="averageRating">${game.rating_count ? Number(game.rating_average).toFixed(1) : '—'}</div><p id="ratingCount">${game.rating_count} 位玩家评分 · 满分 5 星</p><div class="rating-distribution">${[5,4,3,2,1].map(rating => `<span>${rating} ★</span><meter min="0" max="${Math.max(1,game.rating_count)}" value="${result.distribution[String(rating)]}" aria-label="${rating} 星 ${result.distribution[String(rating)]} 人"></meter><span>${result.distribution[String(rating)]}</span>`).join('')}</div></section>${reviewEditor(game,result.my_review)}</aside></div>`;
      bindAuthButtons(content);
      pagination(document.getElementById('reviewPagination'),result.page,result.pages,page => {reviewPage=page;loadDetail();});
      content.querySelector('#reviewForm')?.addEventListener('submit',async event => {
        event.preventDefault(); const form=event.currentTarget,button=form.querySelector('button'); button.disabled=true;
        const errorNode=document.getElementById('reviewError'); errorNode.textContent='';
        try {
          const data=new FormData(form);
          await api(`/games/${id}/review`,{method:'PUT',body:JSON.stringify({rating:Number(data.get('rating')),body:document.getElementById('reviewBody').value})});
          await loadDetail(); toast('评价已保存，谢谢你的反馈。');
        } catch (error) {errorNode.textContent=error.message; if(error.status===401) openAuth();}
        finally {button.disabled=false;}
      });
      content.querySelectorAll('[data-reply-open]').forEach(button => button.addEventListener('click',() => {
        if (!state.user) return openAuth();
        if (!game.published) return toast('游戏已下架，暂不能回复。');
        const form=content.querySelector(`[data-reply-form="${button.dataset.replyOpen}"]`);
        form.hidden=!form.hidden; if(!form.hidden) form.querySelector('textarea').focus();
      }));
      content.querySelectorAll('[data-reply-form]').forEach(form => form.addEventListener('submit',async event => {
        event.preventDefault(); const button=form.querySelector('button'),errorNode=form.querySelector('.form-error');
        button.disabled=true; errorNode.textContent='';
        try {
          await api(`/reviews/${form.dataset.replyForm}/replies`,{method:'POST',body:JSON.stringify({body:form.querySelector('textarea').value})});
          await loadDetail(); toast('回复已发布');
        } catch(error) {errorNode.textContent=error.message;}
        finally {button.disabled=false;}
      }));
      for (const [selector,pathKey,path] of [['[data-review-delete]','reviewDelete','reviews'],['[data-reply-delete]','replyDelete','replies']]) {
        content.querySelectorAll(selector).forEach(button => button.addEventListener('click',async () => {
          if (!confirm(path==='reviews' ? '删除你的评价及其下的回复？' : '删除这条回复？')) return;
          button.disabled=true;
          try {await api(`/${path}/${button.dataset[pathKey]}`,{method:'DELETE'}); await loadDetail(); toast('已删除');}
          catch(error) {toast(error.message); button.disabled=false;}
        }));
      }
      content.querySelector('#togglePublication')?.addEventListener('click',async event => {
        if (game.published && !confirm('暂时下架这个游戏？已发布的评价会保留。')) return;
        event.currentTarget.disabled=true;
        try {
          await api(`/games/${id}${game.published ? '' : '/restore'}`,{method:game.published ? 'DELETE' : 'POST'});
          await loadDetail(); toast(game.published ? '作品已下架' : '作品已重新上架');
        } catch(error) {toast(error.message); await loadDetail();}
      });
    } catch(error) {if(requestId === detailRequest) showError(content,error,loadDetail);}
  }

  let loadedEditId = null;
  async function loadPublish() {
    const revision = authRevision;
    const fieldset=document.getElementById('publishFields');
    document.getElementById('publishGate').hidden=!!state.user;
    fieldset.disabled=!state.user;
    bindAuthButtons();
    const id=Number(params.get('id'));
    if (id && state.user && loadedEditId!==id) {
      try {
        const {game}=await api(`/games/${id}`);
        if(revision !== authRevision) return;
        if(!game.is_owner) throw new Error('只能编辑自己发布的作品。');
        document.getElementById('gameTitle').value=game.title;
        document.getElementById('gameUrl').value=game.play_url;
        document.getElementById('gameCategory').value=game.category;
        document.getElementById('gameDescription').value=game.description;
        document.getElementById('publishHeading').textContent='让你的作品，继续变得更好。';
        document.getElementById('publishSubmit').textContent='保存修改';
        loadedEditId=id;
      } catch(error) {if(revision===authRevision) {fieldset.disabled=true; document.getElementById('publishError').textContent=error.message;}}
    }
    updateDescriptionCount();
  }

  function updateDescriptionCount() {
    const description=document.getElementById('gameDescription');
    if(description) document.getElementById('descriptionCount').textContent=`${description.value.length} / 4000`;
  }

  async function renderPage() {
    if(pageType==='catalogue') {
      if(!state.user) document.getElementById('mineOnly').checked=false;
      await loadCatalogue();
    } else if(pageType==='detail') await loadDetail();
    else if(pageType==='publish') await loadPublish();
  }

  if(pageType==='catalogue') {
    document.getElementById('gameSearch').value=params.get('q') || '';
    document.getElementById('gameSort').value=params.get('sort')==='rating' ? 'rating' : 'newest';
    if(!Object.hasOwn(categories,category)) category='';
    const filters=document.getElementById('categoryFilters');
    filters.innerHTML=Object.entries({'':'全部游戏',...categories}).map(([key,label]) => `<button class="category ${key===category ? 'active' : ''}" data-category="${key}" aria-pressed="${key===category}">${label}</button>`).join('');
    filters.querySelectorAll('button').forEach(button => button.addEventListener('click',() => {
      category=button.dataset.category; cataloguePage=1;
      filters.querySelectorAll('button').forEach(node => {node.classList.toggle('active',node===button);node.setAttribute('aria-pressed',String(node===button));});
      loadCatalogue();
    }));
    document.getElementById('gameSearch').addEventListener('input',() => {clearTimeout(searchTimer);searchTimer=setTimeout(() => {cataloguePage=1;loadCatalogue();},300);});
    document.getElementById('gameSort').addEventListener('change',() => {cataloguePage=1;loadCatalogue();});
    document.getElementById('mineOnly').addEventListener('change',event => {
      if(!state.user) {event.currentTarget.checked=false;openAuth();return;}
      cataloguePage=1;loadCatalogue();
    });
  }
  if(pageType==='publish') {
    document.getElementById('gameDescription').addEventListener('input',updateDescriptionCount);
    document.getElementById('publishForm').addEventListener('submit',async event => {
      event.preventDefault(); if(!state.user) return openAuth();
      const button=document.getElementById('publishSubmit'),errorNode=document.getElementById('publishError');
      errorNode.textContent=''; button.disabled=true;
      try {
        const data={title:document.getElementById('gameTitle').value,play_url:document.getElementById('gameUrl').value,
          category:document.getElementById('gameCategory').value,description:document.getElementById('gameDescription').value};
        const id=Number(params.get('id'));
        const result=await api('/games'+(id ? '/'+id : ''),{method:id ? 'PATCH' : 'POST',body:JSON.stringify(data)});
        location.href='game.html?id='+result.game.id;
      } catch(error) {errorNode.textContent=error.message;button.disabled=false;if(error.status===401) openAuth();}
    });
  }
  bindAuthButtons();
  (async () => {
    const revision=authRevision;
    try {const result=await api('/auth/me');if(revision===authRevision) {state.user=result.user;state.csrf=result.csrf;}}
    catch(_) { /* Each page renders a recoverable error for its own request. */ }
    renderAccount();
    if(pageType==='catalogue' && state.user && params.get('mine')==='1') document.getElementById('mineOnly').checked=true;
    await renderPage();
  })();
})();
