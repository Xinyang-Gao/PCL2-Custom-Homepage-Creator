// 真实文档导入测试：docs/Custom.xaml（PCL 官方主页示例）
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importFromXAML } from '../src/xaml/parser';
import { generateXAML } from '../src/xaml/generator';
import { store } from '../src/core/store';

const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).XMLSerializer = dom.window.XMLSerializer;
(globalThis as any).localStorage = dom.window.localStorage;

const xaml = readFileSync(join(__dirname, '..', 'docs', 'Custom.xaml'), 'utf-8');

let fail = 0;
const assert = (c: boolean, n: string, d = '') => {
    console.log(`${c ? '  ✓' : '  ✗'} ${n}${c ? '' : ' ' + d}`);
    if (!c) fail++;
};

console.log('\n[真实文件] docs/Custom.xaml 导入');
const result = importFromXAML(xaml);
assert(result.ok, `导入成功（顶层 ${result.count} 个卡片）`);

const out = generateXAML(store.components);
assert(out.includes('local:MyCard'), '生成 MyCard');
assert(out.includes('EventType="打开网页"'), '保留事件');
assert(out.includes('CustomEventService.Events'), '高级事件集合原样保留');
assert(out.includes('{variable:TutorialCardSwap:True}') || out.includes('IsSwapped'), '保留 {variable} 标记或 IsSwapped');
assert(out.includes('Grid.ColumnDefinitions') || out.includes('ColumnDefinition'), '保留 Grid 列定义');
assert(out.includes('local:MyImage'), '保留 MyImage');
assert(out.includes('&#xA;') || out.includes('&#x') || out.includes('\\n'), '保留换行转义');

// 二次导入幂等
const second = importFromXAML(out);
assert(second.ok, '二次导入成功');
const out2 = generateXAML(store.components);
assert(out2 === out, '两次生成一致');

console.log(`\n未知标签: [${result.unknownTags.join(', ')}]`);
console.log(fail === 0 ? '真实文档测试全部通过' : `${fail} 项失败`);
if (fail) process.exit(1);
