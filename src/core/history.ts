// 增量操作历史（撤销/重做）
import type { ComponentModel } from './types';
import { store } from './store';
import { findComponentById, getSiblingInfo, removeFromTree, insertIntoTree } from '../components/tree';

export const ActionType = {
    ADD: 'add',
    REMOVE: 'remove',
    UPDATE_PROPS: 'updateProps',
    UPDATE_EVENTS: 'updateEvents',
    UPDATE_CUSTOM_PROPS: 'updateCustomProps',
    MOVE: 'move'
} as const;

export type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];

export interface HistoryAction {
    type: ActionTypeValue;
    component?: ComponentModel;
    componentId?: number;
    parentId?: number | null;
    index?: number;
    newParentId?: number | null;
    newIndex?: number;
    oldParentId?: number | null;
    oldIndex?: number;
    newProps?: Record<string, string>;
    oldProps?: Record<string, string>;
    newEvents?: { type: string; data: string };
    oldEvents?: { type: string; data: string };
    newCustom?: Record<string, string>;
    oldCustom?: Record<string, string>;
}

class HistoryManager {
    private undoStack: HistoryAction[] = [];
    private redoStack: HistoryAction[] = [];
    private maxSize = 100;
    private isUndoRedo = false;

    get canUndo(): boolean { return this.undoStack.length > 0; }
    get canRedo(): boolean { return this.redoStack.length > 0; }

    record(action: HistoryAction): void {
        if (this.isUndoRedo) return;
        this.redoStack = [];
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    }

    undo(): boolean {
        if (!this.undoStack.length) return false;
        const action = this.undoStack.pop()!;
        this.isUndoRedo = true;
        try {
            this.applyInverse(action);
            this.redoStack.push(action);
        } finally {
            this.isUndoRedo = false;
        }
        store.markDirty();
        return true;
    }

    redo(): boolean {
        if (!this.redoStack.length) return false;
        const action = this.redoStack.pop()!;
        this.isUndoRedo = true;
        try {
            this.apply(action);
            this.undoStack.push(action);
        } finally {
            this.isUndoRedo = false;
        }
        store.markDirty();
        return true;
    }

    private apply(action: HistoryAction): void {
        switch (action.type) {
            case ActionType.ADD:
                if (action.component) insertIntoTree(action.component, action.parentId ?? null, action.index);
                break;
            case ActionType.REMOVE:
                if (action.componentId !== undefined) removeFromTree(action.componentId);
                break;
            case ActionType.UPDATE_PROPS:
                this.updateProps(action.componentId!, action.newProps!);
                break;
            case ActionType.UPDATE_EVENTS:
                this.updateEvents(action.componentId!, action.newEvents!);
                break;
            case ActionType.UPDATE_CUSTOM_PROPS:
                this.updateCustom(action.componentId!, action.newCustom!);
                break;
            case ActionType.MOVE:
                this.move(action.componentId!, action.newParentId ?? null, action.newIndex ?? 0);
                break;
        }
    }

    private applyInverse(action: HistoryAction): void {
        switch (action.type) {
            case ActionType.ADD:
                if (action.component) removeFromTree(action.component.id);
                break;
            case ActionType.REMOVE:
                if (action.component) insertIntoTree(action.component, action.parentId ?? null, action.index);
                break;
            case ActionType.UPDATE_PROPS:
                this.updateProps(action.componentId!, action.oldProps!);
                break;
            case ActionType.UPDATE_EVENTS:
                this.updateEvents(action.componentId!, action.oldEvents!);
                break;
            case ActionType.UPDATE_CUSTOM_PROPS:
                this.updateCustom(action.componentId!, action.oldCustom!);
                break;
            case ActionType.MOVE:
                this.move(action.componentId!, action.oldParentId ?? null, action.oldIndex ?? 0);
                break;
        }
    }

    private updateProps(id: number, patch: Record<string, string>): void {
        const comp = findComponentById(id);
        if (comp) Object.assign(comp.props, patch);
    }

    private updateEvents(id: number, events: { type: string; data: string }): void {
        const comp = findComponentById(id);
        if (comp) comp.events = { ...events };
    }

    private updateCustom(id: number, custom: Record<string, string>): void {
        const comp = findComponentById(id);
        if (comp) comp.customProps = { ...custom };
    }

    private move(id: number, newParentId: number | null, newIndex: number): void {
        const comp = findComponentById(id);
        if (!comp) return;
        removeFromTree(id);
        comp.parentId = newParentId;
        insertIntoTree(comp, newParentId, newIndex);
    }

    reset(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export const history = new HistoryManager();

// 供 componentManager 记录 move 用：便捷读取当前位置
export function locate(id: number): { parentId: number | null; index: number } | null {
    const comp = findComponentById(id);
    if (!comp) return null;
    const info = getSiblingInfo(comp);
    if (!info) return null;
    return { parentId: info.parentId, index: info.index };
}
