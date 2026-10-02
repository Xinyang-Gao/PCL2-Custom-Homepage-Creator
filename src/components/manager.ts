// 组件增删改查与移动（写操作统一走这里，自动记录历史并刷新渲染）
import type { ComponentModel } from '../core/types';
import { store } from '../core/store';
import { history, ActionType, locate } from '../core/history';
import { findComponentById, getSiblingInfo, deepCloneComponent, getMaxGlobalId, insertIntoTree, removeFromTree, isDescendant } from './tree';
import { createComponentModel, getSpec } from './specs';
import { toast } from '../ui/toast';
import { renderManager } from '../render/renderManager';
import { propsPanel } from '../render/propsPanel';

export const componentManager = {
    nextId(): number {
        return getMaxGlobalId() + 1;
    },

    create(type: string, parentId: number | null = null, customId?: number): ComponentModel | null {
        const id = customId !== undefined ? customId : this.nextId();
        return createComponentModel(type, id, parentId);
    },

    /** 添加组件；返回是否成功 */
    add(comp: ComponentModel, parentId: number | null = null, index: number | null = null): boolean {
        const ok = insertIntoTree(comp, parentId, index ?? undefined);
        if (!ok) return false;
        history.record({
            type: ActionType.ADD,
            component: structuredClone(comp),
            parentId,
            index: index ?? undefined
        });
        renderManager.appendComponentToParent(comp, parentId, index);
        store.markDirty();
        return true;
    },

    removeById(id: number): boolean {
        const comp = findComponentById(id);
        if (!comp) return false;
        const sibling = getSiblingInfo(comp);
        const snapshot = structuredClone(comp);
        const removed = removeFromTree(id);
        if (!removed) return false;

        history.record({
            type: ActionType.REMOVE,
            component: snapshot,
            parentId: sibling?.parentId ?? null,
            index: sibling?.index
        });

        document.querySelector(`.component-item-wrapper[data-id="${id}"]`)?.remove();

        if (store.selectedId === id) {
            store.selectedId = comp.parentId;
        }
        store.markDirty();
        propsPanel.update();
        renderManager.updateHierarchyBar();
        if (store.selectedId !== null) {
            document.querySelectorAll('.component-item-wrapper.selected').forEach(el => el.classList.remove('selected'));
            document.querySelector(`.component-item-wrapper[data-id="${store.selectedId}"]`)?.classList.add('selected');
        }
        return true;
    },

    duplicate(id: number): boolean {
        const comp = findComponentById(id);
        if (!comp) return false;
        const sibling = getSiblingInfo(comp);
        if (!sibling) return false;
        const clone = deepCloneComponent(comp, sibling.parentId);
        if (!this.add(clone, sibling.parentId, sibling.index + 1)) return false;
        renderManager.selectComponent(clone.id);
        toast(`已复制组件: ${clone.name}`);
        return true;
    },

    /** 移动组件到新的位置 */
    move(compId: number, newParentId: number | null, newIndex: number): boolean {
        const comp = findComponentById(compId);
        if (!comp) return false;
        if (newParentId !== null && isDescendant(compId, newParentId)) return false;
        if (newParentId !== null) {
            const targetParent = findComponentById(newParentId);
            if (!targetParent || !getSpec(targetParent.type)?.canNest) return false;
        }

        const oldPos = locate(compId);
        removeFromTree(compId);
        const ok = insertIntoTree(comp, newParentId, newIndex);
        if (!ok) return false;

        history.record({
            type: ActionType.MOVE,
            componentId: compId,
            newParentId, newIndex,
            oldParentId: oldPos?.parentId ?? null,
            oldIndex: oldPos?.index ?? 0
        });
        store.markDirty();
        return true;
    },

    clear(): void {
        if (!store.components.length) return;
        store.components = [];
        store.selectedId = null;
        history.reset();
        store.markDirty();
    }
};
