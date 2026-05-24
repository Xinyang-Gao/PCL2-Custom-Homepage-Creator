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
                App.recordSnapshot();
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