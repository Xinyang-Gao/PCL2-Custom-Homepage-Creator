import { App } from './appCore.js';
import { Utils } from './utils.js';

export class FileManager {
    constructor() {
        this.currentFileHandle = null;
        this.currentFileName = '';
        this.currentFileBlob = null;
    }

    isFileSystemAccessSupported() {
        return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    }

    async openLocalFileWithPicker() {
        if (!this.isFileSystemAccessSupported()) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xaml,.xml';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const text = await file.text();
                if (confirm('打开文件将替换当前所有组件，是否继续？')) {
                    App.xamlProcessor.importFromXAML(text);
                    Utils.showToast(`已打开: ${file.name} (只读模式，如需保存请使用另存为)`);
                    this.currentFileHandle = null;
                    this.currentFileName = file.name;
                    this.currentFileBlob = new Blob([text], { type: 'text/plain' });
                    this.updateLocalFileUI();
                    App.resetDirty();
                }
            };
            input.click();
            return;
        }

        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }],
                multiple: false
            });
            const file = await handle.getFile();
            const content = await file.text();
            if (confirm(`打开 "${file.name}" 将替换当前所有组件，是否继续？`)) {
                App.xamlProcessor.importFromXAML(content);
                this.currentFileHandle = handle;
                this.currentFileName = file.name;
                this.currentFileBlob = null;
                this.updateLocalFileUI();
                Utils.showToast(`已链接本地文件: ${file.name}`);
                App.resetDirty();
            }
        } catch (err) {
            if (err.name !== 'AbortError') Utils.showToast('打开文件失败: ' + err.message, true);
        }
    }

    async saveToLinkedFile() {
        if (this.currentFileHandle && this.isFileSystemAccessSupported()) {
            const xamlContent = App.xamlProcessor.generateXAML(App.state.components);
            if (!xamlContent.trim()) {
                Utils.showToast('没有可保存的内容', true);
                return;
            }
            try {
                const writable = await this.currentFileHandle.createWritable();
                await writable.write(xamlContent);
                await writable.close();
                Utils.showToast(`已保存到 ${this.currentFileName}`);
                App.resetDirty();
                return;
            } catch (err) {
                Utils.showToast('保存失败: ' + err.message, true);
                return;
            }
        }

        if (this.currentFileName && !this.currentFileHandle) {
            const overwrite = confirm(`文件 "${this.currentFileName}" 为只读打开，是否另存为覆盖它？\n点击“确定”将选择该文件保存，点击“取消”将不保存。`);
            if (overwrite) {
                await this.saveAsLocalFile(true);
            }
            return;
        }

        Utils.showToast('没有链接的本地文件，请先“打开本地文件”或使用“另存为”', true);
    }

    async saveAsLocalFile(overwriteMode = false) {
        const xamlContent = App.xamlProcessor.generateXAML(App.state.components);
        if (!xamlContent.trim()) {
            Utils.showToast('没有可保存的内容', true);
            return;
        }

        if (this.isFileSystemAccessSupported()) {
            try {
                const suggestedName = overwriteMode && this.currentFileName ? this.currentFileName : (this.currentFileName || 'design.xaml');
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{ description: 'XAML文件', accept: { 'application/xml': ['.xaml', '.xml'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(xamlContent);
                await writable.close();
                this.currentFileHandle = handle;
                this.currentFileName = handle.name;
                this.currentFileBlob = null;
                this.updateLocalFileUI();
                Utils.showToast(`已保存到: ${handle.name}，并已链接此文件`);
                App.resetDirty();
            } catch (err) {
                if (err.name !== 'AbortError') Utils.showToast('保存失败: ' + err.message, true);
            }
        } else {
            const blob = new Blob([xamlContent], { type: 'text/plain' });
            const link = document.createElement('a');
            const downloadName = this.currentFileName || 'design.xaml';
            link.href = URL.createObjectURL(blob);
            link.download = downloadName;
            link.click();
            URL.revokeObjectURL(link.href);
            Utils.showToast(`已下载文件 ${downloadName}`);
            this.currentFileName = downloadName;
            this.currentFileHandle = null;
            this.currentFileBlob = blob;
            this.updateLocalFileUI();
            App.resetDirty();
            setTimeout(() => {
                Utils.showToast('提示：当前浏览器不支持直接读写文件，保存采用下载方式。', false);
            }, 1500);
        }
    }

    updateLocalFileUI() {
        const infoDiv = document.getElementById('linkedFileInfo');
        const saveBtn = document.getElementById('saveToLocalFileBtn');

        if (this.currentFileName) {
            const mode = this.currentFileHandle ? '可读写' : (this.currentFileBlob ? '只读(已下载)' : '仅名称');
            infoDiv.innerHTML = `<i class="fas fa-link"></i> 已链接: ${this.currentFileName} (${mode})`;
            if (saveBtn) saveBtn.disabled = false;
        } else {
            infoDiv.innerHTML = `<i class="fas fa-link"></i> 未链接任何本地文件`;
            if (saveBtn) saveBtn.disabled = true;
        }

        const warningDiv = document.getElementById('fsaCompatWarning');
        if (!this.isFileSystemAccessSupported()) {
            warningDiv.innerHTML = '<div class="unsupported-warning"><i class="fas fa-exclamation-triangle"></i> 当前浏览器不支持文件系统API，本地文件仅能读取，保存将使用下载方式。</div>';
        } else {
            warningDiv.innerHTML = '';
        }
    }
}