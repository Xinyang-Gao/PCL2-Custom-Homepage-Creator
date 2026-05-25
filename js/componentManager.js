// componentManager.js
import { ComponentTypes } from './componentTypes.js';
import { ComponentFinder } from './componentFinder.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';
import { ActionType } from './historyManager.js';

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
        // 记录操作（正向操作本身会执行，但记录逆向所需信息）
        const action = {
            type: ActionType.ADD,
            component: JSON.parse(JSON.stringify(comp)), // 深拷贝组件用于撤销删除
            parentId: targetParentId,
            index: insertIndex
        };
        // 执行实际添加
        if (targetParentId === null) {
            if (insertIndex !== null && insertIndex >= 0 && insertIndex <= App.state.components.length) {
                App.state.components.splice(insertIndex, 0, comp);
            } else {
                App.state.components.push(comp);
            }
        } else {
            const parent = ComponentFinder.findComponentById(targetParentId);
            if (parent && ComponentTypes[parent.type]?.canNest) {
                if (insertIndex !== null && insertIndex >= 0 && insertIndex <= parent.children.length) {
                    parent.children.splice(insertIndex, 0, comp);
                } else {
                    parent.children.push(comp);
                }
                comp.parentId = targetParentId;
            } else {
                return false;
            }
        }
        App.renderManager.appendComponentToParent(comp, targetParentId, insertIndex);
        App.markDirty();
        App.history.recordAction(action);
        return true;
    }

    static removeComponentById(id) {
        // 查找组件及其父级、索引
        let removedComp = null;
        let parentId = null;
        let index = -1;

        const findAndRemove = (list, parentComp = null) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    removedComp = JSON.parse(JSON.stringify(list[i]));
                    parentId = parentComp ? parentComp.id : null;
                    index = i;
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].children && findAndRemove(list[i].children, list[i])) return true;
            }
            return false;
        };

        if (!findAndRemove(App.state.components)) return false;

        const action = {
            type: ActionType.REMOVE,
            component: removedComp,
            parentId: parentId,
            index: index
        };

        // 移除 DOM 元素
        const el = document.querySelector(`.component-item-wrapper[data-id="${id}"]`);
        if (el) el.remove();

        if (App.state.selectedId === id) {
            if (parentId !== null) {
                App.state.selectedId = parentId;
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
        App.history.recordAction(action);
        return true;
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
        const newIndex = originalIndex + 1;
        // 使用 addComponent 自动记录操作
        ComponentManager.addComponent(clone, parentId, newIndex);
        App.renderManager.selectComponent(clone.id);
        Utils.showToast(`已复制组件: ${clone.name}`);
        return true;
    }

    static moveComponentTo(compId, newParentId, newIndex) {
        const comp = ComponentFinder.findComponentById(compId);
        if (!comp) return false;
        
        // 禁止将父组件移动到自己的子组件中
        if (newParentId !== null) {
            let ancestor = ComponentFinder.findComponentById(newParentId);
            while (ancestor) {
                if (ancestor.id === compId) return false;
                ancestor = ComponentFinder.findComponentById(ancestor.parentId);
            }
        }

        // 记录旧位置
        const oldParentId = comp.parentId;
        let oldIndex = -1;
        if (oldParentId === null) {
            oldIndex = App.state.components.findIndex(c => c.id === compId);
        } else {
            const oldParent = ComponentFinder.findComponentById(oldParentId);
            if (oldParent) oldIndex = oldParent.children.findIndex(c => c.id === compId);
        }

        const action = {
            type: ActionType.MOVE,
            componentId: compId,
            newParentId, newIndex,
            oldParentId, oldIndex
        };

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
        App.history.recordAction(action);
        return true;
    }
}