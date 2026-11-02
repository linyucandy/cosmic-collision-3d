/* Navigation and startup recovery shared by the imported experiences. */
(() => {
  const home = document.createElement('a');
  home.id = 'experienceHome';
  home.href = 'index.html';
  home.textContent = '← 游戏选择';
  home.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:200;padding:8px 12px;border:1px solid #9aafd766;border-radius:8px;background:#090e1de6;color:#e4ecff;font:12px system-ui;text-decoration:none;pointer-events:auto';
  document.body.append(home);
  const filename = location.pathname.split('/').pop();
  if (filename === 'cosmic-collision.html') {
    home.style.left = 'auto'; home.style.right = '12px';
    home.style.bottom = 'auto'; home.style.top = '8px';
  }
  if (filename === 'deepseek_html_20261018_27ab85.html') {
    home.style.bottom = 'auto'; home.style.top = '116px';
  }
  if (document.currentScript.dataset.graphics !== 'webgl') return;
  let ready = false;
  const status = document.createElement('div');
  status.id = 'experienceError';
  status.style.cssText = 'display:none;position:fixed;inset:25% 8% auto;z-index:201;padding:24px;border:1px solid #bc8d85;border-radius:12px;background:#101827;color:#fff;font:15px/1.8 system-ui;text-align:center';
  status.setAttribute('role', 'alert');
  status.textContent = '三维画面启动失败。请通过本地 HTTP 服务打开，确认支持 WebGL，然后刷新重试。';
  const retry = document.createElement('button');
  retry.textContent = '重新加载';
  retry.style.cssText = 'display:block;margin:16px auto 0;padding:8px 20px;cursor:pointer';
  retry.addEventListener('click', () => location.reload());
  status.append(retry);
  document.body.append(status);
  const fail = () => { if (!ready) status.style.display = 'block'; };
  window.addEventListener('error', fail, true);
  window.addEventListener('unhandledrejection', fail);
  window.addEventListener('experience-ready', () => { ready = true; status.style.display = 'none'; });
  // Shader compilation and procedural textures can take several seconds on mobile.
  setTimeout(fail, 30000);
})();
