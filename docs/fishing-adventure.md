# 像素垂钓 · 湖域冒险

七种鱼有独立像素图样，成功钓获后加入背包。图鉴记录累计发现和最大游戏尺寸，消费库存不会抹去图鉴。鱼的尺寸、稀有度、金币、水域组合与兑换用途是游戏数据。

## 交付渔获换装

钓具、船只各有3级升级。一级消耗2条普通鱼；二级消耗3条普通鱼、1条稀有鱼和金币；三级消耗4条普通鱼、2条稀有鱼和金币。面板列出实际将扣除的鱼，库存或金币不足时禁止兑换。史诗、传说鱼不用于升级。

钓具提高收线效率、降低张力增长、增加抛竿距离和放松恢复速度；船只提高航速、减轻水流漂移，并改变船体颜色。属性直接参与模拟。

## 四个水域

|水域|通关目标|新增挑战|
|---|---|---|
|晨光池塘|钓获5条，钓具与船只各1级|基础三种普通鱼、宽松刺鱼窗口|
|回旋溪流|钓获6条，稀有及以上1条，钓具2级、船只1级|虹鳟、水流、拉力增加|
|迷雾湿地|钓获8条，稀有及以上2条，钓具与船只各2级|电鳗、黄金鲤鱼、摆动水流与拉力|
|风暴深潭|钓获10条，稀有及以上3条，其中锦鲤王1条，装备各2级|最短窗口、最强水流、终章鱼|

通关奖励只能领取一次。后期水域连续普通钓获后提高目标鱼保障；终章钓获7条却未发现锦鲤王时，后续咬钩提供锦鲤王，直到成功钓获。可回到旧水域补充普通材料鱼，不强迫丢弃既有库存。

## 存档与交互

保留单HTML独立运行。纯模型嵌入 `script#fishing-progression`，Node测试直接读取，避免维护两份规则。进度保存于 `chenchen-fishing-adventure-v1`，严格验证版本、物品、总数、装备、解锁顺序与通关条件。保存不可用时明确提示；开始新旅程前确认。存档仅在当前浏览器，无跨设备同步。

打开手记暂停模拟；关闭后保持此前的暂停/运行状态。面板打开期间不会推进咬钩计时。当前抛竿尚未结束时禁止跨水域航行，避免把前一水域的鱼计入新区域。

## 图鉴资料

资料核对日期：2026-10-31。生物描述为简短改写，来源链接附于每条鱼的详情。营养资料仅作条目介绍，不随游戏尺寸生成或推算。

- [FAO 鲫鱼养殖资料](https://www.fao.org/fishery/culturedspecies/Carassius_carassius/en)：游戏“小鲫鱼”按鲫属泛称处理，未强行对应该旧资料的单一物种名。
- [USFWS 蓝鳃太阳鱼](https://www.fws.gov/species/bluegill-lepomis-macrochirus)、[USFWS 大口黑鲈](https://www.fws.gov/species/largemouth-bass-micropterus-salmoides)。
- [EUMOFA 虹鳟资料](https://fishery-aquaculture-market-observatory.ec.europa.eu/en/country-and-species-profiles/species-profiles/rainbow-trout)：仅虹鳟列出法国鲜鱼片每100克的资料示例，并注明不适用于所有产地与烹调状态；另附 [BIM 营养手册](https://bim.ie/wp-content/uploads/2021/03/BIM-Seafood-Nutrition-Handbook-Final.pdf)。
- [FDA 鱼类营养资料](https://www.fda.gov/media/70799/download)、[NIH Omega-3 资料](https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/)：其余食用鱼仅给一般性说明，不挪用其他鱼的定量成分表。
- [美国国家水族馆 电鳗](https://aqua.org/explore/animals/electric-eel)：区分电鳗与真鳗，不提供套用的食用鳗鱼营养数据。
- [FAO 鲤鱼资料](https://www.fao.org/fishery/docs/CDrom/aquaculture/I1129m/file/en/en_commoncarp.htm)、[新西兰DOC 锦鲤资料](https://www.doc.govt.nz/nature/pests-and-threats/freshwater-pests/koi-carp/)：黄金鲤鱼、锦鲤王标注游戏变体，皇冠与王者身份为虚构，不编造其营养数值。

测试覆盖实际钓获入包、原子扣除升级、唯一奖励、四区完整通关、存档一致性、手机面板、暂停状态、活动抛竿切区限制及存储失败提示。
