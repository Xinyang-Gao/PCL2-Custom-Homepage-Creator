// 后端 API 封装（备份与工作区文件）
import { store } from '../core/store';
import { toast } from '../ui/toast';

export interface BackupInfo {
    name: string;
    size: number;
    modified: number;
    modified_str: string;
}

async function request(url: string, init?: RequestInit): Promise<any> {
    const res = await fetch(url, init);
    return res.json();
}

class ServerApi {
    backups: BackupInfo[] = [];

    async getBackupList(): Promise<BackupInfo[]> {
        try {
            const data = await request('/api/backups');
            if (data.success) {
                this.backups = data.backups || [];
                return this.backups;
            }
            return [];
        } catch (err) {
            console.error('获取备份列表失败', err);
            return [];
        }
    }

    async createBackup(content: string): Promise<boolean> {
        if (!content.trim()) return false;
        try {
            const data = await request('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            return !!data.success;
        } catch (err) {
            console.error('备份失败', err);
            return false;
        }
    }

    async manualBackup(): Promise<boolean> {
        const { generateXAML } = await import('../xaml/generator');
        const content = generateXAML(store.components);
        if (!content.trim()) {
            toast('没有可备份的内容', true);
            return false;
        }
        const ok = await this.createBackup(content);
        if (ok) toast('手动备份已保存');
        return ok;
    }

    async getBackupContent(filename: string): Promise<string | null> {
        try {
            const data = await request(`/api/backup/load?filename=${encodeURIComponent(filename)}`);
            if (data.success && data.content) return data.content;
            toast('获取备份内容失败: ' + (data.error || '未知错误'), true);
            return null;
        } catch (err) {
            toast('请求失败: ' + (err as Error).message, true);
            return null;
        }
    }

    async deleteBackup(filename: string): Promise<boolean> {
        try {
            const data = await request('/api/backup/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (data.success) {
                toast(`已删除 ${filename}`);
                return true;
            }
            toast('删除失败: ' + (data.error || '未知错误'), true);
            return false;
        } catch (err) {
            toast('请求失败: ' + (err as Error).message, true);
            return false;
        }
    }

    /** 加载备份内容到画布（不弹二次确认，由调用方处理） */
    async loadBackupToCanvas(filename: string): Promise<boolean> {
        const content = await this.getBackupContent(filename);
        if (!content) return false;
        const { importFromXAML } = await import('../xaml/parser');
        const result = importFromXAML(content);
        if (result.ok) {
            const { renderManager } = await import('../render/renderManager');
            const { history } = await import('../core/history');
            renderManager.renderCanvas();
            history.reset();
            toast(`已加载备份: ${filename}`);
            return true;
        }
        return false;
    }
}

export const serverApi = new ServerApi();
