// script.js - 优化版本，XAML工具仅保留代码预览功能，导入由文件拖拽实现
(function () {
    // ----------------------------- 组件元数据 -----------------------------
    const COMP_TYPES = {
        card: {
            name: "卡片 (MyCard)",
            icon: "fas fa-layer-group",
            canNest: true,
            defaults: {
                Title: "新卡片",
                Margin: "0,0,0,15",
                CanSwap: "True",
                IsSwapped: "True",
                ToolTip: "",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        text: {
            name: "文本 (TextBlock)",
            icon: "fas fa-font",
            canNest: false,
            defaults: {
                Text: "这是一段文本",
                FontSize: "14",
                TextWrapping: "Wrap",
                Foreground: "#1e293b",
                ToolTip: "",
                Margin: "0",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        hint: {
            name: "提示条 (MyHint)",
            icon: "fas fa-info-circle",
            canNest: false,
            defaults: {
                Text: "提示信息",
                Theme: "Blue",
                ToolTip: "",
                Margin: "0",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        image: {
            name: "图片 (MyImage)",
            icon: "fas fa-image",
            canNest: false,
            defaults: {
                Source: "https://www.baidu.com/img/flexible/logo/pc/result.png",
                Height: "60",
                HorizontalAlignment: "Center",
                ToolTip: "",
                Margin: "0",
                VerticalAlignment: "Stretch"
            }
        },
        button: {
            name: "按钮 (MyButton)",
            icon: "fas fa-hand-pointer",
            canNest: false,
            defaults: {
                Text: "按钮",
                ColorType: "Highlight",
                Height: "35",
                Padding: "20,0",
                Margin: "0,4,0,10",
                ToolTip: "",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        textbutton: {
            name: "文本按钮 (MyTextButton)",
            icon: "fas fa-minus-square",
            canNest: false,
            defaults: {
                Text: "文本按钮",
                Margin: "0,8,0,10",
                ToolTip: "",
                HorizontalAlignment: "Center",
                VerticalAlignment: "Stretch"
            }
        },
        listitem: {
            name: "列表项 (MyListItem)",
            icon: "fas fa-list",
            canNest: false,
            defaults: {
                Title: "标题",
                Info: "描述",
                Logo: "pack://application:,,,/images/Blocks/Grass.png",
                Type: "Clickable",
                ToolTip: "",
                Margin: "-5,0,-5,8",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        stackpanel: {
            name: "垂直布局 (StackPanel)",
            icon: "fas fa-align-justify",
            canNest: true,
            defaults: {
                Margin: "0,0,0,0",
                ToolTip: "",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        },
        horizontalstack: {
            name: "水平布局 (StackPanel Horizontal)",
            icon: "fas fa-arrows-alt-h",
            canNest: true,
            defaults: {
                Orientation: "Horizontal",
                HorizontalAlignment: "Center",
                Margin: "0,0,0,0",
                ToolTip: "",
                VerticalAlignment: "Stretch"
            }
        },
        grid: {
            name: "网格布局 (Grid)",
            icon: "fas fa-th",
            canNest: true,
            defaults: {
                ColumnsDefinition: "1*,2*,Auto",
                RowsDefinition: "",
                Margin: "0",
                ToolTip: "",
                HorizontalAlignment: "Stretch",
                VerticalAlignment: "Stretch"
            }
        }
    };

    // 应用状态管理
    let state = {
        components: [],
        nextId: 100,
        selectedId: null
    };

    // 本地文件句柄相关
    let currentFileHandle = null;
    let currentFileName = '';

    // 初始化主题
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }

    // 工具函数
    const utils = {
        showToast: function (msg, isErr = false) {
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = 'toast';
                document.body.appendChild(toast);
            }

            toast.textContent = msg;
            toast.style.background = isErr ? '#ef4444' : '#4f46e5';
            toast.style.opacity = '1';
            setTimeout(() => toast.style.opacity = '0', 2000);
        },

        escapeHtml: function (str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function (m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        },

        escapeXml: function (str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function (m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            }).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        }
    };

    // 组件查找辅助函数
    const componentFinder = {
        findComponentById: function (id, list = state.components) {
            for (let comp of list) {
                if (comp.id === id) return comp;
                if (comp.children && comp.children.length) {
                    let found = componentFinder.findComponentById(id, comp.children);
                    if (found) return found;
                }
            }
            return null;
        }
    };

    // 组件创建和管理
    const componentManager = {
        createComponent: function (type, parentId = null) {
            const def = COMP_TYPES[type];
            if (!def) return null;
            const id = state.nextId++;
            return {
                id, type, name: def.name, parentId, children: [],
                props: JSON.parse(JSON.stringify(def.defaults)),
                events: { type: "", data: "" }
            };
        },

        addComponent: function (comp, targetParentId = null) {
            if (targetParentId === null) {
                state.components.push(comp);
                return true;
            }
            const parent = componentFinder.findComponentById(targetParentId);
            if (parent && COMP_TYPES[parent.type]?.canNest) {
                parent.children.push(comp);
                comp.parentId = targetParentId;
                return true;
            }
            return false;
        },

        removeComponentById: function (id) {
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
                renderManager.renderCanvas();
                return true;
            }
            return false;
        },

        deepCloneComponent: function (comp, newParentId = null) {
            const clone = {
                ...comp,
                id: state.nextId++,
                parentId: newParentId,
                children: [],
                props: { ...comp.props },
                events: { ...comp.events }
            };
            for (let child of comp.children) {
                const childClone = componentManager.deepCloneComponent(child, clone.id);
                clone.children.push(childClone);
            }
            return clone;
        },

        duplicateComponent: function (comp) {
            if (!comp) return false;
            const clone = componentManager.deepCloneComponent(comp, comp.parentId);
            if (comp.parentId) {
                const parent = componentFinder.findComponentById(comp.parentId);
                if (parent) parent.children.push(clone);
                else return false;
            } else {
                state.components.push(clone);
            }
            renderManager.renderCanvas();
            renderManager.selectComponent(clone.id);
            utils.showToast(`已复制组件: ${clone.name}`);
            return true;
        }
    };

    // 渲染管理器
    const renderManager = {
        renderComponentDOM: function (comp, container) {
            const wrapper = document.createElement('div');
            wrapper.className = 'component-item-wrapper';
            wrapper.setAttribute('data-id', comp.id);
            wrapper.setAttribute('data-type', comp.type);

            if (comp.type === 'card') {
                wrapper.innerHTML = `<div class="card-component"><div class="card-header"><span>${utils.escapeHtml(comp.props.Title || '卡片')}</span><div><i class="fas fa-arrows-alt"></i></div></div><div class="card-content"><div class="nested-dropzone" data-parent-id="${comp.id}" data-placeholder="将组件拖入卡片"></div></div></div>`;
                const dropzone = wrapper.querySelector('.nested-dropzone');
                comp.children.forEach(child => renderManager.renderComponentDOM(child, dropzone));
            }
            else if (comp.type === 'stackpanel') {
                wrapper.innerHTML = `<div class="card-component" style="background:var(--bg-card); padding:8px; border:1px dashed var(--border);"><div style="font-size:0.7rem; color:var(--text-light);"><i class="fas fa-layer-group"></i> 垂直布局</div><div class="nested-dropzone" data-parent-id="${comp.id}"></div></div>`;
                const dz = wrapper.querySelector('.nested-dropzone');
                comp.children.forEach(child => renderManager.renderComponentDOM(child, dz));
            }
            else if (comp.type === 'horizontalstack') {
                wrapper.innerHTML = `<div class="card-component" style="background:var(--bg-card); padding:8px; border:1px dashed var(--border);"><div style="font-size:0.7rem;"><i class="fas fa-arrows-alt-h"></i> 水平布局</div><div class="nested-dropzone horizontal" data-parent-id="${comp.id}" style="display:flex; gap:8px; flex-wrap:wrap;"></div></div>`;
                const dz = wrapper.querySelector('.nested-dropzone');
                comp.children.forEach(child => renderManager.renderComponentDOM(child, dz));
            }
            else if (comp.type === 'grid') {
                wrapper.innerHTML = `<div class="card-component grid-mock"><div style="font-size:0.7rem;"><i class="fas fa-th"></i> 网格布局 (${comp.props.ColumnsDefinition || '未定义列'})</div><div class="nested-dropzone" data-parent-id="${comp.id}"></div></div>`;
                const dz = wrapper.querySelector('.nested-dropzone');
                comp.children.forEach(child => renderManager.renderComponentDOM(child, dz));
            }
            else {
                let innerHtml = '';
                if (comp.type === 'text') {
                    innerHtml = `<div style="margin:4px 0; color:${comp.props.Foreground || '#000'}">${utils.escapeHtml(comp.props.Text || '文本')}</div>`;
                }
                else if (comp.type === 'hint') {
                    innerHtml = `<div class="hint-${(comp.props.Theme || 'blue').toLowerCase()}" style="padding:8px; border-radius:8px;">${utils.escapeHtml(comp.props.Text)}</div>`;
                }
                else if (comp.type === 'image') {
                    innerHtml = `<img src="${comp.props.Source}" style="max-width:100%; height:${comp.props.Height || 'auto'}" />`;
                }
                else if (comp.type === 'button') {
                    innerHtml = `<button class="btn" style="background:${comp.props.ColorType === 'Highlight' ? '#4f46e5' : '#333'}; color:white; border:none; padding:8px 16px; border-radius:30px;">${utils.escapeHtml(comp.props.Text)}</button>`;
                }
                else if (comp.type === 'textbutton') {
                    innerHtml = `<button style="background:none; border:none; color:var(--primary); cursor:pointer;">${utils.escapeHtml(comp.props.Text)}</button>`;
                }
                else if (comp.type === 'listitem') {
                    innerHtml = `<div class="list-item-mock"><i class="fas fa-cube"></i><div><strong>${utils.escapeHtml(comp.props.Title)}</strong><div style="font-size:12px;">${utils.escapeHtml(comp.props.Info)}</div></div></div>`;
                }

                wrapper.innerHTML = innerHtml;
                if (comp.props.ToolTip) wrapper.title = comp.props.ToolTip;
            }

            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                renderManager.selectComponent(comp.id);
            });
            container.appendChild(wrapper);
        },

        renderCanvas: function () {
            const canvas = document.getElementById('canvas');
            canvas.innerHTML = '';
            if (state.components.length === 0) {
                canvas.innerHTML = '<div class="empty-placeholder"><i class="fas fa-drag-drop" style="font-size:2rem"></i><p>从左侧拖拽组件至此</p></div>';
                renderManager.updateHierarchyBar();
                renderManager.updatePropsPanel();
                return;
            }
            state.components.forEach(comp => renderManager.renderComponentDOM(comp, canvas));
            if (state.selectedId) {
                document.querySelectorAll(`[data-id="${state.selectedId}"]`).forEach(el => el.classList.add('selected'));
            }
            renderManager.updateHierarchyBar();
            renderManager.updatePropsPanel();
        },

        selectComponent: function (id) {
            state.selectedId = id;
            document.querySelectorAll('.component-item-wrapper').forEach(el => el.classList.remove('selected'));
            const selEl = document.querySelector(`[data-id="${id}"]`);
            if (selEl) selEl.classList.add('selected');
            renderManager.updatePropsPanel();
            renderManager.updateHierarchyBar();
        },

        updatePropsPanel: function () {
            const comp = componentFinder.findComponentById(state.selectedId);
            document.getElementById('compTypeName').innerText = comp ? (COMP_TYPES[comp.type]?.name || comp.type) : '未选中';
            document.getElementById('compIdDisplay').innerText = comp ? comp.id : '-';
            if (!comp) {
                document.getElementById('dynamicProps').innerHTML = '';
                document.getElementById('eventTypeSelect').value = '';
                document.getElementById('eventDataInput').value = '';
                return;
            }

            const container = document.getElementById('dynamicProps');
            container.innerHTML = '';
            const groups = renderManager.getPropGroups(comp);
            for (let group of groups) {
                const section = document.createElement('div');
                section.className = 'prop-section';
                section.innerHTML = `<div class="prop-section-title"><i class="${group.icon}"></i> ${group.title}</div>`;
                for (let field of group.fields) {
                    const fieldDiv = document.createElement('div');
                    fieldDiv.className = 'prop-field';
                    const isLong = (field.key === 'Text' || field.key === 'Info');
                    const inputHtml = isLong ?
                        `<textarea data-prop="${field.key}" rows="2">${utils.escapeHtml(String(field.val))}</textarea>` :
                        `<input data-prop="${field.key}" value="${utils.escapeHtml(String(field.val))}" />`;
                    fieldDiv.innerHTML = `<label>${field.key}</label>${inputHtml}`;
                    section.appendChild(fieldDiv);
                }
                container.appendChild(section);
            }
            document.getElementById('eventTypeSelect').value = comp.events?.type || '';
            document.getElementById('eventDataInput').value = comp.events?.data || '';
        },

        getPropGroups: function (comp) {
            if (!comp) return [];
            const groups = {
                content: { title: "内容", icon: "fas fa-align-left", fields: [] },
                appearance: { title: "外观样式", icon: "fas fa-palette", fields: [] },
                layout: { title: "布局与边距", icon: "fas fa-expand-alt", fields: [] },
                behavior: { title: "行为", icon: "fas fa-cog", fields: [] },
                other: { title: "其他", icon: "fas fa-ellipsis-h", fields: [] }
            };

            const specificContentKeys = ["Text", "Title", "Info", "Source", "Logo"];
            const appearanceKeys = ["Foreground", "FontSize", "TextWrapping", "Theme", "ColorType", "LogoScale", "Type"];
            const layoutKeys = ["Margin", "Padding", "Width", "Height", "HorizontalAlignment", "VerticalAlignment", "ColumnsDefinition", "RowsDefinition", "Orientation"];
            const behaviorKeys = ["CanSwap", "IsSwapped", "ToolTip", "EnableCache", "UseAnimation", "SwapLogoRight", "HasMouseAnimation", "IsHitTestVisible"];

            for (let [key, val] of Object.entries(comp.props)) {
                if (specificContentKeys.includes(key)) groups.content.fields.push({ key, val });
                else if (appearanceKeys.includes(key)) groups.appearance.fields.push({ key, val });
                else if (layoutKeys.includes(key)) groups.layout.fields.push({ key, val });
                else if (behaviorKeys.includes(key)) groups.behavior.fields.push({ key, val });
                else groups.other.fields.push({ key, val });
            }

            return Object.values(groups).filter(g => g.fields.length > 0);
        },

        updateHierarchyBar: function () {
            const bar = document.getElementById('hierarchyBar');
            if (!state.selectedId) {
                bar.innerHTML = '<span>未选中组件</span>';
                return;
            }

            let path = [];
            let cur = componentFinder.findComponentById(state.selectedId);
            while (cur) {
                path.unshift(cur);
                cur = componentFinder.findComponentById(cur.parentId);
            }

            bar.innerHTML = path.map(c => `<span class="hierarchy-item" data-id="${c.id}">${c.name}</span>`).join(' <i class="fas fa-chevron-right"></i> ');
            document.querySelectorAll('.hierarchy-item').forEach(el => el.addEventListener('click', (e) => {
                renderManager.selectComponent(parseInt(el.getAttribute('data-id')));
            }));
        },

        applyCurrentProps: function () {
            const comp = componentFinder.findComponentById(state.selectedId);
            if (!comp) return;

            document.querySelectorAll('#dynamicProps input, #dynamicProps textarea').forEach(inp => {
                const key = inp.getAttribute('data-prop');
                if (key) comp.props[key] = inp.value;
            });

            comp.events = {
                type: document.getElementById('eventTypeSelect').value,
                data: document.getElementById('eventDataInput').value
            };

            renderManager.renderCanvas();
            utils.showToast('属性已更新');
        }
    };

    // XAML 导入导出核心
    const xamlProcessor = {
        importFromXAML: function (xmlStr) {
            try {
                const wrappedXml = `<root xmlns:local="http://tempuri.org/pcl">${xmlStr}</root>`;
                const parser = new DOMParser();
                const xml = parser.parseFromString(wrappedXml, 'text/xml');

                if (xml.querySelector('parsererror')) throw new Error('XML格式错误');

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

                    const comp = componentManager.createComponent(type, parentId);
                    const commonProps = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment'];
                    commonProps.forEach(prop => {
                        const val = node.getAttribute(prop);
                        if (val !== null) comp.props[prop] = val;
                    });

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
                        let colsDef = '', rowsDef = '';
                        for (let child of node.children) {
                            const childName = child.tagName?.toLowerCase();
                            if (childName === 'grid.columndefinitions') {
                                const colDefs = Array.from(child.children).map(cd => cd.getAttribute('Width') || '').join(';');
                                if (colDefs) colsDef = colDefs;
                            }
                            else if (childName === 'grid.rowdefinitions') {
                                const rowDefs = Array.from(child.children).map(rd => rd.getAttribute('Height') || '').join(';');
                                if (rowDefs) rowsDef = rowDefs;
                            }
                            else {
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
                    state.nextId = Math.max(
                        (function getMaxId(comps) {
                            let max = 0;
                            const traverse = (list) => {
                                for (let c of list) {
                                    if (c.id > max) max = c.id;
                                    if (c.children) traverse(c.children);
                                }
                            };
                            traverse(comps);
                            return max;
                        })(state.components) + 1,
                        200
                    );
                    state.selectedId = null;
                    renderManager.renderCanvas();
                    utils.showToast(`成功导入 ${newComponents.length} 个组件`);
                } else {
                    utils.showToast('未找到有效组件', true);
                }
            } catch (e) {
                console.error(e);
                utils.showToast('解析失败: ' + e.message, true);
            }
        },

        generateXAML: function (comps, indent = 0) {
            let xaml = '';
            const spaces = '  '.repeat(indent);

            for (let comp of comps) {
                const attrs = [];
                const commonAttrs = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment'];
                commonAttrs.forEach(attr => {
                    if (comp.props[attr] && comp.props[attr] !== '') {
                        attrs.push(`${attr}="${utils.escapeXml(comp.props[attr])}"`);
                    }
                });

                if (comp.type === 'card') {
                    attrs.push(`Title="${utils.escapeXml(comp.props.Title)}"`);
                    attrs.push(`CanSwap="${comp.props.CanSwap || 'True'}"`);
                    attrs.push(`IsSwapped="${comp.props.IsSwapped || 'True'}"`);
                    xaml += `${spaces}<local:MyCard ${attrs.join(' ')}>\n`;
                    for (let child of comp.children) {
                        xaml += xamlProcessor.generateXAML([child], indent + 1);
                    }
                    xaml += `${spaces}</local:MyCard>\n\n`;
                }
                else if (comp.type === 'grid') {
                    xaml += `${spaces}<Grid ${attrs.join(' ')}>\n`;
                    if (comp.props.ColumnsDefinition) {
                        const cols = comp.props.ColumnsDefinition.split(';');
                        if (cols.length && !(cols.length === 1 && cols[0] === '')) {
                            xaml += `${spaces}  <Grid.ColumnDefinitions>\n`;
                            cols.forEach(w => {
                                xaml += `${spaces}    <ColumnDefinition Width="${utils.escapeXml(w.trim())}"/>\n`;
                            });
                            xaml += `${spaces}  </Grid.ColumnDefinitions>\n`;
                        }
                    }
                    if (comp.props.RowsDefinition) {
                        const rows = comp.props.RowsDefinition.split(';');
                        if (rows.length && !(rows.length === 1 && rows[0] === '')) {
                            xaml += `${spaces}  <Grid.RowDefinitions>\n`;
                            rows.forEach(h => {
                                xaml += `${spaces}    <RowDefinition Height="${utils.escapeXml(h.trim())}"/>\n`;
                            });
                            xaml += `${spaces}  </Grid.RowDefinitions>\n`;
                        }
                    }
                    for (let child of comp.children) {
                        xaml += xamlProcessor.generateXAML([child], indent + 1);
                    }
                    xaml += `${spaces}</Grid>\n\n`;
                }
                else if (comp.type === 'stackpanel') {
                    xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                    for (let child of comp.children) {
                        xaml += xamlProcessor.generateXAML([child], indent + 1);
                    }
                    xaml += `${spaces}</StackPanel>\n\n`;
                }
                else if (comp.type === 'horizontalstack') {
                    attrs.push('Orientation="Horizontal"');
                    xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                    for (let child of comp.children) {
                        xaml += xamlProcessor.generateXAML([child], indent + 1);
                    }
                    xaml += `${spaces}</StackPanel>\n\n`;
                }
                else if (comp.type === 'text') {
                    attrs.push(`Text="${utils.escapeXml(comp.props.Text)}"`);
                    if (comp.props.FontSize) attrs.push(`FontSize="${comp.props.FontSize}"`);
                    if (comp.props.TextWrapping) attrs.push(`TextWrapping="${comp.props.TextWrapping}"`);
                    if (comp.props.Foreground) attrs.push(`Foreground="${comp.props.Foreground}"`);
                    xaml += `${spaces}<TextBlock ${attrs.join(' ')} />\n`;
                }
                else if (comp.type === 'hint') {
                    attrs.push(`Text="${utils.escapeXml(comp.props.Text)}"`);
                    if (comp.props.Theme) attrs.push(`Theme="${comp.props.Theme}"`);
                    xaml += `${spaces}<local:MyHint ${attrs.join(' ')} />\n`;
                }
                else if (comp.type === 'image') {
                    attrs.push(`Source="${utils.escapeXml(comp.props.Source)}"`);
                    if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                    if (comp.props.HorizontalAlignment) attrs.push(`HorizontalAlignment="${comp.props.HorizontalAlignment}"`);
                    xaml += `${spaces}<local:MyImage ${attrs.join(' ')} />\n`;
                }
                else if (comp.type === 'button') {
                    attrs.push(`Text="${utils.escapeXml(comp.props.Text)}"`);
                    if (comp.props.ColorType) attrs.push(`ColorType="${comp.props.ColorType}"`);
                    if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                    if (comp.props.Padding) attrs.push(`Padding="${comp.props.Padding}"`);
                    if (comp.events?.type) attrs.push(`EventType="${utils.escapeXml(comp.events.type)}" EventData="${utils.escapeXml(comp.events.data || '')}"`);
                    xaml += `${spaces}<local:MyButton ${attrs.join(' ')} />\n`;
                }
                else if (comp.type === 'textbutton') {
                    attrs.push(`Text="${utils.escapeXml(comp.props.Text)}"`);
                    if (comp.events?.type) attrs.push(`EventType="${utils.escapeXml(comp.events.type)}" EventData="${utils.escapeXml(comp.events.data || '')}"`);
                    xaml += `${spaces}<local:MyTextButton ${attrs.join(' ')} />\n`;
                }
                else if (comp.type === 'listitem') {
                    attrs.push(`Title="${utils.escapeXml(comp.props.Title)}"`);
                    attrs.push(`Info="${utils.escapeXml(comp.props.Info)}"`);
                    attrs.push(`Logo="${utils.escapeXml(comp.props.Logo)}"`);
                    attrs.push(`Type="${comp.props.Type || 'Clickable'}"`);
                    if (comp.events?.type) attrs.push(`EventType="${utils.escapeXml(comp.events.type)}" EventData="${utils.escapeXml(comp.events.data || '')}"`);
                    xaml += `${spaces}<local:MyListItem ${attrs.join(' ')} />\n`;
                }
            }
            return xaml;
        }
    };

    // 本地文件管理 (File System Access API)
    const fileManager = {
        isFileSystemAccessSupported: function () {
            return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
        },

        openLocalFileWithPicker: async function () {
            if (!fileManager.isFileSystemAccessSupported()) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xaml,.xml';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const text = await file.text();
                    if (confirm('打开文件将替换当前所有组件，是否继续？')) {
                        xamlProcessor.importFromXAML(text);
                        utils.showToast(`已打开: ${file.name} (只读模式，如需保存请使用另存为)`);
                        currentFileHandle = null;
                        currentFileName = file.name;
                        fileManager.updateLocalFileUI();
                    }
                };
                input.click();
                return;
            }

            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }],
                    multiple: false
                });
                const file = await handle.getFile();
                const content = await file.text();
                if (confirm(`打开 "${file.name}" 将替换当前所有组件，是否继续？`)) {
                    xamlProcessor.importFromXAML(content);
                    currentFileHandle = handle;
                    currentFileName = file.name;
                    fileManager.updateLocalFileUI();
                    utils.showToast(`已链接本地文件: ${file.name}`);
                }
            } catch (err) {
                if (err.name !== 'AbortError') utils.showToast('打开文件失败: ' + err.message, true);
            }
        },

        saveToLinkedFile: async function () {
            if (!currentFileHandle) {
                utils.showToast('没有链接的本地文件，请先"打开本地文件"', true);
                return;
            }
            if (!fileManager.isFileSystemAccessSupported()) {
                utils.showToast('当前浏览器不支持直接写入，请使用"另存为"', true);
                return;
            }

            const xamlContent = xamlProcessor.generateXAML(state.components);
            if (!xamlContent.trim()) {
                utils.showToast('没有可保存的内容', true);
                return;
            }

            try {
                const writable = await currentFileHandle.createWritable();
                await writable.write(xamlContent);
                await writable.close();
                utils.showToast(`已保存到 ${currentFileName}`);
            } catch (err) {
                utils.showToast('保存失败: ' + err.message, true);
            }
        },

        saveAsLocalFile: async function () {
            const xamlContent = xamlProcessor.generateXAML(state.components);
            if (!xamlContent.trim()) {
                utils.showToast('没有可保存的内容', true);
                return;
            }

            if (fileManager.isFileSystemAccessSupported()) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: currentFileName || 'design.xaml',
                        types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(xamlContent);
                    await writable.close();
                    currentFileHandle = handle;
                    currentFileName = handle.name;
                    fileManager.updateLocalFileUI();
                    utils.showToast(`已另存为: ${handle.name}，并已链接此文件`);
                } catch (err) {
                    if (err.name !== 'AbortError') utils.showToast('保存失败: ' + err.message, true);
                }
            } else {
                const blob = new Blob([xamlContent], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = currentFileName || 'design.xaml';
                link.click();
                URL.revokeObjectURL(link.href);
                utils.showToast('已下载文件，如需再次编辑请使用"打开本地文件"');
            }
        },

        updateLocalFileUI: function () {
            const infoDiv = document.getElementById('linkedFileInfo');
            const saveBtn = document.getElementById('saveToLocalFileBtn');

            if (currentFileName) {
                infoDiv.innerHTML = `<i class="fas fa-link"></i> 已链接: ${currentFileName}${currentFileHandle ? ' (可读写)' : ' (只读)'}`;
                if (saveBtn) saveBtn.disabled = false;
            } else {
                infoDiv.innerHTML = `<i class="fas fa-link"></i> 未链接任何本地文件`;
                if (saveBtn) saveBtn.disabled = true;
            }

            const warningDiv = document.getElementById('fsaCompatWarning');
            if (!fileManager.isFileSystemAccessSupported()) {
                warningDiv.innerHTML = '<div class="unsupported-warning"><i class="fas fa-exclamation-triangle"></i> 当前浏览器不支持文件系统API，本地文件仅能读取，保存将使用下载方式。</div>';
            } else {
                warningDiv.innerHTML = '';
            }
        }
    };

    // 服务器端API交互
    let currentSelectedServerFile = '';
    const serverApi = {
        loadServerFileList: async function () {
            try {
                const res = await fetch('/api/files');
                const data = await res.json();
                if (data.success && data.files) {
                    const select = document.getElementById('serverFileSelect');
                    select.innerHTML = '<option value="">-- 选择文件 --</option>';
                    data.files.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        select.appendChild(option);
                    });
                    if (currentSelectedServerFile && data.files.includes(currentSelectedServerFile)) {
                        select.value = currentSelectedServerFile;
                    } else {
                        currentSelectedServerFile = '';
                        document.getElementById('overwriteCurrentBtn').disabled = true;
                    }
                    return data.files;
                } else {
                    utils.showToast('获取文件列表失败', true);
                    return [];
                }
            } catch (err) {
                utils.showToast('网络错误: ' + err.message, true);
                return [];
            }
        },

        saveToServer: async function (filename, content) {
            try {
                const res = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, content })
                });
                const data = await res.json();
                if (data.success) {
                    utils.showToast(data.message);
                    await serverApi.loadServerFileList();
                    return true;
                } else {
                    utils.showToast('保存失败: ' + (data.error || '未知错误'), true);
                    return false;
                }
            } catch (err) {
                utils.showToast('请求失败: ' + err.message, true);
                return false;
            }
        },

        loadFromServer: async function (filename) {
            try {
                const res = await fetch(`/api/load?filename=${encodeURIComponent(filename)}`);
                const data = await res.json();
                if (data.success && data.content) {
                    if (confirm(`加载 "${filename}" 将替换当前所有组件，是否继续？`)) {
                        xamlProcessor.importFromXAML(data.content);
                        utils.showToast(`已加载 ${filename}`);
                        return true;
                    }
                } else {
                    utils.showToast('加载失败: ' + (data.error || '文件内容为空'), true);
                }
                return false;
            } catch (err) {
                utils.showToast('请求失败: ' + err.message, true);
                return false;
            }
        },

        deleteServerFile: async function (filename) {
            if (!confirm(`确定删除文件 "${filename}" 吗？此操作不可恢复。`)) return false;
            try {
                const res = await fetch('/api/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
                const data = await res.json();
                if (data.success) {
                    utils.showToast(`已删除 ${filename}`);
                    if (currentSelectedServerFile === filename) {
                        currentSelectedServerFile = '';
                        document.getElementById('overwriteCurrentBtn').disabled = true;
                    }
                    await serverApi.loadServerFileList();
                    return true;
                } else {
                    utils.showToast('删除失败: ' + (data.error || '未知错误'), true);
                    return false;
                }
            } catch (err) {
                utils.showToast('请求失败: ' + err.message, true);
                return false;
            }
        }
    };

    // 拖拽导入
    const dragDropManager = {
        handleFileImport: function (file) {
            if (!file) return;
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'xaml' && ext !== 'xml') {
                utils.showToast('请拖入 .xaml 或 .xml 文件', true);
                return;
            }
            if (confirm('拖入文件将替换当前所有组件，是否继续？')) {
                const reader = new FileReader();
                reader.onload = (e) => { xamlProcessor.importFromXAML(e.target.result); };
                reader.onerror = () => utils.showToast('文件读取失败', true);
                reader.readAsText(file, 'UTF-8');
            }
        },

        initGlobalFileDragAndDrop: function () {
            const overlay = document.getElementById('globalDragOverlay');
            document.body.addEventListener('dragover', (e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.classList.add('drag-file-active');
                    e.dataTransfer.dropEffect = 'copy';
                }
            });
            document.body.addEventListener('dragleave', (e) => {
                if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
                    document.body.classList.remove('drag-file-active');
                }
            });
            document.body.addEventListener('drop', (e) => {
                document.body.classList.remove('drag-file-active');
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    dragDropManager.handleFileImport(files[0]);
                    return false;
                }
            });
        },

        initDragAndDrop: function () {
            const designContainer = document.getElementById('previewContainer');
            let pendingDragType = null, currentDropZone = null;

            document.body.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            designContainer.addEventListener('dragover', (e) => {
                if (e.dataTransfer.types.includes('Files')) return;
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
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return;
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
                    const parentComp = componentFinder.findComponentById(targetParentId);
                    if (!parentComp || !COMP_TYPES[parentComp.type]?.canNest) {
                        utils.showToast('该容器不允许放置子组件', true);
                        pendingDragType = null;
                        return;
                    }
                }

                const newComp = componentManager.createComponent(compType, targetParentId);
                if (!newComp) return;

                if (componentManager.addComponent(newComp, targetParentId)) {
                    renderManager.renderCanvas();
                    renderManager.selectComponent(newComp.id);
                    utils.showToast(`添加 ${COMP_TYPES[compType].name}`);
                } else {
                    utils.showToast('无法添加到此处', true);
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

            // 组件库拖拽初始化
            const container = document.getElementById('componentsList');
            container.querySelectorAll('.comp-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    const type = item.getAttribute('data-type');
                    pendingDragType = type;
                    e.dataTransfer.setData('text/plain', type);
                    e.dataTransfer.effectAllowed = 'copy';
                });
            });
        }
    };

    // UI 初始化和事件绑定
    const uiManager = {
        buildComponentLibrary: function () {
            const container = document.getElementById('componentsList');
            container.innerHTML = '';
            for (let [key, val] of Object.entries(COMP_TYPES)) {
                const div = document.createElement('div');
                div.className = 'comp-item';
                div.setAttribute('data-type', key);
                div.setAttribute('draggable', 'true');
                div.innerHTML = `<i class="${val.icon}"></i><span>${val.name}</span><i class="fas fa-grip-vertical" style="margin-left:auto; opacity:0.5"></i>`;
                container.appendChild(div);
            }

            document.getElementById('compSearch')?.addEventListener('input', (e) => {
                const kw = e.target.value.trim().toLowerCase();
                document.querySelectorAll('.comp-item').forEach(item => {
                    const nameSpan = item.querySelector('span')?.innerText.toLowerCase() || '';
                    item.classList.toggle('hidden', kw !== '' && !nameSpan.includes(kw));
                });
            });

            dragDropManager.initDragAndDrop();
        },

        bindUIEvents: function () {
            document.getElementById('clearCanvasBtn').onclick = () => {
                if (confirm('清空所有组件？')) {
                    state.components = [];
                    state.selectedId = null;
                    renderManager.renderCanvas();
                }
            };

            document.getElementById('applyPropsBtn').onclick = renderManager.applyCurrentProps;
            document.getElementById('deleteCompBtn').onclick = () => {
                if (state.selectedId && confirm('删除组件？')) {
                    componentManager.removeComponentById(state.selectedId);
                }
            };

            document.getElementById('duplicateCompBtn').onclick = () => {
                if (state.selectedId) {
                    componentManager.duplicateComponent(componentFinder.findComponentById(state.selectedId));
                }
            };

            // XAML工具 - 仅查看代码，无导入功能
            document.getElementById('xamlExportBtn').onclick = () => {
                const modal = document.getElementById('xamlModal');
                const codeArea = document.getElementById('xamlCodeArea');
                if (codeArea) {
                    codeArea.value = xamlProcessor.generateXAML(state.components);
                }
                modal.style.display = 'flex';
            };

            document.getElementById('copyXamlBtn').onclick = async () => {
                try {
                    await navigator.clipboard.writeText(document.getElementById('xamlCodeArea').value);
                    utils.showToast('已复制XAML');
                } catch (err) {
                    utils.showToast('复制失败', true);
                }
            };

            document.getElementById('downloadXamlBtn').onclick = () => {
                const xaml = document.getElementById('xamlCodeArea').value;
                if (xaml.trim()) {
                    const blob = new Blob([xaml], { type: 'text/plain' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `pcl_export_${new Date().toISOString().slice(0, 19)}.xaml`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                } else {
                    utils.showToast('无XAML内容', true);
                }
            };

            document.getElementById('closeModalBtn').onclick = () => document.getElementById('xamlModal').style.display = 'none';

            document.getElementById('toggleSidebarBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('themeToggle').onclick = () => {
                document.body.classList.toggle('dark');
                localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
            };

            document.getElementById('copyIdBtn').addEventListener('click', () => {
                const idSpan = document.getElementById('compIdDisplay');
                if (idSpan && idSpan.innerText !== '-') {
                    navigator.clipboard.writeText(idSpan.innerText);
                    utils.showToast(`已复制ID: ${idSpan.innerText}`);
                }
            });

            window.onclick = (e) => {
                if (e.target === document.getElementById('xamlModal')) document.getElementById('xamlModal').style.display = 'none';
                if (e.target === document.getElementById('serverModal')) document.getElementById('serverModal').style.display = 'none';
            };

            document.getElementById('dynamicProps')?.addEventListener('change', renderManager.applyCurrentProps);
            document.getElementById('eventTypeSelect')?.addEventListener('change', renderManager.applyCurrentProps);
            document.getElementById('eventDataInput')?.addEventListener('blur', renderManager.applyCurrentProps);

            // 服务器管理相关事件
            const serverModal = document.getElementById('serverModal');
            document.getElementById('serverManageBtn').onclick = () => {
                serverModal.style.display = 'flex';
                serverApi.loadServerFileList();
                fileManager.updateLocalFileUI();
            };

            document.getElementById('closeServerModalBtn').onclick = () => {
                serverModal.style.display = 'none';
            };

            document.getElementById('refreshFileListBtn').onclick = serverApi.loadServerFileList;

            document.getElementById('loadServerFileBtn').onclick = async () => {
                const filename = document.getElementById('serverFileSelect').value;
                if (!filename) {
                    utils.showToast('请选择一个文件', true);
                    return;
                }
                await serverApi.loadFromServer(filename);
                serverModal.style.display = 'none';
            };

            document.getElementById('deleteServerFileBtn').onclick = async () => {
                const filename = document.getElementById('serverFileSelect').value;
                if (!filename) {
                    utils.showToast('请选择一个文件', true);
                    return;
                }
                await serverApi.deleteServerFile(filename);
            };

            document.getElementById('saveAsNewBtn').onclick = async () => {
                const newName = document.getElementById('newFileNameInput').value.trim();
                if (!newName) {
                    utils.showToast('请输入文件名（例如 mypage.xml）', true);
                    return;
                }
                if (!newName.endsWith('.xml')) {
                    utils.showToast('文件名必须以 .xml 结尾', true);
                    return;
                }
                const xamlContent = xamlProcessor.generateXAML(state.components);
                if (!xamlContent.trim()) {
                    utils.showToast('没有可保存的内容', true);
                    return;
                }
                await serverApi.saveToServer(newName, xamlContent);
                document.getElementById('newFileNameInput').value = '';
            };

            const fileSelect = document.getElementById('serverFileSelect');
            fileSelect.addEventListener('change', (e) => {
                currentSelectedServerFile = e.target.value;
                document.getElementById('overwriteCurrentBtn').disabled = !currentSelectedServerFile;
            });

            document.getElementById('overwriteCurrentBtn').onclick = async () => {
                if (!currentSelectedServerFile) {
                    utils.showToast('没有选中的文件', true);
                    return;
                }
                const xamlContent = xamlProcessor.generateXAML(state.components);
                if (!xamlContent.trim()) {
                    utils.showToast('没有可保存的内容', true);
                    return;
                }
                await serverApi.saveToServer(currentSelectedServerFile, xamlContent);
            };

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.getAttribute('data-tab');
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                    document.getElementById(targetTab).classList.add('active');
                    if (targetTab === 'local-tab') fileManager.updateLocalFileUI();
                });
            });

            document.getElementById('openLocalFilePickerBtn').onclick = fileManager.openLocalFileWithPicker;
            document.getElementById('saveToLocalFileBtn').onclick = fileManager.saveToLinkedFile;
            document.getElementById('saveAsLocalFileBtn').onclick = fileManager.saveAsLocalFile;
            document.getElementById('openLocalFileBtn').onclick = () => {
                fileManager.openLocalFileWithPicker();
            };
        }
    };

    function init() {
        uiManager.buildComponentLibrary();
        dragDropManager.initGlobalFileDragAndDrop();
        uiManager.bindUIEvents();
        renderManager.renderCanvas();
        fileManager.updateLocalFileUI();
    }

    init();
})();