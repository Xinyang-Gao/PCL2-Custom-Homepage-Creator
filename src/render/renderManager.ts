// 画布渲染：组件 DOM 构建、选中、层级栏、批量渲染
import type { ComponentModel } from '../core/types';
import { getSpec } from '../components/specs';
import { findComponentById } from '../components/tree';
import { store } from '../core/store';
import { applyLayoutStyles, applyPaddingStyles, applyTextStyles, resolveBackground } from './layout';
import { isSafeUrl, normalizeImageUrl, escapeHtml } from '../util/dom';
import { colorBrush, resolveColorValue } from '../xaml/markers';
import { propsPanel } from './propsPanel';

class RenderManager {
    private debouncedRefreshProps: ReturnType<typeof setTimeout> | null = null;

    // ================== 组件 DOM 构建 ==================

    renderComponentDOM(comp: ComponentModel, container: HTMLElement | DocumentFragment): HTMLElement {
        const spec = getSpec(comp.type);
        const wrapper = document.createElement('div');
        wrapper.className = 'component-item-wrapper';
        wrapper.dataset.id = String(comp.id);
        wrapper.dataset.type = comp.type;
        wrapper.draggable = true;
        if (comp.props.ToolTip) wrapper.title = comp.props.ToolTip;

        applyLayoutStyles(wrapper, comp);
        (wrapper as any)._component = comp;

        switch (spec?.renderKind) {
            case 'card':
                this.renderCard(comp, wrapper);
                break;
            case 'stack':
                this.renderStack(comp, wrapper);
                break;
            case 'grid':
                this.renderGrid(comp, wrapper);
                break;
            default:
                this.renderLeaf(comp, wrapper);
        }

        container.appendChild(wrapper);
        return wrapper;
    }

    private makeDropzone(parentId: number, horizontal = false): HTMLDivElement {
        const dropzone = document.createElement('div');
        dropzone.className = 'nested-dropzone' + (horizontal ? ' horizontal' : '');
        dropzone.dataset.parentId = String(parentId);
        if (horizontal) {
            dropzone.style.display = 'flex';
            dropzone.style.flexWrap = 'wrap';
            dropzone.style.gap = '8px';
        }
        return dropzone;
    }

    private renderCard(comp: ComponentModel, wrapper: HTMLElement): void {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-component';

        const header = document.createElement('div');
        header.className = 'card-header';
        const title = document.createElement('span');
        title.textContent = comp.props.Title || '卡片';
        if (comp.props.CanSwap === 'False') title.classList.add('no-swap');
        const grip = document.createElement('div');
        grip.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        header.append(title, grip);

        const content = document.createElement('div');
        content.className = 'card-content';
        applyPaddingStyles(comp, content);
        if (resolveBackground(comp.props.Background || '')) {
            content.style.background = resolveBackground(comp.props.Background)!;
        }

        const dropzone = this.makeDropzone(comp.id);
        dropzone.dataset.placeholder = '将组件拖入卡片';
        content.appendChild(dropzone);
        cardDiv.append(header, content);
        wrapper.appendChild(cardDiv);

        for (const child of comp.children) this.renderComponentDOM(child, dropzone);
    }

    private renderStack(comp: ComponentModel, wrapper: HTMLElement): void {
        const horizontal = comp.type === 'horizontalstack' || comp.props.Orientation === 'Horizontal';
        const box = document.createElement('div');
        box.className = 'card-component stack-box';

        const label = document.createElement('div');
        label.className = 'stack-box-label';
        label.innerHTML = `<i class="fas fa-${horizontal ? 'arrows-alt-h' : 'align-justify'}"></i> ${horizontal ? '水平布局' : '垂直布局'}`;

        const dropzone = this.makeDropzone(comp.id, horizontal);
        box.append(label, dropzone);
        wrapper.appendChild(box);
        applyPaddingStyles(comp, box);

        for (const child of comp.children) this.renderComponentDOM(child, dropzone);
    }

    private renderGrid(comp: ComponentModel, wrapper: HTMLElement): void {
        const container = document.createElement('div');
        container.className = 'grid-component nested-dropzone';
        container.dataset.parentId = String(comp.id);

        let cols: Array<{ width: string; minWidth?: string; maxWidth?: string }> = [];
        let rows: Array<{ height: string; minHeight?: string; maxHeight?: string }> = [];
        try { cols = JSON.parse(comp.props.ColumnsDefinition || '[]'); } catch { cols = []; }
        try { rows = JSON.parse(comp.props.RowsDefinition || '[]'); } catch { rows = []; }

        const toTrack = (value: string | undefined, fallback: string): string => {
            if (!value) return fallback;
            if (value === 'Auto') return 'auto';
            if (value.endsWith('*')) {
                const frac = parseFloat(value);
                return `${isNaN(frac) ? 1 : frac}fr`;
            }
            const px = parseFloat(value);
            return isNaN(px) ? fallback : `${px}px`;
        };

        container.style.gridTemplateColumns = cols.length
            ? cols.map(c => toTrack(c.width, '1fr')).join(' ')
            : '1fr';
        container.style.gridTemplateRows = rows.length
            ? rows.map(r => toTrack(r.height, 'auto')).join(' ')
            : 'auto';

        const label = document.createElement('div');
        label.className = 'grid-label';
        label.innerHTML = `<i class="fas fa-th"></i> 网格布局 (${cols.length}列 × ${rows.length}行)`;
        container.appendChild(label);

        for (const child of comp.children) {
            const childWrapper = this.renderComponentDOM(child, document.createElement('div'));
            const row = parseInt(child.props['Grid.Row'] ?? '');
            const col = parseInt(child.props['Grid.Column'] ?? '');
            const rowSpan = parseInt(child.props['Grid.RowSpan'] ?? '');
            const colSpan = parseInt(child.props['Grid.ColumnSpan'] ?? '');

            childWrapper.style.gridRowStart = isNaN(row) ? 'auto' : String(row + 1);
            childWrapper.style.gridRowEnd = `span ${isNaN(rowSpan) ? 1 : rowSpan}`;
            childWrapper.style.gridColumnStart = isNaN(col) ? 'auto' : String(col + 1);
            childWrapper.style.gridColumnEnd = `span ${isNaN(colSpan) ? 1 : colSpan}`;
            childWrapper.style.position = 'relative';
            childWrapper.style.margin = '0';
            container.appendChild(childWrapper);
        }

        wrapper.appendChild(container);
    }

    private renderLeaf(comp: ComponentModel, wrapper: HTMLElement): void {
        const inner = document.createElement('div');
        inner.className = 'component-inner';

        switch (comp.type) {
            case 'text': {
                const div = document.createElement('div');
                div.className = 'text-leaf';
                div.textContent = comp.props.Text || '文本';
                applyTextStyles(div, comp);
                if (comp.props.Background) {
                    const bg = resolveBackground(comp.props.Background);
                    if (bg) {
                        div.style.background = bg;
                        div.style.padding = '2px 6px';
                        div.style.display = 'inline-block';
                    }
                }
                inner.appendChild(div);
                break;
            }
            case 'hint': {
                const div = document.createElement('div');
                div.className = `hint-${(comp.props.Theme || 'Blue').toLowerCase()}`;
                div.textContent = comp.props.Text || '';
                inner.appendChild(div);
                break;
            }
            case 'image':
                inner.appendChild(this.buildImage(comp));
                break;
            case 'button': {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn canvas-btn';
                const colorType = comp.props.ColorType || '';
                if (colorType) btn.classList.add(`btn-${colorType.toLowerCase()}`);
                btn.textContent = comp.props.Text || '按钮';
                if (comp.props.Height) btn.style.height = `${comp.props.Height}px`;
                if (comp.props.Padding) btn.style.padding = parseButtonPadding(comp.props.Padding);
                inner.appendChild(btn);
                break;
            }
            case 'textbutton': {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-text canvas-text-btn';
                btn.textContent = comp.props.Text || '文本按钮';
                inner.appendChild(btn);
                break;
            }
            case 'icontextbutton':
                inner.appendChild(this.buildIconTextButton(comp));
                break;
            case 'iconbutton':
                inner.appendChild(this.buildIconButton(comp));
                break;
            case 'listitem':
                inner.appendChild(this.buildListItem(comp));
                break;
            case 'path':
                inner.appendChild(this.buildPath(comp));
                break;
        }

        wrapper.appendChild(inner);
        applyPaddingStyles(comp, inner);
    }

    private buildImage(comp: ComponentModel): HTMLElement {
        const holder = document.createElement('div');
        holder.className = 'image-holder';

        const img = document.createElement('img');
        img.style.maxWidth = '100%';
        if (comp.props.Height) img.style.height = cssPx(comp.props.Height);

        const target = normalizeImageUrl(comp.props.Source || '');
        const fallback = normalizeImageUrl(comp.props.FallbackSource || '');
        const loading = normalizeImageUrl(comp.props.LoadingSource || '');

        if (loading && isSafeUrl(loading)) img.src = loading;

        const showFallbackOrPlaceholder = () => {
            if (fallback && isSafeUrl(fallback)) img.src = fallback;
            else img.src = PLACEHOLDER_SVG;
        };

        if (target && isSafeUrl(target)) {
            const probe = new Image();
            probe.onload = () => { img.src = target; };
            probe.onerror = showFallbackOrPlaceholder;
            probe.src = target;
            if (comp.props.EnableCache === 'False') {
                probe.src = target + (target.includes('?') ? '&' : '?') + '_t=' + Date.now();
            }
        } else if (fallback && isSafeUrl(fallback)) {
            img.src = fallback;
        } else {
            img.src = PLACEHOLDER_SVG;
        }

        img.onerror = showFallbackOrPlaceholder;
        holder.appendChild(img);
        return holder;
    }

    private buildIconTextButton(comp: ComponentModel): HTMLElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        const highlight = comp.props.ColorType === 'Highlight';
        btn.className = 'canvas-icontext-btn' + (highlight ? ' highlight' : '');
        const scale = parseFloat(comp.props.LogoScale || '1');
        const svg = buildSvgIcon(comp.props.Logo || '', isNaN(scale) ? 1 : scale, highlight ? '#ffffff' : 'currentColor');
        if (svg) btn.appendChild(svg);
        const span = document.createElement('span');
        span.textContent = comp.props.Text || '';
        btn.appendChild(span);
        if (comp.props.Height) btn.style.height = cssPx(comp.props.Height);
        return btn;
    }

    private buildIconButton(comp: ComponentModel): HTMLElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        const theme = comp.props.Theme || 'Color';
        btn.className = `canvas-icon-btn theme-${theme.toLowerCase()}`;
        const scale = parseFloat(comp.props.LogoScale || '1');
        const iconColor = theme === 'White' ? '#ffffff'
            : theme === 'Black' ? '#333333'
            : theme === 'Red' ? '#ef4444'
            : '#ffffff';
        const svg = buildSvgIcon(comp.props.Logo || '', isNaN(scale) ? 1 : scale, iconColor);
        if (svg) btn.appendChild(svg);
        return btn;
    }

    private buildListItem(comp: ComponentModel): HTMLElement {
        const item = document.createElement('div');
        item.className = 'list-item-mock' + (comp.props.Type === 'Clickable' ? ' clickable' : '');

        const logoBox = document.createElement('div');
        logoBox.className = 'list-item-logo';
        const img = document.createElement('img');
        const logo = normalizeImageUrl(comp.props.Logo || '');
        if (logo && isSafeUrl(logo)) {
            img.src = logo;
            img.onerror = () => { img.src = DEFAULT_LIST_ICON; };
        } else {
            img.src = DEFAULT_LIST_ICON;
        }
        logoBox.appendChild(img);

        const content = document.createElement('div');
        content.className = 'list-item-content';
        const title = document.createElement('strong');
        title.textContent = comp.props.Title || '';
        content.appendChild(title);
        if (comp.props.Info) {
            const info = document.createElement('div');
            info.textContent = comp.props.Info;
            content.appendChild(info);
        }

        item.append(logoBox, content);
        if (comp.props.Type === 'Clickable') {
            const arrow = document.createElement('i');
            arrow.className = 'fas fa-chevron-right list-item-arrow';
            item.appendChild(arrow);
        }
        return item;
    }

    private buildPath(comp: ComponentModel): HTMLElement {
        const holder = document.createElement('div');
        holder.className = 'path-holder';
        const w = comp.props.Width ? cssPx(comp.props.Width) : '24px';
        const h = comp.props.Height ? cssPx(comp.props.Height) : '24px';
        const fill = comp.props.Fill ? resolveColorValue(comp.props.Fill) : '#333';
        const data = comp.props.Data || '';
        holder.innerHTML = `<svg viewBox="0 0 1024 1024" width="${w}" height="${h}" style="display:block"><path fill="${escapeHtml(fill)}" d="${escapeHtml(data)}"/></svg>`;
        return holder;
    }

    // ================== 画布 ==================

    renderCanvas(): void {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        canvas.innerHTML = '';

        if (!store.components.length) {
            canvas.innerHTML = '<div class="empty-placeholder"><i class="fas fa-drag-drop"></i><p>从左侧拖拽组件至此</p></div>';
            this.updateHierarchyBar();
            propsPanel.update();
            return;
        }

        const total = store.components.length;
        const BATCH = 50;
        let index = 0;
        const fragment = document.createDocumentFragment();

        if (total > 100) {
            const loading = document.createElement('div');
            loading.id = 'renderLoading';
            loading.className = 'render-loading';
            loading.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 加载组件中...';
            canvas.appendChild(loading);
        }

        const renderBatch = () => {
            const end = Math.min(index + BATCH, total);
            for (; index < end; index++) {
                this.renderComponentDOM(store.components[index], fragment);
            }
            if (index < total) {
                requestAnimationFrame(renderBatch);
            } else {
                document.getElementById('renderLoading')?.remove();
                canvas.appendChild(fragment);
                this.restoreSelection();
                this.updateHierarchyBar();
                propsPanel.update();
            }
        };
        renderBatch();
    }

    private restoreSelection(): void {
        if (store.selectedId === null) return;
        document.querySelectorAll('.component-item-wrapper.selected').forEach(el => el.classList.remove('selected'));
        document.querySelector(`.component-item-wrapper[data-id="${store.selectedId}"]`)?.classList.add('selected');
    }

    refreshComponent(compId: number): void {
        const comp = findComponentById(compId);
        const oldWrapper = document.querySelector(`.component-item-wrapper[data-id="${compId}"]`);
        if (!comp || !oldWrapper || !oldWrapper.parentNode) {
            this.renderCanvas();
            return;
        }
        const container = document.createElement('div');
        const newWrapper = this.renderComponentDOM(comp, container);
        oldWrapper.parentNode.replaceChild(newWrapper, oldWrapper);
        if (store.selectedId === compId) {
            newWrapper.classList.add('selected');
            propsPanel.update();
        }
    }

    /** 新组件追加到指定父级 DOM（增量渲染，避免整树重绘） */
    appendComponentToParent(comp: ComponentModel, parentId: number | null, insertIndex: number | null): void {
        let parentEl: Element | null;
        if (parentId === null) {
            parentEl = document.getElementById('canvas');
            parentEl?.querySelector('.empty-placeholder')?.remove();
        } else {
            parentEl = document.querySelector(`.component-item-wrapper[data-id="${parentId}"] .nested-dropzone`);
        }
        if (!parentEl) {
            this.renderCanvas();
            return;
        }

        const container = document.createElement('div');
        const node = this.renderComponentDOM(comp, container);

        const siblings = Array.from(parentEl.children).filter(
            (el): el is HTMLElement => el.classList.contains('component-item-wrapper')
        );
        const ref = insertIndex !== null ? siblings[insertIndex] : null;
        parentEl.insertBefore(node, ref);

        // Grid 子元素：刷新整个 Grid，确保新增子元素带上行列定位样式
        if (parentId !== null) {
            const parent = findComponentById(parentId);
            if (parent?.type === 'grid') {
                if (comp.props['Grid.Row'] === undefined) comp.props['Grid.Row'] = '0';
                if (comp.props['Grid.Column'] === undefined) comp.props['Grid.Column'] = '0';
                this.refreshComponent(parentId);
                return;
            }
        }
    }

    selectComponent(id: number | null): void {
        store.selectedId = id;
        document.querySelectorAll('.component-item-wrapper.selected').forEach(el => el.classList.remove('selected'));
        if (id !== null) {
            document.querySelector(`.component-item-wrapper[data-id="${id}"]`)?.classList.add('selected');
        }
        propsPanel.update();
        this.updateHierarchyBar();
    }

    updateHierarchyBar(): void {
        const bar = document.getElementById('hierarchyBar');
        if (!bar) return;
        if (store.selectedId === null) {
            bar.innerHTML = '<span class="hierarchy-empty">未选中组件</span>';
            return;
        }
        const path: ComponentModel[] = [];
        let cur = findComponentById(store.selectedId);
        while (cur) {
            path.unshift(cur);
            cur = cur.parentId !== null ? findComponentById(cur.parentId) : null;
        }
        bar.innerHTML = path
            .map((c, i) => `${i > 0 ? ' <i class="fas fa-chevron-right"></i> ' : ''}<span class="hierarchy-item" data-id="${c.id}">${escapeHtml(c.name)} <code>#${c.id}</code></span>`)
            .join('');
        bar.querySelectorAll<HTMLElement>('.hierarchy-item').forEach(el => {
            el.addEventListener('click', () => this.selectComponent(parseInt(el.dataset.id || '', 10)));
        });
    }

    /** 属性变更后延迟刷新（避免输入过程中频繁重建面板） */
    schedulePropsRefresh(): void {
        if (this.debouncedRefreshProps) clearTimeout(this.debouncedRefreshProps);
        this.debouncedRefreshProps = setTimeout(() => {
            propsPanel.update();
            this.updateHierarchyBar();
        }, 100);
    }
}

function cssPx(v: string): string {
    return /^\d+(\.\d+)?$/.test(v.trim()) ? `${v.trim()}px` : v;
}

function parseButtonPadding(p: string): string {
    return p.split(',').map(s => `${parseFloat(s) || 0}px`).join(' ');
}

function buildSvgIcon(pathData: string, scale: number, color: string): SVGSVGElement | null {
    if (!pathData) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1024 1024');
    const size = Math.round(18 * scale);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.classList.add('icon-svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', color);
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
}

const PLACEHOLDER_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/%3E%3C/svg%3E';

const DEFAULT_LIST_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%23666" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/%3E%3C/svg%3E';

export const renderManager = new RenderManager();
export { colorBrush };
