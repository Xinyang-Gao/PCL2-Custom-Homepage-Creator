// renderManager.js
import { ComponentTypes, PROP_SELECT_OPTIONS } from './componentTypes.js';
import { ComponentFinder } from './componentFinder.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';
import { ActionType } from './historyManager.js';

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

// 应用外边距、宽高、对齐等通用布局样式
function applyLayoutStyles(wrapper, comp) {
    const margin = comp.props.Margin || '0';
    const [ml, mt, mr, mb] = parseMargin(margin);

    wrapper.style.margin = `${mt}px ${mr}px ${mb}px ${ml}px`;

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
    const isLeftMarginSet = ml !== 0;
    const isRightMarginSet = mr !== 0;

    if (halign === 'Center') {
        if (!isLeftMarginSet && !isRightMarginSet) {
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = 'auto';
        } else {
            if (isLeftMarginSet) wrapper.style.marginLeft = `${ml}px`;
            if (isRightMarginSet) wrapper.style.marginRight = `${mr}px`;
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    }
    else if (halign === 'Right') {
        if (!isRightMarginSet) {
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = '0';
        } else {
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
    else { // Stretch
        if (!comp.props.Width) wrapper.style.width = '100%';
        if (isLeftMarginSet) wrapper.style.marginLeft = `${ml}px`;
        if (isRightMarginSet) wrapper.style.marginRight = `${mr}px`;
    }

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

    wrapper.setAttribute('data-halign', halign);
    wrapper.setAttribute('data-valign', valign);
}

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
    constructor() {
        this.debouncedApply = Utils.debounce(this.applyCurrentProps.bind(this), 300);
    }

    renderComponentDOM(comp, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'component-item-wrapper';
        wrapper.setAttribute('data-id', comp.id);
        wrapper.setAttribute('data-type', comp.type);
        wrapper.setAttribute('draggable', 'true');
        if (comp.props.ToolTip) {
            wrapper.setAttribute('title', comp.props.ToolTip);
        }

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
            containerDiv.className = 'grid-component';

            let cols = [], rows = [];
            try { cols = JSON.parse(comp.props.ColumnsDefinition || "[]"); } catch (e) { cols = []; }
            try { rows = JSON.parse(comp.props.RowsDefinition || "[]"); } catch (e) { rows = []; }

            const gridTemplateColumns = cols.map(col => {
                if (col.width === 'Auto') return 'auto';
                if (col.width && typeof col.width === 'string' && col.width.endsWith('*')) {
                    const frac = parseFloat(col.width) || 1;
                    return `${frac}fr`;
                }
                const widthVal = col.width ? parseFloat(col.width) : 1;
                return isNaN(widthVal) ? '1fr' : `${widthVal}px`;
            }).join(' ');

            const gridTemplateRows = rows.map(row => {
                if (row.height === 'Auto') return 'auto';
                if (row.height && typeof row.height === 'string' && row.height.endsWith('*')) {
                    const frac = parseFloat(row.height) || 1;
                    return `${frac}fr`;
                }
                const heightVal = row.height ? parseFloat(row.height) : 1;
                return isNaN(heightVal) ? '1fr' : `${heightVal}px`;
            }).join(' ');

            containerDiv.style.display = 'grid';
            containerDiv.style.gap = '8px';
            containerDiv.style.backgroundColor = 'var(--bg-card)';
            containerDiv.style.border = '1px dashed var(--border)';
            containerDiv.style.padding = '8px';
            containerDiv.style.minHeight = '60px';
            if (gridTemplateColumns && gridTemplateColumns.trim() !== '') {
                containerDiv.style.gridTemplateColumns = gridTemplateColumns;
            } else {
                containerDiv.style.gridTemplateColumns = '1fr';
            }
            if (gridTemplateRows && gridTemplateRows.trim() !== '') {
                containerDiv.style.gridTemplateRows = gridTemplateRows;
            } else {
                containerDiv.style.gridTemplateRows = 'auto';
            }

            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-size:0.7rem; color:var(--text-light); margin-bottom:8px; grid-column:1/-1; display:flex; align-items:center; gap:8px;';
            labelDiv.innerHTML = `<i class="fas fa-th"></i> 网格布局 (${cols.length}列 × ${rows.length}行)`;
            containerDiv.appendChild(labelDiv);

            containerDiv.classList.add('nested-dropzone');
            containerDiv.setAttribute('data-parent-id', comp.id);
            wrapper.appendChild(containerDiv);

            for (let child of comp.children) {
                const tempContainer = document.createElement('div');
                this.renderComponentDOM(child, tempContainer);
                let childWrapper = tempContainer.firstChild;
                if (childWrapper) {
                    const gridRow = child.props['Grid.Row'];
                    const gridColumn = child.props['Grid.Column'];
                    const rowSpan = child.props['Grid.RowSpan'];
                    const colSpan = child.props['Grid.ColumnSpan'];

                    if (gridRow !== undefined && gridRow !== null && gridRow !== '') {
                        const rowIdx = parseInt(gridRow);
                        if (!isNaN(rowIdx)) {
                            childWrapper.style.gridRowStart = rowIdx + 1;
                            if (rowSpan && !isNaN(parseInt(rowSpan))) {
                                childWrapper.style.gridRowEnd = `span ${parseInt(rowSpan)}`;
                            } else {
                                childWrapper.style.gridRowEnd = `span 1`;
                            }
                        }
                    } else {
                        childWrapper.style.gridRowStart = 'auto';
                        childWrapper.style.gridRowEnd = 'span 1';
                    }

                    if (gridColumn !== undefined && gridColumn !== null && gridColumn !== '') {
                        const colIdx = parseInt(gridColumn);
                        if (!isNaN(colIdx)) {
                            childWrapper.style.gridColumnStart = colIdx + 1;
                            if (colSpan && !isNaN(parseInt(colSpan))) {
                                childWrapper.style.gridColumnEnd = `span ${parseInt(colSpan)}`;
                            } else {
                                childWrapper.style.gridColumnEnd = `span 1`;
                            }
                        }
                    } else {
                        childWrapper.style.gridColumnStart = 'auto';
                        childWrapper.style.gridColumnEnd = 'span 1';
                    }

                    childWrapper.style.position = 'relative';
                    childWrapper.style.margin = '0';
                    containerDiv.appendChild(childWrapper);
                }
            }
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
                // ----- 图片组件增强：支持 LoadingSource、FallbackSource、EnableCache -----
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.position = 'relative';
                wrapperDiv.style.display = 'inline-block';

                const img = document.createElement('img');
                img.style.maxWidth = '100%';
                if (comp.props.Height) img.style.height = comp.props.Height;

                // 标准化所有图片 URL
                const targetSrc = Utils.normalizeImageUrl(comp.props.Source || '');
                const fallbackSrc = Utils.normalizeImageUrl(comp.props.FallbackSource || '');
                const loadingSrc = Utils.normalizeImageUrl(comp.props.LoadingSource || '');

                // 设置占位图
                if (loadingSrc && Utils.isSafeUrl(loadingSrc)) {
                    img.src = loadingSrc;
                }

                // 加载实际图片
                if (targetSrc && Utils.isSafeUrl(targetSrc)) {
                    const actualImg = new Image();
                    actualImg.onload = function() {
                        img.src = targetSrc;
                        img.onerror = null;
                    };
                    actualImg.onerror = function() {
                        if (fallbackSrc && Utils.isSafeUrl(fallbackSrc)) {
                            img.src = fallbackSrc;
                        } else {
                            // 内置默认占位图（转换为标准化路径）
                            const defaultPlaceholder = Utils.normalizeImageUrl('pack://application:,,,/images/Icons/NoIcon.png');
                            img.src = defaultPlaceholder || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/%3E%3C/svg%3E';
                        }
                    };
                    actualImg.src = targetSrc;
                } else if (fallbackSrc && Utils.isSafeUrl(fallbackSrc)) {
                    img.src = fallbackSrc;
                }

                // 处理 EnableCache
                if (comp.props.EnableCache === 'False') {
                    img.setAttribute('data-no-cache', 'true');
                    // 添加时间戳避免缓存
                    img.src += (img.src.includes('?') ? '&' : '?') + '_t=' + Date.now();
                }

                wrapperDiv.appendChild(img);
                innerContainer.appendChild(wrapperDiv);
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
                // ----- 列表项 Logo 渲染，支持图片预览 -----
                const itemDiv = document.createElement('div');
                itemDiv.className = 'list-item-mock';

                const logoContainer = document.createElement('div');
                logoContainer.style.width = '32px';
                logoContainer.style.height = '32px';
                logoContainer.style.flexShrink = '0';
                logoContainer.style.marginRight = '12px';
                logoContainer.style.display = 'flex';
                logoContainer.style.alignItems = 'center';
                logoContainer.style.justifyContent = 'center';

                const logoImg = document.createElement('img');
                logoImg.style.maxWidth = '100%';
                logoImg.style.maxHeight = '100%';
                logoImg.style.objectFit = 'contain';

                // 标准化 Logo URL
                const logoVal = Utils.normalizeImageUrl(comp.props.Logo || '');
                const defaultIcon = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%23666" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/%3E%3C/svg%3E';

                if (logoVal && Utils.isSafeUrl(logoVal)) {
                    logoImg.src = logoVal;
                    logoImg.onerror = function() {
                        this.src = defaultIcon;
                    };
                } else {
                    logoImg.src = defaultIcon;
                }

                logoContainer.appendChild(logoImg);

                const contentDiv = document.createElement('div');
                contentDiv.style.flex = '1';
                const titleStrong = document.createElement('strong');
                titleStrong.textContent = comp.props.Title || '';
                const infoSpan = document.createElement('div');
                infoSpan.style.fontSize = '12px';
                infoSpan.textContent = comp.props.Info || '';
                contentDiv.appendChild(titleStrong);
                contentDiv.appendChild(infoSpan);

                itemDiv.appendChild(logoContainer);
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
            if (!parentWrapper) {
                const wrapper = document.querySelector(`.component-item-wrapper[data-id="${parentId}"]`);
                if (wrapper) {
                    parentWrapper = wrapper.querySelector('.grid-component');
                    if (parentWrapper && parentWrapper.classList.contains('nested-dropzone')) {
                        // ok
                    } else {
                        parentWrapper = null;
                    }
                }
            }
        }
        if (!parentWrapper) {
            this.renderCanvas();
            return;
        }
        const tempContainer = document.createElement('div');
        this.renderComponentDOM(comp, tempContainer);
        const newComponentNode = tempContainer.firstChild;
        if (newComponentNode) {
            const childrenWrappers = Array.from(parentWrapper.querySelectorAll(':scope > .component-item-wrapper, :scope > .grid-component > .component-item-wrapper'));
            const actualChildren = childrenWrappers.filter(el => el.classList && el.classList.contains('component-item-wrapper'));
            const refNode = actualChildren[insertIndex] || null;
            if (refNode) {
                parentWrapper.insertBefore(newComponentNode, refNode);
            } else {
                parentWrapper.appendChild(newComponentNode);
            }
            const parentComp = ComponentFinder.findComponentById(parentId);
            if (parentComp && parentComp.type === 'grid') {
                const newComp = ComponentFinder.findComponentById(comp.id);
                if (newComp) {
                    if (newComp.props['Grid.Row'] === undefined) newComp.props['Grid.Row'] = '0';
                    if (newComp.props['Grid.Column'] === undefined) newComp.props['Grid.Column'] = '0';
                    this.refreshComponent(comp.id);
                }
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

        const total = App.state.components.length;
        const BATCH_SIZE = 50;
        let index = 0;
        const fragment = document.createDocumentFragment();

        if (total > 100) {
            const loading = document.createElement('div');
            loading.id = 'renderLoading';
            loading.style.cssText = 'text-align:center;padding:40px;color:var(--text-secondary)';
            loading.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 加载组件中...';
            canvas.appendChild(loading);
        }

        const renderBatch = () => {
            const end = Math.min(index + BATCH_SIZE, total);
            for (; index < end; index++) {
                this.renderComponentDOM(App.state.components[index], fragment);
            }
            if (index < total) {
                requestAnimationFrame(renderBatch);
            } else {
                const loadingEl = document.getElementById('renderLoading');
                if (loadingEl) loadingEl.remove();
                canvas.appendChild(fragment);
                if (App.state.selectedId) {
                    const selEl = document.querySelector(`[data-id="${App.state.selectedId}"]`);
                    if (selEl) selEl.classList.add('selected');
                }
                this.updateHierarchyBar();
                this.updatePropsPanel();
            }
        };
        renderBatch();
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
                    this.debouncedApply();
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

    updateComponentMargin(compId, marginStr) {
        const comp = ComponentFinder.findComponentById(compId);
        if (!comp) return;
        const wrapper = document.querySelector(`.component-item-wrapper[data-id="${compId}"]`);
        if (!wrapper) return;

        comp.props.Margin = marginStr;
        applyLayoutStyles(wrapper, comp);
        App.markDirty();
    }

    openGridEditor(gridComp) {
        let cols = [];
        let rows = [];
        try { cols = JSON.parse(gridComp.props.ColumnsDefinition || "[]"); } catch (e) { cols = []; }
        try { rows = JSON.parse(gridComp.props.RowsDefinition || "[]"); } catch (e) { rows = []; }

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
                let unit = 'px', val = 100, minVal = '', maxVal = '';
                if (type === 'col') {
                    const w = item.width;
                    if (w === 'Auto') unit = 'auto';
                    else if (w && w.endsWith('*')) { unit = 'star'; val = parseFloat(w); if (isNaN(val)) val = 1; }
                    else { unit = 'px'; val = parseFloat(w); if (isNaN(val)) val = 100; }
                    minVal = item.minWidth || '';
                    maxVal = item.maxWidth || '';
                } else {
                    const h = item.height;
                    if (h === 'Auto') unit = 'auto';
                    else if (h && h.endsWith('*')) { unit = 'star'; val = parseFloat(h); if (isNaN(val)) val = 1; }
                    else { unit = 'px'; val = parseFloat(h); if (isNaN(val)) val = 100; }
                    minVal = item.minHeight || '';
                    maxVal = item.maxHeight || '';
                }

                const div = document.createElement('div');
                div.className = 'grid-def-item';
                div.draggable = true;
                div.setAttribute('data-index', idx);
                div.setAttribute('data-type', type);
                div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center; background:var(--bg-subtle); padding:6px 10px; border-radius:var(--radius-md); cursor:grab;';
                div.innerHTML = `
                    <span style="cursor:grab; color:var(--text-tertiary);"><i class="fas fa-grip-vertical"></i></span>
                    <select class="grid-unit" data-type="${type}" data-index="${idx}">
                        <option value="px" ${unit === 'px' ? 'selected' : ''}>像素(px)</option>
                        <option value="star" ${unit === 'star' ? 'selected' : ''}>星(*)</option>
                        <option value="auto" ${unit === 'auto' ? 'selected' : ''}>自动</option>
                    </select>
                    <input class="grid-value" data-type="${type}" data-index="${idx}" value="${val}" ${unit === 'auto' ? 'disabled' : ''} style="width:80px;">
                    <input class="grid-min" placeholder="Min" data-type="${type}" data-index="${idx}" value="${Utils.escapeHtmlAttr(minVal)}" style="width:70px;">
                    <input class="grid-max" placeholder="Max" data-type="${type}" data-index="${idx}" value="${Utils.escapeHtmlAttr(maxVal)}" style="width:70px;">
                    <button class="grid-copy" data-type="${type}" data-index="${idx}" title="复制此定义" style="background:none; border:none; color:var(--primary);"><i class="fas fa-copy"></i></button>
                    <button class="grid-del" data-type="${type}" data-index="${idx}" style="background:none; border:none; color:red;"><i class="fas fa-trash"></i></button>
                `;
                container.appendChild(div);
            });

            container.querySelectorAll('.grid-def-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: item.getAttribute('data-type'),
                        index: parseInt(item.getAttribute('data-index'))
                    }));
                });
                item.addEventListener('dragover', (e) => e.preventDefault());
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const fromType = data.type;
                    const fromIdx = data.index;
                    const toIdx = parseInt(item.getAttribute('data-index'));
                    if (fromType === type && fromIdx !== toIdx) {
                        const listRef = (type === 'col') ? cols : rows;
                        const [removed] = listRef.splice(fromIdx, 1);
                        listRef.splice(toIdx, 0, removed);
                        renderList(containerId, listRef, type);
                        updateDefinition();
                    }
                });
            });

            container.querySelectorAll('.grid-copy').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-index'));
                    const listRef = (type === 'col') ? cols : rows;
                    const clone = JSON.parse(JSON.stringify(listRef[idx]));
                    listRef.splice(idx + 1, 0, clone);
                    renderList(containerId, listRef, type);
                    updateDefinition();
                });
            });

            container.querySelectorAll('.grid-del').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-index'));
                    const listRef = (type === 'col') ? cols : rows;
                    listRef.splice(idx, 1);
                    renderList(containerId, listRef, type);
                    updateDefinition();
                });
            });
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

        modal.addEventListener('input', (e) => {
            if (e.target.closest('.grid-def-item')) {
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

        // 扩展内容键包含图片新属性
        const specificContentKeys = ["Text", "Title", "Info", "Source", "Logo", "FallbackSource", "LoadingSource"];
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

        const oldProps = { ...comp.props };
        const oldEvents = { ...comp.events };
        const oldCustom = { ...comp.customProps };

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

        const changedProps = {};
        for (let key in comp.props) {
            if (oldProps[key] !== comp.props[key]) {
                changedProps[key] = comp.props[key];
            }
        }
        if (Object.keys(changedProps).length > 0) {
            const oldChanged = {};
            for (let key in changedProps) {
                oldChanged[key] = oldProps[key];
            }
            App.history.recordAction({
                type: ActionType.UPDATE_PROPS,
                componentId: comp.id,
                newProps: changedProps,
                oldProps: oldChanged
            });
        }

        if (JSON.stringify(oldEvents) !== JSON.stringify(comp.events)) {
            App.history.recordAction({
                type: ActionType.UPDATE_EVENTS,
                componentId: comp.id,
                newEvents: { ...comp.events },
                oldEvents: { ...oldEvents }
            });
        }

        if (JSON.stringify(oldCustom) !== JSON.stringify(comp.customProps)) {
            App.history.recordAction({
                type: ActionType.UPDATE_CUSTOM_PROPS,
                componentId: comp.id,
                newCustom: { ...comp.customProps },
                oldCustom: { ...oldCustom }
            });
        }

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