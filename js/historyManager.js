import { App } from './appCore.js';

export class HistoryManager {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.ignoreNext = false;
    }

    getSnapshot() {
        return JSON.parse(JSON.stringify(App.state.components));
    }

    pushState() {
        if (this.ignoreNext) {
            this.ignoreNext = false;
            return;
        }
        const snapshot = this.getSnapshot();
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxSize) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const current = this.getSnapshot();
        this.redoStack.push(current);
        const previous = this.undoStack.pop();
        this.ignoreNext = true;
        App.state.components = previous;
        App.state.selectedId = null;
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        const next = this.redoStack.pop();
        this.undoStack.push(this.getSnapshot());
        this.ignoreNext = true;
        App.state.components = next;
        App.state.selectedId = null;
        App.renderManager.renderCanvas();
        App.markDirty();
        return true;
    }

    reset() {
        this.undoStack = [];
        this.redoStack = [];
    }
}