// historyManager.js
import { App } from './appCore.js';
import { ComponentFinder } from './componentFinder.js';

// 操作类型枚举
export const ActionType = {
    ADD: 'add',
    REMOVE: 'remove',
    UPDATE_PROPS: 'updateProps',
    UPDATE_EVENTS: 'updateEvents',
    UPDATE_CUSTOM_PROPS: 'updateCustomProps',
    MOVE: 'move'
};

export class HistoryManager {
    constructor(maxSize = 100) {
        this.undoStack = [];      // 存储 Action 对象
        this.redoStack = [];
        this.maxSize = maxSize;
        this.isUndoRedo = false;   // 防止记录操作过程中的重复记录
    }

    // 记录一个操作（命令）
    recordAction(action) {
        if (this.isUndoRedo) return;
        // 清空 redo 栈
        this.redoStack = [];
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    // 撤销
    undo() {
        if (this.undoStack.length === 0) return false;
        const action = this.undoStack.pop();
        this.isUndoRedo = true;
        try {
            this.executeInverse(action);
            this.redoStack.push(action);
        } finally {
            this.isUndoRedo = false;
        }
        // 刷新界面
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    // 重做
    redo() {
        if (this.redoStack.length === 0) return false;
        const action = this.redoStack.pop();
        this.isUndoRedo = true;
        try {
            this.executeAction(action);
            this.undoStack.push(action);
        } finally {
            this.isUndoRedo = false;
        }
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    // 执行正向操作
    executeAction(action) {
        switch (action.type) {
            case ActionType.ADD:
                this.doAdd(action.component, action.parentId, action.index);
                break;
            case ActionType.REMOVE:
                this.doRemove(action.componentId);
                break;
            case ActionType.UPDATE_PROPS:
                this.doUpdateProps(action.componentId, action.newProps, action.oldProps);
                break;
            case ActionType.UPDATE_EVENTS:
                this.doUpdateEvents(action.componentId, action.newEvents, action.oldEvents);
                break;
            case ActionType.UPDATE_CUSTOM_PROPS:
                this.doUpdateCustomProps(action.componentId, action.newCustom, action.oldCustom);
                break;
            case ActionType.MOVE:
                this.doMove(action.componentId, action.newParentId, action.newIndex, action.oldParentId, action.oldIndex);
                break;
            default:
                console.warn('未知操作类型', action);
        }
    }

    // 执行逆向操作（撤销）
    executeInverse(action) {
        switch (action.type) {
            case ActionType.ADD:
                this.doRemove(action.component.id);
                break;
            case ActionType.REMOVE:
                this.doAdd(action.component, action.parentId, action.index);
                break;
            case ActionType.UPDATE_PROPS:
                this.doUpdateProps(action.componentId, action.oldProps, action.newProps);
                break;
            case ActionType.UPDATE_EVENTS:
                this.doUpdateEvents(action.componentId, action.oldEvents, action.newEvents);
                break;
            case ActionType.UPDATE_CUSTOM_PROPS:
                this.doUpdateCustomProps(action.componentId, action.oldCustom, action.newCustom);
                break;
            case ActionType.MOVE:
                this.doMove(action.componentId, action.oldParentId, action.oldIndex, action.newParentId, action.newIndex);
                break;
        }
    }

    // ----- 具体操作实现（直接修改数据模型，不触发额外记录）-----
    doAdd(component, parentId, index) {
        if (parentId === null) {
            if (index !== undefined && index >= 0 && index <= App.state.components.length) {
                App.state.components.splice(index, 0, component);
            } else {
                App.state.components.push(component);
            }
        } else {
            const parent = ComponentFinder.findComponentById(parentId);
            if (parent && parent.children) {
                if (index !== undefined && index >= 0 && index <= parent.children.length) {
                    parent.children.splice(index, 0, component);
                } else {
                    parent.children.push(component);
                }
            }
        }
        component.parentId = parentId;
    }

    doRemove(componentId) {
        const removeFromList = (list, parentComp = null) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === componentId) {
                    list.splice(i, 1);
                    return true;
                }
                if (list[i].children && removeFromList(list[i].children, list[i])) return true;
            }
            return false;
        };
        removeFromList(App.state.components);
        if (App.state.selectedId === componentId) {
            App.state.selectedId = null;
        }
    }

    doUpdateProps(componentId, newProps, oldProps) {
        const comp = ComponentFinder.findComponentById(componentId);
        if (comp) {
            comp.props = { ...comp.props, ...newProps };
        }
    }

    doUpdateEvents(componentId, newEvents, oldEvents) {
        const comp = ComponentFinder.findComponentById(componentId);
        if (comp) {
            comp.events = { ...newEvents };
        }
    }

    doUpdateCustomProps(componentId, newCustom, oldCustom) {
        const comp = ComponentFinder.findComponentById(componentId);
        if (comp) {
            comp.customProps = { ...newCustom };
        }
    }

    doMove(componentId, newParentId, newIndex, oldParentId, oldIndex) {
        // 先找到组件并移除
        let comp = null;
        if (oldParentId === null) {
            const idx = App.state.components.findIndex(c => c.id === componentId);
            if (idx !== -1) {
                comp = App.state.components[idx];
                App.state.components.splice(idx, 1);
            }
        } else {
            const oldParent = ComponentFinder.findComponentById(oldParentId);
            if (oldParent) {
                const idx = oldParent.children.findIndex(c => c.id === componentId);
                if (idx !== -1) {
                    comp = oldParent.children[idx];
                    oldParent.children.splice(idx, 1);
                }
            }
        }
        if (!comp) return;
        comp.parentId = newParentId;
        if (newParentId === null) {
            if (newIndex !== undefined && newIndex >= 0 && newIndex <= App.state.components.length) {
                App.state.components.splice(newIndex, 0, comp);
            } else {
                App.state.components.push(comp);
            }
        } else {
            const newParent = ComponentFinder.findComponentById(newParentId);
            if (newParent) {
                if (newIndex !== undefined && newIndex >= 0 && newIndex <= newParent.children.length) {
                    newParent.children.splice(newIndex, 0, comp);
                } else {
                    newParent.children.push(comp);
                }
            }
        }
    }

    // 重置历史
    reset() {
        this.undoStack = [];
        this.redoStack = [];
    }
}