# 四个 HTML 体验的功能复核

复核日期：2026-11-02。四份原始文件来自仓库上级目录；保留原文件名，修订副本合入本仓库。上级原件未修改。

| 入口 | 内容 | 复核与修正 |
| --- | --- | --- |
| `cosmic-collision.html` | Canvas 双星系碰撞 | 四种预设、密度调节、暂停与重置可用，增加返回首页入口。 |
| `deepseek_html_20261018_27ab85.html` | 3D 城市毁灭 | 原始 THREE 是不渲染的占位实现，缺少 `setUsage`，导致初始化失败。换为真实 Three.js r160，补齐光照、水面更新、小地图和点击、拖动、滚轮交互。检查十五种武器，修正重建时未取消旧灾害、未释放临时模型的问题。调整手机武器栏宽度及返回按钮位置。 |
| `deepseek_html-Earth-MoonSim_20261018_454973.html` | 地月探索 | 地球、月球降落及返回轨道可用。修正总览相机距离，桌面与手机均可看到两颗星球；返回及窗口调整沿用适配视角。 |
| `deepseek_html-everest-ski-3d_20261017_3b3830.html` | 珠峰速降动画 | 15 秒循环观赏动画，保留 WebM 录制。补齐 MediaRecorder 缺失、构造及启动失败处理，录制结束释放捕获轨道。此页面没有滑雪操控玩法。 |

首页的“更多模拟与动画”提供四个入口，各页可返回游戏选择。三维页面共用仓库内 `vendor/three-r160/` 的固定版本模块，附带 MIT 许可证，无需从 CDN 获取依赖。`OrbitControls.js` 仅将 Three.js 导入改为同目录路径。

## 运行

在仓库目录执行：

```sh
python -m http.server 8000
```

打开 `http://localhost:8000/`。三维页面需要支持 WebGL 的浏览器；请使用 HTTP 服务打开整个目录，直接以 `file://` 打开模块页面会受浏览器模块加载限制。启动失败时显示重新加载按钮及返回入口。

## 验证

使用本机 Chrome + Playwright，分别复核 1440×900 与 390×844 的真实页面渲染和截图。阻断外部 HTTPS 请求后检查手机页面启动，确认依赖均来自本地。

```sh
python -m unittest discover -s tests -p test_imported_experiences.py -v
python -m unittest discover -s tests -p test_simulator.py -k test_home_links_author_and_mobile_layout -v
```

新增测试覆盖真实 WebGL 绘制、十五种武器调用、点击破坏、拖动及缩放、重建取消地震定时任务、碰撞预设与暂停、两颗星球降落与返回、总览可见范围、WebM 下载和轨道释放、录制失败回退、首页入口、手机布局及图形模块加载失败提示。测试对私有状态的访问通过测试时注入，不在生产页面暴露调试接口。

物理、地形与星球纹理均为可视化近似；测试未涵盖所有移动设备、持续高频武器压力或长时间 GPU 资源监测。
