// 往返集成测试：XAML → 模型 → XAML，覆盖新组件、事件、标记、Grid
import { JSDOM } from 'jsdom';
import { importFromXAML } from '../src/xaml/parser';
import { generateXAML } from '../src/xaml/generator';
import { store } from '../src/core/store';
import { getEventTypeDoc, EVENT_TYPES } from '../src/xaml/eventTypes';
import { MARKERS, colorBrush } from '../src/xaml/markers';
import { COMPONENT_SPECS } from '../src/components/specs';

// ---- 环境注入（jsdom 提供 DOMParser / XMLSerializer / localStorage） ----
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).XMLSerializer = dom.window.XMLSerializer;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).document = dom.window.document;

let pass = 0;
let fail = 0;
function assert(cond: boolean, name: string, detail = '') {
    if (cond) {
        pass++;
        console.log(`  ✓ ${name}`);
    } else {
        fail++;
        console.error(`  ✗ ${name} ${detail}`);
    }
}

// ---- 1. 完整组件往返 ----
console.log('\n[1] 全组件类型 XAML 往返');
const src = `
<local:MyCard Title="测试卡片" Margin="0,0,0,15" CanSwap="True" IsSwapped="False" CustomAttr="hello">
    <StackPanel Margin="25,40,23,15">
        <TextBlock TextWrapping="Wrap" Margin="0,0,0,4" FontSize="13" FontWeight="Bold"
                    Text="带 {variable:name:default} 与 {date} 的文本" Foreground="{DynamicResource ColorBrush3}" />
        <local:MyHint Text="提示" Theme="Yellow" />
        <local:MyImage Height="50" Source="pack://application:,,,/images/Blocks/Grass.png" EnableCache="False" />
        <local:MyButton Text="按钮" ColorType="Red" Height="35" EventType="打开网页" EventData="https://example.com/" />
        <local:MyTextButton Text="文本按钮" EventType="弹出提示" EventData="你好|Green" />
        <local:MyIconTextButton Text="图标文本按钮" ColorType="Highlight" Logo="M10 10" LogoScale="1.2" EventType="刷新页面" EventData="-" />
        <local:MyIconButton Logo="M20 20" Theme="Red" Width="25" Height="25" EventType="内存优化" />
        <local:MyListItem Title="条目" Info="说明" Logo="pack://application:,,,/images/Blocks/Anvil.png" Type="Clickable" EventType="打开帮助" EventData="个性化/替换标记.json" />
        <Path Data="M0 0" Fill="{DynamicResource ColorBrush1}" Stretch="Uniform" Width="24" Height="24" />
        <StackPanel Orientation="Horizontal">
            <local:MyButton Text="A" Margin="0,0,10,0" />
            <local:MyButton Text="B" />
        </StackPanel>
        <Grid>
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="1*" />
                <ColumnDefinition Width="150" MinWidth="100" MaxWidth="300" />
            </Grid.ColumnDefinitions>
            <local:MyButton Grid.Column="0" Text="第一列" />
            <local:MyButton Grid.Column="1" Grid.RowSpan="1" Text="第二列" />
        </Grid>
    </StackPanel>
</local:MyCard>
`;

const r1 = importFromXAML(src);
assert(r1.ok, `导入成功 (${r1.count} 个顶层组件)`);
assert(r1.unknownTags.length === 0, '无未知标签', JSON.stringify(r1.unknownTags));

const out1 = generateXAML(store.components);
assert(out1.includes('local:MyIconTextButton'), '包含 MyIconTextButton');
assert(out1.includes('local:MyIconButton'), '包含 MyIconButton');
assert(out1.includes('<Path'), '包含 Path');
assert(out1.includes('EventType="打开网页"'), '保留 EventType');
assert(out1.includes('EventData="https://example.com/"'), '保留 EventData');
assert(out1.includes('CustomAttr="hello"'), '保留自定义属性');
assert(out1.includes('{variable:name:default}'), '保留替换标记');
assert(out1.includes('{DynamicResource ColorBrush3}'), '保留主题色标记');
assert(out1.includes('Grid.Column="1"'), '保留 Grid 附加属性');
assert(out1.includes('ColumnDefinition Width="150" MinWidth="100" MaxWidth="300"'), '保留 Grid 列定义');

// ---- 2. 二次往返幂等 ----
console.log('\n[2] 二次往返幂等性');
const before = store.components.length;
const r2 = importFromXAML(out1);
assert(r2.ok, '二次导入成功');
const out2 = generateXAML(store.components);
assert(out2 === out1, '两次生成结果一致', `\n--- 第一次 ---\n${out1}\n--- 第二次 ---\n${out2}`);

// ---- 3. 水平 StackPanel 识别 ----
console.log('\n[3] Orientation 识别');
const hType = store.components[0]?.type;
assert(hType === 'card', '顶层是卡片');
const flat = out2.split('\n').filter(l => l.includes('Orientation="Horizontal"'));
assert(flat.length >= 1, '水平 StackPanel 保留 Orientation');

// ---- 4. 事件注册表 ----
console.log('\n[4] 事件注册表完整性');
const docEvents = ['打开网页', '执行命令', '打开文件', '打开帮助', '启动游戏', '复制文本', '刷新页面', '刷新主页', '刷新帮助', '今日人品', '内存优化', '清理垃圾', '弹出窗口', '弹出提示', '切换页面', '导入整合包', '下载文件', '修改设置', '写入设置', '修改变量', '写入变量', '加入房间', '检查更新'];
for (const name of docEvents) {
    assert(!!getEventTypeDoc(name), `事件已注册: ${name}`);
}
assert(EVENT_TYPES.every(e => e.desc && e.placeholder !== undefined), '每个事件均有描述与占位提示');

// ---- 5. 替换标记 ----
console.log('\n[5] 替换标记与主题色');
for (const t of ['{pcl_version}', '{date}', '{minecraft}', '{user}', '{setup:设置名}', '{variable:变量名:默认值}']) {
    assert(MARKERS.some(m => m.token === t), `标记已注册: ${t}`);
}
const c1 = colorBrush(1);
const c8 = colorBrush(8);
assert(c1.startsWith('rgb(') && c8.startsWith('rgb('), 'ColorBrush 可计算', `${c1} / ${c8}`);
assert(c1 !== c8, '不同浓度颜色不同');

// ---- 6. 错误处理 ----
console.log('\n[6] 错误处理');
const rErr = importFromXAML('<local:MyCard><Unclosed></local:MyCard>');
assert(!rErr.ok, '非法 XML 被拒绝');

// ---- 7. 未知标签保留 ----
console.log('\n[7] 未知标签原样保留（非注释，可再次导入）');
const rUnk = importFromXAML('<local:MyCard Title="T"><local:MyUnknown Thing="1" /></local:MyCard>');
assert(rUnk.ok, '含未知子元素的导入成功');
const outUnk = generateXAML(store.components);
assert(outUnk.includes('<local:MyUnknown'), '未知元素原样写回', outUnk);
// 写回的内容应能再次导入且保持
const rUnk2 = importFromXAML(outUnk);
assert(rUnk2.ok, '含未知元素的输出可再次导入');
const outUnk2 = generateXAML(store.components);
assert(outUnk2 === outUnk, '未知元素往返稳定', `\n1: ${outUnk}\n2: ${outUnk2}`);

// ---- 8. 组件规格 ----
console.log('\n[8] 组件规格');
for (const key of ['card', 'stackpanel', 'horizontalstack', 'grid', 'text', 'hint', 'image', 'button', 'textbutton', 'icontextbutton', 'iconbutton', 'listitem', 'path']) {
    assert(!!COMPONENT_SPECS[key], `组件已注册: ${key}`);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
if (fail > 0) process.exit(1);
