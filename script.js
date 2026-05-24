// ======================== 全局配置：选择类属性的选项映射 ========================
const PROP_SELECT_OPTIONS = {
    HorizontalAlignment: ['Stretch', 'Left', 'Center', 'Right', 'Top', 'Bottom'],
    VerticalAlignment: ['Stretch', 'Top', 'Center', 'Bottom'],
    TextWrapping: ['Wrap', 'NoWrap', 'WrapWithOverflow'],
    Theme: ['Blue', 'Yellow', 'Red'],
    ColorType: ['Highlight', 'Primary', 'Secondary', 'Success', 'Danger'],
    Type: ['Clickable', 'Toggle', 'Radio'],
    Orientation: ['Horizontal', 'Vertical'],
    CanSwap: ['True', 'False'],
    IsSwapped: ['True', 'False'],
    EnableCache: ['True', 'False'],
    UseAnimation: ['True', 'False'],
    SwapLogoRight: ['True', 'False'],
    HasMouseAnimation: ['True', 'False'],
    IsHitTestVisible: ['True', 'False']
};

// ======================== Margin 解析与格式化 ========================
function parseMargin(marginStr) {
    const defaults = [0, 0, 0, 0];
    if (!marginStr || marginStr.trim() === '') return defaults;
    const parts = marginStr.split(',').map(p => {
        const num = parseFloat(p.trim());
        return isNaN(num) ? 0 : num;
    });
    if (parts.length === 1) {
        const v = parts[0];
        return [v, v, v, v];
    } else if (parts.length === 2) {
        return [parts[0], parts[1], parts[0], parts[1]];
    } else if (parts.length === 3) {
        return [parts[0], parts[1], parts[2], parts[1]];
    } else if (parts.length >= 4) {
        return [parts[0], parts[1], parts[2], parts[3]];
    }
    return defaults;
}

function formatMargin(left, top, right, bottom) {
    left = isNaN(left) ? 0 : left;
    top = isNaN(top) ? 0 : top;
    right = isNaN(right) ? 0 : right;
    bottom = isNaN(bottom) ? 0 : bottom;
    if (left === top && top === right && right === bottom) {
        return left.toString();
    }
    if (left === right && top === bottom) {
        return `${left},${top}`;
    }
    return `${left},${top},${right},${bottom}`;
}

// modules/ComponentTypes.js
const ComponentTypes = {
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
            VerticalAlignment: "Stretch",
            UseAnimation: "True",
            SwapLogoRight: "False",
            HasMouseAnimation: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
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
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    grid: {
        name: "网格布局 (Grid)",
        icon: "fas fa-th",
        canNest: true,
        defaults: {
            ColumnsDefinition: "[]",
            RowsDefinition: "[]",
            Margin: "0",
            ToolTip: "",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    }
};

// modules/Utils.js
class Utils {
    static showToast(msg, isErr = false) {
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
    }

    static escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    static escapeXml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    static escapeHtmlAttr(str) {
        if (!str) return '';
        return str.replace(/[&<>"]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return m;
        }).replace(/'/g, '&apos;');
    }

    static isSafeUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase().trim();
        if (lowerUrl.startsWith('javascript:')) return false;
        if (lowerUrl.startsWith('data:') && !lowerUrl.startsWith('data:image/')) return false;
        return true;
    }
}

// modules/ComponentFinder.js
class ComponentFinder {
    static findComponentById(id, list = App.state.components) {
        for (let comp of list) {
            if (comp.id === id) return comp;
            if (comp.children && comp.children.length) {
                let found = ComponentFinder.findComponentById(id, comp.children);
                if (found) return found;
            }
        }
        return null;
    }
}

// ======================== #8 历史管理器 ========================
class HistoryManager {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.ignoreNext = false;
    }

    getSnapshot() {
        return JSON.parse(JSON.stringify(App.state.components));
    }

    pushState() {
        if (this.ignoreNext) {
            this.ignoreNext = false;
            return;
        }
        const snapshot = this.getSnapshot();
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxSize) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const current = this.getSnapshot();
        this.redoStack.push(current);
        const previous = this.undoStack.pop();
        this.ignoreNext = true;
        App.state.components = previous;
        App.state.selectedId = null;
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        const next = this.redoStack.pop();
        this.undoStack.push(this.getSnapshot());
        this.ignoreNext = true;
        App.state.components = next;
        App.state.selectedId = null;
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    reset() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

// modules/ComponentManager.js
class ComponentManager {
    static getMaxGlobalId() {
        let max = 0;
        const traverse = (list) => {
            for (let c of list) {
                if (c.id > max) max = c.id;
                if (c.children) traverse(c.children);
            }
        };
        traverse(App.state.components);
        return max;
    }

    static getNextId() {
        return this.getMaxGlobalId() + 1;
    }

    static createComponent(type, parentId = null, customId = null) {
        const def = ComponentTypes[type];
        if (!def) return null;
        const id = (customId !== null) ? customId : this.getNextId();
        return {
            id, type, name: def.name, parentId, children: [],
            props: JSON.parse(JSON.stringify(def.defaults)),
            events: { type: "", data: "" },
            customProps: {}
        };
    }

    static addComponent(comp, targetParentId = null, insertIndex = null) {
        App.recordSnapshot();  // #8 记录快照
        if (targetParentId === null) {
            if (insertIndex !== null && insertIndex >= 0 && insertIndex <= App.state.components.length) {
                App.state.components.splice(insertIndex, 0, comp);
            } else {
                App.state.components.push(comp);
            }
            App.renderManager.appendComponentToParent(comp, null, insertIndex);
            App.markDirty();
            return true;
        }
        const parent = ComponentFinder.findComponentById(targetParentId);
        if (parent && ComponentTypes[parent.type]?.canNest) {
            if (insertIndex !== null && insertIndex >= 0 && insertIndex <= parent.children.length) {
                parent.children.splice(insertIndex, 0, comp);
            } else {
                parent.children.push(comp);
            }
            comp.parentId = targetParentId;
            App.renderManager.appendComponentToParent(comp, targetParentId, insertIndex);
            App.markDirty();
            return true;
        }
        return false;
    }

    static removeComponentById(id) {
        App.recordSnapshot();  // #8 记录快照
        let removedComp = null;
        let parentOfRemoved = null;

        const removeFromList = (list, parentComp = null) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    removedComp = list[i];
                    parentOfRemoved = parentComp;
                    const el = document.querySelector(`.component-item-wrapper[data-id="${id}"]`);
                    if (el) el.remove();
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].children && removeFromList(list[i].children, list[i])) return true;
            }
            return false;
        };

        if (removeFromList(App.state.components)) {
            if (App.state.selectedId === id) {
                if (parentOfRemoved) {
                    App.state.selectedId = parentOfRemoved.id;
                } else {
                    App.state.selectedId = null;
                }
            }
            App.markDirty();
            App.renderManager.updatePropsPanel();
            App.renderManager.updateHierarchyBar();
            if (App.state.selectedId) {
                document.querySelectorAll('.component-item-wrapper').forEach(el => el.classList.remove('selected'));
                const newSelectedEl = document.querySelector(`[data-id="${App.state.selectedId}"]`);
                if (newSelectedEl) newSelectedEl.classList.add('selected');
            }
            return true;
        }
        return false;
    }

    static deepCloneComponent(comp, newParentId = null) {
        let baseId = this.getMaxGlobalId();
        const cloneComponent = (c, parentId) => {
            baseId++;
            const clone = {
                ...c,
                id: baseId,
                parentId: parentId,
                children: [],
                props: { ...c.props },
                events: { ...c.events },
                customProps: { ...(c.customProps || {}) }
            };
            for (let child of c.children) {
                const childClone = cloneComponent(child, clone.id);
                clone.children.push(childClone);
            }
            return clone;
        };
        return cloneComponent(comp, newParentId);
    }

    static duplicateComponent(comp) {
        if (!comp) return false;
        App.recordSnapshot();  // #8 记录快照
        const parentId = comp.parentId;
        let parentList = null;
        let originalIndex = -1;

        if (parentId === null) {
            parentList = App.state.components;
            originalIndex = parentList.findIndex(c => c.id === comp.id);
        } else {
            const parent = ComponentFinder.findComponentById(parentId);
            if (parent) {
                parentList = parent.children;
                originalIndex = parentList.findIndex(c => c.id === comp.id);
            }
        }

        if (originalIndex === -1 || !parentList) return false;

        const clone = ComponentManager.deepCloneComponent(comp, parentId);
        parentList.splice(originalIndex + 1, 0, clone);

        App.renderManager.appendComponentToParent(clone, parentId, originalIndex + 1);
        App.renderManager.selectComponent(clone.id);
        Utils.showToast(`已复制组件: ${clone.name}`);
        App.markDirty();
        return true;
    }

    static moveComponentTo(compId, newParentId, newIndex) {
        const comp = ComponentFinder.findComponentById(compId);
        if (!comp) return false;
        App.recordSnapshot();  // #8 记录快照
        const oldParentId = comp.parentId;
        // 禁止将父组件移动到自己的子组件中
        if (newParentId !== null) {
            let ancestor = ComponentFinder.findComponentById(newParentId);
            while (ancestor) {
                if (ancestor.id === compId) return false;
                ancestor = ComponentFinder.findComponentById(ancestor.parentId);
            }
        }

        // 1. 从旧数据中移除
        if (oldParentId === null) {
            const idx = App.state.components.findIndex(c => c.id === compId);
            if (idx !== -1) App.state.components.splice(idx, 1);
        } else {
            const oldParent = ComponentFinder.findComponentById(oldParentId);
            if (oldParent) {
                const idx = oldParent.children.findIndex(c => c.id === compId);
                if (idx !== -1) oldParent.children.splice(idx, 1);
            }
        }

        // 2. 更新 parentId
        comp.parentId = newParentId;

        // 3. 插入新数据
        if (newParentId === null) {
            if (newIndex === undefined || newIndex >= App.state.components.length) {
                App.state.components.push(comp);
            } else {
                App.state.components.splice(newIndex, 0, comp);
            }
        } else {
            const newParent = ComponentFinder.findComponentById(newParentId);
            if (!newParent || !ComponentTypes[newParent.type]?.canNest) return false;
            if (newIndex === undefined || newIndex >= newParent.children.length) {
                newParent.children.push(comp);
            } else {
                newParent.children.splice(newIndex, 0, comp);
            }
        }

        // 4. 刷新画布
        App.renderManager.renderCanvas();
        App.renderManager.selectComponent(compId);
        App.markDirty();
        Utils.showToast(`已移动组件: ${comp.name}`);
        return true;
    }
}

// modules/RenderManager.js
class RenderManager {
    renderComponentDOM(comp, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'component-item-wrapper';
        wrapper.setAttribute('data-id', comp.id);
        wrapper.setAttribute('data-type', comp.type);
        wrapper.setAttribute('draggable', 'true');
        if (comp.props.ToolTip) {
            wrapper.setAttribute('title', comp.props.ToolTip);
        }

        if (comp.type === 'card') {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-component';
            const headerDiv = document.createElement('div');
            headerDiv.className = 'card-header';
            const titleSpan = document.createElement('span');
            titleSpan.textContent = comp.props.Title || '卡片';
            const iconSpan = document.createElement('div');
            iconSpan.innerHTML = '<i class="fas fa-arrows-alt"></i>';
            headerDiv.appendChild(titleSpan);
            headerDiv.appendChild(iconSpan);
            const contentDiv = document.createElement('div');
            contentDiv.className = 'card-content';
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone';
            dropzone.setAttribute('data-parent-id', comp.id);
            dropzone.setAttribute('data-placeholder', '将组件拖入卡片');
            contentDiv.appendChild(dropzone);
            cardDiv.appendChild(headerDiv);
            cardDiv.appendChild(contentDiv);
            wrapper.appendChild(cardDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'stackpanel') {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'card-component';
            containerDiv.style.cssText = 'background:var(--bg-card); padding:8px; border:1px dashed var(--border);';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.style.color = 'var(--text-light)';
            labelDiv.innerHTML = '<i class="fas fa-layer-group"></i> 垂直布局';
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone';
            dropzone.setAttribute('data-parent-id', comp.id);
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'horizontalstack') {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'card-component';
            containerDiv.style.cssText = 'background:var(--bg-card); padding:8px; border:1px dashed var(--border);';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.innerHTML = '<i class="fas fa-arrows-alt-h"></i> 水平布局';
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone horizontal';
            dropzone.setAttribute('data-parent-id', comp.id);
            dropzone.style.display = 'flex';
            dropzone.style.gap = '8px';
            dropzone.style.flexWrap = 'wrap';
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'grid') {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'card-component grid-mock';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.innerHTML = `<i class="fas fa-th"></i> 网格布局 (${Utils.escapeHtml(comp.props.ColumnsDefinition || '未定义列')})`;
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone';
            dropzone.setAttribute('data-parent-id', comp.id);
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else {
            if (comp.type === 'text') {
                const textDiv = document.createElement('div');
                textDiv.style.margin = '4px 0';
                if (comp.props.Foreground) textDiv.style.color = comp.props.Foreground;
                textDiv.textContent = comp.props.Text || '文本';
                wrapper.appendChild(textDiv);
            }
            else if (comp.type === 'hint') {
                const hintDiv = document.createElement('div');
                const theme = (comp.props.Theme || 'blue').toLowerCase();
                hintDiv.className = `hint-${theme}`;
                hintDiv.style.padding = '8px';
                hintDiv.style.borderRadius = '8px';
                hintDiv.textContent = comp.props.Text || '';
                wrapper.appendChild(hintDiv);
            }
            else if (comp.type === 'image') {
                const img = document.createElement('img');
                img.style.maxWidth = '100%';
                if (comp.props.Height) img.style.height = comp.props.Height;
                const srcVal = comp.props.Source || '';
                if (Utils.isSafeUrl(srcVal)) {
                    img.src = srcVal;
                } else {
                    img.src = '#';
                    img.alt = '非法图片地址';
                }
                wrapper.appendChild(img);
            }
else if (comp.type === 'button') {
    const btn = document.createElement('button');
    btn.textContent = comp.props.Text || '按钮';
    let colorType = comp.props.ColorType || 'Highlight';
    // 映射到 CSS 类
    let btnClass = 'btn';
    if (colorType === 'Highlight') btnClass += ' btn-highlight';
    else if (colorType === 'Primary') btnClass += ' btn-primary';
    else if (colorType === 'Secondary') btnClass += ' btn-secondary';
    else if (colorType === 'Success') btnClass += ' btn-success';
    else if (colorType === 'Danger') btnClass += ' btn-danger';
    btn.className = btnClass;
    // 如果有自定义高度/边距，保留样式
    if (comp.props.Height) btn.style.height = comp.props.Height + 'px';
    if (comp.props.Padding) btn.style.padding = comp.props.Padding.replace(/,/g, ' ');
    wrapper.appendChild(btn);
}
else if (comp.type === 'textbutton') {
    const btn = document.createElement('button');
    btn.className = 'btn-text';
    btn.textContent = comp.props.Text || '文本按钮';
    // 保留 Margin 等属性（由外层 wrapper 负责）
    wrapper.appendChild(btn);
}
            else if (comp.type === 'listitem') {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'list-item-mock';
                const icon = document.createElement('i');
                icon.className = 'fas fa-cube';
                const contentDiv = document.createElement('div');
                const titleStrong = document.createElement('strong');
                titleStrong.textContent = comp.props.Title || '';
                const infoSpan = document.createElement('div');
                infoSpan.style.fontSize = '12px';
                infoSpan.textContent = comp.props.Info || '';
                contentDiv.appendChild(titleStrong);
                contentDiv.appendChild(infoSpan);
                itemDiv.appendChild(icon);
                itemDiv.appendChild(contentDiv);
                wrapper.appendChild(itemDiv);
            }
        }

        container.appendChild(wrapper);
    }

    appendComponentToParent(comp, parentId, insertIndex = null) {
        let parentWrapper = null;
        if (parentId === null) {
            parentWrapper = document.getElementById('canvas');
            const emptyPlaceholder = parentWrapper.querySelector('.empty-placeholder');
            if (emptyPlaceholder) emptyPlaceholder.remove();
        } else {
            parentWrapper = document.querySelector(`.component-item-wrapper[data-id="${parentId}"] .nested-dropzone`);
        }
        if (!parentWrapper) {
            this.renderCanvas();
            return;
        }
        const tempContainer = document.createElement('div');
        this.renderComponentDOM(comp, tempContainer);
        const newComponentNode = tempContainer.firstChild;
        if (newComponentNode) {
            const childrenWrappers = Array.from(parentWrapper.querySelectorAll(':scope > .component-item-wrapper'));
            const refNode = childrenWrappers[insertIndex] || null;
            if (refNode) {
                parentWrapper.insertBefore(newComponentNode, refNode);
            } else {
                parentWrapper.appendChild(newComponentNode);
            }
        }
    }

    renderCanvas() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        if (App.state.components.length === 0) {
            canvas.innerHTML = '<div class="empty-placeholder"><i class="fas fa-drag-drop" style="font-size:2rem"></i><p>从左侧拖拽组件至此</p></div>';
            this.updateHierarchyBar();
            this.updatePropsPanel();
            return;
        }
        const fragment = document.createDocumentFragment();
        App.state.components.forEach(comp => this.renderComponentDOM(comp, fragment));
        canvas.appendChild(fragment);
        if (App.state.selectedId) {
            document.querySelectorAll(`[data-id="${App.state.selectedId}"]`).forEach(el => el.classList.add('selected'));
        }
        this.updateHierarchyBar();
        this.updatePropsPanel();
    }

    refreshComponent(compId) {
        const comp = ComponentFinder.findComponentById(compId);
        if (!comp) return;
        const oldWrapper = document.querySelector(`.component-item-wrapper[data-id="${compId}"]`);
        if (!oldWrapper) {
            this.renderCanvas();
            return;
        }
        const parent = oldWrapper.parentNode;
        if (!parent) return;
        const tempContainer = document.createElement('div');
        this.renderComponentDOM(comp, tempContainer);
        const newWrapper = tempContainer.firstChild;
        if (newWrapper) {
            parent.replaceChild(newWrapper, oldWrapper);
            if (App.state.selectedId === compId) {
                newWrapper.classList.add('selected');
                this.updatePropsPanel();
            }
        } else {
            this.renderCanvas();
        }
    }

    selectComponent(id) {
        App.state.selectedId = id;
        document.querySelectorAll('.component-item-wrapper').forEach(el => el.classList.remove('selected'));
        const selEl = document.querySelector(`[data-id="${id}"]`);
        if (selEl) selEl.classList.add('selected');
        this.updatePropsPanel();
        this.updateHierarchyBar();
    }

    updatePropsPanel() {
        const comp = ComponentFinder.findComponentById(App.state.selectedId);
        document.getElementById('compTypeName').innerText = comp ? (ComponentTypes[comp.type]?.name || comp.type) : '未选中';
        document.getElementById('compIdDisplay').innerText = comp ? comp.id : '-';
        if (!comp) {
            document.getElementById('dynamicProps').innerHTML = '';
            document.getElementById('eventTypeSelect').value = '';
            document.getElementById('eventDataInput').value = '';
            return;
        }

        const container = document.getElementById('dynamicProps');
        container.innerHTML = '<div class="props-loading">加载属性中...</div>';

        const currentSelectedId = App.state.selectedId;

        requestIdleCallback(() => {
            const currentComp = ComponentFinder.findComponentById(App.state.selectedId);
            if (!currentComp || currentComp.id !== currentSelectedId) return;

            const groups = this.getPropGroups(currentComp);
            const fragment = document.createDocumentFragment();
            for (let group of groups) {
                fragment.appendChild(this.buildPropSection(group, currentComp));
            }
            document.getElementById('eventTypeSelect').value = currentComp.events?.type || '';
            document.getElementById('eventDataInput').value = currentComp.events?.data || '';
            container.innerHTML = '';
            container.appendChild(fragment);
        }, { timeout: 50 });
    }

    buildPropSection(group, comp) {
        const section = document.createElement('div');
        section.className = 'prop-section';
        section.innerHTML = `<div class="prop-section-title"><i class="${group.icon}"></i> ${Utils.escapeHtml(group.title)}</div>`;

        // 处理自定义属性分组（可删除行）
        if (group.title === "自定义属性") {
            group.fields.forEach(field => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'prop-field custom-property-row';
                fieldDiv.innerHTML = `
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input data-custom-key="${Utils.escapeHtmlAttr(field.key)}" value="${Utils.escapeHtmlAttr(field.key)}" placeholder="属性名" style="flex:1;">
                        <input data-custom-val="${Utils.escapeHtmlAttr(field.key)}" value="${Utils.escapeHtmlAttr(field.val)}" placeholder="属性值" style="flex:2;">
                        <button class="delete-custom-prop" data-key="${Utils.escapeHtmlAttr(field.key)}" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                section.appendChild(fieldDiv);
            });
            return section;
        }

        // 处理添加自定义属性的特殊分组
        if (group.title === "添加自定义属性") {
            const addDiv = document.createElement('div');
            addDiv.className = 'prop-field';
            addDiv.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="newCustomKey" placeholder="新属性名" style="flex:1;">
                    <input type="text" id="newCustomVal" placeholder="属性值" style="flex:2;">
                    <button id="addCustomPropBtn" class="btn" style="padding:6px 12px;">添加</button>
                </div>
            `;
            section.appendChild(addDiv);
            return section;
        }

        // 常规属性字段
        for (let field of group.fields) {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'prop-field';
            if (field.key === 'Margin') {
                const marginValues = parseMargin(field.val);
                const [left, top, right, bottom] = marginValues;
                fieldDiv.innerHTML = `
                    <label>Margin (左,上,右,下)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div><label style="font-size:0.65rem;">左</label>
                        <input type="number" class="margin-part" data-margin="left" value="${Utils.escapeHtmlAttr(String(left))}" step="any" style="width:100%;"></div>
                        <div><label style="font-size:0.65rem;">上</label>
                        <input type="number" class="margin-part" data-margin="top" value="${Utils.escapeHtmlAttr(String(top))}" step="any" style="width:100%;"></div>
                        <div><label style="font-size:0.65rem;">右</label>
                        <input type="number" class="margin-part" data-margin="right" value="${Utils.escapeHtmlAttr(String(right))}" step="any" style="width:100%;"></div>
                        <div><label style="font-size:0.65rem;">下</label>
                        <input type="number" class="margin-part" data-margin="bottom" value="${Utils.escapeHtmlAttr(String(bottom))}" step="any" style="width:100%;"></div>
                    </div>
                `;
                section.appendChild(fieldDiv);
                continue;
            }
            const selectOptions = PROP_SELECT_OPTIONS[field.key];
            if (selectOptions) {
                const selectHtml = `
                    <label>${Utils.escapeHtml(field.key)}</label>
                    <select data-prop="${Utils.escapeHtmlAttr(field.key)}" class="prop-select">
                        ${selectOptions.map(opt => `<option value="${Utils.escapeHtmlAttr(opt)}" ${opt === field.val ? 'selected' : ''}>${Utils.escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
                fieldDiv.innerHTML = selectHtml;
            } else {
                const isLong = (field.key === 'Text' || field.key === 'Info' || field.key === 'ColumnsDefinition' || field.key === 'RowsDefinition');
                const inputHtml = isLong ?
                    `<textarea data-prop="${Utils.escapeHtmlAttr(field.key)}" rows="2" style="width:100%;">${Utils.escapeHtml(String(field.val))}</textarea>` :
                    `<input data-prop="${Utils.escapeHtmlAttr(field.key)}" value="${Utils.escapeHtmlAttr(String(field.val))}" style="width:100%;" />`;
                fieldDiv.innerHTML = `<label>${Utils.escapeHtml(field.key)}</label>${inputHtml}`;
            }
            section.appendChild(fieldDiv);
        }

        // 如果是 Grid 组件，添加可视化编辑按钮
        if (comp.type === 'grid') {
            const btnDiv = document.createElement('div');
            btnDiv.className = 'prop-field';
            btnDiv.innerHTML = `<button id="editGridLayoutBtn" class="btn btn-primary" style="width:100%"><i class="fas fa-th"></i> 可视化编辑网格布局</button>`;
            section.appendChild(btnDiv);
            setTimeout(() => {
                const btn = document.getElementById('editGridLayoutBtn');
                if (btn) btn.onclick = () => this.openGridEditor(comp);
            }, 0);
        }

        return section;
    }

    // #9 网格布局可视化编辑器
    openGridEditor(gridComp) {
        let cols = [];
        let rows = [];
        try { cols = JSON.parse(gridComp.props.ColumnsDefinition || "[]"); } catch(e) { cols = []; }
        try { rows = JSON.parse(gridComp.props.RowsDefinition || "[]"); } catch(e) { rows = []; }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <h3><i class="fas fa-th"></i> 编辑网格布局</h3>
                <div style="display: flex; gap: 24px; margin: 20px 0;">
                    <div style="flex:1">
                        <h4>列定义 <button id="addColBtn" class="btn btn-sm">+ 添加列</button></h4>
                        <div id="columnsEditor"></div>
                    </div>
                    <div style="flex:1">
                        <h4>行定义 <button id="addRowBtn" class="btn btn-sm">+ 添加行</button></h4>
                        <div id="rowsEditor"></div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="gridEditorSave" class="btn btn-primary">保存</button>
                    <button id="gridEditorCancel" class="btn">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const renderList = (containerId, list, type) => {
            const container = modal.querySelector(`#${containerId}`);
            container.innerHTML = '';
            list.forEach((item, idx) => {
                let unit = 'px';
                let val = 100;
                if (type === 'col') {
                    const w = item.width;
                    if (w === 'Auto') unit = 'auto';
                    else if (w && w.endsWith('*')) { unit = 'star'; val = parseFloat(w); if (isNaN(val)) val = 1; }
                    else { unit = 'px'; val = parseFloat(w); if (isNaN(val)) val = 100; }
                } else {
                    const h = item.height;
                    if (h === 'Auto') unit = 'auto';
                    else if (h && h.endsWith('*')) { unit = 'star'; val = parseFloat(h); if (isNaN(val)) val = 1; }
                    else { unit = 'px'; val = parseFloat(h); if (isNaN(val)) val = 100; }
                }
                const minVal = type === 'col' ? (item.minWidth || '') : (item.minHeight || '');
                const maxVal = type === 'col' ? (item.maxWidth || '') : (item.maxHeight || '');
                const div = document.createElement('div');
                div.className = 'grid-def-item';
                div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
                div.innerHTML = `
                    <select class="grid-unit" data-type="${type}" data-index="${idx}">
                        <option value="px" ${unit==='px'?'selected':''}>像素(px)</option>
                        <option value="star" ${unit==='star'?'selected':''}>星(*)</option>
                        <option value="auto" ${unit==='auto'?'selected':''}>自动</option>
                    </select>
                    <input class="grid-value" data-type="${type}" data-index="${idx}" value="${val}" ${unit==='auto'?'disabled':''} style="width:80px;">
                    <input class="grid-min" placeholder="Min" data-type="${type}" data-index="${idx}" value="${Utils.escapeHtmlAttr(minVal)}" style="width:70px;">
                    <input class="grid-max" placeholder="Max" data-type="${type}" data-index="${idx}" value="${Utils.escapeHtmlAttr(maxVal)}" style="width:70px;">
                    <button class="grid-del" data-type="${type}" data-index="${idx}" style="background:none; border:none; color:red;"><i class="fas fa-trash"></i></button>
                `;
                container.appendChild(div);
            });
        };

        renderList('columnsEditor', cols, 'col');
        renderList('rowsEditor', rows, 'row');

        modal.querySelector('#addColBtn').onclick = () => {
            cols.push({ width: '1*' });
            renderList('columnsEditor', cols, 'col');
        };
        modal.querySelector('#addRowBtn').onclick = () => {
            rows.push({ height: '1*' });
            renderList('rowsEditor', rows, 'row');
        };

        const updateDefinition = () => {
            // 从 DOM 中读取最新值并更新 cols/rows 数组
            const colItems = modal.querySelectorAll('#columnsEditor .grid-def-item');
            cols = [];
            colItems.forEach((item, idx) => {
                const unitSelect = item.querySelector('.grid-unit');
                const unit = unitSelect.value;
                const valInput = item.querySelector('.grid-value');
                const minInput = item.querySelector('.grid-min');
                const maxInput = item.querySelector('.grid-max');
                let width = '';
                if (unit === 'auto') width = 'Auto';
                else if (unit === 'star') width = (valInput.value ? parseFloat(valInput.value) : 1) + '*';
                else width = (valInput.value ? parseFloat(valInput.value) : 100) + '';
                const colDef = { width };
                if (minInput.value.trim()) colDef.minWidth = minInput.value.trim();
                if (maxInput.value.trim()) colDef.maxWidth = maxInput.value.trim();
                cols.push(colDef);
            });
            const rowItems = modal.querySelectorAll('#rowsEditor .grid-def-item');
            rows = [];
            rowItems.forEach((item, idx) => {
                const unitSelect = item.querySelector('.grid-unit');
                const unit = unitSelect.value;
                const valInput = item.querySelector('.grid-value');
                const minInput = item.querySelector('.grid-min');
                const maxInput = item.querySelector('.grid-max');
                let height = '';
                if (unit === 'auto') height = 'Auto';
                else if (unit === 'star') height = (valInput.value ? parseFloat(valInput.value) : 1) + '*';
                else height = (valInput.value ? parseFloat(valInput.value) : 100) + '';
                const rowDef = { height };
                if (minInput.value.trim()) rowDef.minHeight = minInput.value.trim();
                if (maxInput.value.trim()) rowDef.maxHeight = maxInput.value.trim();
                rows.push(rowDef);
            });
        };

        modal.addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('grid-unit') || target.classList.contains('grid-value') ||
                target.classList.contains('grid-min') || target.classList.contains('grid-max')) {
                updateDefinition();
                // 实时刷新显示（可选，可不做）
            }
        });
        modal.addEventListener('click', (e) => {
            if (e.target.closest('.grid-del')) {
                const btn = e.target.closest('.grid-del');
                const type = btn.getAttribute('data-type');
                const idx = parseInt(btn.getAttribute('data-index'));
                if (type === 'col') cols.splice(idx, 1);
                else rows.splice(idx, 1);
                renderList(`${type}sEditor`, type==='col'?cols:rows, type);
                updateDefinition();
            }
        });

        modal.querySelector('#gridEditorSave').onclick = () => {
            updateDefinition();
            gridComp.props.ColumnsDefinition = JSON.stringify(cols);
            gridComp.props.RowsDefinition = JSON.stringify(rows);
            App.renderManager.refreshComponent(gridComp.id);
            App.markDirty();
            modal.remove();
        };
        modal.querySelector('#gridEditorCancel').onclick = () => modal.remove();
    }

    getPropGroups(comp) {
        if (!comp) return [];
        const groups = {
            content: { title: "内容", icon: "fas fa-align-left", fields: [] },
            appearance: { title: "外观样式", icon: "fas fa-palette", fields: [] },
            layout: { title: "布局与边距", icon: "fas fa-expand-alt", fields: [] },
            gridLayout: { title: "Grid 布局附加属性", icon: "fas fa-th", fields: [] },
            behavior: { title: "行为", icon: "fas fa-cog", fields: [] },
            other: { title: "其他", icon: "fas fa-ellipsis-h", fields: [] }
        };

        const specificContentKeys = ["Text", "Title", "Info", "Source", "Logo"];
        const appearanceKeys = ["Foreground", "FontSize", "TextWrapping", "Theme", "ColorType", "LogoScale", "Type"];
        const layoutKeys = ["Margin", "Padding", "Width", "Height", "HorizontalAlignment", "VerticalAlignment", "ColumnsDefinition", "RowsDefinition", "Orientation"];
        const gridAttachKeys = ["Grid.Row", "Grid.Column", "Grid.RowSpan", "Grid.ColumnSpan"];
        const behaviorKeys = ["CanSwap", "IsSwapped", "ToolTip", "EnableCache", "UseAnimation", "SwapLogoRight", "HasMouseAnimation", "IsHitTestVisible"];

        for (let [key, val] of Object.entries(comp.props)) {
            if (specificContentKeys.includes(key)) groups.content.fields.push({ key, val });
            else if (appearanceKeys.includes(key)) groups.appearance.fields.push({ key, val });
            else if (layoutKeys.includes(key)) groups.layout.fields.push({ key, val });
            else if (gridAttachKeys.includes(key)) groups.gridLayout.fields.push({ key, val });
            else if (behaviorKeys.includes(key)) groups.behavior.fields.push({ key, val });
            else groups.other.fields.push({ key, val });
        }

        let groupsArray = Object.values(groups).filter(g => g.fields.length > 0);

        // 通用分组
        const commonFields = [];
        if (comp.props.ToolTip !== undefined) commonFields.push({ key: "ToolTip", val: comp.props.ToolTip });
        if (comp.props.IsHitTestVisible !== undefined) commonFields.push({ key: "IsHitTestVisible", val: comp.props.IsHitTestVisible });
        if (commonFields.length) groupsArray.unshift({ title: "通用", icon: "fas fa-cogs", fields: commonFields });

        // 自定义属性分组
        const customFields = Object.entries(comp.customProps || {}).map(([key, val]) => ({ key, val }));
        if (customFields.length) {
            groupsArray.push({ title: "自定义属性", icon: "fas fa-tags", fields: customFields });
        }
        groupsArray.push({ title: "添加自定义属性", icon: "fas fa-plus-circle", fields: [{ key: "_add_custom", val: "" }] });

        return groupsArray;
    }

    applyCurrentProps() {
        const comp = ComponentFinder.findComponentById(App.state.selectedId);
        if (!comp) return;
        App.recordSnapshot();  // #8 记录快照

        document.querySelectorAll('#dynamicProps input[data-prop], #dynamicProps textarea[data-prop], #dynamicProps select[data-prop]').forEach(inp => {
            const key = inp.getAttribute('data-prop');
            if (key) {
                let value = inp.value;
                if (typeof comp.props[key] === 'number' && !isNaN(parseFloat(value))) {
                    value = parseFloat(value).toString();
                }
                comp.props[key] = value;
            }
        });

        // Margin 处理
        const marginLeft = document.querySelector('#dynamicProps .margin-part[data-margin="left"]');
        const marginTop = document.querySelector('#dynamicProps .margin-part[data-margin="top"]');
        const marginRight = document.querySelector('#dynamicProps .margin-part[data-margin="right"]');
        const marginBottom = document.querySelector('#dynamicProps .margin-part[data-margin="bottom"]');
        if (marginLeft && marginTop && marginRight && marginBottom) {
            let left = parseFloat(marginLeft.value);
            let top = parseFloat(marginTop.value);
            let right = parseFloat(marginRight.value);
            let bottom = parseFloat(marginBottom.value);
            if (isNaN(left)) left = 0;
            if (isNaN(top)) top = 0;
            if (isNaN(right)) right = 0;
            if (isNaN(bottom)) bottom = 0;
            comp.props.Margin = formatMargin(left, top, right, bottom);
        }

        // 事件绑定
        comp.events = {
            type: document.getElementById('eventTypeSelect').value,
            data: document.getElementById('eventDataInput').value
        };

        // 处理自定义属性：重建 customProps
        const newCustomProps = {};
        document.querySelectorAll('.custom-property-row').forEach(row => {
            const keyInput = row.querySelector('input[data-custom-key]');
            const valInput = row.querySelector('input[data-custom-val]');
            if (keyInput && valInput && keyInput.value.trim() !== '') {
                newCustomProps[keyInput.value.trim()] = valInput.value;
            }
        });
        comp.customProps = newCustomProps;

        // 处理新增自定义属性
        const newKey = document.getElementById('newCustomKey')?.value.trim();
        const newVal = document.getElementById('newCustomVal')?.value.trim();
        if (newKey) {
            comp.customProps[newKey] = newVal;
            const keyInput = document.getElementById('newCustomKey');
            const valInput = document.getElementById('newCustomVal');
            if (keyInput) keyInput.value = '';
            if (valInput) valInput.value = '';
        }

        // 绑定删除按钮事件（动态）
        document.querySelectorAll('.delete-custom-prop').forEach(btn => {
            btn.onclick = (e) => {
                const key = btn.getAttribute('data-key');
                if (key && comp.customProps[key] !== undefined) {
                    delete comp.customProps[key];
                    this.updatePropsPanel();
                    App.markDirty();
                }
            };
        });

        this.refreshComponent(comp.id);
        Utils.showToast('属性已更新');
        App.markDirty();
    }

    updateHierarchyBar() {
        const bar = document.getElementById('hierarchyBar');
        if (!App.state.selectedId) {
            bar.innerHTML = '<span>未选中组件</span>';
            return;
        }

        let path = [];
        let cur = ComponentFinder.findComponentById(App.state.selectedId);
        while (cur) {
            path.unshift(cur);
            cur = ComponentFinder.findComponentById(cur.parentId);
        }

        bar.innerHTML = path.map(c => `<span class="hierarchy-item" data-id="${c.id}">${Utils.escapeHtml(c.name)}</span>`).join(' <i class="fas fa-chevron-right"></i> ');
        document.querySelectorAll('.hierarchy-item').forEach(el => el.addEventListener('click', (e) => {
            this.selectComponent(parseInt(el.getAttribute('data-id')));
        }));
    }
}

// modules/XamlProcessor.js
class XamlProcessor {
    static getLocalTagName(node) {
        const tag = node.tagName;
        if (!tag) return '';
        const colonIndex = tag.indexOf(':');
        return colonIndex !== -1 ? tag.substring(colonIndex + 1).toLowerCase() : tag.toLowerCase();
    }

    importFromXAML(xmlStr) {
        App.recordSnapshot();  // #8 记录快照
        const unknownTags = new Set();
        try {
            if (xmlStr.charCodeAt(0) === 0xFEFF) xmlStr = xmlStr.slice(1);
            const wrappedXml = `<root xmlns:local="http://tempuri.org/pcl">${xmlStr}</root>`;
            const parser = new DOMParser();
            const xml = parser.parseFromString(wrappedXml, 'text/xml');
            const parseError = xml.querySelector('parsererror');
            if (parseError) {
                let errMsg = parseError.textContent || 'XML 格式错误';
                let line = null, column = null;
                const lineAttr = parseError.getAttribute('line') || parseError.getAttribute('lineNumber');
                const colAttr = parseError.getAttribute('column') || parseError.getAttribute('columnNumber');
                if (lineAttr) line = parseInt(lineAttr);
                if (colAttr) column = parseInt(colAttr);
                if (!line) {
                    const lineMatch = errMsg.match(/line:?\s*(\d+)/i) || errMsg.match(/行\s*(\d+)/);
                    if (lineMatch) line = parseInt(lineMatch[1]);
                }
                if (!column) {
                    const colMatch = errMsg.match(/column:?\s*(\d+)/i) || errMsg.match(/列\s*(\d+)/);
                    if (colMatch) column = parseInt(colMatch[1]);
                }
                let location = '';
                if (line) location += `第 ${line} 行`;
                if (column) location += `第 ${column} 列`;
                throw new Error(`XAML 解析失败: ${errMsg.substring(0, 200)}${location ? ` (${location})` : ''}`);
            }

            let nextId = 1;
            const getNextLocalId = () => nextId++;

            const parseNode = (node, parentId = null) => {
                const tagName = XamlProcessor.getLocalTagName(node);
                if (!tagName) return null;

                let type = null;
                if (tagName === 'mycard') type = 'card';
                else if (tagName === 'textblock') type = 'text';
                else if (tagName === 'myhint') type = 'hint';
                else if (tagName === 'myimage') type = 'image';
                else if (tagName === 'mybutton') type = 'button';
                else if (tagName === 'mytextbutton') type = 'textbutton';
                else if (tagName === 'mylistitem') type = 'listitem';
                else if (tagName === 'stackpanel') {
                    const orientation = node.getAttribute('Orientation') || node.getAttribute('orientation');
                    type = orientation && orientation.toLowerCase() === 'horizontal' ? 'horizontalstack' : 'stackpanel';
                }
                else if (tagName === 'grid') type = 'grid';

                if (!type || !ComponentTypes[type]) {
                    unknownTags.add(tagName);
                    return null;
                }

                const comp = ComponentManager.createComponent(type, parentId, getNextLocalId());
                const commonProps = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible'];
                commonProps.forEach(prop => {
                    const val = node.getAttribute(prop);
                    if (val !== null) comp.props[prop] = val;
                });

                const gridRow = node.getAttribute('Grid.Row');
                if (gridRow !== null) comp.props['Grid.Row'] = gridRow;
                const gridColumn = node.getAttribute('Grid.Column');
                if (gridColumn !== null) comp.props['Grid.Column'] = gridColumn;
                const gridRowSpan = node.getAttribute('Grid.RowSpan');
                if (gridRowSpan !== null) comp.props['Grid.RowSpan'] = gridRowSpan;
                const gridColumnSpan = node.getAttribute('Grid.ColumnSpan');
                if (gridColumnSpan !== null) comp.props['Grid.ColumnSpan'] = gridColumnSpan;

                const knownProps = new Set([
                    ...commonProps,
                    'Title', 'Text', 'Source', 'Height', 'ColorType', 'Padding', 'FontSize', 'TextWrapping', 'Foreground',
                    'Theme', 'Logo', 'Type', 'Info', 'ColumnsDefinition', 'RowsDefinition', 'Orientation',
                    'CanSwap', 'IsSwapped', 'UseAnimation', 'SwapLogoRight', 'HasMouseAnimation',
                    'Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan', 'EventType', 'EventData'
                ]);
                for (let attr of node.attributes) {
                    const name = attr.name;
                    const value = attr.value;
                    if (!knownProps.has(name)) {
                        comp.customProps[name] = value;
                    }
                }

                if (type === 'card') {
                    comp.props.Title = node.getAttribute('Title') || '卡片';
                    comp.props.CanSwap = node.getAttribute('CanSwap') ?? 'True';
                    comp.props.IsSwapped = node.getAttribute('IsSwapped') ?? 'True';
                    comp.props.UseAnimation = node.getAttribute('UseAnimation') ?? 'True';
                    comp.props.SwapLogoRight = node.getAttribute('SwapLogoRight') ?? 'False';
                    comp.props.HasMouseAnimation = node.getAttribute('HasMouseAnimation') ?? 'True';
                    for (let child of node.children) {
                        const childComp = parseNode(child, comp.id);
                        if (childComp) comp.children.push(childComp);
                    }
                }
                else if (type === 'grid') {
                    let colsDef = [], rowsDef = [];
                    for (let child of node.children) {
                        const childName = XamlProcessor.getLocalTagName(child);
                        if (childName === 'grid.columndefinitions') {
                            for (let cd of child.children) {
                                const width = cd.getAttribute('Width') || '';
                                const minWidth = cd.getAttribute('MinWidth') || '';
                                const maxWidth = cd.getAttribute('MaxWidth') || '';
                                colsDef.push({ width, minWidth, maxWidth });
                            }
                        }
                        else if (childName === 'grid.rowdefinitions') {
                            for (let rd of child.children) {
                                const height = rd.getAttribute('Height') || '';
                                const minHeight = rd.getAttribute('MinHeight') || '';
                                const maxHeight = rd.getAttribute('MaxHeight') || '';
                                rowsDef.push({ height, minHeight, maxHeight });
                            }
                        }
                        else {
                            const childComp = parseNode(child, comp.id);
                            if (childComp) comp.children.push(childComp);
                        }
                    }
                    if (colsDef.length) comp.props.ColumnsDefinition = JSON.stringify(colsDef);
                    else comp.props.ColumnsDefinition = "[]";
                    if (rowsDef.length) comp.props.RowsDefinition = JSON.stringify(rowsDef);
                    else comp.props.RowsDefinition = "[]";
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

                let evType = node.getAttribute('EventType') || node.getAttribute('eventtype');
                let evData = node.getAttribute('EventData') || node.getAttribute('eventdata');
                if (evType) comp.events = { type: evType, data: evData || '' };

                return comp;
            };

            let newComponents = [];
            for (let node of xml.documentElement.children) {
                const comp = parseNode(node);
                if (comp) newComponents.push(comp);
            }

            if (newComponents.length) {
                App.state.components = newComponents;
                App.state.selectedId = null;
                App.renderManager.renderCanvas();
                Utils.showToast(`成功导入 ${newComponents.length} 个组件`);
                if (unknownTags.size > 0) {
                    Utils.showToast(`警告：发现未知组件类型: ${Array.from(unknownTags).join(', ')}，它们已被忽略`, true);
                }
                App.resetDirty();
                App.history.reset();  // #8 重置历史
            } else {
                Utils.showToast('未找到有效组件', true);
                if (unknownTags.size > 0) {
                    Utils.showToast(`文件中仅包含未知组件: ${Array.from(unknownTags).join(', ')}`, true);
                }
            }
        } catch (e) {
            console.error(e);
            Utils.showToast('解析失败: ' + e.message, true);
        }
    }

    generateXAML(comps, indent = 0) {
        let xaml = '';
        const spaces = '  '.repeat(indent);

        for (let comp of comps) {
            const attrs = [];
            const commonAttrs = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible'];
            commonAttrs.forEach(attr => {
                if (comp.props[attr] && comp.props[attr] !== '') {
                    attrs.push(`${attr}="${Utils.escapeXml(comp.props[attr])}"`);
                }
            });

            const gridAttrs = ['Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan'];
            gridAttrs.forEach(attr => {
                if (comp.props[attr] && comp.props[attr] !== '') {
                    attrs.push(`${attr}="${Utils.escapeXml(comp.props[attr])}"`);
                }
            });

            if (comp.events?.type) {
                attrs.push(`EventType="${Utils.escapeXml(comp.events.type)}"`);
                attrs.push(`EventData="${Utils.escapeXml(comp.events.data || '')}"`);
            }

            for (const [key, val] of Object.entries(comp.customProps || {})) {
                attrs.push(`${key}="${Utils.escapeXml(val)}"`);
            }

            if (comp.type === 'card') {
                attrs.push(`Title="${Utils.escapeXml(comp.props.Title)}"`);
                attrs.push(`CanSwap="${comp.props.CanSwap || 'True'}"`);
                attrs.push(`IsSwapped="${comp.props.IsSwapped || 'True'}"`);
                if (comp.props.UseAnimation) attrs.push(`UseAnimation="${comp.props.UseAnimation}"`);
                if (comp.props.SwapLogoRight) attrs.push(`SwapLogoRight="${comp.props.SwapLogoRight}"`);
                if (comp.props.HasMouseAnimation) attrs.push(`HasMouseAnimation="${comp.props.HasMouseAnimation}"`);
                xaml += `${spaces}<local:MyCard ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</local:MyCard>\n\n`;
            }
            else if (comp.type === 'grid') {
                xaml += `${spaces}<Grid ${attrs.join(' ')}>\n`;
                let cols = [];
                let rows = [];
                try { cols = JSON.parse(comp.props.ColumnsDefinition); } catch(e) { cols = []; }
                try { rows = JSON.parse(comp.props.RowsDefinition); } catch(e) { rows = []; }
                if (cols.length) {
                    xaml += `${spaces}  <Grid.ColumnDefinitions>\n`;
                    cols.forEach(def => {
                        let colAttrs = [];
                        if (def.width) colAttrs.push(`Width="${def.width}"`);
                        if (def.minWidth) colAttrs.push(`MinWidth="${def.minWidth}"`);
                        if (def.maxWidth) colAttrs.push(`MaxWidth="${def.maxWidth}"`);
                        xaml += `${spaces}    <ColumnDefinition ${colAttrs.join(' ')}/>\n`;
                    });
                    xaml += `${spaces}  </Grid.ColumnDefinitions>\n`;
                }
                if (rows.length) {
                    xaml += `${spaces}  <Grid.RowDefinitions>\n`;
                    rows.forEach(def => {
                        let rowAttrs = [];
                        if (def.height) rowAttrs.push(`Height="${def.height}"`);
                        if (def.minHeight) rowAttrs.push(`MinHeight="${def.minHeight}"`);
                        if (def.maxHeight) rowAttrs.push(`MaxHeight="${def.maxHeight}"`);
                        xaml += `${spaces}    <RowDefinition ${rowAttrs.join(' ')}/>\n`;
                    });
                    xaml += `${spaces}  </Grid.RowDefinitions>\n`;
                }
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</Grid>\n\n`;
            }
            else if (comp.type === 'stackpanel') {
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</StackPanel>\n\n`;
            }
            else if (comp.type === 'horizontalstack') {
                attrs.push('Orientation="Horizontal"');
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</StackPanel>\n\n`;
            }
            else if (comp.type === 'text') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.FontSize) attrs.push(`FontSize="${comp.props.FontSize}"`);
                if (comp.props.TextWrapping) attrs.push(`TextWrapping="${comp.props.TextWrapping}"`);
                if (comp.props.Foreground) attrs.push(`Foreground="${comp.props.Foreground}"`);
                xaml += `${spaces}<TextBlock ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'hint') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.Theme) attrs.push(`Theme="${comp.props.Theme}"`);
                xaml += `${spaces}<local:MyHint ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'image') {
                attrs.push(`Source="${Utils.escapeXml(comp.props.Source)}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                xaml += `${spaces}<local:MyImage ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'button') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.ColorType) attrs.push(`ColorType="${comp.props.ColorType}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                if (comp.props.Padding) attrs.push(`Padding="${comp.props.Padding}"`);
                xaml += `${spaces}<local:MyButton ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'textbutton') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                xaml += `${spaces}<local:MyTextButton ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'listitem') {
                attrs.push(`Title="${Utils.escapeXml(comp.props.Title)}"`);
                attrs.push(`Info="${Utils.escapeXml(comp.props.Info)}"`);
                attrs.push(`Logo="${Utils.escapeXml(comp.props.Logo)}"`);
                attrs.push(`Type="${comp.props.Type || 'Clickable'}"`);
                xaml += `${spaces}<local:MyListItem ${attrs.join(' ')} />\n`;
            }
        }
        return xaml;
    }
}

// modules/FileManager.js
class FileManager {
    constructor() {
        this.currentFileHandle = null;
        this.currentFileName = '';
        this.currentFileBlob = null;
    }

    isFileSystemAccessSupported() {
        return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    }

    async openLocalFileWithPicker() {
        if (!this.isFileSystemAccessSupported()) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xaml,.xml';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const text = await file.text();
                if (confirm('打开文件将替换当前所有组件，是否继续？')) {
                    App.xamlProcessor.importFromXAML(text);
                    Utils.showToast(`已打开: ${file.name} (只读模式，如需保存请使用另存为)`);
                    this.currentFileHandle = null;
                    this.currentFileName = file.name;
                    this.currentFileBlob = new Blob([text], { type: 'text/plain' });
                    this.updateLocalFileUI();
                    App.resetDirty();
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
                App.xamlProcessor.importFromXAML(content);
                this.currentFileHandle = handle;
                this.currentFileName = file.name;
                this.currentFileBlob = null;
                this.updateLocalFileUI();
                Utils.showToast(`已链接本地文件: ${file.name}`);
                App.resetDirty();
            }
        } catch (err) {
            if (err.name !== 'AbortError') Utils.showToast('打开文件失败: ' + err.message, true);
        }
    }

    async saveToLinkedFile() {
        if (this.currentFileHandle && this.isFileSystemAccessSupported()) {
            const xamlContent = App.xamlProcessor.generateXAML(App.state.components);
            if (!xamlContent.trim()) {
                Utils.showToast('没有可保存的内容', true);
                return;
            }
            try {
                const writable = await this.currentFileHandle.createWritable();
                await writable.write(xamlContent);
                await writable.close();
                Utils.showToast(`已保存到 ${this.currentFileName}`);
                App.resetDirty();
                return;
            } catch (err) {
                Utils.showToast('保存失败: ' + err.message, true);
                return;
            }
        }

        if (this.currentFileName && !this.currentFileHandle) {
            const overwrite = confirm(`文件 "${this.currentFileName}" 为只读打开，是否另存为覆盖它？\n点击“确定”将选择该文件保存，点击“取消”将不保存。`);
            if (overwrite) {
                await this.saveAsLocalFile(true);
            }
            return;
        }

        Utils.showToast('没有链接的本地文件，请先“打开本地文件”或使用“另存为”', true);
    }

    async saveAsLocalFile(overwriteMode = false) {
        const xamlContent = App.xamlProcessor.generateXAML(App.state.components);
        if (!xamlContent.trim()) {
            Utils.showToast('没有可保存的内容', true);
            return;
        }

        if (this.isFileSystemAccessSupported()) {
            try {
                const suggestedName = overwriteMode && this.currentFileName ? this.currentFileName : (this.currentFileName || 'design.xaml');
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(xamlContent);
                await writable.close();
                this.currentFileHandle = handle;
                this.currentFileName = handle.name;
                this.currentFileBlob = null;
                this.updateLocalFileUI();
                Utils.showToast(`已保存到: ${handle.name}，并已链接此文件`);
                App.resetDirty();
            } catch (err) {
                if (err.name !== 'AbortError') Utils.showToast('保存失败: ' + err.message, true);
            }
        } else {
            const blob = new Blob([xamlContent], { type: 'text/plain' });
            const link = document.createElement('a');
            const downloadName = this.currentFileName || 'design.xaml';
            link.href = URL.createObjectURL(blob);
            link.download = downloadName;
            link.click();
            URL.revokeObjectURL(link.href);
            Utils.showToast(`已下载文件 ${downloadName}`);
            this.currentFileName = downloadName;
            this.currentFileHandle = null;
            this.currentFileBlob = blob;
            this.updateLocalFileUI();
            App.resetDirty();
            setTimeout(() => {
                Utils.showToast('提示：当前浏览器不支持直接读写文件，保存采用下载方式。', false);
            }, 1500);
        }
    }

    updateLocalFileUI() {
        const infoDiv = document.getElementById('linkedFileInfo');
        const saveBtn = document.getElementById('saveToLocalFileBtn');

        if (this.currentFileName) {
            const mode = this.currentFileHandle ? '可读写' : (this.currentFileBlob ? '只读(已下载)' : '仅名称');
            infoDiv.innerHTML = `<i class="fas fa-link"></i> 已链接: ${this.currentFileName} (${mode})`;
            if (saveBtn) saveBtn.disabled = false;
        } else {
            infoDiv.innerHTML = `<i class="fas fa-link"></i> 未链接任何本地文件`;
            if (saveBtn) saveBtn.disabled = true;
        }

        const warningDiv = document.getElementById('fsaCompatWarning');
        if (!this.isFileSystemAccessSupported()) {
            warningDiv.innerHTML = '<div class="unsupported-warning"><i class="fas fa-exclamation-triangle"></i> 当前浏览器不支持文件系统API，本地文件仅能读取，保存将使用下载方式。</div>';
        } else {
            warningDiv.innerHTML = '';
        }
    }
}

// modules/ServerApi.js
class ServerApi {
    constructor() {
        this.backups = [];
        this.lastSelectedBackup = null;
    }

    async getBackupList() {
        try {
            const res = await fetch('/api/backups');
            const data = await res.json();
            if (data.success) {
                this.backups = data.backups || [];
                return this.backups;
            }
            return [];
        } catch (err) {
            console.error('获取备份列表失败', err);
            return [];
        }
    }

    async createBackup(content) {
        if (!content || !content.trim()) return false;
        try {
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (data.success) {
                Utils.showToast('自动备份已保存');
                return true;
            }
            return false;
        } catch (err) {
            console.error('备份失败', err);
            return false;
        }
    }

    async loadBackup(filename) {
        try {
            const res = await fetch(`/api/backup/load?filename=${encodeURIComponent(filename)}`);
            const data = await res.json();
            if (data.success && data.content) {
                if (confirm(`加载备份 "${filename}" 将替换当前所有组件，是否继续？`)) {
                    App.xamlProcessor.importFromXAML(data.content);
                    Utils.showToast(`已加载备份: ${filename}`);
                    this.lastSelectedBackup = filename;
                    return true;
                }
            } else {
                Utils.showToast('加载失败: ' + (data.error || '未知错误'), true);
            }
            return false;
        } catch (err) {
            Utils.showToast('请求失败: ' + err.message, true);
            return false;
        }
    }

    async deleteBackup(filename) {
        if (!confirm(`确定删除备份 "${filename}" 吗？`)) return false;
        try {
            const res = await fetch('/api/backup/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                Utils.showToast(`已删除 ${filename}`);
                if (this.lastSelectedBackup === filename) this.lastSelectedBackup = null;
                return true;
            } else {
                Utils.showToast('删除失败: ' + (data.error || '未知错误'), true);
                return false;
            }
        } catch (err) {
            Utils.showToast('请求失败: ' + err.message, true);
            return false;
        }
    }

    async manualBackup() {
        const content = App.xamlProcessor.generateXAML(App.state.components);
        if (!content.trim()) {
            Utils.showToast('没有可备份的内容', true);
            return false;
        }
        return await this.createBackup(content);
    }
}

// modules/DragDropManager.js
class DragDropManager {
    constructor() {
        this.dragSource = null;
        this.insertPlaceholder = null;
    }

    createInsertPlaceholder(isHorizontal = false) {
        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        if (isHorizontal) {
            placeholder.style.cssText = `
                width: 4px;
                height: 60px;
                background: var(--primary);
                margin: 0 4px;
                border-radius: 2px;
                transition: all 0.1s;
                display: inline-block;
                vertical-align: middle;
            `;
        } else {
            placeholder.style.cssText = `
                height: 4px;
                background: var(--primary);
                margin: 4px 0;
                border-radius: 2px;
                transition: all 0.1s;
            `;
        }
        return placeholder;
    }

    clearPlaceholder() {
        if (this.insertPlaceholder && this.insertPlaceholder.parentNode) {
            this.insertPlaceholder.parentNode.removeChild(this.insertPlaceholder);
        }
        this.insertPlaceholder = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    isParentHorizontal(parentId) {
        if (parentId === null) return false;
        const parentComp = ComponentFinder.findComponentById(parentId);
        if (!parentComp) return false;
        if (parentComp.type === 'horizontalstack') return true;
        if (parentComp.type === 'stackpanel' && parentComp.props.Orientation === 'Horizontal') return true;
        return false;
    }

    computeDropPosition(dragEvent, targetElement) {
        let dropZone = targetElement.closest('.nested-dropzone');
        let targetComponent = targetElement.closest('.component-item-wrapper');
        
        if (dropZone) {
            const parentIdAttr = dropZone.getAttribute('data-parent-id');
            const parentId = parentIdAttr ? parseInt(parentIdAttr) : null;
            const isHorizontal = this.isParentHorizontal(parentId);
            const childrenWrappers = Array.from(dropZone.querySelectorAll(':scope > .component-item-wrapper'));
            if (childrenWrappers.length === 0) {
                return { parentId, index: 0, targetElement: dropZone, isHorizontal };
            }
            const mousePos = isHorizontal ? dragEvent.clientX : dragEvent.clientY;
            for (let i = 0; i < childrenWrappers.length; i++) {
                const rect = childrenWrappers[i].getBoundingClientRect();
                const middle = isHorizontal ? (rect.left + rect.width / 2) : (rect.top + rect.height / 2);
                if (mousePos < middle) {
                    return { parentId, index: i, targetElement: childrenWrappers[i], isHorizontal };
                }
            }
            return { parentId, index: childrenWrappers.length, targetElement: dropZone, isHorizontal };
        }
        
        if (targetComponent) {
            const compId = parseInt(targetComponent.getAttribute('data-id'));
            const comp = ComponentFinder.findComponentById(compId);
            if (!comp) return null;
            const parentId = comp.parentId;
            const parentComp = parentId === null ? null : ComponentFinder.findComponentById(parentId);
            const siblings = parentId === null ? App.state.components : parentComp.children;
            const currentIndex = siblings.findIndex(c => c.id === compId);
            if (currentIndex === -1) return null;
            
            const isHorizontal = this.isParentHorizontal(parentId);
            const rect = targetComponent.getBoundingClientRect();
            const mousePos = isHorizontal ? dragEvent.clientX : dragEvent.clientY;
            const middle = isHorizontal ? (rect.left + rect.width / 2) : (rect.top + rect.height / 2);
            let newIndex = mousePos < middle ? currentIndex : currentIndex + 1;
            let parentElement = parentId === null ? document.getElementById('canvas') : 
                                document.querySelector(`.component-item-wrapper[data-id="${parentId}"] .nested-dropzone`);
            if (!parentElement) return null;
            return { parentId, index: newIndex, targetElement: parentElement, isHorizontal };
        }
        
        const canvas = document.getElementById('canvas');
        if (canvas && canvas.contains(targetElement)) {
            const childrenWrappers = Array.from(canvas.querySelectorAll(':scope > .component-item-wrapper'));
            const isHorizontal = false;
            if (childrenWrappers.length === 0) {
                return { parentId: null, index: 0, targetElement: canvas, isHorizontal };
            }
            const mouseY = dragEvent.clientY;
            for (let i = 0; i < childrenWrappers.length; i++) {
                const rect = childrenWrappers[i].getBoundingClientRect();
                const middle = rect.top + rect.height / 2;
                if (mouseY < middle) {
                    return { parentId: null, index: i, targetElement: childrenWrappers[i], isHorizontal };
                }
            }
            return { parentId: null, index: childrenWrappers.length, targetElement: canvas, isHorizontal };
        }
        
        return null;
    }

    showPlaceholder(dropInfo) {
        this.clearPlaceholder();
        if (!dropInfo) return;
        
        const { targetElement, index, isHorizontal } = dropInfo;
        if (!targetElement) return;
        
        const placeholder = this.createInsertPlaceholder(isHorizontal);
        this.insertPlaceholder = placeholder;
        
        if (targetElement.classList && targetElement.classList.contains('component-item-wrapper')) {
            targetElement.parentNode.insertBefore(placeholder, targetElement);
        } else if (targetElement.classList && targetElement.classList.contains('nested-dropzone')) {
            const children = Array.from(targetElement.children).filter(child => child.classList.contains('component-item-wrapper'));
            if (index <= children.length) {
                if (index === 0) {
                    targetElement.insertBefore(placeholder, children[0] || null);
                } else if (index === children.length) {
                    targetElement.appendChild(placeholder);
                } else {
                    targetElement.insertBefore(placeholder, children[index]);
                }
            } else {
                targetElement.appendChild(placeholder);
            }
        } else if (targetElement.id === 'canvas') {
            const children = Array.from(targetElement.children).filter(child => child.classList.contains('component-item-wrapper'));
            if (index <= children.length) {
                if (index === 0) {
                    targetElement.insertBefore(placeholder, children[0] || null);
                } else if (index === children.length) {
                    targetElement.appendChild(placeholder);
                } else {
                    targetElement.insertBefore(placeholder, children[index]);
                }
            } else {
                targetElement.appendChild(placeholder);
            }
        }
    }

    initGlobalFileDragAndDrop() {
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
                if (files[0].size > 5 * 1024 * 1024) {
                    Utils.showToast('文件较大，加载可能需要几秒钟...', false);
                }
                this.handleFileImport(files[0]);
                return false;
            }
        });
    }

    async handleFileImport(file) {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xaml' && ext !== 'xml') {
            Utils.showToast('请拖入 .xaml 或 .xml 文件', true);
            return;
        }
        if (!confirm('拖入文件将替换当前所有组件，是否继续？')) return;
        const CHUNK_SIZE = 1024 * 1024;
        const totalSize = file.size;
        let content = '';
        if (totalSize < CHUNK_SIZE) {
            try {
                content = await file.text();
                App.xamlProcessor.importFromXAML(content);
            } catch (err) {
                Utils.showToast('文件读取失败: ' + err.message, true);
            }
            return;
        }
        let offset = 0;
        const progress = this.createProgressOverlay();
        const readNextChunk = () => {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const reader = new FileReader();
            reader.onload = (e) => {
                content += e.target.result;
                offset += CHUNK_SIZE;
                const percent = Math.min(100, (offset / totalSize) * 100);
                progress.updateProgress(percent);
                if (offset < totalSize) {
                    setTimeout(readNextChunk, 0);
                } else {
                    progress.close();
                    App.xamlProcessor.importFromXAML(content);
                }
            };
            reader.onerror = () => {
                progress.close();
                Utils.showToast('文件读取失败', true);
            };
            reader.readAsText(chunk, 'UTF-8');
        };
        readNextChunk();
    }

    createProgressOverlay() {
        let overlay = document.getElementById('globalProgressOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'globalProgressOverlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 10001; flex-direction: column; gap: 16px;
                color: white; font-weight: 500;
            `;
            overlay.innerHTML = `
                <div><i class="fas fa-spinner fa-pulse fa-2x"></i></div>
                <div>正在读取文件...</div>
                <div class="progress-bar-container" style="width: 300px; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px;">
                    <div class="progress-bar-fill" style="width: 0%; height: 100%; background: var(--primary); border-radius: 4px; transition: width 0.2s;"></div>
                </div>
                <div class="progress-text">0%</div>
            `;
            document.body.appendChild(overlay);
        }
        return {
            updateProgress: (percent) => {
                const fill = overlay.querySelector('.progress-bar-fill');
                const text = overlay.querySelector('.progress-text');
                if (fill) fill.style.width = `${percent}%`;
                if (text) text.innerText = `${Math.round(percent)}%`;
            },
            close: () => { overlay.remove(); }
        };
    }

    initDragAndDrop() {
        const designContainer = document.getElementById('previewContainer');
        
        document.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.comp-item');
            if (target) {
                const compType = target.getAttribute('data-type');
                if (compType && ComponentTypes[compType]) {
                    this.dragSource = { type: compType, isExisting: false };
                    e.dataTransfer.setData('text/plain', compType);
                    e.dataTransfer.effectAllowed = 'copy';
                }
                return;
            }
            
            const existingComp = e.target.closest('.component-item-wrapper');
            if (existingComp) {
                const id = parseInt(existingComp.getAttribute('data-id'));
                const comp = ComponentFinder.findComponentById(id);
                if (comp) {
                    this.dragSource = { id: comp.id, type: comp.type, isExisting: true };
                    e.dataTransfer.setData('text/plain', `move:${comp.id}`);
                    e.dataTransfer.effectAllowed = 'move';
                    existingComp.style.opacity = '0.5';
                }
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (this.dragSource && !this.dragSource.isExisting) {
                // 新组件拖拽结束清理
            } else if (this.dragSource && this.dragSource.isExisting) {
                const wrapper = document.querySelector(`.component-item-wrapper[data-id="${this.dragSource.id}"]`);
                if (wrapper) wrapper.style.opacity = '';
            }
            this.dragSource = null;
            this.clearPlaceholder();
        });
        
        designContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = this.dragSource && !this.dragSource.isExisting ? 'copy' : 'move';
            if (!this.dragSource) return;
            
            const dropInfo = this.computeDropPosition(e, e.target);
            if (dropInfo) {
                this.showPlaceholder(dropInfo);
                if (dropInfo.targetElement && dropInfo.targetElement.classList && dropInfo.targetElement.classList.contains('nested-dropzone')) {
                    dropInfo.targetElement.classList.add('drag-over');
                }
            } else {
                this.clearPlaceholder();
            }
        });
        
        designContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.dragSource) {
                this.clearPlaceholder();
                return;
            }
            
            const dropInfo = this.computeDropPosition(e, e.target);
            if (!dropInfo) {
                this.clearPlaceholder();
                return;
            }
            
            const { parentId, index, isHorizontal } = dropInfo;
            
            if (!this.dragSource.isExisting) {
                const compType = this.dragSource.type;
                if (compType && ComponentTypes[compType]) {
                    if (parentId !== null) {
                        const parentComp = ComponentFinder.findComponentById(parentId);
                        if (!parentComp || !ComponentTypes[parentComp.type]?.canNest) {
                            Utils.showToast('该容器不允许放置子组件', true);
                            this.clearPlaceholder();
                            this.dragSource = null;
                            return;
                        }
                    }
                    const newComp = ComponentManager.createComponent(compType, parentId);
                    if (newComp) {
                        ComponentManager.addComponent(newComp, parentId, index);
                        App.renderManager.selectComponent(newComp.id);
                        Utils.showToast(`添加 ${ComponentTypes[compType].name}`);
                    }
                }
            } else {
                const sourceId = this.dragSource.id;
                if (sourceId === parentId) {
                    Utils.showToast('不能将组件移动到自身', true);
                    this.clearPlaceholder();
                    this.dragSource = null;
                    return;
                }
                if (parentId !== null) {
                    const targetParent = ComponentFinder.findComponentById(parentId);
                    if (!targetParent || !ComponentTypes[targetParent.type]?.canNest) {
                        Utils.showToast('目标容器不允许放置子组件', true);
                        this.clearPlaceholder();
                        this.dragSource = null;
                        return;
                    }
                }
                const success = ComponentManager.moveComponentTo(sourceId, parentId, index);
                if (!success) {
                    Utils.showToast('移动失败：可能导致循环引用', true);
                }
            }
            
            this.clearPlaceholder();
            this.dragSource = null;
        });
        
        const container = document.getElementById('componentsList');
        if (container) {
            container.querySelectorAll('.comp-item').forEach(item => {
                item.setAttribute('draggable', 'true');
            });
        }
    }
}

// modules/UIManager.js
class UIManager {
    updateOpenFileButton() {
        const btn = document.getElementById('openLocalFileBtn');
        if (!btn) return;

        const hasLinkedFile = !!App.fileManager.currentFileName;
        const isDirty = App.state.dirty;

        if (hasLinkedFile && isDirty) {
            btn.innerHTML = '<i class="fas fa-save"></i> 保存到文件';
            btn.classList.add('btn-primary');
            btn.disabled = false;
            btn.title = '保存到当前链接的文件';
            btn.onclick = () => App.fileManager.saveToLinkedFile();
        } else if (hasLinkedFile && !isDirty) {
            btn.innerHTML = '<i class="fas fa-check"></i> 已是最新';
            btn.classList.remove('btn-primary');
            btn.disabled = true;
            btn.title = '文件已同步，无需保存';
            btn.onclick = null;
        } else {
            btn.innerHTML = '<i class="fas fa-folder-open"></i> 打开本地文件';
            btn.classList.remove('btn-primary');
            btn.disabled = false;
            btn.title = '打开或链接本地文件';
            btn.onclick = () => App.fileManager.openLocalFileWithPicker();
        }
    }

    async renderBackupList() {
        const container = document.getElementById('backupListContainer');
        if (!container) return;

        const backups = await App.serverApi.getBackupList();
        if (!backups.length) {
            container.innerHTML = '<div class="empty-placeholder" style="padding:20px"><i class="fas fa-cloud-upload-alt"></i><p>暂无自动备份，编辑组件后将自动创建</p></div>';
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fas fa-history"></i> 自动备份列表（最多保留30个）</span>
                <button class="btn" id="manualBackupBtn"><i class="fas fa-camera"></i> 手动备份</button>
            </div>
            <div class="backup-items">
                ${backups.map(b => `
                    <div class="backup-item" data-name="${Utils.escapeHtmlAttr(b.name)}">
                        <div class="backup-info">
                            <i class="fas fa-file-archive"></i>
                            <strong>${Utils.escapeHtml(b.name)}</strong>
                            <span class="backup-time">${Utils.escapeHtml(b.modified_str)}</span>
                            <span class="backup-size">${(b.size/1024).toFixed(1)} KB</span>
                        </div>
                        <div class="backup-actions">
                            <button class="btn load-backup" data-name="${Utils.escapeHtmlAttr(b.name)}"><i class="fas fa-undo"></i> 恢复</button>
                            <button class="btn btn-danger delete-backup" data-name="${Utils.escapeHtmlAttr(b.name)}"><i class="fas fa-trash"></i> 删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        if (App.serverApi.lastSelectedBackup) {
            const targetItem = container.querySelector(`.backup-item[data-name="${App.serverApi.lastSelectedBackup}"]`);
            if (targetItem) {
                targetItem.style.backgroundColor = 'var(--primary-soft)';
                targetItem.style.borderColor = 'var(--primary)';
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                App.serverApi.lastSelectedBackup = null;
            }
        }

        container.querySelectorAll('.load-backup').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = btn.getAttribute('data-name');
                await App.serverApi.loadBackup(name);
                App.resetDirty();
                document.getElementById('serverModal').style.display = 'none';
            });
        });

        container.querySelectorAll('.delete-backup').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = btn.getAttribute('data-name');
                await App.serverApi.deleteBackup(name);
                await this.renderBackupList();
            });
        });

        const manualBtn = document.getElementById('manualBackupBtn');
        if (manualBtn) {
            manualBtn.onclick = async () => {
                await App.serverApi.manualBackup();
                await this.renderBackupList();
            };
        }
    }

    buildComponentLibrary() {
        const container = document.getElementById('componentsList');
        container.innerHTML = '';
        for (let [key, val] of Object.entries(ComponentTypes)) {
            const div = document.createElement('div');
            div.className = 'comp-item';
            div.setAttribute('data-type', key);
            div.setAttribute('draggable', 'true');
            div.innerHTML = `<i class="${val.icon}"></i><span>${Utils.escapeHtml(val.name)}</span><i class="fas fa-grip-vertical" style="margin-left:auto; opacity:0.5"></i>`;
            container.appendChild(div);
        }

        document.getElementById('compSearch')?.addEventListener('input', (e) => {
            const kw = e.target.value.trim().toLowerCase();
            document.querySelectorAll('.comp-item').forEach(item => {
                const nameSpan = item.querySelector('span')?.innerText.toLowerCase() || '';
                item.classList.toggle('hidden', kw !== '' && !nameSpan.includes(kw));
            });
        });

        App.dragDropManager.initDragAndDrop();
    }

    bindUIEvents() {
        document.getElementById('clearCanvasBtn').onclick = () => {
            if (confirm('清空所有组件？')) {
                App.recordSnapshot();  // #8 记录快照
                App.state.components = [];
                App.state.selectedId = null;
                App.renderManager.renderCanvas();
                App.markDirty();
                App.history.reset();   // 清空历史
            }
        };

        document.getElementById('applyPropsBtn').onclick = () => App.renderManager.applyCurrentProps();
        document.getElementById('deleteCompBtn').onclick = () => {
            if (App.state.selectedId && confirm('删除组件？')) {
                ComponentManager.removeComponentById(App.state.selectedId);
            }
        };

        document.getElementById('duplicateCompBtn').onclick = () => {
            if (App.state.selectedId) {
                ComponentManager.duplicateComponent(ComponentFinder.findComponentById(App.state.selectedId));
            }
        };

        document.getElementById('xamlExportBtn').onclick = () => {
            const modal = document.getElementById('xamlModal');
            const codeArea = document.getElementById('xamlCodeArea');
            if (codeArea) {
                codeArea.value = App.xamlProcessor.generateXAML(App.state.components);
            }
            modal.style.display = 'flex';
        };

        document.getElementById('copyXamlBtn').onclick = async () => {
            try {
                await navigator.clipboard.writeText(document.getElementById('xamlCodeArea').value);
                Utils.showToast('已复制XAML');
            } catch (err) {
                Utils.showToast('复制失败', true);
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
                Utils.showToast('无XAML内容', true);
            }
        };

        document.getElementById('closeModalBtn').onclick = () => document.getElementById('xamlModal').style.display = 'none';
        document.getElementById('themeToggle').onclick = () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        };

        document.getElementById('copyIdBtn').addEventListener('click', () => {
            const idSpan = document.getElementById('compIdDisplay');
            if (idSpan && idSpan.innerText !== '-') {
                navigator.clipboard.writeText(idSpan.innerText);
                Utils.showToast(`已复制ID: ${idSpan.innerText}`);
            }
        });

        window.onclick = (e) => {
            if (e.target === document.getElementById('xamlModal')) document.getElementById('xamlModal').style.display = 'none';
            if (e.target === document.getElementById('serverModal')) document.getElementById('serverModal').style.display = 'none';
        };

        document.getElementById('dynamicProps')?.addEventListener('change', () => App.renderManager.applyCurrentProps());
        document.getElementById('eventTypeSelect')?.addEventListener('change', () => App.renderManager.applyCurrentProps());
        document.getElementById('eventDataInput')?.addEventListener('blur', () => App.renderManager.applyCurrentProps());

        const serverModal = document.getElementById('serverModal');
        document.getElementById('serverManageBtn').onclick = async () => {
            serverModal.style.display = 'flex';
            await this.renderBackupList();
            App.fileManager.updateLocalFileUI();
        };

        document.getElementById('closeServerModalBtn').onclick = () => {
            serverModal.style.display = 'none';
        };

        const refreshBackupBtn = document.getElementById('refreshBackupListBtn');
        if (refreshBackupBtn) {
            refreshBackupBtn.onclick = () => this.renderBackupList();
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(targetTab).classList.add('active');
                if (targetTab === 'local-tab') App.fileManager.updateLocalFileUI();
            });
        });

        document.getElementById('openLocalFilePickerBtn').onclick = () => App.fileManager.openLocalFileWithPicker();
        document.getElementById('saveToLocalFileBtn').onclick = () => App.fileManager.saveToLinkedFile();
        document.getElementById('saveAsLocalFileBtn').onclick = () => App.fileManager.saveAsLocalFile();
        document.getElementById('openLocalFileBtn').onclick = () => {
            App.fileManager.openLocalFileWithPicker();
        };
    }
}

// main application class
class App {
    static state = {
        components: [],
        selectedId: null,
        dirty: false
    };

    static autoBackupTimer = null;
    static AUTO_BACKUP_DELAY = 1000;

    static history = new HistoryManager();  // #8

    static recordSnapshot() {
        App.history.pushState();
    }

    static markDirty() {
        if (!App.state.dirty) {
            App.state.dirty = true;
            App.uiManager?.updateOpenFileButton();
        }
        App.scheduleAutoBackup();
    }

    static resetDirty() {
        App.state.dirty = false;
        App.uiManager?.updateOpenFileButton();
    }

    static scheduleAutoBackup() {
        if (App.autoBackupTimer) clearTimeout(App.autoBackupTimer);
        App.autoBackupTimer = setTimeout(() => {
            const content = App.xamlProcessor?.generateXAML(App.state.components);
            if (content && content.trim()) {
                App.serverApi?.createBackup(content).catch(console.error);
            }
        }, App.AUTO_BACKUP_DELAY);
    }

    static init() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
        }

        this.renderManager = new RenderManager();
        this.xamlProcessor = new XamlProcessor();
        this.fileManager = new FileManager();
        this.serverApi = new ServerApi();
        this.dragDropManager = new DragDropManager();
        this.uiManager = new UIManager();

        this.uiManager.buildComponentLibrary();
        this.dragDropManager.initGlobalFileDragAndDrop();
        this.uiManager.bindUIEvents();
        this.renderManager.renderCanvas();
        this.fileManager.updateLocalFileUI();
        this.uiManager.updateOpenFileButton();

        // 全局事件委托：选中组件
        document.getElementById('previewContainer')?.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.component-item-wrapper');
            if (wrapper) {
                const id = parseInt(wrapper.getAttribute('data-id'));
                if (!isNaN(id)) {
                    e.stopPropagation();
                    this.renderManager.selectComponent(id);
                }
            }
        });

        // #8 全局撤销/重做快捷键
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                App.history.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                App.history.redo();
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (App.state.dirty) {
                const message = '当前设计未保存，离开页面将会丢失更改，确定要离开吗？';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});