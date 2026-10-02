// 应用入口：初始化、全局事件、快捷键
import { store } from './core/store';
import { history, ActionType } from './core/history';
import { findComponentById } from './components/tree';
import { componentManager } from './components/manager';
import { dragDropManager } from './components/dragDrop';
import { renderManager } from './render/renderManager';
import { propsPanel } from './render/propsPanel';
import { uiManager } from './ui/uiManager';
import { fileManager, updateLinkedFileInfo } from './io/fileManager';
import { toast } from './ui/toast';
import './styles/main.css';

function isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function initSelection(): void {
    document.getElementById('previewContainer')?.addEventListener('click', (e) => {
        const wrapper = (e.target as Element).closest?.('.component-item-wrapper');
        if (wrapper) {
            const id = parseInt((wrapper as HTMLElement).dataset.id || '');
            if (!isNaN(id)) {
                e.stopPropagation();
                renderManager.selectComponent(id);
            }
        }
    });

    // 点击空白处取消选中
    document.getElementById('canvas')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('empty-placeholder')) {
            renderManager.selectComponent(null);
        }
    });
}

function initShortcuts(): void {
    window.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
            if (history.undo()) {
                renderManager.renderCanvas();
                toast('已撤销');
            }
        } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
            if (history.redo()) {
                renderManager.renderCanvas();
                toast('已重做');
            }
        } else if (mod && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (store.fileName) void fileManager.saveToLinked();
            else void fileManager.saveAs();
        } else if (mod && e.key.toLowerCase() === 'd') {
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
            if (store.selectedId !== null) componentManager.duplicate(store.selectedId);
        } else if (e.key === 'Delete' && store.selectedId !== null) {
            if (isEditableTarget(e.target)) return;
            e.preventDefault();
            if (confirm('删除选中的组件？')) componentManager.removeById(store.selectedId);
        } else if (e.key === 'Escape') {
            renderManager.selectComponent(null);
        }
    });
}

function initBeforeUnload(): void {
    window.addEventListener('beforeunload', (e) => {
        if (store.dirty) {
            const message = '当前设计未保存，离开页面将会丢失更改，确定要离开吗？';
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    });
}

/** 响应 store 变化（脏标记 → 顶栏按钮、历史按钮） */
function bindStore(): void {
    store.subscribe(() => {
        uiManager.updateSaveButton();
        uiManager.updateHistoryButtons();
    });
}

export function initApp(): void {
    // 主题恢复
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }

    bindStore();
    history.onChange = () => uiManager.updateHistoryButtons();
    uiManager.updateHistoryButtons();
    uiManager.buildComponentLibrary();
    dragDropManager.initGlobalFileDragAndDrop();
    uiManager.bindUIEvents();
    renderManager.renderCanvas();
    updateLinkedFileInfo();
    uiManager.updateSaveButton();
    initSelection();
    initShortcuts();
    initBeforeUnload();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
