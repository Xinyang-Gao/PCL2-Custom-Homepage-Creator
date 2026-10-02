// 属性面板：分组属性编辑、Margin 可视化、事件绑定、标记插入、Grid 编辑器
import type { ComponentModel, PropGroup, PropField, ColumnDef, RowDef } from '../core/types';
import { getSpec, getSelectOptions, PROP_GROUP_DEFS } from '../components/specs';
import { findComponentById } from '../components/tree';
import { store } from '../core/store';
import { history, ActionType } from '../core/history';
import { formatMargin, parseMargin } from './layout';
import { escapeHtml, escapeAttr } from '../util/dom';
import { getEventTypeDoc, getEventTypesByCategory } from '../xaml/eventTypes';
import { getMarkerGroups } from '../xaml/markers';
import { toast } from '../ui/toast';
import { renderManager } from './renderManager';

class PropsPanel {
    private applyDebounce: ReturnType<typeof setTimeout> | null = null;

    /** 输入防抖后应用（用于 input 事件） */
    scheduleApply(): void {
        if (this.applyDebounce) clearTimeout(this.applyDebounce);
        this.applyDebounce = setTimeout(() => this.apply(), 300);
    }

    update(): void {
        const comp = findComponentById(store.selectedId);
        const nameEl = document.getElementById('compTypeName');
        const idEl = document.getElementById('compIdDisplay');
        const container = document.getElementById('dynamicProps');
        if (!nameEl || !idEl || !container) return;

        nameEl.textContent = comp ? (getSpec(comp.type)?.name || comp.type) : '未选中';
        idEl.textContent = comp ? `#${comp.id}` : '-';

        this.updateEventSection(comp);

        if (!comp) {
            container.innerHTML = '';
            return;
        }

        const selectedId = comp.id;
        const groups = this.getPropGroups(comp);
        const build = () => {
            const current = findComponentById(store.selectedId);
            if (!current || current.id !== selectedId) return;
            const fragment = document.createDocumentFragment();
            for (const group of groups) {
                fragment.appendChild(this.buildGroup(group, current));
            }
            container.innerHTML = '';
            container.appendChild(fragment);
        };
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(build, { timeout: 50 });
        } else {
            build();
        }
    }

    // ================== 事件绑定区域 ==================

    private updateEventSection(comp: ComponentModel | null): void {
        const select = document.getElementById('eventTypeSelect') as HTMLSelectElement | null;
        const dataInput = document.getElementById('eventDataInput') as HTMLTextAreaElement | null;
        const hint = document.getElementById('eventParamHint');
        if (!select || !dataInput) return;

        if (!comp) {
            select.value = '';
            dataInput.value = '';
            dataInput.placeholder = '事件数据';
            if (hint) hint.innerHTML = '';
            return;
        }

        // 分组下拉
        select.innerHTML = '<option value="">无</option>';
        for (const { category, items } of getEventTypesByCategory()) {
            const og = document.createElement('optgroup');
            og.label = category;
            for (const doc of items) {
                const opt = document.createElement('option');
                opt.value = doc.type;
                opt.textContent = doc.type;
                og.appendChild(opt);
            }
            select.appendChild(og);
        }
        select.value = comp.events.type || '';
        dataInput.value = comp.events.data || '';
        this.refreshEventHint();
    }

    /** 根据当前 EventType 显示参数说明与占位提示 */
    refreshEventHint(): void {
        const select = document.getElementById('eventTypeSelect') as HTMLSelectElement | null;
        const dataInput = document.getElementById('eventDataInput') as HTMLTextAreaElement | null;
        const hint = document.getElementById('eventParamHint');
        if (!select || !dataInput || !hint) return;

        const doc = getEventTypeDoc(select.value);
        if (!doc) {
            dataInput.placeholder = '事件数据';
            hint.innerHTML = '';
            return;
        }
        dataInput.placeholder = doc.placeholder;

        let html = `<div class="event-desc"><i class="fas fa-info-circle"></i> ${escapeHtml(doc.desc)}</div>`;
        if (doc.since) html += `<div class="event-since"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(doc.since)}</div>`;
        if (doc.params.length) {
            html += '<ul class="event-params">';
            for (const p of doc.params) {
                html += `<li><code>${escapeHtml(p.name)}</code>${p.required ? '<em>必填</em>' : '<em class="opt">可选</em>'} — ${escapeHtml(p.desc)}${p.example ? ` <span class="eg">例：${escapeHtml(p.example)}</span>` : ''}</li>`;
            }
            html += '</ul>';
        } else {
            html += '<div class="event-noparam"><em>无参数</em></div>';
        }
        hint.innerHTML = html;
    }

    // ================== 属性分组 ==================

    private getPropGroups(comp: ComponentModel): PropGroup[] {
        const buckets = new Map<string, PropField[]>();
        const order: string[] = [];
        const addTo = (title: string, field: PropField) => {
            if (!buckets.has(title)) {
                buckets.set(title, []);
                order.push(title);
            }
            buckets.get(title)!.push(field);
        };

        const groupOf = (key: string): string => {
            for (const g of PROP_GROUP_DEFS) if (g.keys.includes(key)) return g.title;
            return '其他';
        };

        for (const [key, val] of Object.entries(comp.props)) {
            // Grid 定义字段不直接展示（由可视化编辑器处理）
            if (key === 'ColumnsDefinition' || key === 'RowsDefinition') continue;
            // 只显示当前组件类型默认属性 + 通用布局属性，避免展示空的无关默认值
            addTo(groupOf(key), { key, val });
        }

        const groups: PropGroup[] = order.map(title => {
            const def = PROP_GROUP_DEFS.find(g => g.title === title);
            return {
                title,
                icon: def?.icon || 'fas fa-circle',
                fields: buckets.get(title)!
            };
        });

        // 通用置顶
        const common: PropField[] = [];
        if (comp.props.ToolTip !== undefined) common.push({ key: 'ToolTip', val: comp.props.ToolTip });
        if (comp.props.IsHitTestVisible !== undefined) common.push({ key: 'IsHitTestVisible', val: comp.props.IsHitTestVisible });
        if (common.length) groups.unshift({ title: '通用', icon: 'fas fa-cogs', fields: common });

        // Grid 编辑按钮
        if (comp.type === 'grid') {
            groups.push({ title: '网格结构', icon: 'fas fa-table', fields: [{ key: '_grid_editor', val: '' }] });
        }

        // 自定义属性
        const customFields: PropField[] = Object.entries(comp.customProps)
            .filter(([k]) => k !== '_unknownChildren')
            .map(([key, val]) => ({ key, val: String(val) }));
        if (customFields.length) {
            groups.push({ title: '自定义属性', icon: 'fas fa-tags', fields: customFields, kind: 'custom' });
        }
        groups.push({ title: '添加自定义属性', icon: 'fas fa-plus-circle', fields: [], kind: 'addCustom' });

        return groups;
    }

    private buildGroup(group: PropGroup, comp: ComponentModel): HTMLElement {
        const section = document.createElement('div');
        section.className = 'prop-section';
        section.innerHTML = `<div class="prop-section-title"><i class="${group.icon}"></i> ${escapeHtml(group.title)}</div>`;

        if (group.kind === 'custom') {
            for (const field of group.fields) {
                const row = document.createElement('div');
                row.className = 'prop-field custom-property-row';
                row.innerHTML = `
                    <div class="custom-prop-row-inner">
                        <input data-custom-key value="${escapeAttr(field.key)}" placeholder="属性名">
                        <input data-custom-val value="${escapeAttr(field.val)}" placeholder="属性值">
                        <button class="icon-btn danger delete-custom-prop" data-key="${escapeAttr(field.key)}" title="删除属性"><i class="fas fa-trash-alt"></i></button>
                    </div>`;
                section.appendChild(row);
            }
            return section;
        }

        if (group.kind === 'addCustom') {
            const div = document.createElement('div');
            div.className = 'prop-field';
            div.innerHTML = `
                <div class="add-custom-row">
                    <input type="text" id="newCustomKey" placeholder="新属性名">
                    <input type="text" id="newCustomVal" placeholder="属性值">
                    <button id="addCustomPropBtn" class="btn btn-sm"><i class="fas fa-plus"></i></button>
                </div>`;
            section.appendChild(div);
            return section;
        }

        for (const field of group.fields) {
            if (field.key === '_grid_editor') {
                const div = document.createElement('div');
                div.className = 'prop-field';
                div.innerHTML = `<button class="btn btn-primary btn-block" id="editGridLayoutBtn"><i class="fas fa-th"></i> 可视化编辑网格布局</button>`;
                section.appendChild(div);
                setTimeout(() => {
                    const btn = document.getElementById('editGridLayoutBtn');
                    if (btn) btn.onclick = () => this.openGridEditor(comp);
                }, 0);
                continue;
            }

            if (field.key === 'Margin') {
                section.appendChild(this.buildMarginEditor(field.val));
                continue;
            }

            section.appendChild(this.buildField(comp, field));
        }

        return section;
    }

    private buildField(comp: ComponentModel, field: PropField): HTMLElement {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'prop-field';

        const selectOptions = getSelectOptions(comp.type, field.key);
        const labelHtml = `<label>${escapeHtml(field.key)}${this.isMarkerField(field.key) ? ' <button type="button" class="marker-insert-btn" data-target-key="' + escapeAttr(field.key) + '" title="插入替换标记或主题色"><i class="fas fa-code"></i></button>' : ''}</label>`;

        if (selectOptions) {
            const options = selectOptions.includes(field.val) || field.val === '' ? selectOptions : [...selectOptions, field.val];
            fieldDiv.innerHTML = `${labelHtml}
                <select data-prop="${escapeAttr(field.key)}" class="prop-select">
                    ${options.map(opt => `<option value="${escapeAttr(opt)}" ${opt === field.val ? 'selected' : ''}>${opt === '' ? '（默认）' : escapeHtml(opt)}</option>`).join('')}
                </select>`;
            return fieldDiv;
        }

        const isLong = ['Text', 'Info', 'Data', 'Source', 'Logo', 'Foreground', 'Fill', 'Background'].includes(field.key);
        const inputHtml = isLong
            ? `<textarea data-prop="${escapeAttr(field.key)}" rows="2" class="prop-textarea">${escapeHtml(String(field.val))}</textarea>`
            : `<input data-prop="${escapeAttr(field.key)}" value="${escapeAttr(String(field.val))}" class="prop-input" />`;
        fieldDiv.innerHTML = `${labelHtml}${inputHtml}`;
        return fieldDiv;
    }

    /** 适合插入替换标记的字段 */
    private isMarkerField(key: string): boolean {
        return ['Text', 'Source', 'Logo', 'Title', 'Info', 'Foreground', 'Fill', 'Background', 'Data', 'FallbackSource'].includes(key);
    }

    // ================== Margin 可视化编辑 ==================

    private buildMarginEditor(value: string): HTMLElement {
        const [left, top, right, bottom] = parseMargin(value);
        const group = document.createElement('div');
        group.className = 'margin-visual-group';
        const row = (dir: 'left' | 'top' | 'right' | 'bottom', icon: string, label: string, val: number) => `
            <div class="margin-row">
                <span class="margin-label"><i class="fas fa-${icon}"></i> ${label}</span>
                <input type="range" class="margin-slider" data-margin="${dir}" min="-100" max="200" step="1" value="${val}">
                <input type="number" class="margin-number" data-margin="${dir}" value="${val}" step="1">
            </div>`;
        group.innerHTML = `
            ${row('left', 'arrow-left', '左', left)}
            ${row('top', 'arrow-up', '上', top)}
            ${row('right', 'arrow-right', '右', right)}
            ${row('bottom', 'arrow-down', '下', bottom)}
            <div class="margin-preview">当前边距：<code>${escapeHtml(formatMargin(left, top, right, bottom))}</code></div>`;

        const readValue = (dir: string): number => {
            const num = group.querySelector<HTMLInputElement>(`.margin-number[data-margin="${dir}"]`);
            const n = num ? parseFloat(num.value) : NaN;
            return isNaN(n) ? 0 : n;
        };

        const update = () => {
            const str = formatMargin(readValue('left'), readValue('top'), readValue('right'), readValue('bottom'));
            const preview = group.querySelector('.margin-preview code');
            if (preview) preview.textContent = str;
            this.scheduleApply();
        };

        group.querySelectorAll<HTMLInputElement>('.margin-slider, .margin-number').forEach(input => {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const dir = target.dataset.margin!;
                const peer = group.querySelector<HTMLInputElement>(
                    target.classList.contains('margin-slider') ? `.margin-number[data-margin="${dir}"]` : `.margin-slider[data-margin="${dir}"]`
                );
                if (peer) peer.value = target.value;
                update();
            });
        });
        return group;
    }

    // ================== 应用属性 ==================

    apply(): void {
        const comp = findComponentById(store.selectedId);
        if (!comp) return;

        const oldProps = { ...comp.props };
        const oldEvents = { ...comp.events };
        const oldCustom = { ...comp.customProps };

        // 1. 常规属性
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('#dynamicProps [data-prop]').forEach(inp => {
            const key = inp.dataset.prop;
            if (key) comp.props[key] = inp.value;
        });

        // 2. Margin
        const ml = document.querySelector<HTMLInputElement>('#dynamicProps .margin-number[data-margin="left"]');
        const mt = document.querySelector<HTMLInputElement>('#dynamicProps .margin-number[data-margin="top"]');
        const mr = document.querySelector<HTMLInputElement>('#dynamicProps .margin-number[data-margin="right"]');
        const mb = document.querySelector<HTMLInputElement>('#dynamicProps .margin-number[data-margin="bottom"]');
        if (ml && mt && mr && mb) {
            const n = (el: HTMLInputElement) => { const v = parseFloat(el.value); return isNaN(v) ? 0 : v; };
            comp.props.Margin = formatMargin(n(ml), n(mt), n(mr), n(mb));
        }

        // 3. 事件
        const evSelect = document.getElementById('eventTypeSelect') as HTMLSelectElement | null;
        const evData = document.getElementById('eventDataInput') as HTMLTextAreaElement | null;
        if (evSelect && evData) {
            comp.events = { type: evSelect.value, data: evData.value };
        }

        // 4. 自定义属性行
        const newCustom: Record<string, string> = {};
        document.querySelectorAll<HTMLElement>('.custom-property-row').forEach(row => {
            const keyInput = row.querySelector<HTMLInputElement>('input[data-custom-key]');
            const valInput = row.querySelector<HTMLInputElement>('input[data-custom-val]');
            if (keyInput && valInput && keyInput.value.trim()) {
                newCustom[keyInput.value.trim()] = valInput.value;
            }
        });
        const extraKey = (document.getElementById('newCustomKey') as HTMLInputElement | null)?.value.trim();
        const extraVal = (document.getElementById('newCustomVal') as HTMLInputElement | null)?.value;
        if (extraKey) {
            newCustom[extraKey] = extraVal || '';
            const k = document.getElementById('newCustomKey') as HTMLInputElement | null;
            const v = document.getElementById('newCustomVal') as HTMLInputElement | null;
            if (k) k.value = '';
            if (v) v.value = '';
        }
        comp.customProps = { ...newCustom, ...(Array.isArray(oldCustom._unknownChildren) ? { _unknownChildren: oldCustom._unknownChildren } : {}) };

        // 5. 记录历史
        const changedProps: Record<string, string> = {};
        const oldChanged: Record<string, string> = {};
        for (const key of Object.keys(comp.props)) {
            if (oldProps[key] !== comp.props[key]) {
                changedProps[key] = comp.props[key];
                oldChanged[key] = oldProps[key];
            }
        }
        if (Object.keys(changedProps).length) {
            history.record({ type: ActionType.UPDATE_PROPS, componentId: comp.id, newProps: changedProps, oldProps: oldChanged });
        }
        if (JSON.stringify(oldEvents) !== JSON.stringify(comp.events)) {
            history.record({ type: ActionType.UPDATE_EVENTS, componentId: comp.id, newEvents: { ...comp.events }, oldEvents: { ...oldEvents } });
        }
        const customForHistory = { ...comp.customProps };
        delete (customForHistory as any)._unknownChildren;
        const oldForHistory = { ...oldCustom };
        delete (oldForHistory as any)._unknownChildren;
        if (JSON.stringify(customForHistory) !== JSON.stringify(oldForHistory)) {
            history.record({ type: ActionType.UPDATE_CUSTOM_PROPS, componentId: comp.id, newCustom: customForHistory, oldCustom: oldForHistory });
        }

        renderManager.refreshComponent(comp.id);
        store.markDirty();
    }

    /** 无提示地应用（供防抖输入使用） */
    applySilent(): void {
        const before = JSON.stringify(findComponentById(store.selectedId)?.props || {});
        this.apply();
        const after = JSON.stringify(findComponentById(store.selectedId)?.props || {});
        if (before !== after) toast('属性已更新');
    }

    // ================== 替换标记插入 ==================

    openMarkerMenu(targetKey: string, anchor: HTMLElement): void {
        document.querySelectorAll('.marker-menu').forEach(m => m.remove());
        const input = document.querySelector<HTMLElement>(`#dynamicProps [data-prop="${targetKey}"]`);
        if (!input) return;

        const menu = document.createElement('div');
        menu.className = 'marker-menu';
        let html = `<div class="marker-menu-header"><i class="fas fa-code"></i> 插入替换标记</div>`;
        for (const { group, items } of getMarkerGroups()) {
            html += `<div class="marker-group-title">${escapeHtml(group)}</div>`;
            for (const m of items) {
                html += `<button class="marker-item" data-token="${escapeAttr(m.token)}" title="${escapeHtml(m.desc)}"><code>${escapeHtml(m.token)}</code><span>${escapeHtml(m.label)}</span></button>`;
            }
        }
        html += `<div class="marker-group-title">主题色</div>`;
        for (let i = 1; i <= 8; i++) {
            html += `<button class="marker-item brush-item" data-token="{DynamicResource ColorBrush${i}}" title="PCL 主题色浓度 ${i}">
                <span class="brush-swatch" data-brush="${i}"></span><code>ColorBrush${i}</code></button>`;
        }
        menu.innerHTML = html;

        document.body.appendChild(menu);
        const rect = anchor.getBoundingClientRect();
        menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 12)}px`;
        menu.style.left = `${Math.min(rect.left, window.innerWidth - menu.offsetWidth - 12)}px`;

        menu.querySelectorAll<HTMLElement>('.marker-item').forEach(item => {
            item.addEventListener('click', () => {
                this.insertAtCursor(input, item.dataset.token || '');
                menu.remove();
                this.scheduleApply();
            });
        });

        const close = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('mousedown', close);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', close), 0);
    }

    private insertAtCursor(el: HTMLElement, text: string): void {
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            el.value = el.value.slice(0, start) + text + el.value.slice(end);
            el.selectionStart = el.selectionEnd = start + text.length;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.focus();
        } else {
            // select 类字段：直接替换
            (el as HTMLInputElement).value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // ================== Grid 可视化编辑器 ==================

    openGridEditor(gridComp: ComponentModel): void {
        let cols: ColumnDef[] = [];
        let rows: RowDef[] = [];
        try { cols = JSON.parse(gridComp.props.ColumnsDefinition || '[]'); } catch { cols = []; }
        try { rows = JSON.parse(gridComp.props.RowsDefinition || '[]'); } catch { rows = []; }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 720px;">
                <h3><i class="fas fa-th"></i> 编辑网格布局</h3>
                <div class="grid-editor-cols">
                    <div class="grid-editor-pane">
                        <h4>列定义 <button id="addColBtn" class="btn btn-sm">+ 添加列</button></h4>
                        <div id="columnsEditor" class="grid-def-list"></div>
                    </div>
                    <div class="grid-editor-pane">
                        <h4>行定义 <button id="addRowBtn" class="btn btn-sm">+ 添加行</button></h4>
                        <div id="rowsEditor" class="grid-def-list"></div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="gridEditorSave" class="btn btn-primary">保存</button>
                    <button id="gridEditorCancel" class="btn">取消</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const parseUnit = (value: string | undefined, fallback: number) => {
            if (value === 'Auto') return { unit: 'auto', val: 0 };
            if (value && value.endsWith('*')) {
                const v = parseFloat(value);
                return { unit: 'star', val: isNaN(v) ? 1 : v };
            }
            const v = parseFloat(value || '');
            return { unit: 'px', val: isNaN(v) ? fallback : v };
        };

        const renderList = (containerId: string, list: (ColumnDef | RowDef)[], type: 'col' | 'row') => {
            const container = modal.querySelector<HTMLElement>(`#${containerId}`)!;
            container.innerHTML = '';
            if (!list.length) {
                container.innerHTML = '<div class="grid-def-empty">暂无定义（将使用默认 1 列）</div>';
                return;
            }
            list.forEach((item, idx) => {
                const raw = type === 'col' ? (item as ColumnDef).width : (item as RowDef).height;
                const minV = type === 'col' ? (item as ColumnDef).minWidth : (item as RowDef).minHeight;
                const maxV = type === 'col' ? (item as ColumnDef).maxWidth : (item as RowDef).maxHeight;
                const { unit, val } = parseUnit(raw, 100);

                const div = document.createElement('div');
                div.className = 'grid-def-item';
                div.draggable = true;
                div.dataset.index = String(idx);
                div.dataset.type = type;
                div.innerHTML = `
                    <span class="grid-def-grip"><i class="fas fa-grip-vertical"></i></span>
                    <select class="grid-unit">
                        <option value="px" ${unit === 'px' ? 'selected' : ''}>像素</option>
                        <option value="star" ${unit === 'star' ? 'selected' : ''}>星号(*)</option>
                        <option value="auto" ${unit === 'auto' ? 'selected' : ''}>自动</option>
                    </select>
                    <input class="grid-value" value="${unit === 'auto' ? '' : val}" ${unit === 'auto' ? 'disabled' : ''} placeholder="${type === 'col' ? '宽' : '高'}">
                    <input class="grid-min" placeholder="Min" value="${escapeAttr(minV || '')}">
                    <input class="grid-max" placeholder="Max" value="${escapeAttr(maxV || '')}">
                    <button class="icon-btn grid-copy" title="复制此定义"><i class="fas fa-copy"></i></button>
                    <button class="icon-btn danger grid-del" title="删除"><i class="fas fa-trash"></i></button>`;
                container.appendChild(div);
            });

            container.querySelectorAll<HTMLElement>('.grid-def-item').forEach(item => {
                item.addEventListener('dragstart', e => {
                    e.dataTransfer!.setData('text/plain', JSON.stringify({ type, index: Number(item.dataset.index) }));
                });
                item.addEventListener('dragover', e => e.preventDefault());
                item.addEventListener('drop', e => {
                    e.preventDefault();
                    try {
                        const data = JSON.parse(e.dataTransfer!.getData('text/plain'));
                        const target = Number(item.dataset.index);
                        const listRef = (type === 'col' ? cols : rows) as Array<ColumnDef | RowDef>;
                        if (data.type === type && data.index !== target) {
                            const [removed] = listRef.splice(data.index, 1);
                            listRef.splice(target, 0, removed);
                            if (type === 'col') cols = listRef as ColumnDef[];
                            else rows = listRef as RowDef[];
                            renderList(containerId, listRef, type);
                        }
                    } catch { /* ignore */ }
                });
            });

            container.querySelectorAll<HTMLElement>('.grid-copy').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const index = Number(btn.closest<HTMLElement>('.grid-def-item')!.dataset.index);
                    if (type === 'col') {
                        cols.splice(index + 1, 0, JSON.parse(JSON.stringify(cols[index])));
                        renderList(containerId, cols, type);
                    } else {
                        rows.splice(index + 1, 0, JSON.parse(JSON.stringify(rows[index])));
                        renderList(containerId, rows, type);
                    }
                };
            });
            container.querySelectorAll<HTMLElement>('.grid-del').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const index = Number(btn.closest<HTMLElement>('.grid-def-item')!.dataset.index);
                    if (type === 'col') {
                        cols.splice(index, 1);
                        renderList(containerId, cols, type);
                    } else {
                        rows.splice(index, 1);
                        renderList(containerId, rows, type);
                    }
                };
            });
        };

        const readValue = (item: HTMLElement, type: 'col' | 'row'): ColumnDef | RowDef => {
            const unit = item.querySelector<HTMLSelectElement>('.grid-unit')!.value;
            const val = item.querySelector<HTMLInputElement>('.grid-value')!.value.trim();
            const min = item.querySelector<HTMLInputElement>('.grid-min')!.value.trim();
            const max = item.querySelector<HTMLInputElement>('.grid-max')!.value.trim();
            const size = unit === 'auto' ? 'Auto'
                : unit === 'star' ? `${parseFloat(val) || 1}*`
                : `${parseFloat(val) || 100}`;
            if (type === 'col') {
                const def: ColumnDef = { width: size };
                if (min) def.minWidth = min;
                if (max) def.maxWidth = max;
                return def;
            }
            const def: RowDef = { height: size };
            if (min) def.minHeight = min;
            if (max) def.maxHeight = max;
            return def;
        };

        const collect = () => {
            cols = Array.from(modal.querySelectorAll<HTMLElement>('#columnsEditor .grid-def-item')).map(el => readValue(el, 'col') as ColumnDef);
            rows = Array.from(modal.querySelectorAll<HTMLElement>('#rowsEditor .grid-def-item')).map(el => readValue(el, 'row') as RowDef);
        };

        renderList('columnsEditor', cols, 'col');
        renderList('rowsEditor', rows, 'row');

        modal.querySelector<HTMLButtonElement>('#addColBtn')!.onclick = () => { cols.push({ width: '1*' }); renderList('columnsEditor', cols, 'col'); };
        modal.querySelector<HTMLButtonElement>('#addRowBtn')!.onclick = () => { rows.push({ height: '1*' }); renderList('rowsEditor', rows, 'row'); };

        modal.addEventListener('change', (e) => {
            if ((e.target as HTMLElement).closest('.grid-def-item')) {
                collect();
                const isRows = !!(e.target as HTMLElement).closest('#rowsEditor');
                renderList(isRows ? 'rowsEditor' : 'columnsEditor', isRows ? rows : cols, isRows ? 'row' : 'col');
            }
        });

        modal.querySelector<HTMLButtonElement>('#gridEditorSave')!.onclick = () => {
            collect();
            const oldCols = gridComp.props.ColumnsDefinition;
            const oldRows = gridComp.props.RowsDefinition;
            gridComp.props.ColumnsDefinition = JSON.stringify(cols);
            gridComp.props.RowsDefinition = JSON.stringify(rows);
            history.record({
                type: ActionType.UPDATE_PROPS,
                componentId: gridComp.id,
                newProps: { ColumnsDefinition: gridComp.props.ColumnsDefinition, RowsDefinition: gridComp.props.RowsDefinition },
                oldProps: { ColumnsDefinition: oldCols, RowsDefinition: oldRows }
            });
            renderManager.refreshComponent(gridComp.id);
            store.markDirty();
            modal.remove();
        };
        modal.querySelector<HTMLButtonElement>('#gridEditorCancel')!.onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
}

export const propsPanel = new PropsPanel();
