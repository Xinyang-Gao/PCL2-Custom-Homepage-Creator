// 组件树操作：查找、插入、删除、克隆
import type { ComponentModel } from '../core/types';
import { store } from '../core/store';

export function findComponentById(id: number | null, list: ComponentModel[] = store.components): ComponentModel | null {
    if (id === null) return null;
    for (const comp of list) {
        if (comp.id === id) return comp;
        if (comp.children.length) {
            const found = findComponentById(id, comp.children);
            if (found) return found;
        }
    }
    return null;
}

/** 获取组件的父 id 与在兄弟中的索引 */
export function getSiblingInfo(comp: ComponentModel): { parentId: number | null; index: number } | null {
    if (comp.parentId === null) {
        const index = store.components.findIndex(c => c.id === comp.id);
        return index === -1 ? null : { parentId: null, index };
    }
    const parent = findComponentById(comp.parentId);
    if (!parent) return null;
    const index = parent.children.findIndex(c => c.id === comp.id);
    return index === -1 ? null : { parentId: parent.parentId === null ? parent.id : parent.id, index };
}

/** 从树中移除（返回被移除的组件） */
export function removeFromTree(id: number): ComponentModel | null {
    const walk = (list: ComponentModel[]): ComponentModel | null => {
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) {
            const [removed] = list.splice(idx, 1);
            removed.parentId = removed.parentId; // 保持原 parentId 信息供撤销使用
            return removed;
        }
        for (const c of list) {
            if (c.children.length) {
                const found = walk(c.children);
                if (found) return found;
            }
        }
        return null;
    };
    return walk(store.components);
}

/** 插入到树中指定位置 */
export function insertIntoTree(comp: ComponentModel, parentId: number | null, index?: number): boolean {
    if (parentId === null) {
        comp.parentId = null;
        const i = index === undefined ? store.components.length : Math.min(index, store.components.length);
        store.components.splice(i, 0, comp);
        return true;
    }
    const parent = findComponentById(parentId);
    if (!parent) return false;
    comp.parentId = parentId;
    const i = index === undefined ? parent.children.length : Math.min(index, parent.children.length);
    parent.children.splice(i, 0, comp);
    return true;
}

export function getMaxGlobalId(list: ComponentModel[] = store.components): number {
    let max = 0;
    const traverse = (items: ComponentModel[]) => {
        for (const c of items) {
            if (c.id > max) max = c.id;
            if (c.children.length) traverse(c.children);
        }
    };
    traverse(list);
    return max;
}

/** 深拷贝组件并为整棵子树分配新 id */
export function deepCloneComponent(comp: ComponentModel, newParentId: number | null): ComponentModel {
    let baseId = getMaxGlobalId();
    const cloneNode = (c: ComponentModel, parentId: number | null): ComponentModel => {
        baseId++;
        const clone: ComponentModel = {
            ...c,
            id: baseId,
            parentId,
            children: [],
            props: { ...c.props },
            events: { ...c.events },
            customProps: { ...(c.customProps || {}) }
        };
        for (const child of c.children) {
            clone.children.push(cloneNode(child, clone.id));
        }
        return clone;
    };
    return cloneNode(comp, newParentId);
}

/** 检查 targetId 是否为 id 的子孙（防止循环引用） */
export function isDescendant(id: number, targetId: number | null): boolean {
    if (targetId === null) return false;
    let cur = findComponentById(targetId);
    while (cur) {
        if (cur.id === id) return true;
        cur = cur.parentId === null ? null : findComponentById(cur.parentId);
    }
    return false;
}
