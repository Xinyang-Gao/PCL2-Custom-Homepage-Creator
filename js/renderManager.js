import { ComponentTypes, PROP_SELECT_OPTIONS } from './componentTypes.js';
import { ComponentFinder } from './componentFinder.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';

// margin 解析与格式化辅助函数
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

// 应用外边距、宽高、对齐等通用布局样式（直接模拟位置，无虚线框）
function applyLayoutStyles(wrapper, comp) {
    // 获取并解析 Margin 值
    const margin = comp.props.Margin || '0';
    const [ml, mt, mr, mb] = parseMargin(margin);
    
    // 先设置总 margin（会被后续单独的 left/right 覆盖）
    wrapper.style.margin = `${mt}px ${mr}px ${mb}px ${ml}px`;

    // 宽度 / 高度处理
    if (comp.props.Width) {
        wrapper.style.width = comp.props.Width;
    } else {
        wrapper.style.width = '';
    }
    if (comp.props.Height) {
        wrapper.style.height = comp.props.Height;
    } else {
        wrapper.style.height = '';
    }

    const halign = comp.props.HorizontalAlignment || 'Stretch';
    const isLeftMarginSet = ml !== 0;   // 左边距是否被用户显式设置（非0）
    const isRightMarginSet = mr !== 0;  // 右边距是否被用户显式设置（非0）

    // 根据水平对齐方式，决定是否覆盖左右边距
    if (halign === 'Center') {
        if (!isLeftMarginSet && !isRightMarginSet) {
            // 无用户边距时，使用居中
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = 'auto';
        } else {
            // 有用户边距时，保留用户设置的具体像素值
            if (isLeftMarginSet) wrapper.style.marginLeft = `${ml}px`;
            if (isRightMarginSet) wrapper.style.marginRight = `${mr}px`;
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } 
    else if (halign === 'Right') {
        if (!isRightMarginSet) {
            // 无右边距用户值时，按右对齐处理
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = '0';
        } else {
            // 有右边距时优先使用用户值，左边距同理
            if (isLeftMarginSet) wrapper.style.marginLeft = `${ml}px`;
            wrapper.style.marginRight = `${mr}px`;
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } 
    else if (halign === 'Left') {
        if (!isLeftMarginSet) {
            wrapper.style.marginLeft = '0';
            wrapper.style.marginRight = 'auto';
        } else {
            wrapper.style.marginLeft = `${ml}px`;
            if (isRightMarginSet) wrapper.style.marginRight = `${mr}px`;
            else wrapper.style.marginRight = 'auto';
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } 
    else { // Stretch 拉伸模式
        if (!comp.props.Width) wrapper.style.width = '100%';
        // 拉伸模式下也保留用户设置的左右边距
        if (isLeftMarginSet) wrapper.style.marginLeft = `${ml}px`;
        if (isRightMarginSet) wrapper.style.marginRight = `${mr}px`;
    }

    // 垂直对齐处理（不变）
    const valign = comp.props.VerticalAlignment || 'Stretch';
    if (valign === 'Top') {
        wrapper.style.alignSelf = 'flex-start';
    } else if (valign === 'Center') {
        wrapper.style.alignSelf = 'center';
    } else if (valign === 'Bottom') {
        wrapper.style.alignSelf = 'flex-end';
    } else {
        wrapper.style.alignSelf = 'stretch';
    }

    // 记录属性到自定义 data 属性，便于调试
    wrapper.setAttribute('data-halign', halign);
    wrapper.setAttribute('data-valign', valign);
}

// 应用内边距到组件内部内容区
function applyPaddingStyles(comp, contentElement) {
    if (!contentElement) return;
    const padding = comp.props.Padding || '';
    if (padding) {
        const parts = padding.split(',').map(p => parseFloat(p.trim()));
        if (parts.length === 1) {
            contentElement.style.padding = `${parts[0]}px`;
        } else if (parts.length === 2) {
            contentElement.style.padding = `${parts[0]}px ${parts[1]}px`;
        } else if (parts.length === 3) {
            contentElement.style.padding = `${parts[0]}px ${parts[1]}px ${parts[2]}px`;
        } else if (parts.length >= 4) {
            contentElement.style.padding = `${parts[0]}px ${parts[1]}px ${parts[2]}px ${parts[3]}px`;
        }
    } else {
        contentElement.style.padding = '';
    }
}

// 文本样式应用
function applyTextStyles(textElement, comp) {
    if (comp.props.Foreground) {
        textElement.style.color = comp.props.Foreground;
    } else {
        textElement.style.color = '';
    }
    if (comp.props.FontSize) {
        textElement.style.fontSize = comp.props.FontSize + 'px';
    } else {
        textElement.style.fontSize = '';
    }
    if (comp.props.FontWeight) {
        textElement.style.fontWeight = comp.props.FontWeight;
    }
    if (comp.props.TextWrapping === 'Wrap') {
        textElement.style.whiteSpace = 'normal';
        textElement.style.wordWrap = 'break-word';
    } else if (comp.props.TextWrapping === 'NoWrap') {
        textElement.style.whiteSpace = 'nowrap';
    }
}

export class RenderManager {
    renderComponentDOM(comp, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'component-item-wrapper';
        wrapper.setAttribute('data-id', comp.id);
        wrapper.setAttribute('data-type', comp.type);
        wrapper.setAttribute('draggable', 'true');
        if (comp.props.ToolTip) {
            wrapper.setAttribute('title', comp.props.ToolTip);
        }

        // 直接应用布局样式（Margin 等，无虚线框）
        applyLayoutStyles(wrapper, comp);
        wrapper._component = comp;

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
            applyPaddingStyles(comp, contentDiv);
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
            containerDiv.style.cssText = 'background:var(--bg-card); border:1px dashed var(--border);';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.style.color = 'var(--text-light)';
            labelDiv.style.marginBottom = '8px';
            labelDiv.innerHTML = '<i class="fas fa-layer-group"></i> 垂直布局';
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone';
            dropzone.setAttribute('data-parent-id', comp.id);
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            applyPaddingStyles(comp, containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'horizontalstack') {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'card-component';
            containerDiv.style.cssText = 'background:var(--bg-card); border:1px dashed var(--border);';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.style.marginBottom = '8px';
            labelDiv.innerHTML = '<i class="fas fa-arrows-alt-h"></i> 水平布局';
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone horizontal';
            dropzone.setAttribute('data-parent-id', comp.id);
            dropzone.style.display = 'flex';
            dropzone.style.flexWrap = 'wrap';
            dropzone.style.gap = '8px';
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            applyPaddingStyles(comp, containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else if (comp.type === 'grid') {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'card-component grid-mock';
            const labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '0.7rem';
            labelDiv.style.marginBottom = '8px';
            labelDiv.innerHTML = `<i class="fas fa-th"></i> 网格布局 (${Utils.escapeHtml(comp.props.ColumnsDefinition || '未定义列')})`;
            const dropzone = document.createElement('div');
            dropzone.className = 'nested-dropzone';
            dropzone.setAttribute('data-parent-id', comp.id);
            containerDiv.appendChild(labelDiv);
            containerDiv.appendChild(dropzone);
            wrapper.appendChild(containerDiv);
            applyPaddingStyles(comp, containerDiv);
            comp.children.forEach(child => this.renderComponentDOM(child, dropzone));
        }
        else {
            const innerContainer = document.createElement('div');
            innerContainer.className = 'component-inner';
            
            if (comp.type === 'text') {
                const textDiv = document.createElement('div');
                textDiv.textContent = comp.props.Text || '文本';
                textDiv.style.margin = '0';
                applyTextStyles(textDiv, comp);
                innerContainer.appendChild(textDiv);
            }
            else if (comp.type === 'hint') {
                const hintDiv = document.createElement('div');
                const theme = (comp.props.Theme || 'blue').toLowerCase();
                hintDiv.className = `hint-${theme}`;
                hintDiv.textContent = comp.props.Text || '';
                innerContainer.appendChild(hintDiv);
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
                innerContainer.appendChild(img);
            }
            else if (comp.type === 'button') {
                const btn = document.createElement('button');
                btn.textContent = comp.props.Text || '按钮';
                let colorType = comp.props.ColorType || 'Highlight';
                let btnClass = 'btn';
                if (colorType === 'Highlight') btnClass += ' btn-highlight';
                else if (colorType === 'Primary') btnClass += ' btn-primary';
                else if (colorType === 'Secondary') btnClass += ' btn-secondary';
                else if (colorType === 'Success') btnClass += ' btn-success';
                else if (colorType === 'Danger') btnClass += ' btn-danger';
                btn.className = btnClass;
                if (comp.props.Height) btn.style.height = comp.props.Height + 'px';
                if (comp.props.Padding) {
                    btn.style.padding = comp.props.Padding.replace(/,/g, ' ');
                }
                innerContainer.appendChild(btn);
            }
            else if (comp.type === 'textbutton') {
                const btn = document.createElement('button');
                btn.className = 'btn-text';
                btn.textContent = comp.props.Text || '文本按钮';
                innerContainer.appendChild(btn);
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
                innerContainer.appendChild(itemDiv);
            }
            
            wrapper.appendChild(innerContainer);
            applyPaddingStyles(comp, innerContainer);
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
            const selEl = document.querySelector(`[data-id="${App.state.selectedId}"]`);
            if (selEl) selEl.classList.add('selected');
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

        for (let field of group.fields) {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'prop-field';
// renderManager.js - buildPropSection 内部
if (field.key === 'Margin') {
    const marginValues = parseMargin(field.val);
    const [left, top, right, bottom] = marginValues;

    const marginGroup = document.createElement('div');
    marginGroup.className = 'margin-visual-group';
    marginGroup.innerHTML = `
        <div class="margin-row">
            <span class="margin-label"><i class="fas fa-arrow-left"></i> 左</span>
            <input type="range" class="margin-slider" data-margin="left" min="-100" max="200" step="1" value="${left}">
            <input type="number" class="margin-number" data-margin="left" value="${left}" step="1">
        </div>
        <div class="margin-row">
            <span class="margin-label"><i class="fas fa-arrow-up"></i> 上</span>
            <input type="range" class="margin-slider" data-margin="top" min="-100" max="200" step="1" value="${top}">
            <input type="number" class="margin-number" data-margin="top" value="${top}" step="1">
        </div>
        <div class="margin-row">
            <span class="margin-label"><i class="fas fa-arrow-right"></i> 右</span>
            <input type="range" class="margin-slider" data-margin="right" min="-100" max="200" step="1" value="${right}">
            <input type="number" class="margin-number" data-margin="right" value="${right}" step="1">
        </div>
        <div class="margin-row">
            <span class="margin-label"><i class="fas fa-arrow-down"></i> 下</span>
            <input type="range" class="margin-slider" data-margin="bottom" min="-100" max="200" step="1" value="${bottom}">
            <input type="number" class="margin-number" data-margin="bottom" value="${bottom}" step="1">
        </div>
        <div class="margin-preview">当前边距：${formatMargin(left, top, right, bottom)}</div>
    `;

    // 绑定实时更新事件
    const sliders = marginGroup.querySelectorAll('.margin-slider');
    const numbers = marginGroup.querySelectorAll('.margin-number');
    const previewSpan = marginGroup.querySelector('.margin-preview');

    const updateMargin = () => {
        const newLeft = parseFloat(marginGroup.querySelector('[data-margin="left"] .margin-number')?.value || 0);
        const newTop = parseFloat(marginGroup.querySelector('[data-margin="top"] .margin-number')?.value || 0);
        const newRight = parseFloat(marginGroup.querySelector('[data-margin="right"] .margin-number')?.value || 0);
        const newBottom = parseFloat(marginGroup.querySelector('[data-margin="bottom"] .margin-number')?.value || 0);
        const newMarginStr = formatMargin(newLeft, newTop, newRight, newBottom);
        previewSpan.innerText = `当前边距：${newMarginStr}`;
        this.updateComponentMargin(comp.id, newMarginStr);
    };

    const syncControl = (target) => {
        const marginDir = target.getAttribute('data-margin');
        const slider = marginGroup.querySelector(`.margin-slider[data-margin="${marginDir}"]`);
        const number = marginGroup.querySelector(`.margin-number[data-margin="${marginDir}"]`);
        if (target.classList.contains('margin-slider')) {
            number.value = target.value;
        } else {
            slider.value = target.value;
        }
        updateMargin();
    };

    sliders.forEach(slider => slider.addEventListener('input', (e) => syncControl(e.target)));
    numbers.forEach(num => num.addEventListener('input', (e) => syncControl(e.target)));

    section.appendChild(marginGroup);
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

    // renderManager.js 中新增方法
updateComponentMargin(compId, marginStr) {
    const comp = ComponentFinder.findComponentById(compId);
    if (!comp) return;
    const wrapper = document.querySelector(`.component-item-wrapper[data-id="${compId}"]`);
    if (!wrapper) return;

    // 更新数据模型
    comp.props.Margin = marginStr;

    // 重新应用布局样式（包含 margin、宽高、对齐等）
    applyLayoutStyles(wrapper, comp);

    // 标记已修改并触发自动备份
    App.markDirty();
}

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
        const appearanceKeys = ["Foreground", "FontSize", "TextWrapping", "Theme", "ColorType", "LogoScale", "Type", "FontWeight"];
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

        const commonFields = [];
        if (comp.props.ToolTip !== undefined) commonFields.push({ key: "ToolTip", val: comp.props.ToolTip });
        if (comp.props.IsHitTestVisible !== undefined) commonFields.push({ key: "IsHitTestVisible", val: comp.props.IsHitTestVisible });
        if (commonFields.length) groupsArray.unshift({ title: "通用", icon: "fas fa-cogs", fields: commonFields });

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
        App.recordSnapshot();

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

const marginLeft = document.querySelector('#dynamicProps .margin-number[data-margin="left"]');
const marginTop = document.querySelector('#dynamicProps .margin-number[data-margin="top"]');
const marginRight = document.querySelector('#dynamicProps .margin-number[data-margin="right"]');
const marginBottom = document.querySelector('#dynamicProps .margin-number[data-margin="bottom"]');
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

        comp.events = {
            type: document.getElementById('eventTypeSelect').value,
            data: document.getElementById('eventDataInput').value
        };

        const newCustomProps = {};
        document.querySelectorAll('.custom-property-row').forEach(row => {
            const keyInput = row.querySelector('input[data-custom-key]');
            const valInput = row.querySelector('input[data-custom-val]');
            if (keyInput && valInput && keyInput.value.trim() !== '') {
                newCustomProps[keyInput.value.trim()] = valInput.value;
            }
        });
        comp.customProps = newCustomProps;

        const newKey = document.getElementById('newCustomKey')?.value.trim();
        const newVal = document.getElementById('newCustomVal')?.value.trim();
        if (newKey) {
            comp.customProps[newKey] = newVal;
            const keyInput = document.getElementById('newCustomKey');
            const valInput = document.getElementById('newCustomVal');
            if (keyInput) keyInput.value = '';
            if (valInput) valInput.value = '';
        }

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