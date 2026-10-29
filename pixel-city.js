/* Browser controls; the city rules live in pixel-city-engine.js. */
(() => {
  'use strict';
  const C=PixelCity,$=id=>document.getElementById(id),canvas=$('cityMap'),renderer=new CityRenderer(canvas);
  const SAVE_KEY='chenchen-pixel-city-v1';
  let state=C.createCity(),tool='house',running=false,speed=1,elapsed=0,lastTime=0,lastDraw=0,space=false;
  let cursor={x:6,y:10},pointer=null,saveTimer=null,storageAvailable=true;
  const signed=value=>(value>=0?'+':'')+value;
  const message=text=>{$('cityMessage').textContent=text;};
  try {
    const saved=localStorage.getItem(SAVE_KEY);
    if(saved){const restored=C.restore(saved);if(restored){state=restored;message('欢迎回来，市长！已恢复这台设备上的城市。');}else message('旧存档无法读取，已建立新城市。请手动保存以替换旧存档。');}
  } catch(_){storageAvailable=false;}
  function save(manual=false){
    clearTimeout(saveTimer);
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageAvailable=true;$('saveStatus').textContent='已保存于本机 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(manual)message('城市已保存。下次用这个浏览器打开，就能继续建设。');}
    catch(_){storageAvailable=false;$('saveStatus').textContent='保存失败：浏览器未允许本地存储';if(manual)message('保存失败，请允许浏览器本地存储。关闭页面会丢失本次进度。');}
  }
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),250);}
  function select(type){tool=type;for(const button of $('toolGrid').children)button.setAttribute('aria-pressed',String(button.dataset.tool===tool));$('toolDescription').textContent=C.BUILDINGS[tool].description;canvas.style.cursor=tool==='hand'?'grab':'crosshair';updatePlot();}
  for(const [type,definition] of Object.entries(C.BUILDINGS)){
    if(type==='townhall')continue;
    const button=document.createElement('button');button.type='button';button.id='tool-'+type;button.dataset.tool=type;button.className='tool-button';button.setAttribute('aria-pressed','false');button.title=definition.description+' ('+definition.key+')';
    const icon=document.createElement('canvas');icon.width=40;icon.height=40;icon.setAttribute('aria-hidden','true');CityRenderer.icon(icon,type);
    const label=document.createElement('span');label.textContent=definition.name;const cost=document.createElement('small');cost.textContent=definition.cost?definition.cost+' 城币':type==='bulldoze'?'返还 25%':'拖动画布';
    button.append(icon,label,cost);button.addEventListener('click',()=>select(type));$('toolGrid').append(button);
  }
  function updatePlot(){
    const pos=renderer.hover;if(!pos)return;
    const tile=state.tiles[C.index(pos.x,pos.y)],name=tile.type==='empty'?(tile.terrain==='water'?'河流':'待建设草地'):C.BUILDINGS[tile.type].name;
    $('plotTitle').textContent=name+' · '+(pos.x+1)+', '+(pos.y+1);
    const report=C.stats(state);
    $('plotText').textContent=tile.type==='empty'?(tile.terrain==='water'?'保留一条清澈的河流，城市会更美。':C.BUILDINGS[tool].description):C.BUILDINGS[tile.type].description+(report.connected.has(C.index(pos.x,pos.y))?' 已接入市政道路。':' 尚未接入市政道路。');
  }
  function update(){
    const report=C.stats(state);
    $('moneyValue').textContent=state.money.toLocaleString('zh-CN');$('populationValue').textContent=state.population;$('happinessValue').textContent=report.happiness;
    $('monthValue').textContent='第 '+(Math.floor((state.month-1)/12)+1)+' 年 · '+((state.month-1)%12+1)+' 月';
    $('runStatus').textContent=running?'城市运营中':'规划时间';$('pauseButton').textContent=running?'Ⅱ 暂停':'▶ 开始运营';$('pauseButton').setAttribute('aria-pressed',String(running));$('speedButton').textContent=speed+'×';
    for(const key of ['power','water']){$(key+'Text').textContent=report[key+'Capacity']+' / '+report[key+'Demand'];$(key+'Meter').value=Math.min(100,report[key+'Demand']?report[key+'Capacity']/report[key+'Demand']*100:100);}
    $('housingValue').textContent=state.population+' / '+report.activeCapacity+' 人';$('jobsValue').textContent=report.employed+' / '+report.jobs+' 个';$('incomeValue').textContent='+'+report.income;$('expenseValue').textContent='−'+report.expense;$('netValue').textContent=signed(report.net);$('netValue').className=report.net>=0?'positive':'negative';
    $('cityLevel').textContent=state.population>=100?'繁荣城市':state.population>=50?'热闹小镇':state.population>=20?'温暖社区':'起步街区';
    $('grantButton').disabled=state.grantUsed||state.money>=150;$('grantButton').textContent=state.grantUsed?'本城援助已领取':'低资金援助 +250';
    $('achievementCount').textContent=state.achievements.length+' / '+C.GOALS.length;
    const next=C.GOALS.find(goal=>!state.achievements.includes(goal.id));
    $('goalTitle').textContent=next?'下一站：'+next.name:'每个人，都有一个家。';$('goalCount').textContent=next?Math.min(state.population,next.target)+' / '+next.target+' 人':'4 / 4 已完成';$('goalReward').textContent=next?'奖励 +'+next.reward:'继续自由建设';$('goalFill').style.width=(next?Math.min(100,state.population/next.target*100):100)+'%';
    $('goalList').replaceChildren(...C.GOALS.map(goal=>{const li=document.createElement('li');const done=state.achievements.includes(goal.id);li.className=done?'completed':'';const mark=document.createElement('span');mark.textContent=done?'✓':'○';const label=document.createElement('span');label.textContent=goal.name;const small=document.createElement('small');small.textContent=goal.description+' · +'+goal.reward;label.append(small);li.append(mark,label);return li;}));
    for(const button of $('toolGrid').children){const def=C.BUILDINGS[button.dataset.tool];button.classList.toggle('unaffordable',state.money<def.cost);}
    updatePlot();
  }
  function buildAt(pos,quiet=false){if(!pos||tool==='hand')return;const result=C.build(state,pos.x,pos.y,tool);if(!quiet||result.ok)message(result.message);if(result.ok){update();scheduleSave();}}
  function month(){const result=C.advance(state);message('月度结算：税收 +'+result.income+'，维护 −'+result.expense+'，结余 '+signed(result.net)+'。居民 '+signed(result.growth)+' 人。'+result.rewards.map(goal=>'达成「'+goal.name+'」奖励 +'+goal.reward+'！').join(''));update();scheduleSave();}
  $('pauseButton').onclick=()=>{running=!running;elapsed=0;update();};$('speedButton').onclick=()=>{speed=speed===4?1:speed*2;update();};$('nextMonthButton').onclick=()=>{elapsed=0;month();};
  $('grantButton').onclick=()=>{const result=C.grant(state);message(result.message);if(result.ok){update();scheduleSave();}};
  $('saveButton').onclick=()=>save(true);$('restartButton').onclick=()=>$('restartDialog').showModal();
  $('cancelRestart').onclick=()=>$('restartDialog').close();$('confirmRestart').onclick=()=>{state=C.createCity();running=false;elapsed=0;renderer.center();renderer.hover=null;update();save();message('新城市已准备好。市长，开始你的下一段故事吧！');$('restartDialog').close();};
  $('helpButton').onclick=()=>$('helpDialog').showModal();for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$('helpDialog').close();
  // These actions remain available when the compact mobile toolbar hides storage controls.
  const mobileActions=document.createElement('div');mobileActions.className='dialog-actions';
  for(const [label,action] of [['保存进度',()=>save(true)],['重新开局',()=>{$('helpDialog').close();$('restartDialog').showModal();}]]){const button=document.createElement('button');button.textContent=label;button.onclick=action;mobileActions.append(button);}$('helpDialog').append(mobileActions);
  $('cityInfoToggle').onclick=()=>{const open=$('cityReport').classList.toggle('open');$('cityInfoToggle').setAttribute('aria-expanded',String(open));};
  $('zoomIn').onclick=()=>renderer.zoomBy(1.2);$('zoomOut').onclick=()=>renderer.zoomBy(1/1.2);$('centerMap').onclick=()=>renderer.center();
  canvas.addEventListener('contextmenu',event=>event.preventDefault());canvas.addEventListener('wheel',event=>{event.preventDefault();renderer.zoomBy(event.deltaY<0?1.12:1/1.12);},{passive:false});
  canvas.addEventListener('pointerdown',event=>{
    if(pointer||event.button>2)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    const pan=tool==='hand'||event.button===2||space;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,pan,moved:false,paint:['road','bulldoze'].includes(tool)&&!pan,last:null};
    renderer.hover=renderer.pick(event.clientX,event.clientY);if(pointer.paint){buildAt(renderer.hover);pointer.last=renderer.hover?C.index(renderer.hover.x,renderer.hover.y):null;}updatePlot();
  });
  canvas.addEventListener('pointermove',event=>{
    if(pointer&&pointer.id!==event.pointerId)return;
    if(pointer&&pointer.id===event.pointerId){const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer.moved=pointer.moved||Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)>6;if(pointer.pan)renderer.pan(dx,dy);pointer.x=event.clientX;pointer.y=event.clientY;}
    renderer.hover=renderer.pick(event.clientX,event.clientY);
    if(pointer?.paint&&renderer.hover){
      const target=renderer.hover,id=C.index(target.x,target.y);
      if(id!==pointer.last){
        if(pointer.last!==null){
          let x=pointer.last%C.SIZE,y=Math.floor(pointer.last/C.SIZE);
          // Fill every crossed tile with a four-connected path, even with sparse pointer events.
          while(x!==target.x||y!==target.y){
            if(Math.abs(target.x-x)>=Math.abs(target.y-y)&&x!==target.x)x+=Math.sign(target.x-x);else y+=Math.sign(target.y-y);
            buildAt({x,y},true);
          }
        }else buildAt(target,true);
        pointer.last=id;
      }
    }else if(pointer?.paint)pointer.last=null;
    updatePlot();
  });
  function release(event){if(!pointer||event.pointerId!==pointer.id)return;const active=pointer;pointer=null;if(event.type==='pointerup'&&!active.pan&&!active.paint&&!active.moved)buildAt(renderer.pick(event.clientX,event.clientY));if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('pointerleave',()=>{if(!pointer)renderer.hover=null;});
  canvas.addEventListener('focus',()=>{renderer.hover={...cursor};updatePlot();});
  document.addEventListener('keydown',event=>{
    if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    const choice=Object.entries(C.BUILDINGS).find(([,definition])=>definition.key?.toLowerCase()===event.key.toLowerCase());if(choice){select(choice[0]);return;}
    if(event.target!==canvas)return;
    if(event.code==='Space'){event.preventDefault();space=true;}
    const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(moves[event.key]){event.preventDefault();cursor={x:Math.max(0,Math.min(C.SIZE-1,cursor.x+moves[event.key][0])),y:Math.max(0,Math.min(C.SIZE-1,cursor.y+moves[event.key][1]))};renderer.hover={...cursor};updatePlot();}
    if(event.key==='Enter'){event.preventDefault();buildAt(renderer.hover||cursor);}
  });
  document.addEventListener('keyup',event=>{if(event.code==='Space')space=false;});window.addEventListener('blur',()=>{space=false;});
  window.addEventListener('beforeunload',()=>{if(saveTimer)save();});document.addEventListener('visibilitychange',()=>{elapsed=0;lastTime=0;if(document.hidden&&saveTimer)save();});
  new ResizeObserver(()=>renderer.resize()).observe(canvas);
  function frame(time){const delta=lastTime?Math.min(time-lastTime,100):0;lastTime=time;if(running&&!document.hidden&&!document.querySelector('dialog[open]')){elapsed+=delta*speed;if(elapsed>=5000){elapsed-=5000;month();}}if(time-lastDraw>32){renderer.draw(state,C.stats(state),tool,time);lastDraw=time;}requestAnimationFrame(frame);}
  renderer.resize();select(tool);update();if(!storageAvailable)$('saveStatus').textContent='本地存储不可用，请允许存储以保留进度';requestAnimationFrame(frame);
})();
