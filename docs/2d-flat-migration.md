# 2D 平面版：3D 功能迁移说明

`cosmic-collision-simulator.html` 现在是 `cosmic-collision-3d.html` 的二维对应版本。首页「2D 引力沙盒」入口与 URL 保持不变。

## 平面约束

迁移以「保持 2 维平面」为硬约束，已写入实现和测试（`tests/test_simulator.py` 的 `test_2d_flat_*` 系列）：

- 不加载 Three.js、不使用 WebGL、不引入 Z 轴或透视相机；页面只依赖 `celestial-size.js`、`planet-assessment.js`、`game-overlays.css` 和原生 Canvas 2D。
- 天体状态只有 `x / y / vx / vy / ax / ay`；相机只有 `cam = {x, y, zoom}`，支持右键或中键拖动平移、滚轮以光标为中心缩放、`Shift+滚轮` 调整质量倍率。
- 所有叠加层都画在平面上：希尔球与宜居带是虚线圆/环，奥尔特云是圆环点带，星环与吸积盘是椭圆，标签直接平面投影。
- 引力、碰撞、潮汐与动量守恒都在二维里计算，软化常数与 3D 版一致（`d² = dx² + dy² + 60`）。

## 已迁移的能力

| 类别 | 内容 |
| --- | --- |
| 天体类型 | 41 种，参数表与 3D 版一致；面板布局也对齐 3D：`#featuredTools` 快捷 3 种（暗物质、暗物质晕、引力真空星）、`#tools` 主面板 27 种、`#exoticCatalog` 特殊与假想天体 11 种，全部带图标与悬浮说明 |
| 尺寸模型 | 复用 `CelestialSize.radiusFor`，提供「易观察 / 参考大小」两种模式，切换时重算全部半径 |
| 物理 | 二维 N 体积分、扫掠碰撞检测、白洞近场排斥、暗物质软化引力、虫洞配对传送、动量守恒合并、撞击碎片、潮汐撕扯、离心解体、恒星演化、白矮星吸积新星、钱德拉塞卡极限 |
| 叠加层 | 希尔球（含双体 L1 估计与最多 24 个其他天体）、宜居带、平面距离网格与刻度、标签与距离、轨迹、X 射线/暗物质伪彩、致密星平面光环、奥尔特云、彗尾、撞击坑 |
| 特效 | 粒子爆炸、球形压力波的二维环、星云残骸、日冕物质抛射、造父变星脉动、光晕与吸积盘 |
| 评估 | 复用 `planet-assessment.js`，光源覆盖全部发光类型，参考半径按当前尺寸模式计算 |
| 场景 | 17 个物理演示按钮、单/双/三星恒星系、随机星系、冲击波自动重播、`?scene=` 深链 |
| 操作 | 拖动发射、点击选中、寻找天体、自动圆轨道、潮汐锁定、添加奥尔特云、释放彗星、触发日冕抛射、暂停/倍速/单步、PNG 导出 |
| 白矮星样例 | 8 颗真实光谱型（`#whiteDwarfVariant` + `#whiteDwarfGallery`），颜色由光谱推算近似；新建白矮星即采用所选样例，选中后信息栏标注名称与光谱型 |
| Iax 爆发 | `triggerIax()` 让选中的白矮星抛出约 45% 质量、留下受损残骸并生成 `iax` 抛射壳；`#btnIaxSelected` 与 Iax 演示按钮都走同一逻辑，非白矮星会被拒绝 |

## 3D 专属项的二维等价物

| 3D 实现 | 2D 处理 |
| --- | --- |
| `PerspectiveCamera` + `OrbitControls` | `cam{x,y,zoom}` + `worldToScreen` / `screenToWorld`，只有平移与缩放 |
| 球面网格与 UV 撞击坑 | 径向渐变圆盘 + 圆盘上的随机斑点 |
| 半透明球体 + 三个正交圆环（希尔球） | 单个虚线圆，选中时加淡蓝填充 |
| 3D 球壳奥尔特云 / 点云暗物质 / 星系旋臂 | 平面圆环点带 / 伪彩径向渐变 / 平面旋臂点集 |
| `UnrealBloomPass` 与 Sprite 光晕 | `createRadialGradient` + `globalCompositeOperation='lighter'` |
| 屏幕空间引力透镜着色器 | 致密星周围的平面椭圆光环（`lensToggle`），不做画面形变 |
| 四元数潮汐锁定与朝向 | 一个 `angle` 加一条指向伴星的短线 |
| 3D 射线拾取 | `screenToWorld` 后的圆命中测试 |

没有直接平移的 3D 能力：真实三维轨道倾角、透视景深、球面纹理与法线贴图、GPU 后处理、DOM 标签的透镜反投影。这些是渲染层特性，不影响二维下的物理与玩法。

## 保持兼容的行为

- 控件 id、统计字段、`#btnShockwave` 重播/停止、`#nextPlanet`、`#toggleControls` 移动端折叠、评估面板全部保持原样。
- `randomSystem()` 仍生成最多 9 个天体；`?scene=shockwave` 仍每 3 秒重播、暂停冻结冲击波、清空后停止。
- 脚本仍为传统 `<script>`（非 module），顶层绑定可供 Playwright 直接读取。

## 验证

`tests/test_simulator.py` 中的 `test_2d_flat_simulator_keeps_a_plane_and_all_body_types`、`test_2d_white_dwarf_samples_and_iax_eruption`、`test_2d_hill_sphere_is_a_flat_circle_estimate`、`test_2d_demos_and_camera_roundtrip` 覆盖平面约束、41 种类型与面板一一对应、白矮星样例与 Iax 残骸、希尔球估算与演示入口；原有 2D 断言继续覆盖评分面板、移动端折叠、冲击波重播和随机星系上限。

本地用 Chrome + `puppeteer-core` 做过一轮真实浏览器回归（22 项）：41 个按钮逐一点击都能切换类型、41 种天体都能创建与绘制、8 个白矮星样例与 Iax 两个分支、随机星系 ≤ 9、折叠后露出画布且面板高度 127px、零运行时错误。
