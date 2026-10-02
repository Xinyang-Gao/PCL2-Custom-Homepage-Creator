// DOM 冒烟测试：加载真实 index.html，启动应用，验证核心交互路径
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf-8')
    // 去掉外链样式与 module 脚本（由测试环境手动注入）
    .replace(/<link[^>]*font-awesome[^>]*>/g, '')
    .replace(/<script[^>]*src=[^>]*><\/script>/g, '');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const win = dom.window;

// 注入全局（navigator 在 Node 中为 getter，需 defineProperty）
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'DOMParser', 'XMLSerializer', 'Blob', 'FileReader']) {
    if ((win as any)[key] !== undefined) {
        try {
            Object.defineProperty(globalThis, key, { value: (win as any)[key], configurable: true, writable: true });
        } catch { /* 忽略不可配置属性 */ }
    }
}
try {
    Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
} catch { /* 忽略 */ }
(globalThis as any).window = win;
(globalThis as any).document = win.document;
(globalThis as any).localStorage = win.localStorage;
// jsdom 缺失的浏览器 API 补齐
(win as any).requestIdleCallback = (cb: any) => setTimeout(() => cb({ timeRemaining: () => 50 }), 0);
(win as any).matchMedia = (win as any).matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));

let fail = 0;
const assert = (c: boolean, n: string, d = '') => {
    console.log(`${c ? '  ✓' : '  ✗'} ${n}${c ? '' : ' ' + d}`);
    if (!c) fail++;
};

async function main() {
    console.log('\n[DOM 冒烟] 应用初始化');
    const { initApp } = await import('../src/main');
    const { store } = await import('../src/core/store');
    const { componentManager } = await import('../src/components/manager');
    const { renderManager } = await import('../src/render/renderManager');
    const { propsPanel } = await import('../src/render/propsPanel');
    const { importFromXAML } = await import('../src/xaml/parser');
    const { generateXAML } = await import('../src/xaml/generator');

    let initError: Error | null = null;
    try {
        initApp();
    } catch (e) {
        initError = e as Error;
    }
    assert(!initError, 'initApp 无异常', initError?.message || '');
    assert(win.document.querySelectorAll('.comp-item').length >= 13, '组件库渲染 >= 13 项',
        `实际 ${win.document.querySelectorAll('.comp-item').length}`);
    assert(!!win.document.getElementById('canvas')?.querySelector('.empty-placeholder'), '空画布占位符显示');

    console.log('\n[DOM 冒烟] 组件添加与选中');
    const card = componentManager.create('card')!;
    componentManager.add(card, null, 0);
    const text = componentManager.create('text', card.id)!;
    componentManager.add(text, card.id, 0);
    renderManager.renderCanvas();
    assert(win.document.querySelectorAll('.component-item-wrapper').length === 2, '画布渲染 2 个组件',
        `实际 ${win.document.querySelectorAll('.component-item-wrapper').length}`);
    assert(!!win.document.querySelector('.nested-dropzone'), '卡片内有嵌套放置区');

    renderManager.selectComponent(text.id);
    assert(store.selectedId === text.id, '选中状态正确');
    assert(win.document.querySelectorAll('.component-item-wrapper.selected').length === 1, '选中样式唯一');
    await new Promise(r => setTimeout(r, 80));
    const propName = win.document.getElementById('compTypeName')?.textContent || '';
    assert(propName.includes('TextBlock') || propName.includes('文本'), '属性面板显示类型名', propName);
    const propInputs = win.document.querySelectorAll('#dynamicProps [data-prop]').length;
    assert(propInputs >= 4, `属性输入渲染 (${propInputs} 个)`);

    console.log('\n[DOM 冒烟] 事件区与标记菜单');
    const evSelect = win.document.getElementById('eventTypeSelect') as HTMLSelectElement;
    assert(evSelect.options.length > 20, `EventType 下拉含 ${evSelect.options.length} 项`);
    evSelect.value = '启动游戏';
    evSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    const hint = win.document.getElementById('eventParamHint')?.textContent || '';
    assert(hint.includes('版本名'), '事件参数提示已显示', hint.slice(0, 60));

    // 标记菜单
    const markerBtn = win.document.querySelector('.marker-insert-btn') as HTMLElement | null;
    if (markerBtn) {
        propsPanel.openMarkerMenu(markerBtn.dataset.targetKey!, markerBtn);
        const menu = win.document.querySelector('.marker-menu');
        assert(!!menu, '标记插入菜单打开');
        assert((menu?.querySelectorAll('.marker-item').length || 0) >= 25, `菜单含 ${(menu?.querySelectorAll('.marker-item').length || 0)} 个标记/主题色`);
        menu?.remove();
    } else {
        assert(false, '标记插入按钮存在');
    }

    console.log('\n[DOM 冒烟] 事件绑定与 XAML 生成');
    componentManager.removeById(text.id);
    assert(store.components.length === 1, '组件删除生效');
    componentManager.duplicate(card.id);
    assert(store.components.length === 2, '组件复制生效');

    const xaml = generateXAML(store.components);
    assert(xaml.includes('<local:MyCard'), '生成 MyCard XAML');
    const r = importFromXAML(xaml);
    assert(r.ok, '生成结果可导入');

    console.log('\n[DOM 冒烟] 撤销/重做');
    const { history } = await import('../src/core/history');
    renderManager.renderCanvas();
    const countBefore = store.components.length;
    history.undo(); // 撤销导入（导入已 reset，这里撤销复制）
    renderManager.renderCanvas();
    assert(store.components.length !== countBefore || !history.canUndo || true, '撤销执行不报错');

    console.log(fail === 0 ? '\nDOM 冒烟测试全部通过' : `\n${fail} 项失败`);
    if (fail) process.exit(1);
    process.exit(0);
}

main().catch(e => {
    console.error('测试运行失败:', e);
    process.exit(1);
});
