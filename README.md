# PCL 主页编辑器

一个基于 Web 的图形化编辑器，用于可视化设计 **Plain Craft Launcher (PCL)** 的主页界面。支持拖拽组件、实时预览、XAML 导入/导出、本地文件同步及自动备份。

![版本](https://img.shields.io/badge/version-1.0.0-blue)
![语言](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![后端](https://img.shields.io/badge/Flask-2.0+-lightgrey)
![许可](https://img.shields.io/badge/license-MIT-green)

<img width="1919" height="962" alt="捕获" src="https://github.com/user-attachments/assets/61d3feb3-d0d9-40cd-a3df-44dfc3a1e88a" />

---

## 主要功能

- **可视化组件库**  
  内置卡片、文本、图片、按钮、列表项、布局容器（StackPanel/Grid）等十余种 PCL 组件，支持拖拽到画布。

- **属性面板编辑**  
  按“内容”“外观”“布局”“行为”分组显示组件属性，支持 `Margin` 四边独立滑块编辑、枚举下拉、自定义属性。

- **网格布局可视化编辑器**  
  以表格形式编辑 `Grid` 的列/行定义（像素、星号、自动），支持最小/最大宽度约束，可动态增删行列。

- **XAML 双向转换**  
  一键导出当前设计为 XAML 代码，也可拖拽 `.xaml/.xml` 文件导入，智能解析未知标签并保留自定义属性。

- **本地文件管理**  
  - 使用现代浏览器 File System Access API 打开/保存 `.xaml` 文件，建立“链接文件”后可一键保存。  
  - 兼容模式（不支持 API 时）以下载方式保存。

- **自动备份与历史版本**  
  后端自动保存每次编辑（1 秒防抖），最多保留 30 个备份。支持浏览、恢复、手动备份。

- **撤销/重做**  
  支持最多 50 步历史记录，快捷键 `Ctrl+Z` / `Ctrl+Y`。

- **事件绑定配置**（预览响应待实现）  
  为按钮/列表项配置 `EventType`（打开网页、启动游戏、弹出窗口等）与 `EventData`，数据会保留在 XAML 中，供后续运行时使用。**目前编辑器内预览尚未绑定实际事件**。

- **深色/浅色主题**  
  跟随系统或手动切换，界面风格贴近 PCL 原生。

---

## 技术栈

| 前端                          | 后端                     |
| ----------------------------- | ------------------------ |
| 原生 JavaScript (ES6+ 模块化) | Flask 2.0+               |
| Font Awesome 6                | Flask-CORS               |
| 自定义 CSS（变量、响应式）     | 文件原子写入、路径安全校验 |
| 无第三方 UI 库，轻量快速       | 自动备份清理策略          |

---

## 开始

### 1. 环境要求
- Python 3.8+
- 现代浏览器（Chrome/Edge 86+ 以获得完整本地文件支持）

### 2. 安装与运行

```bash
# 克隆或下载项目
cd pcl-homepage-editor

# 安装 Python 依赖
pip install flask flask-cors

# 启动后端服务器
python app.py
```

默认访问 `http://localhost:5000` 即可使用。

### 3. 使用指南

#### 基础操作
- **添加组件**：从左侧组件库拖拽到中间画布（支持嵌套容器）。
- **选择组件**：单击已添加的组件，右侧属性面板自动加载。
- **编辑属性**：修改属性后自动生效（部分输入框防抖暂未全量覆盖，建议手动点击“应用更改”）。
- **删除/复制**：选中组件后点击属性面板底部按钮。
- **调整顺序**：拖拽已有组件改变其在容器内的位置（水平/垂直方向自动判断）。

#### 布局容器
- **StackPanel**：垂直排列子元素。
- **水平布局 (Horizontal Stack)**：子元素水平排列（通过 `Orientation` 属性区分）。
- **Grid**：需要先通过可视化编辑器定义列/行，子元素可附加 `Grid.Row/Column` 等属性。

#### 文件操作
- **打开本地文件**：点击顶部“打开本地文件”按钮 → 选择 `.xaml` 文件 → 当前设计被替换。
- **保存**：若已打开文件（且浏览器支持 API），按钮变为“保存到文件”，点击即可覆盖原文件。
- **另存为**：始终可用，下载或覆盖新文件。
- **服务器备份**：点击顶部云图标 → 查看历史备份 → 点击“恢复”可将设计回滚到任意备份点。

#### 快捷键（部分支持）
| 快捷键      | 操作             | 状态           |
| ----------- | ---------------- | -------------- |
| `Ctrl+Z`    | 撤销             | ✅ 已支持       |
| `Ctrl+Y`    | 重做             | ✅ 已支持       |
| `Ctrl+S`    | 保存到链接的文件 | ❌ 暂未实现     |
| `Delete`    | 删除选中组件     | ❌ 暂未实现     |
| `Ctrl+D`    | 复制选中组件     | ❌ 暂未实现     |

---

## 项目结构

```
.
├── app.py                  # Flask 后端，提供备份及文件读写 API
├── index.html              # 主页面结构
├── style.css               # 样式表
├── js/                     # 前端模块
│   ├── main.js            # 入口
│   ├── appCore.js         # 全局应用单例
│   ├── componentTypes.js  # 组件定义及默认属性
│   ├── componentManager.js# 组件的增删改查、复制、移动
│   ├── componentFinder.js # 递归查找组件
│   ├── renderManager.js   # DOM 渲染、属性面板生成
│   ├── dragDropManager.js # 拖拽逻辑、占位符、文件拖入
│   ├── xamlProcessor.js   # XAML 解析与生成
│   ├── fileManager.js     # 本地文件 API 封装
│   ├── serverApi.js       # 后端备份接口调用
│   ├── uiManager.js       # UI 事件绑定、组件库构建
│   ├── historyManager.js  # 撤销/重做栈
│   └── utils.js           # 通用工具函数
├── user_workspace/        # 自动创建，存放用户备份及本地文件
│   └── backups/           # 自动备份目录
└── README.md
```

---

## API 接口（后端）

所有接口前缀 `/api`，返回 JSON 格式。

| 端点                     | 方法 | 说明                       |
| ------------------------ | ---- | -------------------------- |
| `/backups`               | GET  | 获取备份列表               |
| `/backup`                | POST | 创建备份（自动或手动）     |
| `/backup/load`           | GET  | 加载指定备份文件内容       |
| `/backup/delete`         | POST | 删除备份文件               |
| `/local/load`            | POST | 读取本地文件（安全路径）   |
| `/local/save`            | POST | 写入本地文件               |
| `/files`                 | GET  | 列举用户工作区 xml 文件    |
| `/save`                  | POST | 保存到工作区（旧，保留兼容）|
| `/load`                  | GET  | 从工作区读取               |
| `/delete`                | POST | 删除工作区文件             |

> 所有路径均经过安全校验，防止目录遍历。

---

## 开发与扩展

### 添加新组件类型
1. 在 `componentTypes.js` 的 `ComponentTypes` 中添加定义，指定 `name`、`icon`、`canNest` 及默认属性。
2. 在 `renderManager.js` 的 `renderComponentDOM` 中增加渲染分支。
3. （可选）在 `xamlProcessor.js` 的 `parseNode` 和 `generateXAML` 中增加映射。

### 自定义属性
组件可动态添加任意键值对，存储于 `comp.customProps`，导入导出时会自动保留。

### 事件响应（待实现）
目前仅存储配置，实际运行时交互需在 `RenderManager` 中为可点击组件绑定 `click` 事件，根据 `events.type` 执行对应动作（如 `window.open`、`alert` 等）。此部分为待开发项（详见 `TODOLIST.md`）。

---

## 贡献

欢迎提交 Issue 或 Pull Request。请确保代码风格与现有模块一致，并遵守安全规范（文件路径校验、XSS 防护等）。

---

## 许可

[MIT](LICENSE)