// 应用状态中心：组件树、选中态、脏标记与订阅通知
import type { ComponentModel } from './types';

type Listener = () => void;

class Store {
    components: ComponentModel[] = [];
    selectedId: number | null = null;
    dirty = false;

    /** 关联的本地文件（File System Access API 句柄） */
    fileHandle: FileSystemFileHandle | null = null;
    fileName = '';
    fileReadOnly = false;

    private listeners = new Set<Listener>();

    subscribe(fn: Listener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    notify(): void {
        for (const fn of this.listeners) fn();
    }

    markDirty(): void {
        if (!this.dirty) {
            this.dirty = true;
            this.notify();
        }
        scheduleAutoBackup();
    }

    resetDirty(): void {
        if (this.dirty) {
            this.dirty = false;
            this.notify();
        }
    }

    reset(components: ComponentModel[]): void {
        this.components = components;
        this.selectedId = null;
        this.resetDirty();
    }
}

export const store = new Store();

// ================== 自动备份（1 秒防抖） ==================
// 延迟导入避免循环依赖：生成 XAML 与后端调用在需要时才加载
let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoBackup(): void {
    if (autoBackupTimer) clearTimeout(autoBackupTimer);
    autoBackupTimer = setTimeout(async () => {
        const { generateXAML } = await import('../xaml/generator');
        const { serverApi } = await import('../io/serverApi');
        const content = generateXAML(store.components);
        if (content.trim()) {
            serverApi.createBackup(content).catch(console.error);
        }
    }, 1000);
}
