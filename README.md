## 已验证存在的问题

| 类别 | 问题 | 是否真实存在 | 说明 |
|------|------|--------------|------|
| **严重安全** | 前端XSS（属性注入） | ✅ 是 | `renderComponentDOM` 中 `img src`、`style` 等属性未转义，可执行脚本 |
| **严重安全** | 后端任意文件读写（路径遍历） | ✅ 是 | `/api/local/load` 和 `/api/local/save` 未限制基目录，可读取 `/etc/passwd` |
| **严重安全** | 后端源码泄露（通配静态路由） | ✅ 是 | `@app.route('/<path:path>')` 允许下载 `app.py` 等源码 |
| **中危安全** | 生产环境 `debug=True` + CORS全开 | ✅ 是 | 暴露错误栈，任意源可调用API，结合文件读写风险极大 |
| **功能缺陷** | XAML导入解析不完整 | ✅ 是 | 未处理 Grid 子元素行列附加属性、命名空间前缀识别脆弱 |
| **功能缺陷** | 本地文件保存逻辑缺陷 | ✅ 是 | 传统 `<input>` 打开的文件无 `FileHandle`，无法“保存到链接文件” |
| **功能缺陷** | 拖拽导入大文件无进度提示 | ✅ 是 | `FileReader.readAsText` 阻塞UI，无加载反馈 |
| **功能缺陷** | 服务器文件列表缓存/焦点恢复有瑕疵 | ✅ 是 | 删除文件后 `currentSelectedServerFile` 恢复逻辑不完善 |
| **健壮性** | 前端 XAML 解析错误定位不友好 | ✅ 是 | `parsererror` 仅截取前100字符，用户无法定位具体行列 |
| **健壮性** | 并发写入无锁（后端+前端） | ✅ 是 | 多请求同时写同一文件可能损坏内容 |
| **用户体验** | 关闭页面无未保存提示 | ✅ 是 | 未监听 `beforeunload` 事件 |
| **用户体验** | 属性面板刷新延迟 | ✅ 是 | 切换选中组件时属性面板同步渲染，复杂组件树有短暂空白 |

---

# TODO List

## 🔴 严重安全（必须立即修复）

### 1. 修复前端XSS注入（多处）
- **文件**：`script.js` → `RenderManager.renderComponentDOM`
- **风险**：攻击者通过导入恶意XAML执行任意JS，窃取会话、数据
- **修复方案**：
  - 创建 `escapeHtmlAttr(str)` 函数，转义 `&` `"` `'` `<` `>`
  - 对所有动态拼接的HTML属性值（`src`, `style`, `title` 等）进行转义
  - 对 `style` 属性中的颜色值也进行转义（或使用 `textContent` + 安全样式设置）
- **优先级**：🔴 P0

### 2. 修复后端任意文件读写漏洞
- **文件**：`app.py` → `/api/local/load`, `/api/local/save`
- **风险**：攻击者可读取系统文件或写入Webshell
- **修复方案**：
  - 定义安全基目录 `BASE_DIR = os.path.realpath('./user_workspace')`
  - 使用 `os.path.realpath(os.path.join(BASE_DIR, user_path))` 规范化路径
  - 校验最终路径是否以 `BASE_DIR` 开头，否则返回403
- **优先级**：🔴 P0

### 3. 防止后端源码泄露
- **文件**：`app.py` → 通配路由 `@app.route('/<path:path>')`
- **风险**：任何人可下载 `app.py`、`script.js` 等源码
- **修复方案**：
  - 移除该路由，仅保留 `@app.route('/')` 和明确的静态文件路由（如 `/style.css`, `/script.js`）
  - 或使用 `send_from_directory('static', path)` 并将所有静态文件移至 `static/` 文件夹
- **优先级**：🔴 P0

### 4. 关闭生产环境debug并限制CORS
- **文件**：`app.py` 启动部分 + `CORS(app)`
- **风险**：debug模式暴露堆栈，CORS全开允许恶意网站调用API
- **修复方案**：
  - 使用环境变量 `debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'`
  - 生产环境显式设置 `debug=False`
  - CORS 限制为前端域名白名单（如 `http://localhost:5000` 或部署域名）
- **优先级**：🔴 P0

---

## 🟠 功能缺陷（尽快修复）

### 5. 增强XAML导入解析能力
- **文件**：`script.js` → `XamlProcessor.importFromXAML`
- **问题**：不支持 Grid 子元素附加属性（`Grid.Column`/`Grid.Row`）；命名空间前缀匹配脆弱
- **修复方案**：
  - 解析子元素时读取 `Grid.Column`、`Grid.Row` 属性并存储到组件props
  - 支持通过正则匹配 `:MyCard` 等形式，而非简单 `includes`
  - 增加解析失败的行列定位（利用 `DOMParser` 错误行号信息）
- **优先级**：🟠 P1

### 6. 完善本地文件保存体验（降级方案）
- **文件**：`script.js` → `FileManager`
- **问题**：传统 `<input>` 打开文件无法获得写入句柄，“保存到链接文件”按钮失效
- **修复方案**：
  - 在 `openLocalFileWithPicker` 中，若使用传统方式打开，则记录文件内容并生成“临时工作区”
  - 允许“保存到链接文件”时，如果无 `handle` 则自动调用 `saveAsLocalFile` 并更新链接
  - 对不支持 File System Access API 的浏览器，明确提示“只能另存为下载”
- **优先级**：🟠 P1

### 7. 拖拽大文件时增加加载反馈
- **文件**：`DragDropManager.handleFileImport`
- **问题**：大文件读取阻塞UI，无进度提示
- **修复方案**：
  - 显示模态加载提示（“正在解析XAML…”）
  - 使用异步分块读取？实际可以简单增加 loading 遮罩和延迟反馈
  - 设置超时保护（>10MB 警告）
- **优先级**：🟠 P1

### 8. 服务器文件列表焦点恢复优化
- **文件**：`ServerApi.loadServerFileList`, `deleteServerFile`
- **问题**：删除文件后选中状态恢复错误
- **修复方案**：
  - 删除后如果删除的是当前选中的文件，清空 `currentSelectedServerFile` 并禁用覆盖按钮
  - 刷新列表后，优先尝试恢复为之前有效的选中文件，若不存在则选中第一个或空
- **优先级**：🟠 P1

---

## 🟡 健壮性与性能

### 9. 改进XAML解析错误定位
- **文件**：`XamlProcessor.importFromXAML`
- **问题**：错误信息含糊，用户无法定位
- **修复方案**：
  - 从 `parsererror` 元素中提取行号/列号（部分浏览器支持）
  - 使用 `xml.lineNumber` 属性（需遍历节点）
  - 以友好格式显示：`第12行第8列：标签未闭合`
- **优先级**：🟡 P2

### 10. 防止并发写入损坏文件
- **文件**：`app.py` 保存接口
- **问题**：多请求同时写同一文件可能内容交错
- **修复方案**：
  - 使用 `fcntl.flock`（Linux）或 `portalocker` 库实现文件锁
  - 或使用临时文件 + 原子替换（写入临时文件，然后 `os.replace`）
- **优先级**：🟡 P2

### 11. 属性面板切换组件时异步/虚拟滚动
- **文件**：`RenderManager.updatePropsPanel`
- **问题**：复杂组件树同步渲染导致界面卡顿
- **修复方案**：
  - 使用 `requestAnimationFrame` 分批渲染属性分组
  - 或为属性表单使用虚拟滚动（仅当属性超过50个时）
- **优先级**：🟡 P2

### 12. 组件复制时确保ID全局唯一
- **文件**：`ComponentManager.deepCloneComponent`
- **问题**：虽概率极低，但未严格检查ID冲突
- **修复方案**：
  - 调用前计算 `App.state.nextId = getMaxId() + 1`
  - 克隆时使用该nextId并递增
  - 在添加组件前再次确认ID未使用
- **优先级**：🟡 P2

---

## 🔵 用户体验

### 13. 添加页面关闭未保存提示
- **文件**：`script.js` 初始化部分
- **问题**：用户可能意外丢失编辑内容
- **修复方案**：
  - 监听 `beforeunload` 事件，如果有组件且自上次保存后有修改，返回提示文本
  - 维护一个 `isDirty` 标志，在添加/删除/修改属性时设为 `true`，保存/导入/清空时重置
- **优先级**：🔵 P3

### 14. 全局拖拽覆盖层消失问题修复
- **文件**：`DragDropManager.initGlobalFileDragAndDrop`
- **问题**：拖拽到子元素时 `dragleave` 错误触发
- **修复方案**：
  - 使用 `document.body` 上的 `dragleave` 事件，检查 `relatedTarget` 是否为 `body` 的子元素
  - 更稳定的方案：只在进入/离开窗口时控制遮罩显示
- **优先级**：🔵 P3

---

## 📌 总结

| 优先级 | 数量 | 预计工时 |
|--------|------|----------|
| 🔴 P0（严重安全） | 4 | 4h |
| 🟠 P1（功能缺陷） | 4 | 6h |
| 🟡 P2（健壮性） | 4 | 4h |
| 🔵 P3（用户体验） | 2 | 2h |
| **合计** | **14** | **16h** |

建议按 **P0 → P1 → P2 → P3** 顺序修复，每周迭代交付。