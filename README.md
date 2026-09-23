# 碰胡计分器 PenghuCalculator2

**——基于地方民俗文化的智能计分系统**

“碰胡”是流行于湖南株洲及周边地区的一种字牌玩法。一局之中每发生一次碰、扫、坎、跑、提、蛇或胡牌都要记分，而分值又随刻子组数与庄家连庄次数变化，用~~纸笔~~大脑记录既~~费时~~费token又容易算错。本项目把规则固化进程序，玩家只需在手机上点出实际发生的操作，分值由系统按统一口径算出，并同步给同房间的所有参与者。

> 本软件已向中国版权保护中心完成计算机软件著作权登记。使用前请阅读 [LICENSE](LICENSE)。

## 功能概览

- **房间管理**：创建房间并配置计分规则，凭五位房间号、小程序码或微信分享加入
- **上桌与身份**：四人上桌，其余成员可旁观或砸鸟；庄家可在开局前转让
- **计分操作**：记录碰、扫、坎、跑、提、蛇、胡、臭庄等操作，两键组合输入复合操作
- **自动算分**：内置动作分值表、刻子升级（三大／四清／五福）、连庄加成（加法／乘法）、砸鸟
- **记录与更正**：计分记录逐条留痕，可长按撤回
- **结算与战绩**：房间结算后转入历史记录，保留各成员最终得分

## 技术栈与依赖

| 层 | 说明 |
| --- | --- |
| 客户端 | 微信小程序（TypeScript + WXML + WXSS + WXS） |
| 服务端 | 微信云开发（云函数 + 云数据库 + 云存储） |
| 组件库 | [TDesign 小程序组件库](https://tdesign.tencent.com/miniprogram) [tdesign-miniprogram](https://github.com/Tencent/tdesign-miniprogram) `^1.16.0`（MIT） |
| 云函数 SDK | `wx-server-sdk` |
| 基础库 | 3.15.2（云开发要求 2.2.3 以上） |

## 目录结构

```
.
├── miniprogram/              # 小程序前端
│   ├── pages/                # 6 个页面
│   ├── components/           # 自定义组件
│   ├── custom-tab-bar/       # 自定义底部导航
│   ├── utils/                # 工具函数
│   ├── styles/               # 主题变量
│   ├── images/               # 图标与标题图
│   ├── app.ts / app.json / app.wxss
│   └── envList.js            # 云环境 ID（需自行创建）
├── cloudfunctions/           # 17 个云函数
├── typings/                  # 类型声明（含微信官方类型与项目自有类型）
├── project.config.json       # 小程序项目配置
└── tsconfig.json
```

云函数按职责可分为四类：

- **写入类**：`P2_takeOperation`、`P2_transferScores`、`P2_undoAction`、`P2_settleRoom`
- **房间状态类**：`P2_createRoomData`、`P2_updateNextPlayerTuple`、`P2_updateNextDealer`、`P2_updateNextBackerMap`、`P2_updateIsRandomBackMap`、`P2_updateMemberList`
- **查询类**：`P2_getCurrentUserData`、`P2_getUserDataList`、`P2_getHistoryDataList`、`P2_getJoinedRoomList`、`P2_getNoticeDataList`
- **维护类**：`P2_updateUserData`、`P2_clearRoomData`

## 本地开发环境搭建

### 1. 准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 一个已开通**云开发**的微信小程序账号

### 2. 克隆仓库

```bash
git clone https://github.com/Gyre-CyanYu/PenghuCalculator2 PenghuCalculator2
cd PenghuCalculator2
```

### 3. 在微信开发者工具中打开

打开微信开发者工具 → 导入项目 → 选择克隆下来的目录 → 填入你自己的小程序 AppID。

> 仓库中的 `project.config.json` 携带的 AppID 务必换成你自己的，否则无法使用云开发能力。

```json
{
  "appid": "你的AppID"
}
```

### 4. 安装前端依赖并构建 npm

```bash
cd miniprogram
npm i tdesign-miniprogram -S --production
```

回到开发者工具，点击菜单 **工具 → 构建 npm**，生成 `miniprogram/miniprogram_npm/`。本项目用到 TDesign 的按钮、输入框、标签、对话框、头像、分段选择器等组件，不构建组件无法生效。

### 5. 配置云环境

1. 在开发者工具中点击顶部 **云开发** 按钮，开通云开发并记下环境 ID。
2. 在 `miniprogram/` 下新建 `envList.js` ：

```js
const envList = [{
  envId: '你的云环境ID',
  alias: '你的云环境ID'
}];

module.exports = { envList };
```
3. 在 `miniprogram/app.ts` 中把 `globalData.env` 填成同一个环境 ID（不填也行，空字符串时微信开发者工具会使用默认环境）。

### 6. 部署云函数

云函数的依赖由云端安装，逐个部署即可：

1. 在开发者工具左侧资源管理器中展开 `cloudfunctions` 目录。
2. 右键某个云函数目录 → **上传并部署：云端安装依赖**。
3. 对全部 17 个云函数重复该操作。

也可以右键 `cloudfunctions` 目录批量上传。

部署完成后，右键 `P2_clearRoomData` 目录 → **上传触发器**。该函数的 `config.json` 中已写好定时配置（`0 0 */1 * * * *`，每小时触发一次），用于清理超过 12 小时未活动的房间。这一步不做也不影响计分，只是过期房间不会被自动回收。

### 7. 创建数据库集合

在云开发控制台的数据库中新建以下 4 个集合。集合只需创建，字段结构由代码写入时自动形成：

| 集合 | 用途 |
| --- | --- |
| `rooms` | 进行中的房间 |
| `histories` | 已结算房间的战绩 |
| `users` | 用户资料 |
| `notices` | 首页公告 |

### 8. 运行

编译预览即可。首次进入会自动按微信身份建档。

调试计分建议同时开两个以上模拟器实例（或真机 + 模拟器），才能完整走通四人上桌、砸鸟与多端同步。

## 版权声明

本软件的著作权归 CyanYu（GitHub 账号 [@Gyre-CyanYu](https://github.com/Gyre-CyanYu)）所有，并已向中国版权保护中心完成计算机软件著作权登记，受《中华人民共和国著作权法》及《计算机软件保护条例》保护。

**允许**个人学习、研究、教学等非商业目的的使用、复制、修改与分发，但须保留本版权声明。

**禁止**任何形式的商业使用，包括但不限于：将本软件或其修改版用于经营活动、随商品或服务一并销售、作为收费产品的一部分、以本软件提供有偿服务。

完整条款见 [LICENSE](LICENSE)。
