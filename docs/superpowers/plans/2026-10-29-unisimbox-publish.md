# uniSimBox 发布与入口

用户授权将 `D:/AI2026/AI晨晨/uniSimBox` 上传 GitHub，并在当前项目建立链接。

- 保留 uniSimBox 原本地 `integration` 分支及历史，将已有未提交碰撞模块一并验证、提交，推送到新仓库 `linyucandy/uniSimBox` 的 `main`。
- Vite 使用相对路径，GitHub Actions 部署 `dist`，Pages 采用 workflow 模式。
- 当前项目首页增加体验/源码链接，公开社区以稳定 `unisimbox` ID 关联游戏和评分；可选 SQLite 后端按 URL 判断后新增内置游戏，避免覆盖已有作品 ID。

验证：uniSimBox 23 项功能测试、TypeScript 和正式构建通过；以 `/uniSimBox/` 子目录测试正式构建的 14 个入口、碰撞播放、手机布局和 hash 路由刷新，无页面异常。社区 13 项专项测试通过，模型 7 用例通过，首页/手机回归通过。发布路径、CI、评分绑定已通过独立审查。线上部署与访问仍须在实际 Pages 发布后确认。
