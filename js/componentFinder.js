import { App } from './appCore.js';

export class ComponentFinder {
    static findComponentById(id, list = App.state.components) {
        for (let comp of list) {
            if (comp.id === id) return comp;
            if (comp.children && comp.children.length) {
                let found = ComponentFinder.findComponentById(id, comp.children);
                if (found) return found;
            }
        }
        return null;
    }
}