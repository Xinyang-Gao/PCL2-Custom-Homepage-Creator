import { ComponentTypes } from './componentTypes.js';
import { ComponentFinder } from './componentFinder.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';

export class ComponentManager {
    static getMaxGlobalId() {
        let max = 0;
        const traverse = (list) => {
            for (let c of list) {
                if (c.id > max) max = c.id;
                if (c.children) traverse(c.children);
            }
        };
        traverse(App.state.components);
        return max;
    }

    static getNextId() {
        return this.getMaxGlobalId() + 1;
    }

    static createComponent(type, parentId = null, customId = null) {
        const def = ComponentTypes[type];
        if (!def) return null;
        const id = (customId !== null) ? customId : this.getNextId();
        return {
            id, type, name: def.name, parentId, children: [],
            props: JSON.parse(JSON.stringify(def.defaults)),
            events: { type: "", data: "" },
            customProps: {}
        };
    }

    static addComponent(comp, targetParentId = null, insertIndex = null) {
        App.recordSnapshot();
        if (targetParentId === null) {
            if (insertIndex !== null && insertIndex >= 0 && insertIndex <= App.state.components.length) {
                App.state.components.splice(insertIndex, 0, comp);
            } else {
                App.state.components.push(comp);
            }
            App.renderManager.appendComponentToParent(comp, null, insertIndex);
            App.markDirty();
            return true;
        }
        const parent = ComponentFinder.findComponentById(targetParentId);
        if (parent && ComponentTypes[parent.type]?.canNest) {
            if (insertIndex !== null && insertIndex >= 0 && insertIndex <= parent.children.length) {
                parent.children.splice(insertIndex, 0, comp);
            } else {
                parent.children.push(comp);
            }
            comp.parentId = targetParentId;
            App.renderManager.appendComponentToParent(comp, targetParentId, insertIndex);
            App.markDirty();
            return true;
        }
        return false;
    }

    static removeComponentById(id) {
        App.recordSnapshot();
        let removedComp = null;
        let parentOfRemoved = null;

        const removeFromList = (list, parentComp = null) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    removedComp = list[i];
                    parentOfRemoved = parentComp;
                    const el = document.querySelector(`.component-item-wrapper[data-id="${id}"]`);
                    if (el) el.remove();
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].children && removeFromList(list[i].children, list[i])) return true;
            }
            return false;
        };

        if (removeFromList(App.state.components)) {
            if (App.state.selectedId === id) {
                if (parentOfRemoved) {
                    App.state.selectedId = parentOfRemoved.id;
                } else {
                    App.state.selectedId = null;
                }
            }
            App.markDirty();
            App.renderManager.updatePropsPanel();
            App.renderManager.updateHierarchyBar();
            if (App.state.selectedId) {
                document.querySelectorAll('.component-item-wrapper').forEach(el => el.classList.remove('selected'));
                const newSelectedEl = document.querySelector(`[data-id="${App.state.selectedId}"]`);
                if (newSelectedEl) newSelectedEl.classList.add('selected');
            }
            return true;
        }
        return false;
    }

    static deepCloneComponent(comp, newParentId = null) {
        let baseId = this.getMaxGlobalId();
        const cloneComponent = (c, parentId) => {
            baseId++;
            const clone = {
                ...c,
                id: baseId,
                parentId: parentId,
                children: [],
                props: { ...c.props },
                events: { ...c.events },
                customProps: { ...(c.customProps || {}) }
            };
            for (let child of c.children) {
                const childClone = cloneComponent(child, clone.id);
                clone.children.push(childClone);
            }
            return clone;
        };
        return cloneComponent(comp, newParentId);
    }

    static duplicateComponent(comp) {
        if (!comp) return false;
        App.recordSnapshot();
        const parentId = comp.parentId;
        let parentList = null;
        let originalIndex = -1;

        if (parentId === null) {
            parentList = App.state.components;
            originalIndex = parentList.findIndex(c => c.id === comp.id);
        } else {
            const parent = ComponentFinder.findComponentById(parentId);
            if (parent) {
                parentList = parent.children;
                originalIndex = parentList.findIndex(c => c.id === comp.id);
            }
        }

        if (originalIndex === -1 || !parentList) return false;

        const clone = ComponentManager.deepCloneComponent(comp, parentId);
        parentList.splice(originalIndex + 1, 0, clone);

        App.renderManager.appendComponentToParent(clone, parentId, originalIndex + 1);
        App.renderManager.selectComponent(clone.id);
        Utils.showToast(`已复制组件: ${clone.name}`);
        App.markDirty();
        return true;
    }

    static moveComponentTo(compId, newParentId, newIndex) {
        const comp = ComponentFinder.findComponentById(compId);
        if (!comp) return false;
        App.recordSnapshot();
        const oldParentId = comp.parentId;
        // 禁止将父组件移动到自己的子组件中
        if (newParentId !== null) {
            let ancestor = ComponentFinder.findComponentById(newParentId);
            while (ancestor) {
                if (ancestor.id === compId) return false;
                ancestor = ComponentFinder.findComponentById(ancestor.parentId);
            }
        }

        // 1. 从旧数据中移除
        if (oldParentId === null) {
            const idx = App.state.components.findIndex(c => c.id === compId);
            if (idx !== -1) App.state.components.splice(idx, 1);
        } else {
            const oldParent = ComponentFinder.findComponentById(oldParentId);
            if (oldParent) {
                const idx = oldParent.children.findIndex(c => c.id === compId);
                if (idx !== -1) oldParent.children.splice(idx, 1);
            }
        }

        // 2. 更新 parentId
        comp.parentId = newParentId;

        // 3. 插入新数据
        if (newParentId === null) {
            if (newIndex === undefined || newIndex >= App.state.components.length) {
                App.state.components.push(comp);
            } else {
                App.state.components.splice(newIndex, 0, comp);
            }
        } else {
            const newParent = ComponentFinder.findComponentById(newParentId);
            if (!newParent || !ComponentTypes[newParent.type]?.canNest) return false;
            if (newIndex === undefined || newIndex >= newParent.children.length) {
                newParent.children.push(comp);
            } else {
                newParent.children.splice(newIndex, 0, comp);
            }
        }

        // 4. 刷新画布
        App.renderManager.renderCanvas();
        App.renderManager.selectComponent(compId);
        App.markDirty();
        Utils.showToast(`已移动组件: ${comp.name}`);
        return true;
    }
}