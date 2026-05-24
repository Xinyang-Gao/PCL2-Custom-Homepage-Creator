import { App } from './appCore.js';
import { Utils } from './utils.js';

export class ServerApi {
    constructor() {
        this.backups = [];
        this.lastSelectedBackup = null;
    }

    async getBackupList() {
        try {
            const res = await fetch('/api/backups');
            const data = await res.json();
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

    async createBackup(content) {
        if (!content || !content.trim()) return false;
        try {
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (data.success) {
                Utils.showToast('自动备份已保存');
                return true;
            }
            return false;
        } catch (err) {
            console.error('备份失败', err);
            return false;
        }
    }

    async loadBackup(filename) {
        try {
            const res = await fetch(`/api/backup/load?filename=${encodeURIComponent(filename)}`);
            const data = await res.json();
            if (data.success && data.content) {
                if (confirm(`加载备份 "${filename}" 将替换当前所有组件，是否继续？`)) {
                    App.xamlProcessor.importFromXAML(data.content);
                    Utils.showToast(`已加载备份: ${filename}`);
                    this.lastSelectedBackup = filename;
                    return true;
                }
            } else {
                Utils.showToast('加载失败: ' + (data.error || '未知错误'), true);
            }
            return false;
        } catch (err) {
            Utils.showToast('请求失败: ' + err.message, true);
            return false;
        }
    }

    async deleteBackup(filename) {
        if (!confirm(`确定删除备份 "${filename}" 吗？`)) return false;
        try {
            const res = await fetch('/api/backup/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                Utils.showToast(`已删除 ${filename}`);
                if (this.lastSelectedBackup === filename) this.lastSelectedBackup = null;
                return true;
            } else {
                Utils.showToast('删除失败: ' + (data.error || '未知错误'), true);
                return false;
            }
        } catch (err) {
            Utils.showToast('请求失败: ' + err.message, true);
            return false;
        }
    }

    async manualBackup() {
        const content = App.xamlProcessor.generateXAML(App.state.components);
        if (!content.trim()) {
            Utils.showToast('没有可备份的内容', true);
            return false;
        }
        return await this.createBackup(content);
    }
}