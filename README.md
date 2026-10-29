# 宇宙碰撞实验室

作者：**晨晨**

打开 `index.html` 选择 3D 宇宙、2D 引力沙盒，或直接进入随机星系、撞击坑观察、黑洞场景。两个模拟器均提供返回游戏选择的入口。

推荐在目录中运行 `python -m http.server 8000`，然后访问 <http://localhost:8000>。3D 使用 CDN 加载 Three.js，需要联网及支持 WebGL 的浏览器；2D 可直接双击 HTML 运行。

3D 中拖动发射天体、右键旋转、滚轮缩放，点击天体跟随观察。岩石行星和小行星受到撞击后会留下表面撞击坑；气态天体与恒星不生成固体表面痕迹。随机星系每次重新生成，场景切换会清除旧天体及特效。

浏览器回归测试（需要安装本机 Google Chrome）：

```sh
python -m pip install playwright
python -m unittest discover -s tests -v
```

测试覆盖首页和手机布局、场景入口、2D 随机重置、3D 随机星系重复生成、撞击痕迹独立保存及场景资源清理。验证截图写入 `.screenshots/`，不随代码提交。
