// appCore.js
import { RenderManager } from './renderManager.js';
import { XamlProcessor } from './xamlProcessor.js';
import { FileManager } from './fileManager.js';
import { ServerApi } from './serverApi.js';
import { DragDropManager } from './dragDropManager.js';
import { UIManager } from './uiManager.js';
import { HistoryManager } from './historyManager.js';
import { ComponentManager } from './componentManager.js';
import { ComponentFinder } from './componentFinder.js';

// 应用核心单例
export const App = {
    state: {
        components: [],
        selectedId: null,
        dirty: false
    },
    autoBackupTimer: null,
    AUTO_BACKUP_DELAY: 1000,

    // 管理器实例
    renderManager: null,
    xamlProcessor: null,
    fileManager: null,
    serverApi: null,
    dragDropManager: null,
    uiManager: null,
    history: null,

    markDirty() {
        if (!this.state.dirty) {
            this.state.dirty = true;
            this.uiManager?.updateOpenFileButton();
        }
        this.scheduleAutoBackup();
    },

    resetDirty() {
        this.state.dirty = false;
        this.uiManager?.updateOpenFileButton();
    },

    scheduleAutoBackup() {
        if (this.autoBackupTimer) clearTimeout(this.autoBackupTimer);
        this.autoBackupTimer = setTimeout(() => {
            const content = this.xamlProcessor?.generateXAML(this.state.components);
            if (content && content.trim()) {
                this.serverApi?.createBackup(content).catch(console.error);
            }
        }, this.AUTO_BACKUP_DELAY);
    },

    init() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
        }

        // 初始化各个管理器
        this.renderManager = new RenderManager();
        this.xamlProcessor = new XamlProcessor();
        this.fileManager = new FileManager();
        this.serverApi = new ServerApi();
        this.dragDropManager = new DragDropManager();
        this.uiManager = new UIManager();
        this.history = new HistoryManager();

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

        // 全局快捷键
        window.addEventListener('keydown', (e) => {
            // 撤销
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.history.undo();
            }
            // 重做
            else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.history.redo();
            }
            // 保存 (Ctrl+S)
            else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.fileManager.currentFileName) {
                    this.fileManager.saveToLinkedFile();
                } else {
                    this.fileManager.saveAsLocalFile();
                }
            }
            // 删除 (Delete)
            else if (e.key === 'Delete' && this.state.selectedId !== null) {
                e.preventDefault();
                if (confirm('删除选中的组件？')) {
                    ComponentManager.removeComponentById(this.state.selectedId);
                }
            }
            // 复制 (Ctrl+D)
            else if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (this.state.selectedId !== null) {
                    const comp = ComponentFinder.findComponentById(this.state.selectedId);
                    if (comp) ComponentManager.duplicateComponent(comp);
                }
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.state.dirty) {
                const message = '当前设计未保存，离开页面将会丢失更改，确定要离开吗？';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }
};