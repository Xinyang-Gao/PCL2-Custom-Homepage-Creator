// dragDropManager.js
import { ComponentTypes } from './componentTypes.js';
import { ComponentManager } from './componentManager.js';
import { ComponentFinder } from './componentFinder.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';

export class DragDropManager {
    constructor() {
        this.dragSource = null;
        this.insertPlaceholder = null;
        // 自动滚动相关属性
        this.scrollAnimationId = null;
        this.scrollStep = 10;          // 每次滚动的像素值
        this.scrollThreshold = 35;     // 距离边缘触发滚动的阈值（像素）
    }

    createInsertPlaceholder(isHorizontal = false) {
        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        if (isHorizontal) {
            placeholder.style.cssText = `
                width: 4px;
                height: 60px;
                background: var(--primary);
                margin: 0 4px;
                border-radius: 2px;
                transition: all 0.1s;
                display: inline-block;
                vertical-align: middle;
            `;
        } else {
            placeholder.style.cssText = `
                height: 4px;
                background: var(--primary);
                margin: 4px 0;
                border-radius: 2px;
                transition: all 0.1s;
            `;
        }
        return placeholder;
    }

    clearPlaceholder() {
        if (this.insertPlaceholder && this.insertPlaceholder.parentNode) {
            this.insertPlaceholder.parentNode.removeChild(this.insertPlaceholder);
        }
        this.insertPlaceholder = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        this.stopAutoScroll();  // 清除时停止滚动
    }

    isParentHorizontal(parentId) {
        if (parentId === null) return false;
        const parentComp = ComponentFinder.findComponentById(parentId);
        if (!parentComp) return false;
        if (parentComp.type === 'horizontalstack') return true;
        if (parentComp.type === 'stackpanel' && parentComp.props.Orientation === 'Horizontal') return true;
        return false;
    }

    computeDropPosition(dragEvent, targetElement) {
        let dropZone = targetElement.closest('.nested-dropzone');
        let targetComponent = targetElement.closest('.component-item-wrapper');
        
        if (dropZone) {
            const parentIdAttr = dropZone.getAttribute('data-parent-id');
            const parentId = parentIdAttr ? parseInt(parentIdAttr) : null;
            const isHorizontal = this.isParentHorizontal(parentId);
            const childrenWrappers = Array.from(dropZone.querySelectorAll(':scope > .component-item-wrapper'));
            if (childrenWrappers.length === 0) {
                return { parentId, index: 0, targetElement: dropZone, isHorizontal };
            }
            const mousePos = isHorizontal ? dragEvent.clientX : dragEvent.clientY;
            for (let i = 0; i < childrenWrappers.length; i++) {
                const rect = childrenWrappers[i].getBoundingClientRect();
                const middle = isHorizontal ? (rect.left + rect.width / 2) : (rect.top + rect.height / 2);
                if (mousePos < middle) {
                    return { parentId, index: i, targetElement: childrenWrappers[i], isHorizontal };
                }
            }
            return { parentId, index: childrenWrappers.length, targetElement: dropZone, isHorizontal };
        }
        
        if (targetComponent) {
            const compId = parseInt(targetComponent.getAttribute('data-id'));
            const comp = ComponentFinder.findComponentById(compId);
            if (!comp) return null;
            const parentId = comp.parentId;
            const parentComp = parentId === null ? null : ComponentFinder.findComponentById(parentId);
            const siblings = parentId === null ? App.state.components : parentComp.children;
            const currentIndex = siblings.findIndex(c => c.id === compId);
            if (currentIndex === -1) return null;
            
            const isHorizontal = this.isParentHorizontal(parentId);
            const rect = targetComponent.getBoundingClientRect();
            const mousePos = isHorizontal ? dragEvent.clientX : dragEvent.clientY;
            const middle = isHorizontal ? (rect.left + rect.width / 2) : (rect.top + rect.height / 2);
            let newIndex = mousePos < middle ? currentIndex : currentIndex + 1;
            let parentElement = parentId === null ? document.getElementById('canvas') : 
                                document.querySelector(`.component-item-wrapper[data-id="${parentId}"] .nested-dropzone`);
            if (!parentElement) return null;
            return { parentId, index: newIndex, targetElement: parentElement, isHorizontal };
        }
        
        const canvas = document.getElementById('canvas');
        if (canvas && canvas.contains(targetElement)) {
            const childrenWrappers = Array.from(canvas.querySelectorAll(':scope > .component-item-wrapper'));
            const isHorizontal = false;
            if (childrenWrappers.length === 0) {
                return { parentId: null, index: 0, targetElement: canvas, isHorizontal };
            }
            const mouseY = dragEvent.clientY;
            for (let i = 0; i < childrenWrappers.length; i++) {
                const rect = childrenWrappers[i].getBoundingClientRect();
                const middle = rect.top + rect.height / 2;
                if (mouseY < middle) {
                    return { parentId: null, index: i, targetElement: childrenWrappers[i], isHorizontal };
                }
            }
            return { parentId: null, index: childrenWrappers.length, targetElement: canvas, isHorizontal };
        }
        
        return null;
    }

    showPlaceholder(dropInfo) {
        this.clearPlaceholder();
        if (!dropInfo) return;
        
        const { targetElement, index, isHorizontal } = dropInfo;
        if (!targetElement) return;
        
        const placeholder = this.createInsertPlaceholder(isHorizontal);
        this.insertPlaceholder = placeholder;
        
        if (targetElement.classList && targetElement.classList.contains('component-item-wrapper')) {
            targetElement.parentNode.insertBefore(placeholder, targetElement);
        } else if (targetElement.classList && targetElement.classList.contains('nested-dropzone')) {
            const children = Array.from(targetElement.children).filter(child => child.classList.contains('component-item-wrapper'));
            if (index <= children.length) {
                if (index === 0) {
                    targetElement.insertBefore(placeholder, children[0] || null);
                } else if (index === children.length) {
                    targetElement.appendChild(placeholder);
                } else {
                    targetElement.insertBefore(placeholder, children[index]);
                }
            } else {
                targetElement.appendChild(placeholder);
            }
        } else if (targetElement.id === 'canvas') {
            const children = Array.from(targetElement.children).filter(child => child.classList.contains('component-item-wrapper'));
            if (index <= children.length) {
                if (index === 0) {
                    targetElement.insertBefore(placeholder, children[0] || null);
                } else if (index === children.length) {
                    targetElement.appendChild(placeholder);
                } else {
                    targetElement.insertBefore(placeholder, children[index]);
                }
            } else {
                targetElement.appendChild(placeholder);
            }
        }
    }

    // ----- 自动滚动方法 -----
    stopAutoScroll() {
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }
    }

    startAutoScroll(direction) {
        // direction: 1 (向下滚动) 或 -1 (向上滚动)
        if (this.scrollAnimationId) this.stopAutoScroll();
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer) return;

        const scroll = () => {
            if (!this.dragSource) { // 如果没有正在拖拽，停止滚动
                this.stopAutoScroll();
                return;
            }
            const newScrollTop = previewContainer.scrollTop + this.scrollStep * direction;
            if (newScrollTop < 0) previewContainer.scrollTop = 0;
            else if (newScrollTop > previewContainer.scrollHeight - previewContainer.clientHeight) {
                previewContainer.scrollTop = previewContainer.scrollHeight - previewContainer.clientHeight;
                this.stopAutoScroll();
                return;
            } else {
                previewContainer.scrollTop = newScrollTop;
            }
            this.scrollAnimationId = requestAnimationFrame(scroll);
        };
        this.scrollAnimationId = requestAnimationFrame(scroll);
    }

    handleEdgeScroll(clientY) {
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer) return;
        const rect = previewContainer.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const threshold = this.scrollThreshold;

        // 检查是否能够滚动
        const canScrollUp = previewContainer.scrollTop > 0;
        const canScrollDown = previewContainer.scrollTop < previewContainer.scrollHeight - previewContainer.clientHeight;

        if (relativeY < threshold && canScrollUp) {
            this.startAutoScroll(-1);  // 向上
        } else if (rect.height - relativeY < threshold && canScrollDown) {
            this.startAutoScroll(1);   // 向下
        } else {
            this.stopAutoScroll();
        }
    }

    initGlobalFileDragAndDrop() {
        const overlay = document.getElementById('globalDragOverlay');
        document.body.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                document.body.classList.add('drag-file-active');
                e.dataTransfer.dropEffect = 'copy';
            }
        });
        document.body.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
                document.body.classList.remove('drag-file-active');
            }
        });
        document.body.addEventListener('drop', (e) => {
            document.body.classList.remove('drag-file-active');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                if (files[0].size > 5 * 1024 * 1024) {
                    Utils.showToast('文件较大，加载可能需要几秒钟...', false);
                }
                this.handleFileImport(files[0]);
                return false;
            }
        });
    }

    async handleFileImport(file) {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xaml' && ext !== 'xml') {
            Utils.showToast('请拖入 .xaml 或 .xml 文件', true);
            return;
        }
        if (!confirm('拖入文件将替换当前所有组件，是否继续？')) return;
        const CHUNK_SIZE = 1024 * 1024;
        const totalSize = file.size;
        let content = '';
        if (totalSize < CHUNK_SIZE) {
            try {
                content = await file.text();
                App.xamlProcessor.importFromXAML(content);
            } catch (err) {
                Utils.showToast('文件读取失败: ' + err.message, true);
            }
            return;
        }
        let offset = 0;
        const progress = this.createProgressOverlay();
        const readNextChunk = () => {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const reader = new FileReader();
            reader.onload = (e) => {
                content += e.target.result;
                offset += CHUNK_SIZE;
                const percent = Math.min(100, (offset / totalSize) * 100);
                progress.updateProgress(percent);
                if (offset < totalSize) {
                    setTimeout(readNextChunk, 0);
                } else {
                    progress.close();
                    App.xamlProcessor.importFromXAML(content);
                }
            };
            reader.onerror = () => {
                progress.close();
                Utils.showToast('文件读取失败', true);
            };
            reader.readAsText(chunk, 'UTF-8');
        };
        readNextChunk();
    }

    createProgressOverlay() {
        let overlay = document.getElementById('globalProgressOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'globalProgressOverlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 10001; flex-direction: column; gap: 16px;
                color: white; font-weight: 500;
            `;
            overlay.innerHTML = `
                <div><i class="fas fa-spinner fa-pulse fa-2x"></i></div>
                <div>正在读取文件...</div>
                <div class="progress-bar-container" style="width: 300px; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px;">
                    <div class="progress-bar-fill" style="width: 0%; height: 100%; background: var(--primary); border-radius: 4px; transition: width 0.2s;"></div>
                </div>
                <div class="progress-text">0%</div>
            `;
            document.body.appendChild(overlay);
        }
        return {
            updateProgress: (percent) => {
                const fill = overlay.querySelector('.progress-bar-fill');
                const text = overlay.querySelector('.progress-text');
                if (fill) fill.style.width = `${percent}%`;
                if (text) text.innerText = `${Math.round(percent)}%`;
            },
            close: () => { overlay.remove(); }
        };
    }

    initDragAndDrop() {
        const designContainer = document.getElementById('previewContainer');
        
        document.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.comp-item');
            if (target) {
                const compType = target.getAttribute('data-type');
                if (compType && ComponentTypes[compType]) {
                    this.dragSource = { type: compType, isExisting: false };
                    e.dataTransfer.setData('text/plain', compType);
                    e.dataTransfer.effectAllowed = 'copy';
                }
                return;
            }
            
            const existingComp = e.target.closest('.component-item-wrapper');
            if (existingComp) {
                const id = parseInt(existingComp.getAttribute('data-id'));
                const comp = ComponentFinder.findComponentById(id);
                if (comp) {
                    this.dragSource = { id: comp.id, type: comp.type, isExisting: true };
                    e.dataTransfer.setData('text/plain', `move:${comp.id}`);
                    e.dataTransfer.effectAllowed = 'move';
                    existingComp.style.opacity = '0.5';
                }
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (this.dragSource && !this.dragSource.isExisting) {
                // 新组件拖拽结束清理
            } else if (this.dragSource && this.dragSource.isExisting) {
                const wrapper = document.querySelector(`.component-item-wrapper[data-id="${this.dragSource.id}"]`);
                if (wrapper) wrapper.style.opacity = '';
            }
            this.dragSource = null;
            this.clearPlaceholder();    // 内部已经停止滚动
        });
        
        designContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = this.dragSource && !this.dragSource.isExisting ? 'copy' : 'move';
            if (!this.dragSource) return;
            
            const dropInfo = this.computeDropPosition(e, e.target);
            if (dropInfo) {
                this.showPlaceholder(dropInfo);
                if (dropInfo.targetElement && dropInfo.targetElement.classList && dropInfo.targetElement.classList.contains('nested-dropzone')) {
                    dropInfo.targetElement.classList.add('drag-over');
                }
            } else {
                this.clearPlaceholder();
            }
            // 边缘自动滚动
            this.handleEdgeScroll(e.clientY);
        });
        
        designContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.stopAutoScroll();  // 放置时停止滚动
            if (!this.dragSource) {
                this.clearPlaceholder();
                return;
            }
            
            const dropInfo = this.computeDropPosition(e, e.target);
            if (!dropInfo) {
                this.clearPlaceholder();
                return;
            }
            
            const { parentId, index, isHorizontal } = dropInfo;
            
            if (!this.dragSource.isExisting) {
                const compType = this.dragSource.type;
                if (compType && ComponentTypes[compType]) {
                    if (parentId !== null) {
                        const parentComp = ComponentFinder.findComponentById(parentId);
                        if (!parentComp || !ComponentTypes[parentComp.type]?.canNest) {
                            Utils.showToast('该容器不允许放置子组件', true);
                            this.clearPlaceholder();
                            this.dragSource = null;
                            return;
                        }
                    }
                    const newComp = ComponentManager.createComponent(compType, parentId);
                    if (newComp) {
                        ComponentManager.addComponent(newComp, parentId, index);
                        App.renderManager.selectComponent(newComp.id);
                        Utils.showToast(`添加 ${ComponentTypes[compType].name}`);
                    }
                }
            } else {
                const sourceId = this.dragSource.id;
                if (sourceId === parentId) {
                    Utils.showToast('不能将组件移动到自身', true);
                    this.clearPlaceholder();
                    this.dragSource = null;
                    return;
                }
                if (parentId !== null) {
                    const targetParent = ComponentFinder.findComponentById(parentId);
                    if (!targetParent || !ComponentTypes[targetParent.type]?.canNest) {
                        Utils.showToast('目标容器不允许放置子组件', true);
                        this.clearPlaceholder();
                        this.dragSource = null;
                        return;
                    }
                }
                const success = ComponentManager.moveComponentTo(sourceId, parentId, index);
                if (!success) {
                    Utils.showToast('移动失败：可能导致循环引用', true);
                }
            }
            
            this.clearPlaceholder();
            this.dragSource = null;
        });
        
        const container = document.getElementById('componentsList');
        if (container) {
            container.querySelectorAll('.comp-item').forEach(item => {
                item.setAttribute('draggable', 'true');
            });
        }
    }
}