# PCL 主页编辑器

一个基于 Web 的图形化编辑器，用于可视化设计 **Plain Craft Launcher (PCL)** 的主页界面。支持拖拽组件、实时预览、XAML 导入/导出、本地文件同步及自动备份。

![版本](https://img.shields.io/badge/version-2.0.0-blue)
![语言](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![构建](https://img.shields.io/badge/Vite-6.0-lightgrey?logo=vite)
![后端](https://img.shields.io/badge/Flask-3.0-lightgrey)
![许可](https://img.shields.io/badge/license-MIT-green)

> 📋 版本变更见 [CHANGELOG.md](CHANGELOG.md)

---

## 主要功能

### 组件与事件（对照 `docs/` 完整支持）

- **13 种组件类型**，与 PCL 控件一一对应：
  `MyCard`、`StackPanel`（垂直/水平）、`Grid`、`TextBlock`、`MyHint`、`MyImage`、`MyButton`、`MyTextButton`、**`MyIconTextButton`**、**`MyIconButton`**、`MyListItem`、**`Path`**
  （加粗为 2.0 新增，均支持拖拽、属性编辑与 XAML 双向转换）
- **23 种 EventType**（对照 `docs/自定义事件.md` 全量注册），按分类分组下拉，选中后实时显示**参数说明、必填/可选标注、示例与版本限制**（如「加入房间需 PCL 2.11.1+」）。
- **修正的枚举**：`ColorType`（Highlight/Red/留空=黑）、`MyIconTextButton.ColorType`（Black/Highlight）、`MyIconButton.Theme`（Color/White/Black/Red）、`MyListItem.Type`（留空/Clickable）等均与官方文档一致。

### 替换标记与主题色（新增）

- **替换标记插入器**：属性面板中 `Text`、`Source`、`Logo`、`Foreground` 等字段旁的 `< >` 按钮，可一键插入 `docs/替换标记.md` 中的全部标记（`{date}`、`{variable:name:默认值}`、`{setup:...}` 等 26 项，按分类分组）。
- **主题色预览**：支持 `{DynamicResource ColorBrush1-8}` —— 属性面板提供 8 档色块插入，顶栏 🎨 按钮可自定义预览主题色，画布中实时渲染实际颜色（仅影响预览，不改变导出的 XAML）。

### 编辑器能力

- **可视化组件库**：按「容器 / 基础 / 控件 / 图形」分组，支持搜索过滤。
- **属性面板编辑**：按“内容 / 外观 / 布局 / 行为”分组，`Margin` 四边滑块 + 数值联动编辑、枚举下拉、自定义属性增删。
- **网格布局可视化编辑器**：以表格形式编辑 `Grid` 行/列定义（像素/星号/自动 + Min/Max 约束），支持拖拽排序、复制定义。
- **XAML 双向转换**：一键导出/编辑源码，或拖拽 `.xaml/.xml` 文件导入。**往返幂等**：导出 → 导入 → 导出结果完全一致；未知标签与高级事件集合（`CustomEventService.Events`）**原样保留**，不丢失内容。
- **本地文件管理**：File System Access API 直接读写 `.xaml` 文件（Chrome/Edge 86+），旧浏览器自动降级为下载。
- **自动备份与历史版本**：1 秒防抖自动备份（上限 30 个），支持搜索、批量删除、行级差异对比、恢复。
- **撤销/重做**：增量操作历史（100 步），`Ctrl+Z` / `Ctrl+Y`，输入框内不误触发。
- **深色/浅色主题**：跟随手动切换，本地持久化。

---

## 技术栈

| 前端 | 后端 |
| --- | --- |
| TypeScript 5.7（strict 模式） | Flask 3.0 |
| Vite 6（dev 服务器 + 生产构建） | Flask-CORS |
| 原生 DOM，无 UI 框架 | 原子写入、路径安全校验 |
| jsdom 集成测试（3 组 / 96 项断言） | 自动备份清理策略 |

---

## 开始

### 1. 环境要求

- Node.js 18+（构建前端）
- Python 3.8+（运行后端）
- 现代浏览器（Chrome/Edge 86+ 获得完整本地文件支持）

### 2. 安装与运行

```bash
# 安装前端依赖
npm install

# 开发模式（Vite 服务器 :5173，自动代理 /api 与 /images 到 :5000）
npm run dev          # 终端 1
python app.py        # 终端 2

# 生产模式
npm run build        # 产出 dist/
python app.py        # 访问 http://localhost:5000
```

### 3. 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅 TypeScript 类型检查 |
| `npm test` | 运行全部集成测试（XAML 往返 / 真实文档 / DOM 冒烟） |
| `npm run server` | 启动 Flask 后端 |

### 4. 使用指南

#### 基础操作
- **添加组件**：从左侧组件库拖拽到中间画布（支持嵌套容器）。
- **选择组件**：单击画布中的组件；`Esc` 取消选中。
- **编辑属性**：修改后自动生效（输入 300ms 防抖），或点击「应用更改」。
- **删除/复制**：属性面板底部按钮，或快捷键 `Delete` / `Ctrl+D`。
- **插入替换标记**：属性标签旁的 `< >` 按钮打开标记菜单（含主题色块）。

#### 事件绑定
右侧面板选择 `EventType` 后，下方会显示该事件的参数结构与示例；`EventData` 按 `参数1|参数2` 顺序填写。支持一个控件通过 `CustomEventService.Events` 触发多个事件（源码编辑器中编辑，导入导出原样保留）。

#### 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+S` | 保存到链接文件（或另存为） |
| `Ctrl+D` | 复制选中组件 |
| `Delete` | 删除选中组件 |
| `Esc` | 取消选中 |

---

## 项目结构

```
.
├── index.html              # Vite 入口页面
├── vite.config.ts          # Vite 配置（开发代理、构建输出）
├── tsconfig.json           # TypeScript strict 配置
├── app.py                  # Flask 后端（托管 dist/、备份与文件 API）
├── src/
│   ├── main.ts             # 应用入口：初始化、全局快捷键
│   ├── core/
│   │   ├── types.ts        # 数据模型类型定义
│   │   ├── store.ts        # 状态中心（组件树、选中态、自动备份）
│   │   └── history.ts      # 增量操作历史（撤销/重做）
│   ├── components/
│   │   ├── specs.ts        # ★ 组件声明式规格（类型、默认值、枚举选项）
│   │   ├── tree.ts         # 组件树查找/插入/克隆
│   │   ├── manager.ts      # 组件增删改查（自动记历史）
│   │   └── dragDrop.ts     # 拖拽、占位符、边缘滚动、文件拖入
│   ├── xaml/
│   │   ├── parser.ts       # XAML → 模型（未知内容原样保留）
│   │   ├── generator.ts    # 模型 → XAML（往返幂等）
│   │   ├── eventTypes.ts   # ★ 23 种 EventType 注册表（参数文档）
│   │   └── markers.ts      # ★ 替换标记注册表 + ColorBrush 主题色
│   ├── render/
│   │   ├── renderManager.ts# 画布渲染（13 种组件的 DOM 分支）
│   │   ├── propsPanel.ts   # 属性面板、事件区、标记菜单、Grid 编辑器
│   │   └── layout.ts       # Margin/Padding/对齐 → CSS
│   ├── io/                 # serverApi（备份）、fileManager（本地文件）
│   ├── ui/                 # uiManager（组件库、弹窗、差异对比）、toast
│   ├── styles/main.css     # 全部样式（CSS 变量、深浅主题、响应式）
│   └── util/dom.ts         # DOM/转义/防抖工具
├── tests/                  # 集成测试（esbuild + jsdom）
├── Images/                 # 内置 PCL 图片资源（Flask 静态提供）
└── docs/                   # PCL 官方文档与 Custom.xaml 示例
```

---

## API 接口（后端）

所有接口前缀 `/api`，返回 JSON。所有路径均经过安全校验，防止目录遍历。

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/backups` | GET | 获取备份列表 |
| `/backup` | POST | 创建备份（自动或手动） |
| `/backup/load` | GET | 加载指定备份内容 |
| `/backup/delete` | POST | 删除备份文件 |
| `/local/load` | POST | 读取本地文件（安全路径） |
| `/local/save` | POST | 写入本地文件 |
| `/files` | GET | 列举工作区 xml 文件 |
| `/save` `/load` `/delete` | — | 工作区文件（兼容保留） |
| `/images/<path>` | GET | 内置图片资源 |

---

## 开发与扩展

### 添加新组件类型
1. 在 `src/components/specs.ts` 的 `COMPONENT_SPECS` 中注册：键名、显示名、图标、XAML 标签、分类、默认属性。
2. （可选）在 `TYPE_SELECT_OPTIONS` 中为该类型覆盖枚举选项。
3. 在 `src/render/renderManager.ts` 的 `renderLeaf`/`renderCard` 等分支提供渲染。
4. 在 `src/xaml/parser.ts` 的 `TAG_TO_TYPE` 中登记标签映射。

### 添加新事件类型
在 `src/xaml/eventTypes.ts` 的 `EVENT_TYPES` 中追加条目（分类、描述、参数文档、占位提示），属性面板与测试断言会自动生效。

### 添加新替换标记
在 `src/xaml/markers.ts` 的 `MARKERS` 中追加条目即可出现在插入菜单中。

---

## 测试

```bash
npm test
```

- **XAML 往返**（66 项）：全组件类型导入导出、幂等性、未知元素保留、错误处理。
- **真实文档**（10 项）：`docs/Custom.xaml`（PCL 官方示例，14 张卡片）完整导入与二次往返。
- **DOM 冒烟**（20 项）：加载真实 `index.html` 启动应用，覆盖组件增删复制、属性面板、事件区、标记菜单。

---

## 贡献

欢迎提交 Issue 或 Pull Request。请保持 TypeScript strict 通过（`npm run typecheck`）与测试全绿（`npm test`），并遵守安全规范（文件路径校验、XSS 转义）。

---

## 许可

[MIT](LICENSE)
