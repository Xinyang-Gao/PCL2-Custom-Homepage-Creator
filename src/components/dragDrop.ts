// 拖拽：组件库 → 画布、画布内移动、文件导入、边缘自动滚动
import { COMPONENT_SPECS, getSpec } from './specs';
import { componentManager } from './manager';
import { findComponentById } from './tree';
import { store } from '../core/store';
import { toast } from '../ui/toast';
import { renderManager } from '../render/renderManager';

interface DragSource {
    type?: string;
    id?: number;
    isExisting: boolean;
}

class DragDropManager {
    private dragSource: DragSource | null = null;
    private placeholder: HTMLElement | null = null;
    private scrollAnimId: number | null = null;
    private readonly scrollStep = 10;
    private readonly scrollThreshold = 35;

    // ================== 占位符 ==================

    private clearPlaceholder(): void {
        if (this.placeholder?.parentNode) this.placeholder.parentNode.removeChild(this.placeholder);
        this.placeholder = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        this.stopAutoScroll();
    }

    private isParentHorizontal(parentId: number | null): boolean {
        if (parentId === null) return false;
        const parent = findComponentById(parentId);
        if (!parent) return false;
        return parent.type === 'horizontalstack' || (parent.type === 'stackpanel' && parent.props.Orientation === 'Horizontal');
    }

    private computeDropPosition(e: DragEvent, target: Element): { parentId: number | null; index: number; targetEl: Element; isHorizontal: boolean } | null {
        const dropZone = target.closest('.nested-dropzone');
        const targetComp = target.closest('.component-item-wrapper');

        if (dropZone) {
            const parentIdAttr = (dropZone as HTMLElement).dataset.parentId;
            const parentId = parentIdAttr ? parseInt(parentIdAttr) : null;
            const isHorizontal = this.isParentHorizontal(parentId);
            const children = Array.from(dropZone.children).filter(c => c.classList.contains('component-item-wrapper')) as HTMLElement[];
            if (!children.length) return { parentId, index: 0, targetEl: dropZone, isHorizontal };
            const pos = isHorizontal ? e.clientX : e.clientY;
            for (let i = 0; i < children.length; i++) {
                const rect = children[i].getBoundingClientRect();
                const middle = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
                if (pos < middle) return { parentId, index: i, targetEl: children[i], isHorizontal };
            }
            return { parentId, index: children.length, targetEl: dropZone, isHorizontal };
        }

        if (targetComp) {
            const compId = parseInt((targetComp as HTMLElement).dataset.id || '');
            const comp = findComponentById(compId);
            if (!comp) return null;
            const parentId = comp.parentId;
            const siblings = parentId === null ? store.components : (findComponentById(parentId)?.children ?? []);
            const currentIndex = siblings.findIndex(c => c.id === compId);
            if (currentIndex === -1) return null;
            const isHorizontal = this.isParentHorizontal(parentId);
            const rect = targetComp.getBoundingClientRect();
            const pos = isHorizontal ? e.clientX : e.clientY;
            const middle = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
            const newIndex = pos < middle ? currentIndex : currentIndex + 1;
            const parentEl = parentId === null
                ? document.getElementById('canvas')
                : document.querySelector(`.component-item-wrapper[data-id="${parentId}"] .nested-dropzone`);
            if (!parentEl) return null;
            return { parentId, index: newIndex, targetEl: parentEl, isHorizontal };
        }

        const canvas = document.getElementById('canvas');
        if (canvas && canvas.contains(target)) {
            const children = Array.from(canvas.children).filter(c => c.classList.contains('component-item-wrapper')) as HTMLElement[];
            if (!children.length) return { parentId: null, index: 0, targetEl: canvas, isHorizontal: false };
            for (let i = 0; i < children.length; i++) {
                const rect = children[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    return { parentId: null, index: i, targetEl: children[i], isHorizontal: false };
                }
            }
            return { parentId: null, index: children.length, targetEl: canvas, isHorizontal: false };
        }

        return null;
    }

    private showPlaceholder(dropInfo: { index: number; targetEl: Element; isHorizontal: boolean } | null): void {
        this.clearPlaceholder();
        if (!dropInfo) return;
        const { targetEl, index, isHorizontal } = dropInfo;

        const ph = document.createElement('div');
        ph.className = 'drag-placeholder' + (isHorizontal ? ' horizontal' : '');
        this.placeholder = ph;

        const insertInto = (parent: Element) => {
            const children = Array.from(parent.children).filter(c => c.classList.contains('component-item-wrapper'));
            const ref = children[index] || null;
            parent.insertBefore(ph, ref);
        };

        if (targetEl.classList.contains('component-item-wrapper')) {
            targetEl.parentNode!.insertBefore(ph, targetEl);
        } else {
            insertInto(targetEl);
        }
    }

    // ================== 边缘自动滚动 ==================

    private stopAutoScroll(): void {
        if (this.scrollAnimId !== null) {
            cancelAnimationFrame(this.scrollAnimId);
            this.scrollAnimId = null;
        }
    }

    private startAutoScroll(direction: 1 | -1): void {
        this.stopAutoScroll();
        const container = document.getElementById('previewContainer');
        if (!container) return;
        const step = () => {
            if (!this.dragSource) {
                this.stopAutoScroll();
                return;
            }
            const next = container.scrollTop + this.scrollStep * direction;
            if (next < 0) container.scrollTop = 0;
            else if (next > container.scrollHeight - container.clientHeight) {
                container.scrollTop = container.scrollHeight - container.clientHeight;
                this.stopAutoScroll();
                return;
            } else {
                container.scrollTop = next;
            }
            this.scrollAnimId = requestAnimationFrame(step);
        };
        this.scrollAnimId = requestAnimationFrame(step);
    }

    private handleEdgeScroll(clientY: number): void {
        const container = document.getElementById('previewContainer');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const relY = clientY - rect.top;
        const canUp = container.scrollTop > 0;
        const canDown = container.scrollTop < container.scrollHeight - container.clientHeight;
        if (relY < this.scrollThreshold && canUp) this.startAutoScroll(-1);
        else if (rect.height - relY < this.scrollThreshold && canDown) this.startAutoScroll(1);
        else this.stopAutoScroll();
    }

    // ================== 文件拖入 ==================

    initGlobalFileDragAndDrop(): void {
        document.body.addEventListener('dragover', (e) => {
            if (e.dataTransfer?.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                document.body.classList.add('drag-file-active');
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            }
        });
        document.body.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || !document.body.contains(e.relatedTarget as Node)) {
                document.body.classList.remove('drag-file-active');
            }
        });
        document.body.addEventListener('drop', (e) => {
            document.body.classList.remove('drag-file-active');
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                if (files[0].size > 5 * 1024 * 1024) toast('文件较大，加载可能需要几秒钟...');
                void this.handleFileImport(files[0]);
            }
        });
    }

    private async handleFileImport(file: File): Promise<void> {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext !== 'xaml' && ext !== 'xml') {
            toast('请拖入 .xaml 或 .xml 文件', true);
            return;
        }
        if (!confirm('拖入文件将替换当前所有组件，是否继续？')) return;
        try {
            const text = await file.text();
            const { importFromXAML } = await import('../xaml/parser');
            const result = importFromXAML(text);
            if (result.ok) {
                const { renderManager } = await import('../render/renderManager');
                renderManager.renderCanvas();
                const { history } = await import('../core/history');
                history.reset();
                toast(`已导入 ${result.count} 个组件`);
            }
        } catch (err) {
            toast('文件读取失败: ' + (err as Error).message, true);
        }
    }

    // ================== 初始化 ==================

    initDragAndDrop(): void {
        const designContainer = document.getElementById('previewContainer');
        if (!designContainer) return;

        document.addEventListener('dragstart', (e) => {
            const libItem = (e.target as Element).closest?.('.comp-item');
            if (libItem) {
                const type = (libItem as HTMLElement).dataset.type;
                if (type && COMPONENT_SPECS[type]) {
                    this.dragSource = { type, isExisting: false };
                    e.dataTransfer!.setData('text/plain', type);
                    e.dataTransfer!.effectAllowed = 'copy';
                }
                return;
            }
            const existing = (e.target as Element).closest?.('.component-item-wrapper');
            if (existing) {
                const id = parseInt((existing as HTMLElement).dataset.id || '');
                const comp = findComponentById(id);
                if (comp) {
                    this.dragSource = { id: comp.id, type: comp.type, isExisting: true };
                    e.dataTransfer!.setData('text/plain', `move:${comp.id}`);
                    e.dataTransfer!.effectAllowed = 'move';
                    (existing as HTMLElement).style.opacity = '0.5';
                }
            }
        });

        document.addEventListener('dragend', () => {
            if (this.dragSource?.isExisting && this.dragSource.id !== undefined) {
                const wrapper = document.querySelector<HTMLElement>(`.component-item-wrapper[data-id="${this.dragSource.id}"]`);
                if (wrapper) wrapper.style.opacity = '';
            }
            this.dragSource = null;
            this.clearPlaceholder();
        });

        designContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.dragSource) return;
            e.dataTransfer!.dropEffect = this.dragSource.isExisting ? 'move' : 'copy';
            const dropInfo = this.computeDropPosition(e, e.target as Element);
            if (dropInfo) {
                this.showPlaceholder(dropInfo);
                if (dropInfo.targetEl.classList?.contains('nested-dropzone')) {
                    dropInfo.targetEl.classList.add('drag-over');
                }
            } else {
                this.clearPlaceholder();
            }
            this.handleEdgeScroll(e.clientY);
        });

        designContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.stopAutoScroll();
            if (!this.dragSource) {
                this.clearPlaceholder();
                return;
            }
            const dropInfo = this.computeDropPosition(e, e.target as Element);
            if (!dropInfo) {
                this.clearPlaceholder();
                this.dragSource = null;
                return;
            }
            const { parentId, index } = dropInfo;
            const source = this.dragSource;

            if (!source.isExisting && source.type) {
                if (parentId !== null) {
                    const parent = findComponentById(parentId);
                    if (!parent || !getSpec(parent.type)?.canNest) {
                        toast('该容器不允许放置子组件', true);
                        this.clearPlaceholder();
                        this.dragSource = null;
                        return;
                    }
                }
                const newComp = componentManager.create(source.type, parentId);
                if (newComp && componentManager.add(newComp, parentId, index)) {
                    renderManager.selectComponent(newComp.id);
                    toast(`添加 ${getSpec(source.type)!.name}`);
                }
            } else if (source.id !== undefined) {
                if (source.id === parentId) {
                    toast('不能将组件移动到自身', true);
                } else {
                    const ok = componentManager.move(source.id, parentId, index);
                    if (ok) {
                        renderManager.renderCanvas();
                        renderManager.selectComponent(source.id);
                        toast('已移动组件');
                    } else {
                        toast('移动失败：可能导致循环引用', true);
                    }
                }
            }

            this.clearPlaceholder();
            this.dragSource = null;
        });
    }
}

// 延迟导入的解析与渲染（拖拽结束才需要，避免启动时全量加载）
export const dragDropManager = new DragDropManager();
