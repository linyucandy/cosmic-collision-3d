# 宇宙碰撞实验室

作者：**晨晨**

**[像素小城 · 市长日记](https://linyucandy.github.io/cosmic-collision-3d/pixel-city.html)**：原创像素城市经营小游戏。规划连通市政厅的道路、住宅、商店、工厂、水电、公园与诊所；每月结算税收与维护费，人口、幸福度和成长奖励随城市变化。支持暂停、倍速、逐月推进、手机触控与键盘建造，自动保存在本机浏览器，不同设备的存档独立。打开 `pixel-city.html` 即可游玩，无需构建或外部资源。

打开 `index.html` 选择 3D 宇宙、2D 引力沙盒，或直接进入随机星系、撞击坑观察、黑洞场景。两个模拟器均提供返回游戏选择的入口。

项目现在还包括 **星游游戏广场**：浏览搜索、发布游戏网址、1–5 星评分、评价与交流。每个游戏有独立详情页，不伪造作品或评价。

**现有 GitHub Pages 线上版本使用 GitHub 账号参与，无需另外部署服务器：**

- [游戏广场](https://linyucandy.github.io/cosmic-collision-3d/community.html)
- [发布游戏](https://linyucandy.github.io/cosmic-collision-3d/publish.html)
- [原宇宙游戏首页](https://linyucandy.github.io/cosmic-collision-3d/)
- [uniSimBox 宇宙模拟实验室](https://linyucandy.github.io/uniSimBox/) · [源码](https://github.com/linyucandy/uniSimBox) · [评价与交流](https://linyucandy.github.io/cosmic-collision-3d/game.html?id=unisimbox)

在发布页填写名称、游戏网址和介绍，点击准备草稿，再前往 GitHub 登录并确认 `Submit new issue`。**准备草稿不会自动发布**。评价、无评分讨论也使用相同确认方式；回复可直接在对应 GitHub 帖子中进行，网站可展开查看交流。网站不索要 GitHub 密码或访问令牌。

发布和评价保存在本仓库 Issues，页面从公开接口读取真实记录。作品作者取自 GitHub 实际提交账号，不能通过表单冒名；同一账户对同一作品最新发布的一份有效评价计分一次，作者自评不计入评分。修改自己的原帖可更新内容，关闭作品原帖可下架，重新打开可恢复；修改时保留 `cosmic-*:v1` 标记及 JSON 字段。想撤下自己的评分，请关闭该游戏下自己的所有评分原帖，避免较早的重复评分重新成为最新有效记录。

完成发布、修改或评价后，返回页面点击“同步最新”。公开数据在浏览器会话中缓存两分钟以减少请求；手动同步会重新请求。GitHub 的公开接口存在[访问频率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)，达到限制或无法完整读取时会明确报错，并提供直接查看 GitHub 的入口，不会展示部分数据计算出的误导评分。

若浏览器无法直连 GitHub 接口，会读取同站点的公开数据快照，并明确显示快照时间。仓库的 `Sync community snapshot` 工作流在发布、修改、关闭、回复后自动重新导出公开记录并请求更新 Pages；此时提交后需要等待自动同步再刷新。导出失败时不会以不完整数据覆盖旧快照，工作流日志可在仓库 Actions 中查看。

在 `*.github.io` 自动使用此模式，本地也可通过 `community.html?source=github` 预览。游戏保持原网址，第三方游戏通过 HTTP/HTTPS 外部网址打开，不上传或执行第三方 HTML/ZIP。

项目同时保留一个**可选的站内账号服务器版本**，供日后部署独立服务器使用；它与线上 GitHub 数据独立，不会自动迁移或同步：

```sh
python -m pip install -r requirements.txt
python community_server.py
```

打开 <http://127.0.0.1:8766/community.html>，或从 <http://127.0.0.1:8766/> 的首页进入“游戏广场 / 发布我的游戏”。用户需自行注册，无预设账号、默认密码或虚构评价。密码散列保存，账户暂不提供邮件找回，请妥善保存。

服务使用 [Flask 与 Waitress](https://flask.palletsprojects.com/en/stable/deploying/waitress/)，SQLite 数据默认保存于 `community_data/community.sqlite3`。不同用户/浏览器连接**同一服务器**时共享作品、评价和回复，数据在重启后保留。私有数据与会话不会进入 Git，也不会作为静态文件提供下载。测试使用独立临时数据库，不污染实际作品。

仅运行原宇宙游戏或预览 GitHub 模式时，仍可运行 `python -m http.server 8000` 后访问 <http://localhost:8000>。该静态服务不支持可选的站内账号 API，预览社区时请加 `?source=github`；GitHub Pages 自动选择 GitHub 模式。3D 使用 CDN 加载 Three.js，需要联网及支持 WebGL 的浏览器；2D 可直接双击 HTML 运行。

如果日后选择使用站内账号版本，对外开放时需把项目部署在支持持久化磁盘的 Python 服务器上，并配置 HTTPS 域名。GitHub Pages 不能运行此 Python 后端，当前线上版使用前述 GitHub 账号方案。

可选环境变量：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `COMMUNITY_HOST` | `127.0.0.1` | 监听地址；需要局域网直接访问时设为 `0.0.0.0`，并使用主机实际 IP 访问 |
| `COMMUNITY_PORT` | `8766` | HTTP 服务端口 |
| `COMMUNITY_DATABASE` | `community_data/community.sqlite3` | SQLite 数据文件路径，生产环境应指向持久化磁盘 |
| `COMMUNITY_ORIGIN` | 当前请求来源地址 | HTTPS 代理部署时填完整站点地址，例如 `https://games.example.com`，用于验证写入请求的来源 |
| `COMMUNITY_HTTPS` | 不启用 | 在 HTTPS 部署中设为 `1`，让登录 Cookie 仅通过 HTTPS 发送 |

例如在 PowerShell 中对局域网开放：

```powershell
$env:COMMUNITY_HOST = '0.0.0.0'
python community_server.py
```

备份时停止服务，再复制整个 `community_data/` 目录；不要只复制仍在写入的数据库文件。恢复后使用相同数据路径启动服务。第三方游戏通过外部网址打开，不上传或执行第三方 HTML/ZIP 文件。

3D 中拖动发射天体、右键旋转、滚轮缩放，点击天体跟随观察。岩石行星和小行星受到撞击后会留下表面撞击坑；气态天体与恒星不生成固体表面痕迹。随机星系每次重新生成，场景切换会清除旧天体及特效。

3D 碰撞附带向外扩散的球形压力波和柔边亮环，随后渐隐。点击右上角的“冲击波演示”可立即触发，也可以直接访问 `cosmic-collision-3d.html?scene=shockwave`。

2D 和 3D 的“冲击波演示”按钮均固定在右上角，演示每 3 秒重播；暂停会冻结播放，切换场景或手动发射会结束重播。首页也提供直接入口。

演示时可点击旁边的“停止”结束自动重播，保留当前天体与尚未消失的特效。手机端控制区默认收起，点击“展开控制”可以恢复完整操作；桌面默认展开。

右侧显示地球相似指数、生命存在指数和模拟表面温度。自动观察行星，也可通过“切换天体”选择目标；3D 还支持点击天体观察。这些是根据游戏质量、半径、恒星照射及热量计算的 0–100 环境评分，**不是科学 ESI 测量或发现生命的概率**。碰撞升温降低评分，冷却后逐步恢复；非类地天体的两个指数为 0。

展开“指数如何计算？”可查看评分依据。

浏览器回归测试（需要安装本机 Google Chrome）：

```sh
python -m pip install playwright
python -m unittest discover -s tests -v
```

测试前安装 `requirements.txt`，并确保 Node.js 可执行。测试覆盖两种社区模式、GitHub 草稿与真实记录解析、跨账户发布/评分/回复、权限与数据持久化，以及原游戏功能与手机布局。GitHub 写入只验证草稿，不会自动向仓库发布测试帖子；浏览器测试使用临时数据库与受控公开接口样本。验证截图写入 `.screenshots/`，不随代码提交。
