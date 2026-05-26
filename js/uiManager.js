import { ComponentTypes } from './componentTypes.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';

export class UIManager {
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

        // 获取备份列表
        let backups = await App.serverApi.getBackupList();

        // 获取搜索关键词
        const searchInput = document.getElementById('backupSearchInput');
        const filterText = searchInput ? searchInput.value.toLowerCase() : '';
        if (filterText) {
            backups = backups.filter(b => b.name.toLowerCase().includes(filterText));
        }

        if (!backups.length) {
            container.innerHTML = `<div class="empty-placeholder" style="padding:20px">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>${filterText ? '没有匹配的备份' : '暂无自动备份，编辑组件后将自动创建'}</p>
        </div>`;
            return;
        }

        // 渲染备份列表（带复选框、对比按钮）
        container.innerHTML = `
        <div style="margin-bottom:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input type="text" id="backupSearchInput" placeholder="搜索备份文件名..." 
                       style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--border); background:var(--bg-input);">
                <button id="batchDeleteBackupsBtn" class="btn btn-danger"><i class="fas fa-trash-alt"></i> 批量删除</button>
                <button id="manualBackupBtn" class="btn"><i class="fas fa-camera"></i> 手动备份</button>
            </div>
        </div>
        <div class="backup-items">
            ${backups.map(b => `
                <div class="backup-item" data-name="${Utils.escapeHtmlAttr(b.name)}" style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid var(--border);">
                    <input type="checkbox" class="backup-select" data-name="${Utils.escapeHtmlAttr(b.name)}" style="margin-right: 12px;">
                    <div style="flex:1; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <i class="fas fa-file-archive"></i>
                        <strong>${Utils.escapeHtml(b.name)}</strong>
                        <span class="backup-time" style="color: var(--text-light); font-size:0.8rem;">${Utils.escapeHtml(b.modified_str)}</span>
                        <span class="backup-size" style="font-size:0.75rem;">${(b.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div class="backup-actions" style="display: flex; gap: 6px;">
                        <button class="btn diff-backup" data-name="${Utils.escapeHtmlAttr(b.name)}" title="对比当前设计"><i class="fas fa-code-branch"></i> 对比</button>
                        <button class="btn load-backup" data-name="${Utils.escapeHtmlAttr(b.name)}"><i class="fas fa-undo"></i> 恢复</button>
                        <button class="btn btn-danger delete-backup" data-name="${Utils.escapeHtmlAttr(b.name)}"><i class="fas fa-trash"></i> 删除</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

        // 绑定搜索输入事件
        const newSearchInput = document.getElementById('backupSearchInput');
        if (newSearchInput) {
            // 移除旧的监听器以避免重复（简单处理：先解绑再绑定）
            newSearchInput.removeEventListener('input', this._backupSearchHandler);
            this._backupSearchHandler = () => this.renderBackupList();
            newSearchInput.addEventListener('input', this._backupSearchHandler);
        }

        // 批量删除
        const batchBtn = document.getElementById('batchDeleteBackupsBtn');
        if (batchBtn) {
            batchBtn.onclick = async () => {
                const selected = Array.from(document.querySelectorAll('.backup-select:checked'))
                    .map(cb => cb.getAttribute('data-name'));
                if (selected.length === 0) {
                    Utils.showToast('请至少选择一个备份', true);
                    return;
                }
                if (confirm(`确定删除 ${selected.length} 个备份吗？此操作不可恢复。`)) {
                    for (let name of selected) {
                        await App.serverApi.deleteBackup(name);
                    }
                    Utils.showToast(`已删除 ${selected.length} 个备份`);
                    this.renderBackupList(); // 刷新列表
                }
            };
        }

        // 手动备份按钮
        const manualBtn = document.getElementById('manualBackupBtn');
        if (manualBtn) {
            manualBtn.onclick = async () => {
                await App.serverApi.manualBackup();
                this.renderBackupList();
            };
        }

        // 对比、恢复、删除按钮的事件绑定（使用事件委托，因为列表会重新渲染）
        container.querySelectorAll('.diff-backup').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                const backupContent = await App.serverApi.getBackupContent(name);
                if (backupContent) {
                    this.showDiffModal(backupContent);
                }
            };
        });

        container.querySelectorAll('.load-backup').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                // 恢复前先进行差异对比，让用户确认
                const backupContent = await App.serverApi.getBackupContent(name);
                if (backupContent) {
                    this.showDiffModal(backupContent, async (confirmed) => {
                        if (confirmed) {
                            await App.serverApi.loadBackup(name);
                            document.getElementById('serverModal').style.display = 'none';
                        }
                    });
                } else {
                    // 降级：直接加载
                    await App.serverApi.loadBackup(name);
                    document.getElementById('serverModal').style.display = 'none';
                }
            };
        });

        container.querySelectorAll('.delete-backup').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                await App.serverApi.deleteBackup(name);
                this.renderBackupList();
            };
        });
    }
    
    /**
     * 显示当前设计与备份内容的并排差异弹窗
     * @param {string} backupContent - 备份的 XAML 内容
     * @param {Function} onConfirm - 用户点击“恢复”时的回调，参数为是否确认
     */
    showDiffModal(backupContent, onConfirm) {
        const currentXaml = App.xamlProcessor.generateXAML(App.state.components);
        const currentLines = currentXaml.split('\n');
        const backupLines = backupContent.split('\n');
        const maxLen = Math.max(currentLines.length, backupLines.length);

        // 构建带行号和高亮差异的 HTML
        let currentHtml = '<div style="font-family: monospace; font-size: 12px;">';
        let backupHtml = '<div style="font-family: monospace; font-size: 12px;">';
        for (let i = 0; i < maxLen; i++) {
            const curLine = currentLines[i] || '';
            const bakLine = backupLines[i] || '';
            const isDiff = (curLine !== bakLine);
            const lineNum = i + 1;
            currentHtml += `<div style="${isDiff ? 'background:#ffebee;' : ''}">
                            <span style="display:inline-block; width:40px; color:#888;">${lineNum}</span>
                            ${Utils.escapeHtml(curLine)}
                         </div>`;
            backupHtml += `<div style="${isDiff ? 'background:#ffebee;' : ''}">
                            <span style="display:inline-block; width:40px; color:#888;">${lineNum}</span>
                            ${Utils.escapeHtml(bakLine)}
                         </div>`;
        }
        currentHtml += '</div>';
        backupHtml += '</div>';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; width: 1200px;">
            <h3><i class="fas fa-code-branch"></i> 差异对比</h3>
            <div style="display: flex; gap: 16px; height: 60vh; overflow: auto; border: 1px solid var(--border); padding: 8px;">
                <div style="flex:1; display: flex; flex-direction: column; overflow: auto;">
                    <strong>当前设计</strong>
                    <div style="background: var(--bg-code); padding: 8px; flex:1; overflow: auto;">${currentHtml}</div>
                </div>
                <div style="flex:1; display: flex; flex-direction: column; overflow: auto;">
                    <strong>备份版本</strong>
                    <div style="background: var(--bg-code); padding: 8px; flex:1; overflow: auto;">${backupHtml}</div>
                </div>
            </div>
            <div class="modal-actions" style="margin-top: 16px;">
                <button id="diffConfirmRestore" class="btn btn-primary"><i class="fas fa-check"></i> 恢复此备份</button>
                <button id="diffCancel" class="btn"><i class="fas fa-times"></i> 取消</button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('#diffConfirmRestore');
        const cancelBtn = modal.querySelector('#diffCancel');
        const closeModal = () => modal.remove();

        confirmBtn.onclick = () => {
            if (onConfirm) onConfirm(true);
            closeModal();
        };
        cancelBtn.onclick = () => {
            if (onConfirm) onConfirm(false);
            closeModal();
        };
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
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
                App.state.components = [];
                App.state.selectedId = null;
                App.renderManager.renderCanvas();
                App.markDirty();
                App.history.reset();
            }
        };

        document.getElementById('applyPropsBtn').onclick = () => App.renderManager.applyCurrentProps();
        document.getElementById('deleteCompBtn').onclick = () => {
            if (App.state.selectedId && confirm('删除组件？')) {
                import('./componentManager.js').then(({ ComponentManager }) => {
                    ComponentManager.removeComponentById(App.state.selectedId);
                });
            }
        };

        document.getElementById('duplicateCompBtn').onclick = () => {
            if (App.state.selectedId) {
                import('./componentManager.js').then(({ ComponentManager, ComponentFinder }) => {
                    ComponentManager.duplicateComponent(ComponentFinder.findComponentById(App.state.selectedId));
                });
            }
        };

        // ========== 源码编辑器逻辑（替换旧的 XAML 工具） ==========
        document.getElementById('xamlExportBtn').onclick = () => {
            const modal = document.getElementById('xamlModal');
            const codeArea = document.getElementById('xamlCodeArea');
            if (codeArea) {
                codeArea.value = App.xamlProcessor.generateXAML(App.state.components);
            }
            modal.style.display = 'flex';
        };

        // 应用到设计按钮
        const applyXamlBtn = document.getElementById('applyXamlBtn');
        if (applyXamlBtn) {
            applyXamlBtn.onclick = () => {
                const xamlSource = document.getElementById('xamlCodeArea').value;
                if (!xamlSource.trim()) {
                    Utils.showToast('XAML 内容为空', true);
                    return;
                }
                if (confirm('应用 XAML 源码将替换当前所有设计，是否继续？')) {
                    // 导入前可先记录一次快照（由 importFromXAML 内部处理历史重置）
                    App.xamlProcessor.importFromXAML(xamlSource);
                    document.getElementById('xamlModal').style.display = 'none';
                }
            };
        }

        // 关闭弹窗
        document.getElementById('closeModalBtn').onclick = () => document.getElementById('xamlModal').style.display = 'none';
        // ======================================================

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