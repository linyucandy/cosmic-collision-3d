/* Shared game model. Simulation units are calibrated to a reference planet, not observed data. */
(() => {
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  globalThis.assessPlanet = (body, sources = []) => {
    if (!body || body.type !== 'planet') return {
      earthSimilarity: 0, lifePotential: 0, temperature: null,
      reason: body ? '无类地固体表面' : '等待创建行星'
    };
    const mass = Math.max(0.001, body.mass / 40);
    const radius = body.r ? body.r / (1.7 * Math.cbrt(40)) : Math.cbrt(mass);
    const heat = Math.max(0, body.heat || 0);
    const flux = sources.reduce((sum, source) => {
      const intensity = {star:1, blueGiant:2, redGiant:1.5, whiteDwarf:0.2}[source.type] || 0;
      return sum + intensity * Math.max(0, source.mass / 800) *
        Math.pow(390 / Math.max(10, source.distance), 2);
    }, 0);
    const temperature = Math.min(2500, 30 + 258 * Math.pow(flux, 0.25) + heat * 300);
    const similarity = Math.exp(-Math.abs(Math.log(mass)) * 0.25 -
      Math.abs(Math.log(Math.max(0.001, radius)))) * Math.exp(-Math.abs(temperature - 288) / 140);
    const comfort = Math.exp(-Math.pow((temperature - 288) / 65, 2));
    return {
      earthSimilarity: clamp(similarity * 100),
      lifePotential: clamp(similarity * comfort * Math.exp(-heat * 2) * 95),
      temperature: Math.round(temperature - 273.15),
      reason: heat > 0.5 ? '撞击或潮汐加热，环境受损' :
        temperature < 250 ? '光照不足，表面严寒' : temperature > 340 ? '表面高温，环境严酷' : '温度适宜，具有宜居潜力'
    };
  };

  const panel = document.createElement('section');
  panel.id = 'planetInspector';
  panel.className = 'planet-inspector';
  panel.setAttribute('aria-label', '天体环境观察');
  panel.innerHTML = `<div class="inspector-heading"><strong id="observedName">行星环境</strong>
    <button id="nextPlanet" type="button">切换天体 ↻</button></div>
    <label for="earthMeter">地球相似指数 <b id="earthScore">—</b></label>
    <meter id="earthMeter" min="0" max="100" value="0"></meter>
    <label for="lifeMeter">生命存在指数 <b id="lifeScore">—</b></label>
    <meter id="lifeMeter" min="0" max="100" value="0"></meter>
    <p id="planetCondition">等待创建行星</p>
    <small>游戏模拟评分 · 非实测生命概率</small>
    <details id="scoreExplanation"><summary>指数如何计算？</summary>
    <p>地球相似指数：比较质量、半径和模拟表温与参考地球的接近程度。</p>
    <p>生命存在指数：结合相似度、温度适宜度和碰撞热量估算环境潜力。</p>
    <p>分值表示环境适宜程度，不代表已经发现生命。</p></details>`;
  document.body.appendChild(panel);

  // 手机先露出画布，完整控制仍可随时展开；桌面保持展开。
  const controls = document.querySelector('.panel');
  const controlsBody = document.createElement('div');
  controlsBody.id = 'panelControls';
  for (const child of [...controls.children]) {
    if (!child.matches('a, h1')) controlsBody.appendChild(child);
  }
  const toggle = document.createElement('button');
  toggle.id = 'toggleControls';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', controlsBody.id);
  const setControlsOpen = open => {
    controls.classList.toggle('controls-collapsed', !open);
    controlsBody.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '收起控制 ▴' : '展开控制 ▾';
  };
  controls.append(toggle, controlsBody);
  const mobileLayout = matchMedia('(max-width:640px)');
  setControlsOpen(!mobileLayout.matches);
  mobileLayout.addEventListener('change', event => setControlsOpen(!event.matches));
  toggle.addEventListener('click', () => setControlsOpen(controlsBody.hidden));

  const waveActions = document.createElement('div');
  waveActions.className = 'shockwave-actions';
  const waveTrigger = document.getElementById('btnShockwave');
  const stopWave = document.createElement('button');
  stopWave.id = 'btnStopShockwave';
  stopWave.type = 'button';
  stopWave.hidden = true;
  stopWave.textContent = '停止';
  stopWave.setAttribute('aria-label', '停止自动重播');
  waveActions.append(waveTrigger, stopWave);
  document.body.appendChild(waveActions);
  globalThis.setShockwaveReplayUI = enabled => {
    waveTrigger.textContent = enabled ? '◎ 冲击波重播中' : '◎ 冲击波演示';
    stopWave.hidden = !enabled;
  };
  stopWave.addEventListener('click', () => {
    window.dispatchEvent(new Event('stop-shockwave-replay'));
  });

  globalThis.renderPlanetAssessment = (body, sources, label = '行星') => {
    const result = assessPlanet(body, sources);
    document.getElementById('observedName').textContent = body ? `正在观察 · ${label}` : '行星环境';
    document.getElementById('earthScore').textContent = body ? `${result.earthSimilarity}%` : '—';
    document.getElementById('lifeScore').textContent = body ? `${result.lifePotential}%` : '—';
    document.getElementById('earthMeter').value = result.earthSimilarity;
    document.getElementById('lifeMeter').value = result.lifePotential;
    document.getElementById('planetCondition').textContent =
      (result.temperature === null ? '' : `模拟表温 ${result.temperature}°C · `) + result.reason;
  };
})();
