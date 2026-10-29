# 游戏发布社区实施计划

目标：按用户选定的网址发布方式，完成真实共享的发布、评分和交流系统。

架构：原生 HTML/CSS/JS 前端，Flask 同源 API，SQLite 持久化，Waitress 服务；原游戏保留。设计依据：`docs/superpowers/specs/2026-10-29-game-community-design.md`。

1. `community_server.py`、`requirements.txt`：账户、会话、作品、评价、回复 API，私有数据库，静态文件白名单；先写 API 回归再实现。
2. `community.html`、`game.html`、`publish.html`、`community.js`、`community.css`：广场、发布编辑、详情评分交流和注册登录，真实错误及空状态。
3. 修改 `index.html` 增加平台入口，保持原游戏路径、署名和操作。
4. `tests/test_community.py`、`tests/test_community_browser.py`：持久化、权限、平均分、校验、跨用户端到端、手机；继续跑原 12 项浏览器回归。
5. README 写启动、数据备份、公网部署边界；审查后提交推送并启动本地平台。

重点：不允许修改别人的作品；一次账户评分更新不能增加样本数；下架后游客不能访问；用户文本不能执行脚本；数据库/源代码和凭据不能被下载；API不可用时不生成虚假发布成功。

用户确认 GitHub Pages 托管后，线上改用 `community-github-data.js` + `community-github.js`：以公开 Issues 持久化作品、评分、讨论，用户自行确认 GitHub 草稿；新增模型与 Pages 浏览器测试。保留已完成的站内账号服务为可选方案。`.nojekyll` 保证新静态页面随原仓库发布，Issue 联系入口指向网站。

审查修复：删除末页后的页码失效已加回归并修复；账户切换清除编辑缓存；GitHub 重复评分按新提交的 Issue 编号而非可被回复推动的更新时间选择；JSON 代码围栏解析支持用户文字中的三反引号。六项 GitHub 模型用例已通过，完整测试包含 8 项 API、3 项社区浏览器、1 项六用例模型测试、12 项原游戏浏览器回归。

最终验证：`python -m unittest discover -s tests -v`，24 项通过（117.219 秒）；Node 六项模型用例全部通过；已检查桌面、手机与 GitHub 模式截图。仓库 Issues 已确认启用。线上内容采用真实记录，未自动发布测试帖子。
