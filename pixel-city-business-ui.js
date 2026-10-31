/* Industry management UI. Simulation and save data remain in the city engine. */
(() => {
  const C=PixelCity;
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  class CityBusinessPanel {
    constructor({getState,onChange,onMonth,onFocus,onOverlay}){
      this.getState=getState;this.onChange=onChange;this.onMonth=onMonth;this.onFocus=onFocus;
      const dialog=node('dialog');dialog.id='businessDialog';dialog.className='business-dialog';
      dialog.innerHTML=`<button type="button" class="close-dialog" id="businessClose" aria-label="关闭产业经营">×</button>
        <span class="eyebrow">FARM · RANCH · MARKET</span><h2>从田野，到城市餐桌。</h2>
        <p>在不同城区发展农场、牧场、加工和商场，通过道路、仓库与商业线路连接起来。</p>
        <div class="business-chain" aria-label="生产链"><span>农场 · 粮菜</span><b>→</b><span>牧场 · 奶蛋</span><b>→</b><span>工坊 · 食品</span><b>→</b><span>仓储运输</span><b>→</b><span>商场销售</span></div>
        <div class="business-topline"><strong id="businessSeason"></strong><span id="businessRevenue"></span><button type="button" id="businessNextMonth">经营下个月 ▸</button></div>
        <p id="businessStatus" class="business-status" role="status">查看库存与预计销售，再安排下一步建设。</p>
        <details><summary>建设步骤与生产配方</summary><ol><li>在任一已开放城区建设粮田或蔬菜农场，接入道路和水电。每区初始仓储 40 份。</li><li>牧场和养鸡场需要本区粮食。每座牧场用 2 粮产 3 奶，每座养鸡场用 1 粮产 3 蛋。</li><li>磨坊用 3 粮产 3 面粉；面包坊用 2 面粉产 3 面包；乳品工坊用 2 奶产 3 奶酪。</li><li>跨区运输：两区分别建仓库并通路，选择起点、终点和货物。线路建立费 120、启用时维护费 4/月；默认运力上限 12，起点有货运站时为 24，两端均有地铁货运枢纽时为 60。可设置发货配额，将货物分给不同线路。</li><li>商场每座最多销售 12 份/月（中央商务区为 18 份），全市共享客流需求（每 8 位居民约 1 份）。优先卖奶酪、面包，再销售其他货物。多建商场也需要足够居民。</li></ol><p>同区自动供货，跨区线路每月只运一段。运输后的原料下个月才能在目的区加工。区域特色会提高农业、畜牧、零售或港口能力。贸易港按零售价的 80%（向下取整）出口零售后剩余货物。缺水电会暂停产业；仓储满会停产。每月依次结算收获、饲养、加工、运输和销售。</p><p id="businessPrices"></p></details>
        <section><h3>城区经营与库存</h3><div id="businessDistricts" class="business-districts"></div></section>
        <section><h3>建立商业连接</h3><form id="routeForm" class="route-form"><label>供货城区<select id="routeFrom" required></select></label><label>收货城区<select id="routeTo" required></select></label><label>运输货物<select id="routeGood" required></select></label><label>发货配额/月<input id="routeQuota" type="number" min="1" max="60" value="12" required></label><button type="submit" id="createRoute">建立线路 · 120</button></form><p class="small-note">最多 80 条线路；单向运送指定货物。两端仓库必须接入连通市政厅的道路。</p><label class="route-overlay"><input type="checkbox" id="routeOverlay"> 在地图显示商业连接（城区示意线）</label><div id="businessRoutes"></div></section>
        <details><summary>生产与经营提醒</summary><ul id="businessWarnings"></ul></details>`;
      document.body.append(dialog);this.dialog=dialog;
      this.$=id=>dialog.querySelector('#'+id);
      this.$('businessPrices').textContent='每份售价：'+Object.values(C.GOODS).map(g=>g.name+' '+g.price+' 城币').join(' · ');
      for(const [id,good] of Object.entries(C.GOODS)){const option=node('option',good.name);option.value=id;this.$('routeGood').append(option);}
      this.$('businessClose').onclick=()=>dialog.close();
      this.$('businessNextMonth').onclick=()=>{onMonth();this.$('businessStatus').textContent='已完成一个月结算，库存、收支和线路数据已更新。';};
      this.$('routeOverlay').onchange=event=>onOverlay(event.target.checked);
      this.$('routeForm').onsubmit=event=>{event.preventDefault();this.action(C.addRoute(getState(),this.$('routeFrom').value,this.$('routeTo').value,this.$('routeGood').value,Number(this.$('routeQuota').value)));};
      this.$('businessRoutes').onclick=event=>{const button=event.target.closest('[data-route-id]');if(!button)return;const id=Number(button.dataset.routeId);this.action(button.dataset.action==='remove'?C.removeRoute(getState(),id):C.toggleRoute(getState(),id));};
      this.$('businessDistricts').onclick=event=>{const button=event.target.closest('[data-focus-area]');if(!button)return;const area=C.AREAS.find(a=>a.id===button.dataset.focusArea);dialog.close();onFocus(area);};
    }
    action(result){this.$('businessStatus').textContent=result.message;this.onChange(result);}
    open(){this.dialog.showModal();this.update(C.stats(this.getState()));}
    update(report){
      if(!this.dialog.open)return;
      const state=this.getState(),economy=report.economy;
      this.$('businessSeason').textContent=economy.season.name+'季 · 粮田 '+economy.season.grain+' / 蔬菜 '+economy.season.vegetables+' 份每座/月';
      this.$('businessRevenue').textContent='预计货物销售 +'+economy.revenue+' · 线路维护 −'+economy.expense+' / 月；上月销售 +'+state.economy.last.revenue+'、运送 '+state.economy.last.transported+' 份；累计销售 '+state.economy.soldTotal+' 份；累计出口 '+state.economy.exportedTotal+' 份';
      const openAreas=C.AREAS.filter(a=>state.areas.includes(a.id));
      for(const id of ['routeFrom','routeTo']){
        const select=this.$(id),old=select.value,values=Array.from(select.options).map(o=>o.value).join(',');
        if(values!==openAreas.map(a=>a.id).join(',')){select.replaceChildren(...openAreas.map(a=>{const o=node('option',a.name);o.value=a.id;return o;}));if(openAreas.some(a=>a.id===old))select.value=old;else if(id==='routeTo'&&openAreas.length>1)select.value=openAreas[1].id;}
      }
      this.$('createRoute').disabled=state.stage<3||openAreas.length<2;this.$('createRoute').textContent=state.stage<3?'完成第 3 阶段后开放':'建立线路 · 120';
      this.$('businessDistricts').replaceChildren(...openAreas.map(area=>{
        const card=node('article',undefined,'business-district'),counts=economy.areas[area.id].counts;card.dataset.businessArea=area.id;
        const heading=node('div',undefined,'business-card-heading'),button=node('button','查看地块');button.type='button';button.dataset.focusArea=area.id;heading.append(node('strong',area.name),button);card.append(heading);
        const stock=state.economy.stock[area.id],used=Object.values(stock).reduce((a,b)=>a+b,0),summary=node('p','库存 '+used+' / '+economy.areas[area.id].capacity+' · 预计销售 +'+economy.areas[area.id].revenue+' 城币');card.append(summary);
        const tags=Object.keys(C.BUILDINGS).filter(type=>C.BUILDINGS[type].category&&counts[type]).map(type=>C.BUILDINGS[type].name+' ×'+counts[type]);
        card.append(node('small',tags.join(' · ')||'暂无已通路的产业建筑，可从粮田、蔬菜农场或仓库开始。'));
        const list=node('dl',undefined,'goods-grid');for(const [id,good] of Object.entries(C.GOODS)){const pair=node('div');pair.append(node('dt',good.name),node('dd',String(stock[id])));list.append(pair);}card.append(list);return card;
      }));
      this.$('businessRoutes').replaceChildren(...economy.flows.map(flow=>{
        const route=state.economy.routes.find(r=>r.id===flow.id),card=node('article',undefined,'business-route');
        card.append(node('strong',C.AREAS.find(a=>a.id===flow.from).name+' → '+C.AREAS.find(a=>a.id===flow.to).name));
        card.append(node('small',C.GOODS[flow.good].name+' · 预计 '+flow.amount+' / '+flow.limit+' 份/月 · '+flow.status));
        for(const [action,label] of [['toggle',route.enabled?'暂停':'恢复'],['remove','移除']]){const button=node('button',label);button.type='button';button.dataset.routeId=flow.id;button.dataset.action=action;card.append(button);}return card;
      }));
      if(!economy.flows.length)this.$('businessRoutes').append(node('p','还没有商业连接。可先在两个城区建设仓库，选择需要运送的货物。','small-note'));
      this.$('businessWarnings').replaceChildren(...economy.warnings.map(w=>node('li',C.AREAS.find(a=>a.id===w.area).name+'：'+w.text)));
      if(!economy.warnings.length)this.$('businessWarnings').append(node('li','暂无生产瓶颈。建筑仍需连接市政道路；未连通的建筑不参与生产。'));
    }
  }
  globalThis.CityBusinessPanel=CityBusinessPanel;
})();
