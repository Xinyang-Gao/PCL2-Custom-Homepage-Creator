// UI 事件绑定：组件库、工具栏、弹窗、备份列表、差异对比
import { COMPONENT_SPECS } from '../components/specs';
import { componentManager } from '../components/manager';
import { store } from '../core/store';
import { history } from '../core/history';
import { renderManager } from '../render/renderManager';
import { propsPanel } from '../render/propsPanel';
import { dragDropManager } from '../components/dragDrop';
import { fileManager, updateLinkedFileInfo } from '../io/fileManager';
import { serverApi, type BackupInfo } from '../io/serverApi';
import { generateXAML } from '../xaml/generator';
import { importFromXAML } from '../xaml/parser';
import { toast } from '../ui/toast';
import { escapeAttr, escapeHtml } from '../util/dom';
import { setThemeColor, getThemeColor } from '../xaml/markers';

class UIManager {
    // ================== 组件库 ==================

    buildComponentLibrary(): void {
        const container = document.getElementById('componentsList');
        if (!container) return;
        container.innerHTML = '';

        const categories = ['容器', '基础', '控件', '图形'] as const;
        for (const category of categories) {
            const entries = Object.entries(COMPONENT_SPECS).filter(([, spec]) => spec.category === category);
            if (!entries.length) continue;
            const group = document.createElement('div');
            group.className = 'comp-group';
            group.innerHTML = `<div class="comp-group-title">${category}</div>`;
            for (const [key, spec] of entries) {
                const div = document.createElement('div');
                div.className = 'comp-item';
                div.dataset.type = key;
                div.draggable = true;
                div.innerHTML = `<i class="${spec.icon}"></i><span>${escapeHtml(spec.name)}</span><i class="fas fa-grip-vertical comp-item-grip"></i>`;
                div.title = `拖拽到画布添加：${spec.name}`;
                group.appendChild(div);
            }
            container.appendChild(group);
        }

        document.getElementById('compSearch')?.addEventListener('input', (e) => {
            const kw = (e.target as HTMLInputElement).value.trim().toLowerCase();
            document.querySelectorAll('.comp-item').forEach(item => {
                const text = (item.querySelector('span')?.textContent || '').toLowerCase();
                item.classList.toggle('hidden', kw !== '' && !text.includes(kw));
            });
            // 分组标题：组内全部隐藏时隐藏标题
            document.querySelectorAll('.comp-group').forEach(g => {
                const visible = g.querySelectorAll('.comp-item:not(.hidden)').length;
                g.classList.toggle('hidden', visible === 0);
            });
        });

        dragDropManager.initDragAndDrop();
    }

    // ================== 顶栏保存按钮 ==================

    updateSaveButton(): void {
        const btn = document.getElementById('openLocalFileBtn') as HTMLButtonElement;
        if (!btn) return;
        if (store.fileName && store.dirty) {
            btn.innerHTML = '<i class="fas fa-save"></i> 保存到文件';
            btn.classList.add('btn-primary');
            btn.disabled = false;
            btn.title = '保存到当前链接的文件';
            btn.onclick = () => void fileManager.saveToLinked();
        } else if (store.fileName && !store.dirty) {
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
            btn.onclick = () => void fileManager.openWithPicker();
        }
    }

    // ================== 主事件绑定 ==================

    bindUIEvents(): void {
        // 清空
        document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
            if (!store.components.length) return;
            if (confirm('清空所有组件？此操作可通过撤销恢复一次。')) {
                componentManager.clear();
                renderManager.renderCanvas();
                renderManager.updateHierarchyBar();
                propsPanel.update();
                toast('画布已清空');
            }
        });

        // 属性面板按钮
        document.getElementById('applyPropsBtn')?.addEventListener('click', () => propsPanel.applySilent());
        document.getElementById('deleteCompBtn')?.addEventListener('click', () => {
            if (store.selectedId !== null && confirm('删除组件？')) {
                componentManager.removeById(store.selectedId);
            }
        });
        document.getElementById('duplicateCompBtn')?.addEventListener('click', () => {
            if (store.selectedId !== null) componentManager.duplicate(store.selectedId);
        });
        document.getElementById('copyIdBtn')?.addEventListener('click', () => {
            const text = document.getElementById('compIdDisplay')?.textContent || '';
            if (text && text !== '-') {
                navigator.clipboard.writeText(text);
                toast(`已复制 ID: ${text}`);
            }
        });

        // 属性输入：防抖应用 + 事件区提示
        const dynamicProps = document.getElementById('dynamicProps');
        dynamicProps?.addEventListener('input', (e) => {
            if ((e.target as HTMLElement).closest('.margin-visual-group')) return;
            propsPanel.scheduleApply();
        });
        dynamicProps?.addEventListener('change', (e) => {
            if ((e.target as HTMLElement).closest('.margin-visual-group')) return;
            // 自定义属性删除
            const delBtn = (e.target as HTMLElement).closest?.('.delete-custom-prop') as HTMLElement | null;
            if (delBtn) {
                const row = delBtn.closest('.custom-property-row');
                row?.remove();
                propsPanel.scheduleApply();
                return;
            }
            if ((e.target as HTMLElement).matches('select[data-prop]')) propsPanel.apply();
        });
        dynamicProps?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const markerBtn = target.closest('.marker-insert-btn') as HTMLElement | null;
            if (markerBtn) {
                e.preventDefault();
                propsPanel.openMarkerMenu(markerBtn.dataset.targetKey!, markerBtn);
                return;
            }
            const delBtn = target.closest('.delete-custom-prop') as HTMLElement | null;
            if (delBtn) {
                delBtn.closest('.custom-property-row')?.remove();
                propsPanel.scheduleApply();
                return;
            }
            if (target.closest('#addCustomPropBtn')) {
                propsPanel.apply();
                propsPanel.update();
            }
        });

        // 事件区
        document.getElementById('eventTypeSelect')?.addEventListener('change', () => {
            propsPanel.refreshEventHint();
            propsPanel.apply();
        });
        document.getElementById('eventDataInput')?.addEventListener('blur', () => propsPanel.apply());

        // 源码编辑器
        document.getElementById('xamlExportBtn')?.addEventListener('click', () => {
            const area = document.getElementById('xamlCodeArea') as HTMLTextAreaElement;
            area.value = generateXAML(store.components);
            this.showModal('xamlModal');
        });
        document.getElementById('applyXamlBtn')?.addEventListener('click', () => {
            const source = (document.getElementById('xamlCodeArea') as HTMLTextAreaElement).value;
            if (!source.trim()) {
                toast('XAML 内容为空', true);
                return;
            }
            if (confirm('应用 XAML 源码将替换当前所有设计，是否继续？')) {
                const result = importFromXAML(source);
                if (result.ok) {
                    renderManager.renderCanvas();
                    history.reset();
                    this.hideModal('xamlModal');
                }
            }
        });
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.hideModal('xamlModal'));

        // 主题切换
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        });

        // 主题色设置
        document.getElementById('themeColorBtn')?.addEventListener('click', () => this.openThemeColorDialog());

        // 文件管理弹窗
        document.getElementById('serverManageBtn')?.addEventListener('click', async () => {
            this.showModal('serverModal');
            await this.renderBackupList();
            updateLinkedFileInfo();
        });
        document.getElementById('closeServerModalBtn')?.addEventListener('click', () => this.hideModal('serverModal'));
        document.getElementById('refreshBackupListBtn')?.addEventListener('click', () => void this.renderBackupList());
        document.getElementById('openLocalFilePickerBtn')?.addEventListener('click', () => void fileManager.openWithPicker());
        document.getElementById('saveToLocalFileBtn')?.addEventListener('click', () => void fileManager.saveToLinked());
        document.getElementById('saveAsLocalFileBtn')?.addEventListener('click', () => void fileManager.saveAs());
        // 注：openLocalFileBtn 的行为由 updateSaveButton() 统一接管（onclick），此处不再重复绑定

        // 弹窗标签页
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab')!;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(target)?.classList.add('active');
                if (target === 'local-tab') updateLinkedFileInfo();
            });
        });

        // 点击遮罩关闭
        document.addEventListener('click', (e) => {
            const modal = e.target as HTMLElement;
            if (modal.classList.contains('modal')) modal.style.display = 'none';
        });
    }

    showModal(id: string): void {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    }

    hideModal(id: string): void {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    // ================== 备份列表 ==================

    async renderBackupList(): Promise<void> {
        const container = document.getElementById('backupListContainer');
        if (!container) return;

        const keepSearch = (document.getElementById('backupSearchInput') as HTMLInputElement | null)?.value ?? '';
        let backups = await serverApi.getBackupList();

        const filter = keepSearch.toLowerCase();
        if (filter) backups = backups.filter(b => b.name.toLowerCase().includes(filter));

        container.innerHTML = `
            <div class="backup-toolbar">
                <input type="text" id="backupSearchInput" placeholder="搜索备份文件名..." value="${escapeAttr(keepSearch)}">
                <button id="batchDeleteBackupsBtn" class="btn btn-danger btn-sm"><i class="fas fa-trash-alt"></i> 批量删除</button>
                <button id="manualBackupBtn" class="btn btn-sm"><i class="fas fa-camera"></i> 手动备份</button>
            </div>
            ${backups.length ? `<div class="backup-items">${backups.map(b => this.backupItemHtml(b)).join('')}</div>`
            : `<div class="empty-placeholder" style="padding:24px"><i class="fas fa-cloud-upload-alt"></i><p>${filter ? '没有匹配的备份' : '暂无自动备份，编辑组件后将自动创建'}</p></div>`}`;

        const search = document.getElementById('backupSearchInput') as HTMLInputElement;
        search.addEventListener('input', () => {
            if (this.searchTimer) clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => void this.renderBackupList(), 250);
        });
        // 光标保持在末尾（重新渲染导致）
        search.setSelectionRange(search.value.length, search.value.length);

        document.getElementById('manualBackupBtn')?.addEventListener('click', async () => {
            await serverApi.manualBackup();
            void this.renderBackupList();
        });

        document.getElementById('batchDeleteBackupsBtn')?.addEventListener('click', async () => {
            const selected = Array.from(document.querySelectorAll<HTMLInputElement>('.backup-select:checked'))
                .map(cb => cb.dataset.name!);
            if (!selected.length) {
                toast('请至少选择一个备份', true);
                return;
            }
            if (confirm(`确定删除 ${selected.length} 个备份吗？此操作不可恢复。`)) {
                for (const name of selected) await serverApi.deleteBackup(name);
                toast(`已删除 ${selected.length} 个备份`);
                void this.renderBackupList();
            }
        });

        container.querySelectorAll<HTMLElement>('.diff-backup').forEach(btn => {
            btn.onclick = async () => {
                const content = await serverApi.getBackupContent(btn.dataset.name!);
                if (content) this.showDiffModal(content);
            };
        });

        container.querySelectorAll<HTMLElement>('.load-backup').forEach(btn => {
            btn.onclick = async () => {
                const name = btn.dataset.name!;
                const content = await serverApi.getBackupContent(name);
                if (!content) return;
                this.showDiffModal(content, async (confirmed) => {
                    if (confirmed) {
                        const ok = confirm(`加载备份 "${name}" 将替换当前所有组件，是否继续？`);
                        if (!ok) return;
                        const result = importFromXAML(content);
                        if (result.ok) {
                            renderManager.renderCanvas();
                            history.reset();
                            this.hideModal('serverModal');
                            toast(`已加载备份: ${name}`);
                        }
                    }
                });
            };
        });

        container.querySelectorAll<HTMLElement>('.delete-backup').forEach(btn => {
            btn.onclick = async () => {
                if (confirm(`确定删除备份 "${btn.dataset.name}" 吗？`)) {
                    await serverApi.deleteBackup(btn.dataset.name!);
                    void this.renderBackupList();
                }
            };
        });
    }

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    private backupItemHtml(b: BackupInfo): string {
        return `
            <div class="backup-item" data-name="${escapeAttr(b.name)}">
                <input type="checkbox" class="backup-select" data-name="${escapeAttr(b.name)}">
                <i class="fas fa-file-archive"></i>
                <div class="backup-meta">
                    <strong>${escapeHtml(b.name)}</strong>
                    <span>${escapeHtml(b.modified_str)} · ${(b.size / 1024).toFixed(1)} KB</span>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-sm diff-backup" data-name="${escapeAttr(b.name)}" title="对比当前设计"><i class="fas fa-code-branch"></i></button>
                    <button class="btn btn-sm load-backup" data-name="${escapeAttr(b.name)}"><i class="fas fa-undo"></i> 恢复</button>
                    <button class="btn btn-sm btn-danger delete-backup" data-name="${escapeAttr(b.name)}"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }

    // ================== 差异对比 ==================

    showDiffModal(backupContent: string, onConfirm?: (confirmed: boolean) => void): void {
        const currentLines = generateXAML(store.components).split('\n');
        const backupLines = backupContent.split('\n');
        const maxLen = Math.max(currentLines.length, backupLines.length);

        const renderSide = (lines: string[], other: string[]) => {
            let html = '<div class="diff-lines">';
            for (let i = 0; i < maxLen; i++) {
                const line = lines[i] ?? '';
                const isDiff = line !== (other[i] ?? '');
                html += `<div class="diff-line${isDiff ? ' changed' : ''}"><span class="diff-no">${i + 1}</span>${escapeHtml(line) || '&nbsp;'}</div>`;
            }
            return html + '</div>';
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content diff-modal-content">
                <h3><i class="fas fa-code-branch"></i> 差异对比</h3>
                <div class="diff-container">
                    <div class="diff-pane"><strong>当前设计</strong><div class="diff-body">${renderSide(currentLines, backupLines)}</div></div>
                    <div class="diff-pane"><strong>备份版本</strong><div class="diff-body">${renderSide(backupLines, currentLines)}</div></div>
                </div>
                <div class="modal-actions">
                    ${onConfirm ? '<button id="diffConfirmRestore" class="btn btn-primary"><i class="fas fa-check"></i> 恢复此备份</button>' : ''}
                    <button id="diffCancel" class="btn"><i class="fas fa-times"></i> 关闭</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#diffCancel')!.addEventListener('click', () => {
            onConfirm?.(false);
            close();
        });
        modal.querySelector('#diffConfirmRestore')?.addEventListener('click', () => {
            onConfirm?.(true);
            close();
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    }

    // ================== 主题色设置 ==================

    openThemeColorDialog(): void {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px;">
                <h3><i class="fas fa-palette"></i> 预览主题色</h3>
                <p class="modal-hint">用于预览 <code>{DynamicResource ColorBrush1-8}</code> 与 <code>{DynamicResource ColorBrushN}</code> 等主题色标记的实际效果。仅影响编辑器显示，不影响导出的 XAML。</p>
                <div class="theme-color-row">
                    <input type="color" id="themeColorInput" value="${escapeAttr(getThemeColor())}">
                    <div class="theme-brush-preview" id="themeBrushPreview"></div>
                </div>
                <div class="modal-actions">
                    <button id="themeColorSave" class="btn btn-primary">保存</button>
                    <button id="themeColorCancel" class="btn">取消</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const input = modal.querySelector<HTMLInputElement>('#themeColorInput')!;
        const preview = modal.querySelector<HTMLElement>('#themeBrushPreview')!;
        const updatePreview = async () => {
            const { colorBrush } = await import('../xaml/markers');
            preview.innerHTML = Array.from({ length: 8 }, (_, i) =>
                `<span class="brush-chip" style="background:${colorBrush(i + 1)}" title="ColorBrush${i + 1}">${i + 1}</span>`
            ).join('');
        };
        void updatePreview();
        input.addEventListener('input', () => {
            setThemeColor(input.value);
            void updatePreview();
            renderManager.renderCanvas();
        });

        modal.querySelector('#themeColorSave')!.addEventListener('click', () => {
            setThemeColor(input.value);
            renderManager.renderCanvas();
            toast('主题色已更新');
            modal.remove();
        });
        modal.querySelector('#themeColorCancel')!.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
}

export const uiManager = new UIManager();
