/* Inspectable, live civic planning and measured periodic reports. */
(() => {
  const C=PixelCity,make=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const date=m=>'第 '+(Math.floor((m-1)/12)+1)+' 年 '+((m-1)%12+1)+' 月';
  const portrait=(canvas,index,color)=>{const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#e6ead6';ctx.fillRect(0,0,40,40);ctx.fillStyle=color;ctx.fillRect(8,27,25,13);ctx.fillStyle='#e9c99e';ctx.fillRect(12,10,17,19);ctx.fillStyle=['#655c48','#5d6552','#806b54'][index%3];ctx.fillRect(11,7,19,7);ctx.fillRect(11,12,4,6);ctx.fillStyle='#4f5d4c';ctx.fillRect(17,18,2,2);ctx.fillRect(25,18,2,2);ctx.fillStyle='#bd9474';ctx.fillRect(21,24,4,1);};
  class CityCouncilPanel {
    constructor({getState,getReport,isRunning,onSettings,onMonth,onRun,onFocus}){
      this.getState=getState;this.getReport=getReport;this.isRunning=isRunning;this.dirty=false;this.seenMonth=0;
      this.button=make('button','市民自治 ↗','council-button');this.button.id='councilButton';this.button.type='button';document.querySelector('.map-stage').append(this.button);
      const dialog=make('dialog');dialog.id='councilDialog';dialog.className='council-dialog';
      dialog.innerHTML=`<button type="button" class="close-dialog" id="councilClose" aria-label="关闭市民议事厅">×</button><span class="eyebrow">A CITY THAT THINKS AHEAD</span><h2>市民议事厅</h2><p>市政团队根据人口、收支、供给和阶段目标制定年度规划，按月建设经营，并定期如实上报。自治观察窗口保持城市时间运行。</p>
      <div class="council-controls"><button type="button" id="councilEnable">开启自治</button><button type="button" id="councilRun">开始城市时间</button><button type="button" id="councilNextMonth">推进一个月 ▸</button><strong id="councilStatus"></strong></div>
      <form id="councilSettings" class="council-settings"><label>发展重点<select id="councilFocus"></select></label><label>应急储备<input id="councilReserve" type="number" min="0" max="1000000" step="1" value="200" required></label><label>月度建设预算（现有资金 %）<input id="councilBudget" type="number" min="10" max="70" step="1" value="35" required></label><button type="submit">应用设置</button></form><p id="councilMessage" class="council-message" role="status">开启后可直接观察团队自主发展，也可随时暂停并亲自建设。</p>
      <div class="council-columns"><section><h3>城市里的六位负责人</h3><div id="councilMembers" class="council-members"></div></section><section class="council-plan"><h3 id="councilPlanTitle">等待市民提出规划</h3><p id="councilPlanDates"></p><ul id="councilTargets" class="stage-objectives"></ul><p id="councilBlock"></p><p class="small-note">规划目标在制定时固定，阶段变化、目标达成或到期后再修订。每月最多执行两项主要任务，道路按预算分期铺设。</p></section></div>
      <section><div class="council-report-heading"><h3>规划与目标实现情况</h3><label>查看<select id="councilReportFilter"><option value="all">全部汇报</option><option value="quarter">季度报告</option><option value="annual">年度报告</option><option value="month">月度执行</option></select></label></div><div id="councilReports"></div></section><p class="small-note">本地规则驱动人物决策；所有建设、供货和奖励均通过真实游戏规则执行。只在页面打开且城市时间运行时经营，进度保存在本机。</p><button type="button" id="councilReturn">返回城市</button>`;
      document.body.append(dialog);this.dialog=dialog;this.$=id=>dialog.querySelector('#'+id);
      for(const [id,label] of Object.entries(C.CIVIC_FOCUSES)){const option=make('option',label);option.value=id;this.$('councilFocus').append(option);}
      this.$('councilClose').onclick=this.$('councilReturn').onclick=()=>dialog.close();
      this.button.onclick=()=>{this.seenMonth=getState().month;dialog.showModal();this.update(getReport());};
      this.$('councilEnable').onclick=()=>onSettings({enabled:!getState().autonomy.enabled});
      this.$('councilRun').onclick=onRun;this.$('councilNextMonth').onclick=onMonth;
      this.$('councilSettings').oninput=()=>{this.dirty=true;};
      this.$('councilSettings').onsubmit=event=>{event.preventDefault();const settings={focus:this.$('councilFocus').value,reserve:Number(this.$('councilReserve').value),budgetPercent:Number(this.$('councilBudget').value)};this.dirty=false;onSettings(settings);};
      this.$('councilReportFilter').onchange=()=>this.update(getReport());
      this.$('councilMembers').onclick=event=>{const button=event.target.closest('[data-member]');if(!button)return;const action=[...getState().autonomy.lastActions].reverse().find(a=>a.actor===button.dataset.member&&a.x!==undefined);if(action){dialog.close();onFocus(action.x,action.y);}};
    }
    notify(result){this.$('councilMessage').textContent=result.message;}
    update(report){
      const s=this.getState(),a=s.autonomy,unread=a.reports.some(r=>r.kind!=='month'&&r.month>this.seenMonth);
      this.button.textContent=a.enabled?(unread?'自治中 · 有新季报 ↗':'市民自治中 ↗'):'市民自治 ↗';
      this.button.classList.toggle('active',a.enabled);if(!this.dialog.open)return;
      this.seenMonth=s.month;this.$('councilEnable').textContent=a.enabled?'暂停自治建设':'开启自治经营';this.$('councilRun').textContent=this.isRunning()?'暂停城市时间':'开始城市时间';
      this.$('councilStatus').textContent=date(s.month)+' · '+(a.enabled?'自治已启用':'手动管理')+' · '+(this.isRunning()?'时间运行中':'时间已暂停');
      if(!this.dirty){this.$('councilFocus').value=a.focus;this.$('councilReserve').value=a.reserve;this.$('councilBudget').value=a.budgetPercent;}
      this.$('councilMembers').replaceChildren(...C.COUNCILLORS.map((m,i)=>{
        const card=make('article',undefined,'council-member'),icon=make('canvas');icon.width=40;icon.height=40;icon.setAttribute('aria-hidden','true');portrait(icon,i,m.color);
        const heading=make('div');heading.append(make('strong',m.name),make('small',m.role));card.append(icon,heading,make('p',a.decisions[m.id]||m.motto));
        const action=[...a.lastActions].reverse().find(x=>x.actor===m.id&&x.x!==undefined);if(action){const b=make('button','查看执行地点');b.type='button';b.dataset.member=m.id;card.append(b);}return card;
      }));
      const values=CityCouncilRules.metrics(s,report);this.$('councilPlanTitle').textContent=a.plan?a.plan.title:'等待市民提出规划';this.$('councilPlanDates').textContent=a.plan?date(a.plan.startMonth)+' 制定 · '+date(a.plan.dueMonth)+' 复盘':'启用自治后，市长会提出下一年的城市计划。';
      this.$('councilTargets').replaceChildren(...(a.plan?.targets||[]).map(t=>make('li',(values[t.metric]>=t.target?'✓ ':'○ ')+t.label+' '+values[t.metric]+' / '+t.target+t.unit,values[t.metric]>=t.target?'done':'')));
      this.$('councilBlock').textContent=a.lastBlock?'当前进展：'+a.lastBlock:'团队将根据供需和年度规划安排下月任务。';
      const filter=this.$('councilReportFilter').value,rows=a.reports.filter(r=>filter==='all'||r.kind===filter);
      this.$('councilReports').replaceChildren(...rows.map((r,i)=>{
        const item=make('details',undefined,'council-report');item.open=i===0;const summary=make('summary',date(r.month)+' · '+({month:'月度执行',quarter:'季度报告',annual:'年度报告'}[r.kind])+' · 目标完成 '+r.progress+'%');item.append(summary,make('strong',r.title),make('p',r.summary));
        const list=make('ul',undefined,'stage-objectives');for(const t of r.targets)list.append(make('li',(t.done?'✓ ':'○ ')+t.label+' '+t.value+' / '+t.target+t.unit,t.done?'done':''));item.append(list);
        if(r.actions.length){item.append(make('small','本月实际执行：'));const actions=make('ul',undefined,'council-action-list');for(const action of r.actions)actions.append(make('li',C.COUNCILLORS.find(m=>m.id===action.actor).name+'：'+action.message+(action.cost?'（投入 '+action.cost+'）':'')));item.append(actions);}
        return item;
      }));
      if(!rows.length)this.$('councilReports').append(make('p','尚无这类汇报。自治启用后每月记录执行情况，每三个月生成季度报告，每十二个月生成年度报告。','small-note'));
    }
  }
  globalThis.CityCouncilPanel=CityCouncilPanel;
})();
