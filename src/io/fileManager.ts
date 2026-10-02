// 本地文件管理：File System Access API + 下载降级
import { store } from '../core/store';
import { toast } from '../ui/toast';
import { generateXAML } from '../xaml/generator';
import { importFromXAML } from '../xaml/parser';
import { renderManager } from '../render/renderManager';
import { history } from '../core/history';

class FileManager {
    isFsSupported(): boolean {
        return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    }

    async openWithPicker(): Promise<void> {
        if (!this.isFsSupported()) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xaml,.xml';
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const text = await file.text();
                if (!confirm('打开文件将替换当前所有组件，是否继续？')) return;
                const result = importFromXAML(text);
                if (!result.ok) return;
                store.fileHandle = null;
                store.fileName = file.name;
                store.fileReadOnly = true;
                renderManager.renderCanvas();
                history.reset();
                store.resetDirty();
                toast(`已打开: ${file.name}（只读模式，保存请使用另存为）`);
            };
            input.click();
            return;
        }

        try {
            const [handle] = await (window as any).showOpenFilePicker({
                types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }],
                multiple: false
            });
            const file = await handle.getFile();
            const content = await file.text();
            if (!confirm(`打开 "${file.name}" 将替换当前所有组件，是否继续？`)) return;
            const result = importFromXAML(content);
            if (!result.ok) return;
            store.fileHandle = handle;
            store.fileName = file.name;
            store.fileReadOnly = false;
            renderManager.renderCanvas();
            history.reset();
            store.resetDirty();
            toast(`已链接本地文件: ${file.name}`);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                toast('打开文件失败: ' + (err as Error).message, true);
            }
        }
    }

    private get content(): string | null {
        const xaml = generateXAML(store.components);
        return xaml.trim() ? xaml : null;
    }

    async saveToLinked(): Promise<void> {
        const xaml = this.content;
        if (!xaml) {
            toast('没有可保存的内容', true);
            return;
        }
        if (store.fileHandle && this.isFsSupported()) {
            try {
                const writable = await store.fileHandle.createWritable();
                await writable.write(xaml);
                await writable.close();
                toast(`已保存到 ${store.fileName}`);
                store.resetDirty();
            } catch (err) {
                toast('保存失败: ' + (err as Error).message, true);
            }
            return;
        }
        if (store.fileName && !store.fileHandle) {
            if (confirm(`文件 "${store.fileName}" 为只读打开，是否另存为覆盖它？\n确定 = 选择文件保存，取消 = 不保存。`)) {
                await this.saveAs(true);
            }
            return;
        }
        toast('没有链接的本地文件，请先「打开本地文件」或使用「另存为」', true);
    }

    async saveAs(overwriteMode = false): Promise<void> {
        const xaml = this.content;
        if (!xaml) {
            toast('没有可保存的内容', true);
            return;
        }

        if (this.isFsSupported()) {
            try {
                const suggestedName = (overwriteMode && store.fileName) || store.fileName || 'design.xaml';
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName,
                    types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(xaml);
                await writable.close();
                store.fileHandle = handle;
                store.fileName = handle.name;
                store.fileReadOnly = false;
                updateLinkedFileInfo();
                toast(`已保存到: ${handle.name}，并已链接此文件`);
                store.resetDirty();
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    toast('保存失败: ' + (err as Error).message, true);
                }
            }
        } else {
            const blob = new Blob([xaml], { type: 'text/plain' });
            const link = document.createElement('a');
            const name = store.fileName || 'design.xaml';
            link.href = URL.createObjectURL(blob);
            link.download = name;
            link.click();
            URL.revokeObjectURL(link.href);
            store.fileName = name;
            store.fileHandle = null;
            store.fileReadOnly = true;
            updateLinkedFileInfo();
            store.resetDirty();
            toast(`已下载文件 ${name}（当前浏览器不支持直接写入，保存采用下载方式）`);
        }
    }
}

export function updateLinkedFileInfo(): void {
    const infoDiv = document.getElementById('linkedFileInfo');
    const saveBtn = document.getElementById('saveToLocalFileBtn') as HTMLButtonElement | null;
    const fm = fileManager;

    if (store.fileName) {
        const mode = store.fileHandle ? '可读写' : (store.fileReadOnly ? '只读(下载)' : '仅名称');
        infoDiv!.innerHTML = `<i class="fas fa-link"></i> 已链接: <strong>${store.fileName}</strong> <span class="file-mode">${mode}</span>`;
        if (saveBtn) saveBtn.disabled = false;
    } else {
        infoDiv!.innerHTML = '<i class="fas fa-link"></i> 未链接任何本地文件';
        if (saveBtn) saveBtn.disabled = true;
    }

    const warning = document.getElementById('fsaCompatWarning');
    if (warning) {
        warning.innerHTML = fm.isFsSupported()
            ? ''
            : '<div class="unsupported-warning"><i class="fas fa-exclamation-triangle"></i> 当前浏览器不支持文件系统 API，本地文件仅能读取，保存将使用下载方式。</div>';
    }
}

export const fileManager = new FileManager();
