(function () {
    // ----------------------------- 组件元数据 -----------------------------
    const COMP_TYPES = {
        card: { name: "卡片 (MyCard)", icon: "fas fa-layer-group", canNest: true, defaults: { Title: "新卡片", Margin: "0,0,0,15", CanSwap: "True", IsSwapped: "True", ToolTip: "", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        text: { name: "文本 (TextBlock)", icon: "fas fa-font", canNest: false, defaults: { Text: "这是一段文本", FontSize: "14", TextWrapping: "Wrap", Foreground: "#1e293b", ToolTip: "", Margin: "0", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        hint: { name: "提示条 (MyHint)", icon: "fas fa-info-circle", canNest: false, defaults: { Text: "提示信息", Theme: "Blue", ToolTip: "", Margin: "0", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        image: { name: "图片 (MyImage)", icon: "fas fa-image", canNest: false, defaults: { Source: "https://www.baidu.com/img/flexible/logo/pc/result.png", Height: "60", HorizontalAlignment: "Center", ToolTip: "", Margin: "0", VerticalAlignment: "Stretch" } },
        button: { name: "按钮 (MyButton)", icon: "fas fa-hand-pointer", canNest: false, defaults: { Text: "按钮", ColorType: "Highlight", Height: "35", Padding: "20,0", Margin: "0,4,0,10", ToolTip: "", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        textbutton: { name: "文本按钮 (MyTextButton)", icon: "fas fa-minus-square", canNest: false, defaults: { Text: "文本按钮", Margin: "0,8,0,10", ToolTip: "", HorizontalAlignment: "Center", VerticalAlignment: "Stretch" } },
        listitem: { name: "列表项 (MyListItem)", icon: "fas fa-list", canNest: false, defaults: { Title: "标题", Info: "描述", Logo: "pack://application:,,,/images/Blocks/Grass.png", Type: "Clickable", ToolTip: "", Margin: "-5,0,-5,8", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        stackpanel: { name: "垂直布局 (StackPanel)", icon: "fas fa-align-justify", canNest: true, defaults: { Margin: "0,0,0,0", ToolTip: "", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } },
        horizontalstack: { name: "水平布局 (StackPanel Horizontal)", icon: "fas fa-arrows-alt-h", canNest: true, defaults: { Orientation: "Horizontal", HorizontalAlignment: "Center", Margin: "0,0,0,0", ToolTip: "", VerticalAlignment: "Stretch" } },
        grid: { name: "网格布局 (Grid)", icon: "fas fa-th", canNest: true, defaults: { ColumnsDefinition: "1*,2*,Auto", RowsDefinition: "", Margin: "0", ToolTip: "", HorizontalAlignment: "Stretch", VerticalAlignment: "Stretch" } }
    };

    // ----------------------------- 全局状态 -----------------------------
    let state = {
        components: [],
        nextId: 100,
        selectedId: null
    };

    // 主题持久化
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

    function showToast(msg, isErr = false) {
        let t = document.getElementById('toast');
        t.textContent = msg;
        t.style.background = isErr ? '#ef4444' : '#4f46e5';
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 2000);
    }
    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }
    function escapeXml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }).replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

    function findComponentById(id, list = state.components) {
        for (let comp of list) {
            if (comp.id === id) return comp;
            if (comp.children && comp.children.length) {
                let found = findComponentById(id, comp.children);
                if (found) return found;
            }
        }
        return null;
    }

    function createComponent(type, parentId = null) {
        const def = COMP_TYPES[type];
        if (!def) return null;
        const id = state.nextId++;
        return {
            id, type, name: def.name, parentId, children: [],
            props: JSON.parse(JSON.stringify(def.defaults)),
            events: { type: "", data: "" }
        };
    }

    function addComponent(comp, targetParentId = null) {
        if (targetParentId === null) {
            state.components.push(comp);
            return true;
        }
        const parent = findComponentById(targetParentId);
        if (parent && COMP_TYPES[parent.type]?.canNest) {
            parent.children.push(comp);
            comp.parentId = targetParentId;
            return true;
        }
        return false;
    }

    function removeComponentById(id) {
        const removeFromList = (list) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].children && removeFromList(list[i].children)) return true;
            }
            return false;
        };
        if (removeFromList(state.components)) {
            if (state.selectedId === id) state.selectedId = null;
            renderCanvas();
            return true;
        }
        return false;
    }

    function deepCloneComponent(comp, newParentId = null) {
        const clone = {
            ...comp,
            id: state.nextId++,
            parentId: newParentId,
            children: [],
            props: { ...comp.props },
            events: { ...comp.events }
        };
        for (let child of comp.children) {
            const childClone = deepCloneComponent(child, clone.id);
            clone.children.push(childClone);
        }
        return clone;
    }

    function duplicateComponent(comp) {
        if (!comp) return false;
        const clone = deepCloneComponent(comp, comp.parentId);
        if (comp.parentId) {
            const parent = findComponentById(comp.parentId);
            if (parent) parent.children.push(clone);
            else return false;
        } else {
            state.components.push(clone);
        }
        renderCanvas();
        selectComponent(clone.id);
        showToast(`已复制组件: ${clone.name}`);
        return true;
    }

    // 渲染引擎 (可视化)
    function renderComponentDOM(comp, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'component-item-wrapper';
        wrapper.setAttribute('data-id', comp.id);
        wrapper.setAttribute('data-type', comp.type);
        if (comp.type === 'card') {
            wrapper.innerHTML = `<div class="card-component"><div class="card-header"><span>${escapeHtml(comp.props.Title || '卡片')}</span><div><i class="fas fa-arrows-alt"></i></div></div><div class="card-content"><div class="nested-dropzone" data-parent-id="${comp.id}" data-placeholder="将组件拖入卡片"></div></div></div>`;
            const dropzone = wrapper.querySelector('.nested-dropzone');
            comp.children.forEach(child => renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'stackpanel') {
            wrapper.innerHTML = `<div class="card-component" style="background:var(--bg-card); padding:8px; border:1px dashed var(--border);"><div style="font-size:0.7rem; color:var(--text-light);"><i class="fas fa-layer-group"></i> 垂直布局</div><div class="nested-dropzone" data-parent-id="${comp.id}"></div></div>`;
            const dz = wrapper.querySelector('.nested-dropzone');
            comp.children.forEach(child => renderComponentDOM(child, dz));
        }
        else if (comp.type === 'horizontalstack') {
            wrapper.innerHTML = `<div class="card-component" style="background:var(--bg-card); padding:8px; border:1px dashed var(--border);"><div style="font-size:0.7rem;"><i class="fas fa-arrows-alt-h"></i> 水平布局</div><div class="nested-dropzone horizontal" data-parent-id="${comp.id}" style="display:flex; gap:8px; flex-wrap:wrap;"></div></div>`;
            const dz = wrapper.querySelector('.nested-dropzone');
            comp.children.forEach(child => renderComponentDOM(child, dz));
        }
        else if (comp.type === 'grid') {
            wrapper.innerHTML = `<div class="card-component grid-mock"><div style="font-size:0.7rem;"><i class="fas fa-th"></i> 网格布局 (${comp.props.ColumnsDefinition || '未定义列'})</div><div class="nested-dropzone" data-parent-id="${comp.id}"></div></div>`;
            const dz = wrapper.querySelector('.nested-dropzone');
            comp.children.forEach(child => renderComponentDOM(child, dz));
        }
        else {
            let innerHtml = '';
            if (comp.type === 'text') innerHtml = `<div style="margin:4px 0; color:${comp.props.Foreground || '#000'}">${escapeHtml(comp.props.Text || '文本')}</div>`;
            else if (comp.type === 'hint') innerHtml = `<div class="hint-${(comp.props.Theme || 'blue').toLowerCase()}" style="padding:8px; border-radius:8px;">${escapeHtml(comp.props.Text)}</div>`;
            else if (comp.type === 'image') innerHtml = `<img src="${comp.props.Source}" style="max-width:100%; height:${comp.props.Height || 'auto'}" />`;
            else if (comp.type === 'button') innerHtml = `<button class="btn" style="background:${comp.props.ColorType === 'Highlight' ? '#4f46e5' : '#333'}; color:white; border:none; padding:8px 16px; border-radius:30px;">${escapeHtml(comp.props.Text)}</button>`;
            else if (comp.type === 'textbutton') innerHtml = `<button style="background:none; border:none; color:var(--primary); cursor:pointer;">${escapeHtml(comp.props.Text)}</button>`;
            else if (comp.type === 'listitem') innerHtml = `<div class="list-item-mock"><i class="fas fa-cube"></i><div><strong>${escapeHtml(comp.props.Title)}</strong><div style="font-size:12px;">${escapeHtml(comp.props.Info)}</div></div></div>`;
            wrapper.innerHTML = innerHtml;
            if (comp.props.ToolTip) wrapper.title = comp.props.ToolTip;
        }
        wrapper.addEventListener('click', (e) => { e.stopPropagation(); selectComponent(comp.id); });
        container.appendChild(wrapper);
    }

    function renderCanvas() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        if (state.components.length === 0) {
            canvas.innerHTML = '<div class="empty-placeholder"><i class="fas fa-drag-drop" style="font-size:2rem"></i><p>从左侧拖拽组件至此</p></div>';
            updateHierarchyBar();
            updatePropsPanel();
            return;
        }
        state.components.forEach(comp => renderComponentDOM(comp, canvas));
        if (state.selectedId) {
            document.querySelectorAll(`[data-id="${state.selectedId}"]`).forEach(el => el.classList.add('selected'));
        }
        updateHierarchyBar();
        updatePropsPanel();
    }

    function selectComponent(id) {
        state.selectedId = id;
        document.querySelectorAll('.component-item-wrapper').forEach(el => el.classList.remove('selected'));
        const selEl = document.querySelector(`[data-id="${id}"]`);
        if (selEl) selEl.classList.add('selected');
        updatePropsPanel();
        updateHierarchyBar();
    }

    function updatePropsPanel() {
        const comp = findComponentById(state.selectedId);
        if (!comp) {
            document.getElementById('propType').value = '';
            document.getElementById('dynamicProps').innerHTML = '';
            document.getElementById('eventTypeSelect').value = '';
            document.getElementById('eventDataInput').value = '';
            return;
        }
        document.getElementById('propType').value = COMP_TYPES[comp.type]?.name || comp.type;
        document.getElementById('propId').value = comp.id;
        document.getElementById('eventTypeSelect').value = comp.events?.type || '';
        document.getElementById('eventDataInput').value = comp.events?.data || '';
        const container = document.getElementById('dynamicProps');
        container.innerHTML = '';
        // 显示所有 props，包括通用布局属性
        const allProps = { ...comp.props };
        for (let [key, val] of Object.entries(allProps)) {
            const div = document.createElement('div'); div.className = 'prop-field';
            div.innerHTML = `<label>${key}</label><input data-prop="${key}" value="${escapeHtml(String(val))}" />`;
            container.appendChild(div);
        }
        // 添加通用属性（若缺失可提示，但已包含在 props 中）
    }

    function applyCurrentProps() {
        const comp = findComponentById(state.selectedId);
        if (!comp) return;
        document.querySelectorAll('#dynamicProps input').forEach(inp => {
            const key = inp.getAttribute('data-prop');
            if (key) comp.props[key] = inp.value;
        });
        comp.events = { type: document.getElementById('eventTypeSelect').value, data: document.getElementById('eventDataInput').value };
        renderCanvas();
        showToast('属性已更新');
    }

    function updateHierarchyBar() {
        const bar = document.getElementById('hierarchyBar');
        if (!state.selectedId) { bar.innerHTML = '<span>未选中组件</span>'; return; }
        let path = [];
        let cur = findComponentById(state.selectedId);
        while (cur) { path.unshift(cur); cur = findComponentById(cur.parentId); }
        bar.innerHTML = path.map(c => `<span class="hierarchy-item" data-id="${c.id}">${c.name}</span>`).join(' <i class="fas fa-chevron-right"></i> ');
        document.querySelectorAll('.hierarchy-item').forEach(el => el.addEventListener('click', (e) => { selectComponent(parseInt(el.getAttribute('data-id'))); }));
    }

    // 拖拽系统
    let pendingDragType = null;
    let currentDropZone = null;

    function initDragAndDrop() {
        const designContainer = document.getElementById('previewContainer');
        document.body.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
        designContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            const targetZone = e.target.closest('.nested-dropzone, .canvas');
            if (targetZone && targetZone !== currentDropZone) {
                if (currentDropZone) currentDropZone.classList.remove('drag-over');
                currentDropZone = targetZone;
                currentDropZone.classList.add('drag-over');
            } else if (!targetZone && currentDropZone) {
                currentDropZone.classList.remove('drag-over');
                currentDropZone = null;
            }
        });
        designContainer.addEventListener('dragleave', (e) => {
            if (currentDropZone && !currentDropZone.contains(e.relatedTarget)) {
                currentDropZone.classList.remove('drag-over');
                currentDropZone = null;
            }
        });
        designContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (currentDropZone) {
                currentDropZone.classList.remove('drag-over');
                currentDropZone = null;
            }
            let compType = pendingDragType;
            if (!compType) compType = e.dataTransfer.getData('text/plain');
            if (!compType || !COMP_TYPES[compType]) return;
            const dropZone = e.target.closest('.nested-dropzone, .canvas');
            if (!dropZone) return;
            let targetParentId = null;
            if (dropZone.classList.contains('nested-dropzone')) {
                const parentAttr = dropZone.getAttribute('data-parent-id');
                if (parentAttr) targetParentId = parseInt(parentAttr);
            }
            if (targetParentId !== null) {
                const parentComp = findComponentById(targetParentId);
                if (!parentComp || !COMP_TYPES[parentComp.type]?.canNest) {
                    showToast('该容器不允许放置子组件', true);
                    pendingDragType = null;
                    return;
                }
            }
            const newComp = createComponent(compType, targetParentId);
            if (!newComp) return;
            if (addComponent(newComp, targetParentId)) {
                renderCanvas();
                selectComponent(newComp.id);
                showToast(`添加 ${COMP_TYPES[compType].name}`);
            } else {
                showToast('无法添加到此处', true);
            }
            pendingDragType = null;
        });
        document.addEventListener('dragend', () => {
            pendingDragType = null;
            if (currentDropZone) {
                currentDropZone.classList.remove('drag-over');
                currentDropZone = null;
            }
        });
    }

    function buildComponentLibrary() {
        const container = document.getElementById('componentsList');
        container.innerHTML = '';
        for (let [key, val] of Object.entries(COMP_TYPES)) {
            const div = document.createElement('div');
            div.className = 'comp-item';
            div.setAttribute('data-type', key);
            div.setAttribute('draggable', 'true');
            div.innerHTML = `<i class="${val.icon}"></i><span>${val.name}</span><i class="fas fa-grip-vertical" style="margin-left:auto; opacity:0.5"></i>`;
            div.addEventListener('dragstart', (e) => {
                pendingDragType = key;
                e.dataTransfer.setData('text/plain', key);
                e.dataTransfer.effectAllowed = 'copy';
                const dragIcon = document.createElement('div');
                dragIcon.textContent = val.name;
                e.dataTransfer.setDragImage(dragIcon, 10, 10);
            });
            container.appendChild(div);
        }
        const searchInput = document.getElementById('compSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.trim().toLowerCase();
                document.querySelectorAll('.comp-item').forEach(item => {
                    const nameSpan = item.querySelector('span')?.innerText.toLowerCase() || '';
                    item.classList.toggle('hidden', keyword !== '' && !nameSpan.includes(keyword));
                });
            });
        }
    }

    // 获取树中最大 ID
    function getMaxId(comps) {
        let max = 0;
        const traverse = (list) => {
            for (let c of list) {
                if (c.id > max) max = c.id;
                if (c.children) traverse(c.children);
            }
        };
        traverse(comps);
        return max;
    }

    // 导入 XAML (完整支持 Grid 和容器)
    function importFromXAML(xmlStr) {
        try {
            const wrappedXml = `<root xmlns:local="http://tempuri.org/pcl">${xmlStr}</root>`;
            const parser = new DOMParser();
            const xml = parser.parseFromString(wrappedXml, 'text/xml');
            const parseError = xml.querySelector('parsererror');
            if (parseError) throw new Error('XML 格式错误: ' + parseError.textContent);

            const parseNode = (node, parentId = null) => {
                const tagName = node.tagName?.toLowerCase();
                if (!tagName) return null;
                let type = null;
                if (tagName.includes('mycard')) type = 'card';
                else if (tagName.includes('textblock')) type = 'text';
                else if (tagName.includes('myhint')) type = 'hint';
                else if (tagName.includes('myimage')) type = 'image';
                else if (tagName.includes('mybutton')) type = 'button';
                else if (tagName.includes('mytextbutton')) type = 'textbutton';
                else if (tagName.includes('mylistitem')) type = 'listitem';
                else if (tagName === 'stackpanel') {
                    const orientation = node.getAttribute('Orientation') || node.getAttribute('orientation');
                    type = orientation && orientation.toLowerCase() === 'horizontal' ? 'horizontalstack' : 'stackpanel';
                }
                else if (tagName === 'grid') type = 'grid';

                if (!type || !COMP_TYPES[type]) return null;

                const comp = createComponent(type, parentId);
                // 通用属性提取
                const commonProps = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment'];
                commonProps.forEach(prop => {
                    const val = node.getAttribute(prop);
                    if (val !== null) comp.props[prop] = val;
                });

                // 特定属性
                if (type === 'card') {
                    comp.props.Title = node.getAttribute('Title') || '卡片';
                    comp.props.CanSwap = node.getAttribute('CanSwap') ?? 'True';
                    comp.props.IsSwapped = node.getAttribute('IsSwapped') ?? 'True';
                    for (let child of node.children) {
                        const childComp = parseNode(child, comp.id);
                        if (childComp) comp.children.push(childComp);
                    }
                }
                else if (type === 'grid') {
                    // 解析 ColumnDefinitions 和 RowDefinitions
                    let colsDef = '', rowsDef = '';
                    for (let child of node.children) {
                        const childName = child.tagName?.toLowerCase();
                        if (childName === 'grid.columndefinitions') {
                            const colDefs = Array.from(child.children).map(cd => cd.getAttribute('Width') || '').join(';');
                            if (colDefs) colsDef = colDefs;
                        } else if (childName === 'grid.rowdefinitions') {
                            const rowDefs = Array.from(child.children).map(rd => rd.getAttribute('Height') || '').join(';');
                            if (rowDefs) rowsDef = rowDefs;
                        } else {
                            const childComp = parseNode(child, comp.id);
                            if (childComp) comp.children.push(childComp);
                        }
                    }
                    if (colsDef) comp.props.ColumnsDefinition = colsDef;
                    if (rowsDef) comp.props.RowsDefinition = rowsDef;
                }
                else if (type === 'stackpanel' || type === 'horizontalstack') {
                    if (type === 'horizontalstack') comp.props.Orientation = 'Horizontal';
                    for (let child of node.children) {
                        const childComp = parseNode(child, comp.id);
                        if (childComp) comp.children.push(childComp);
                    }
                }
                else if (type === 'text') {
                    comp.props.Text = node.getAttribute('Text') || '文本';
                    comp.props.FontSize = node.getAttribute('FontSize') || '14';
                    comp.props.TextWrapping = node.getAttribute('TextWrapping') || 'Wrap';
                    comp.props.Foreground = node.getAttribute('Foreground') || '#1e293b';
                }
                else if (type === 'hint') {
                    comp.props.Text = node.getAttribute('Text') || '提示';
                    comp.props.Theme = node.getAttribute('Theme') || 'Blue';
                }
                else if (type === 'image') {
                    comp.props.Source = node.getAttribute('Source') || '';
                    comp.props.Height = node.getAttribute('Height') || '60';
                    comp.props.HorizontalAlignment = node.getAttribute('HorizontalAlignment') || 'Center';
                }
                else if (type === 'button') {
                    comp.props.Text = node.getAttribute('Text') || '按钮';
                    comp.props.ColorType = node.getAttribute('ColorType') || 'Highlight';
                    comp.props.Height = node.getAttribute('Height') || '35';
                    comp.props.Padding = node.getAttribute('Padding') || '20,0';
                    comp.props.Margin = node.getAttribute('Margin') || '0,4,0,10';
                }
                else if (type === 'textbutton') {
                    comp.props.Text = node.getAttribute('Text') || '文本按钮';
                    comp.props.Margin = node.getAttribute('Margin') || '0,8,0,10';
                }
                else if (type === 'listitem') {
                    comp.props.Title = node.getAttribute('Title') || '';
                    comp.props.Info = node.getAttribute('Info') || '';
                    comp.props.Logo = node.getAttribute('Logo') || 'pack://application:,,,/images/Blocks/Grass.png';
                    comp.props.Type = node.getAttribute('Type') || 'Clickable';
                }
                // 事件
                const evType = node.getAttribute('EventType');
                const evData = node.getAttribute('EventData');
                if (evType) comp.events = { type: evType, data: evData || '' };
                return comp;
            };

            let newComponents = [];
            for (let node of xml.documentElement.children) {
                const comp = parseNode(node);
                if (comp) newComponents.push(comp);
            }
            if (newComponents.length) {
                state.components = newComponents;
                const maxId = getMaxId(state.components);
                state.nextId = Math.max(maxId + 1, 200);
                state.selectedId = null;
                renderCanvas();
                showToast(`成功导入 ${newComponents.length} 个组件`);
            } else {
                showToast('未找到有效组件，请检查XAML格式', true);
            }
        } catch (e) {
            console.error(e);
            showToast('解析失败: ' + e.message, true);
        }
    }

    // 生成 XAML (完整支持 Grid 和通用属性)
    function generateXAML(comps, indent = 0) {
        let xaml = '';
        const spaces = '  '.repeat(indent);
        for (let comp of comps) {
            const attrs = [];
            // 通用属性
            const commonAttrs = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment'];
            commonAttrs.forEach(attr => {
                if (comp.props[attr] && comp.props[attr] !== '') attrs.push(`${attr}="${escapeXml(comp.props[attr])}"`);
            });
            if (comp.type === 'card') {
                attrs.push(`Title="${escapeXml(comp.props.Title)}"`);
                attrs.push(`CanSwap="${comp.props.CanSwap || 'True'}"`);
                attrs.push(`IsSwapped="${comp.props.IsSwapped || 'True'}"`);
                xaml += `${spaces}<local:MyCard ${attrs.join(' ')}>\n`;
                // 直接输出子组件（不再额外包裹 StackPanel）
                for (let child of comp.children) xaml += generateXAML([child], indent + 1);
                xaml += `${spaces}</local:MyCard>\n\n`;
            } else if (comp.type === 'grid') {
                xaml += `${spaces}<Grid ${attrs.join(' ')}>\n`;
                // 输出列定义
                if (comp.props.ColumnsDefinition) {
                    const cols = comp.props.ColumnsDefinition.split(';');
                    if (cols.length && !(cols.length === 1 && cols[0] === '')) {
                        xaml += `${spaces}  <Grid.ColumnDefinitions>\n`;
                        cols.forEach(w => {
                            xaml += `${spaces}    <ColumnDefinition Width="${escapeXml(w.trim())}"/>\n`;
                        });
                        xaml += `${spaces}  </Grid.ColumnDefinitions>\n`;
                    }
                }
                if (comp.props.RowsDefinition) {
                    const rows = comp.props.RowsDefinition.split(';');
                    if (rows.length && !(rows.length === 1 && rows[0] === '')) {
                        xaml += `${spaces}  <Grid.RowDefinitions>\n`;
                        rows.forEach(h => {
                            xaml += `${spaces}    <RowDefinition Height="${escapeXml(h.trim())}"/>\n`;
                        });
                        xaml += `${spaces}  </Grid.RowDefinitions>\n`;
                    }
                }
                for (let child of comp.children) xaml += generateXAML([child], indent + 1);
                xaml += `${spaces}</Grid>\n\n`;
            } else if (comp.type === 'stackpanel') {
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) xaml += generateXAML([child], indent + 1);
                xaml += `${spaces}</StackPanel>\n\n`;
            } else if (comp.type === 'horizontalstack') {
                attrs.push('Orientation="Horizontal"');
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) xaml += generateXAML([child], indent + 1);
                xaml += `${spaces}</StackPanel>\n\n`;
            } else if (comp.type === 'text') {
                attrs.push(`Text="${escapeXml(comp.props.Text)}"`);
                if (comp.props.FontSize) attrs.push(`FontSize="${comp.props.FontSize}"`);
                if (comp.props.TextWrapping) attrs.push(`TextWrapping="${comp.props.TextWrapping}"`);
                if (comp.props.Foreground) attrs.push(`Foreground="${comp.props.Foreground}"`);
                xaml += `${spaces}<TextBlock ${attrs.join(' ')} />\n`;
            } else if (comp.type === 'hint') {
                attrs.push(`Text="${escapeXml(comp.props.Text)}"`);
                if (comp.props.Theme) attrs.push(`Theme="${comp.props.Theme}"`);
                xaml += `${spaces}<local:MyHint ${attrs.join(' ')} />\n`;
            } else if (comp.type === 'image') {
                attrs.push(`Source="${escapeXml(comp.props.Source)}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                if (comp.props.HorizontalAlignment) attrs.push(`HorizontalAlignment="${comp.props.HorizontalAlignment}"`);
                xaml += `${spaces}<local:MyImage ${attrs.join(' ')} />\n`;
            } else if (comp.type === 'button') {
                attrs.push(`Text="${escapeXml(comp.props.Text)}"`);
                if (comp.props.ColorType) attrs.push(`ColorType="${comp.props.ColorType}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                if (comp.props.Padding) attrs.push(`Padding="${comp.props.Padding}"`);
                if (comp.events?.type) attrs.push(`EventType="${escapeXml(comp.events.type)}" EventData="${escapeXml(comp.events.data || '')}"`);
                xaml += `${spaces}<local:MyButton ${attrs.join(' ')} />\n`;
            } else if (comp.type === 'textbutton') {
                attrs.push(`Text="${escapeXml(comp.props.Text)}"`);
                if (comp.events?.type) attrs.push(`EventType="${escapeXml(comp.events.type)}" EventData="${escapeXml(comp.events.data || '')}"`);
                xaml += `${spaces}<local:MyTextButton ${attrs.join(' ')} />\n`;
            } else if (comp.type === 'listitem') {
                attrs.push(`Title="${escapeXml(comp.props.Title)}"`);
                attrs.push(`Info="${escapeXml(comp.props.Info)}"`);
                attrs.push(`Logo="${escapeXml(comp.props.Logo)}"`);
                attrs.push(`Type="${comp.props.Type || 'Clickable'}"`);
                if (comp.events?.type) attrs.push(`EventType="${escapeXml(comp.events.type)}" EventData="${escapeXml(comp.events.data || '')}"`);
                xaml += `${spaces}<local:MyListItem ${attrs.join(' ')} />\n`;
            }
        }
        return xaml;
    }

    // 绑定 UI 事件
    function bindUIEvents() {
        document.getElementById('clearCanvasBtn').onclick = () => { if (confirm('清空所有组件？')) { state.components = []; state.selectedId = null; renderCanvas(); } };
        document.getElementById('applyPropsBtn').onclick = applyCurrentProps;
        document.getElementById('deleteCompBtn').onclick = () => { if (state.selectedId && confirm('删除组件？')) removeComponentById(state.selectedId); };
        document.getElementById('duplicateCompBtn').onclick = () => { if (state.selectedId) duplicateComponent(findComponentById(state.selectedId)); };
        document.getElementById('xamlExportBtn').onclick = () => { document.getElementById('xamlModal').style.display = 'flex'; document.getElementById('xamlViewArea').style.display = 'block'; document.getElementById('importArea').style.display = 'none'; document.getElementById('xamlCodeArea').value = generateXAML(state.components); };
        document.getElementById('viewXamlBtn').onclick = () => { document.getElementById('xamlViewArea').style.display = 'block'; document.getElementById('importArea').style.display = 'none'; document.getElementById('xamlCodeArea').value = generateXAML(state.components); };
        document.getElementById('importXamlBtn').onclick = () => { document.getElementById('xamlViewArea').style.display = 'none'; document.getElementById('importArea').style.display = 'block'; document.getElementById('importXamlText').value = ''; };
        document.getElementById('doImportBtn').onclick = () => { let code = document.getElementById('importXamlText').value; if (code.trim()) importFromXAML(code); document.getElementById('xamlModal').style.display = 'none'; };
        document.getElementById('copyXamlBtn').onclick = async () => {
            try {
                await navigator.clipboard.writeText(document.getElementById('xamlCodeArea').value);
                showToast('已复制XAML');
            } catch (err) {
                showToast('复制失败，请手动复制', true);
            }
        };
        document.getElementById('closeModalBtn').onclick = () => document.getElementById('xamlModal').style.display = 'none';
        document.getElementById('cancelImportBtn').onclick = () => document.getElementById('xamlModal').style.display = 'none';
        document.getElementById('toggleSidebarBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('togglePropsPanelBtn').onclick = () => document.getElementById('propsPanel').classList.toggle('open');
        document.getElementById('themeToggle').onclick = () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        };
        window.onclick = (e) => { if (e.target === document.getElementById('xamlModal')) document.getElementById('xamlModal').style.display = 'none'; };
        // 实时保存属性（失焦）
        document.getElementById('dynamicProps')?.addEventListener('change', applyCurrentProps);
        document.getElementById('eventTypeSelect')?.addEventListener('change', applyCurrentProps);
        document.getElementById('eventDataInput')?.addEventListener('blur', applyCurrentProps);
    }

    function init() {
        buildComponentLibrary();
        initDragAndDrop();
        bindUIEvents();
        renderCanvas();
    }
    init();
})();