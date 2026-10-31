/* Regional atlas and cached minimap for the expanded world. */
(() => {
  const C=PixelCity;
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  class CityRegionPanel {
    constructor({getState,getReport,renderer,onUnlock,onClaim,onFocus}){
      this.getState=getState;this.getReport=getReport;this.renderer=renderer;this.onFocus=onFocus;
      this.colors=['#a9be83','#a2b68b','#c2bb87','#9dbca2','#9db595','#d3c57f','#b7bf92','#99bec1','#c2b297','#9cbac0','#8daf89','#a4b4c1','#b9bb9a'];
      this.counts=Object.fromEntries(C.AREAS.map(a=>[a.id,0]));for(let y=0;y<C.SIZE;y++)for(let x=0;x<C.SIZE;x++)this.counts[C.areaAt(x,y)]++;
      const mini=el('div',undefined,'region-minimap');this.canvas=el('canvas');this.canvas.width=192;this.canvas.height=192;this.canvas.id='regionMinimap';this.canvas.setAttribute('aria-label','城市全域小地图，点击移动视角');
      const button=el('button','区域总览 ↗');button.id='regionAtlasButton';button.type='button';mini.append(this.canvas,button);document.querySelector('.map-stage').append(mini);
      this.background=document.createElement('canvas');this.background.width=192;this.background.height=192;
      const dialog=el('dialog');dialog.id='regionDialog';dialog.className='region-dialog';
      dialog.innerHTML='<button type="button" class="close-dialog" id="regionClose" aria-label="关闭区域总览">×</button><span class="eyebrow">A REGION OF POSSIBILITIES</span><h2>一座城，十三种未来。</h2><p id="regionSummary"></p><p class="small-note">点击“查看”前往区域；开放相邻土地后，延伸道路或桥梁接入市政厅。新城区从第 5–7 阶段开放。</p><div id="regionCards" class="region-cards"></div><section class="metro-plan"><h3 id="metroTitle"></h3><p id="metroDescription"></p><ul id="metroObjectives" class="stage-objectives"></ul><button type="button" id="claimMetroPlan"></button><p id="metroPlanList" class="small-note"></p></section><button type="button" id="regionReturn">返回城市</button>';
      document.body.append(dialog);this.dialog=dialog;this.$=id=>dialog.querySelector('#'+id);
      const shortcut=el('button','查看都市群计划 ↓');shortcut.type='button';shortcut.id='metroPlanShortcut';this.$('regionSummary').after(shortcut);shortcut.onclick=()=>dialog.querySelector('.metro-plan').scrollIntoView({block:'start'});
      button.onclick=()=>this.open();this.$('regionClose').onclick=this.$('regionReturn').onclick=()=>dialog.close();
      this.$('regionCards').onclick=event=>{const b=event.target.closest('button');if(!b)return;const area=C.AREAS.find(a=>a.id===(b.dataset.regionOpen||b.dataset.regionFocus));if(!area)return;if(b.dataset.regionOpen)onUnlock(area.id);else{dialog.close();onFocus(area);}};
      this.$('claimMetroPlan').onclick=()=>onClaim();
      this.canvas.onclick=event=>{const r=this.canvas.getBoundingClientRect(),x=Math.min(C.SIZE-1,Math.max(0,Math.floor((event.clientX-r.left)/r.width*C.SIZE))),y=Math.min(C.SIZE-1,Math.max(0,Math.floor((event.clientY-r.top)/r.height*C.SIZE)));renderer.focus(x,y);this.drawCamera();};
    }
    open(){this.dialog.showModal();this.render(this.getReport());}
    update(report){
      const state=this.getState(),ctx=this.background.getContext('2d');
      for(let y=0;y<C.SIZE;y++)for(let x=0;x<C.SIZE;x++){
        const tile=state.tiles[C.index(x,y)],id=C.areaAt(x,y),i=C.AREAS.findIndex(a=>a.id===id);
        ctx.fillStyle=!state.areas.includes(id)?'#65775e':tile.terrain==='water'?'#81b4bb':['road','bridge'].includes(tile.type)?'#ede3ba':tile.type!=='empty'?'#80654d':this.colors[i];ctx.fillRect(x*2,y*2,2,2);
      }
      this.drawCamera();if(this.dialog.open)this.render(report);
    }
    drawCamera(){
      if(!this.renderer.width)return;const ctx=this.canvas.getContext('2d');ctx.drawImage(this.background,0,0);
      const {x,y}=this.renderer.viewCenter();ctx.strokeStyle='#fff8dc';ctx.lineWidth=2;ctx.strokeRect(x*2-4,y*2-4,8,8);
    }
    render(report){
      if(!report)return;const state=this.getState();
      this.$('regionSummary').textContent=C.SIZE+' × '+C.SIZE+' · '+(C.SIZE*C.SIZE).toLocaleString('zh-CN')+' 地块 · 已开放 '+state.areas.length+' / '+C.AREAS.length+' 区 · 居民 '+state.population+' · 游客 '+report.visitors+'（旅游收入 +'+report.tourismIncome+'/月） · 交通覆盖 '+Math.round(report.transitCoverage*100)+'%';
      this.$('regionCards').replaceChildren(...C.AREAS.map((area,i)=>{
        const card=el('article',undefined,'region-card'),open=state.areas.includes(area.id),stage=state.stage<area.stage,parent=area.requires&&!area.requires.some(id=>state.areas.includes(id));card.style.setProperty('--region-color',this.colors[i]);
        card.append(el('small',(area.theme||'城区')+' · '+this.counts[area.id]+' 地块'),el('strong',area.name),el('p',area.description));
        const note=el('small',open?'已开放 · 接通 '+report.areaBuildings[area.id]+' 座建筑':stage?'完成第 '+area.stage+' 阶段后开放':parent?'先开放 '+area.requires.map(id=>C.AREAS.find(a=>a.id===id).name).join(' / '):area.cost+' 城币'+(state.money<area.cost?' · 资金不足':''));card.append(note);
        const actions=el('div',undefined,'region-card-actions'),focus=el('button','查看');focus.type='button';focus.dataset.regionFocus=area.id;actions.append(focus);
        if(!open){const unlock=el('button','开放区域');unlock.type='button';unlock.dataset.regionOpen=area.id;unlock.disabled=stage||parent||state.money<area.cost;actions.append(unlock);}card.append(actions);return card;
      }));
      const plan=C.METRO_PLANS[state.metroStage],goals=C.metroGoals(state,report),ready=state.stage>=C.STAGES.length;
      this.$('metroTitle').textContent=plan?'都市群计划 '+(state.metroStage+1)+' / '+C.METRO_PLANS.length+' · '+plan.name:'都市群计划全部完成';
      this.$('metroDescription').textContent=!ready?'完成原有七阶段后，继续挑战都市群计划。':plan?plan.description:'继续自由建设，经营跨区域产业与旅游。';
      this.$('metroObjectives').replaceChildren(...(ready?goals:[]).map(g=>el('li',(g.value>=g.target?'✓ ':'○ ')+g.name+' '+Math.min(g.value,g.target)+' / '+g.target+(g.unit||''),g.value>=g.target?'done':'')));
      this.$('claimMetroPlan').hidden=!plan;this.$('claimMetroPlan').disabled=!ready||!plan||!goals.every(g=>g.value>=g.target);this.$('claimMetroPlan').textContent=plan?'完成计划 · +'+plan.reward+' 城币':'已完成';
      this.$('metroPlanList').textContent=C.METRO_PLANS.map((p,i)=>(i<state.metroStage?'✓ ':'○ ')+p.name).join(' → ');
    }
  }
  globalThis.CityRegionPanel=CityRegionPanel;
})();
