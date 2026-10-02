// EventType 注册表 —— 依据 docs/自定义事件.md 整理
import type { EventTypeDoc } from '../core/types';

export const EVENT_TYPES: EventTypeDoc[] = [
    {
        type: '打开网页',
        category: '导航',
        desc: '在浏览器中打开指定网页。',
        params: [{ name: '网址', required: true, desc: '支持 http://、https://、minecraft://、minecraft-preview:// 协议', example: 'https://zh.minecraft.wiki/' }],
        placeholder: 'https://example.com'
    },
    {
        type: '执行命令',
        category: '系统',
        desc: '以特定的参数和路径启动进程（打开文件即为无参数进程）。',
        params: [
            { name: '进程路径', required: true, desc: '要启动的进程路径', example: 'notepad.exe' },
            { name: '进程参数', required: false, desc: '可选的进程参数', example: '/select,LatestLaunch.bat' }
        ],
        placeholder: 'notepad.exe|参数（可选）'
    },
    {
        type: '打开文件',
        category: '系统',
        desc: '以特定的参数和路径启动进程，与「执行命令」等价。',
        params: [
            { name: '进程路径', required: true, desc: '要启动的进程路径', example: 'notepad' },
            { name: '进程参数', required: false, desc: '可选的进程参数' }
        ],
        placeholder: 'notepad'
    },
    {
        type: '打开帮助',
        category: '导航',
        desc: '打开指定路径或网址中的帮助条目。',
        params: [{ name: '帮助文件', required: true, desc: '帮助库相对路径或网址，例如 个性化/XAML 格式.json', example: '个性化/自定义事件.json' }],
        placeholder: '个性化/自定义事件.json'
    },
    {
        type: '启动游戏',
        category: '游戏',
        desc: '启动指定版本名的 Minecraft，可指定自动进入服务器。',
        params: [
            { name: '版本名', required: true, desc: 'MC 版本名，或 \\current 直接启动当前版本', example: '1.20.1' },
            { name: '服务器地址', required: false, desc: '启动后自动加入该服务器', example: 'mc.hypixel.net' }
        ],
        placeholder: '\\current|mc.hypixel.net'
    },
    {
        type: '复制文本',
        category: '工具',
        desc: '将 EventData 中的内容复制到剪贴板（内容可包含 |）。',
        params: [{ name: '文本', required: true, desc: '要复制的文本', example: '/summon creeper ~ ~ ~' }],
        placeholder: '要复制的文本'
    },
    {
        type: '刷新页面',
        category: '刷新',
        desc: '刷新当前页面（等同 F5），可刷新替换标记。参数为空时刷新后显示提示。',
        params: [{ name: '静默标志', required: false, desc: '留空显示「已刷新！」提示，非空则静默执行', example: '-' }],
        placeholder: '（留空 = 刷新后提示）'
    },
    {
        type: '刷新主页',
        category: '刷新',
        desc: '刷新启动页右侧的自定义主页内容，可刷新替换标记。',
        params: [{ name: '静默标志', required: false, desc: '留空显示提示，非空静默执行', example: '-' }],
        placeholder: '（留空 = 刷新后提示）'
    },
    {
        type: '刷新帮助',
        category: '刷新',
        desc: '重新解压并加载帮助库（等同帮助页 F5）。',
        params: [{ name: '静默标志', required: false, desc: '留空显示提示，非空静默执行', example: '-' }],
        placeholder: '（留空 = 刷新后提示）'
    },
    {
        type: '今日人品',
        category: '工具',
        desc: '等同「更多 → 百宝箱 → 今日人品」。',
        params: [],
        placeholder: '（无参数）'
    },
    {
        type: '内存优化',
        category: '工具',
        desc: '等同「更多 → 百宝箱 → 内存优化」。',
        params: [],
        placeholder: '（无参数）'
    },
    {
        type: '清理垃圾',
        category: '工具',
        desc: '等同「更多 → 百宝箱 → 清理垃圾」。',
        params: [],
        placeholder: '（无参数）'
    },
    {
        type: '弹出窗口',
        category: '弹窗',
        desc: '弹出一个自定义窗口。',
        params: [
            { name: '标题', required: true, desc: '弹窗标题', example: '这是标题' },
            { name: '内容', required: true, desc: '弹窗内容，\\n 表示换行', example: '标题与内容以竖线间隔。' },
            { name: '按钮文本', required: false, desc: '确定按钮文本，默认「确定」', example: '好的' }
        ],
        placeholder: '标题|内容（\\n 换行）'
    },
    {
        type: '弹出提示',
        category: '弹窗',
        desc: '在左下角弹出一个提示条。',
        params: [
            { name: '内容', required: true, desc: '提示条内容', example: 'PCL 位于：{path}' },
            { name: '颜色', required: false, desc: 'Blue / Green / Red，默认 Blue', example: 'Green' }
        ],
        placeholder: '提示内容|Blue'
    },
    {
        type: '切换页面',
        category: '导航',
        desc: '强行让 PCL 切换到指定页面（非常规切换，部分页面会出错）。',
        params: [
            { name: '主页面', required: true, desc: '如 Setup、Download、Home', example: 'Setup' },
            { name: '子页面', required: false, desc: '默认第一个子页面', example: 'SetupUI' }
        ],
        placeholder: 'Setup|SetupUI'
    },
    {
        type: '导入整合包',
        category: '游戏',
        desc: '等同「版本选择 → 导入整合包」按钮。',
        params: [],
        placeholder: '（无参数）'
    },
    {
        type: '下载文件',
        category: '系统',
        desc: '从指定网址下载文件（仅 http/https）。',
        params: [
            { name: '来源网址', required: true, desc: '下载地址', example: 'https://example.com/file.png' },
            { name: '文件名', required: false, desc: '本地文件名，留空自动分析', example: '百度 Logo.png' },
            { name: '目标文件夹', required: false, desc: '留空则弹窗选择' }
        ],
        placeholder: 'https://example.com/file.png|文件名'
    },
    {
        type: '修改设置',
        category: '设置与变量',
        desc: '修改 PCL 的指定设置项并应用（已加密设置不可修改）。',
        params: [
            { name: '设置名', required: true, desc: '见 ModSetup.vb 开头列表', example: 'UiLauncherTransparent' },
            { name: '设置值', required: true, desc: '设置值', example: '400' },
            { name: '静默标志', required: false, desc: '留空显示「已写入设置！」提示' }
        ],
        placeholder: '设置名|设置值'
    },
    {
        type: '写入设置',
        category: '设置与变量',
        desc: '「修改设置」的别名。',
        params: [
            { name: '设置名', required: true, desc: '设置名' },
            { name: '设置值', required: true, desc: '设置值' }
        ],
        placeholder: '设置名|设置值'
    },
    {
        type: '修改变量',
        category: '设置与变量',
        desc: '写入自定义变量（存于注册表 HKCU\\Software\\PCL），供 {variable:} 标记读取。',
        params: [
            { name: '变量名', required: true, desc: '变量名', example: 'storage' },
            { name: '变量值', required: true, desc: '变量值', example: 'test_value' },
            { name: '静默标志', required: false, desc: '留空显示「已写入变量！」提示' }
        ],
        placeholder: '变量名|变量值'
    },
    {
        type: '写入变量',
        category: '设置与变量',
        desc: '「修改变量」的别名。',
        params: [
            { name: '变量名', required: true, desc: '变量名' },
            { name: '变量值', required: true, desc: '变量值' }
        ],
        placeholder: '变量名|变量值'
    },
    {
        type: '加入房间',
        category: '游戏',
        desc: '切换到联机页面并自动加入联机房间。',
        params: [{ name: '邀请码', required: false, desc: '留空则弹窗要求输入', example: 'PFE0F-X59JM-VVM0M' }],
        placeholder: 'PFE0F-X59JM-VVM0M（可留空）',
        since: 'PCL 2.11.1+（版本序号 ≥ 374）'
    },
    {
        type: '检查更新',
        category: '系统',
        desc: '等同设置中的「检查更新」按钮。',
        params: [],
        placeholder: '（无参数）',
        since: 'PCL 2.12.2+（版本序号 ≥ 380）'
    }
];

export const EVENT_TYPE_NAMES: string[] = EVENT_TYPES.map(e => e.type);

const byType = new Map<string, EventTypeDoc>(EVENT_TYPES.map(e => [e.type, e]));

export function getEventTypeDoc(type: string): EventTypeDoc | undefined {
    return byType.get(type);
}

/** 按分类分组（保持注册表顺序） */
export function getEventTypesByCategory(): Array<{ category: string; items: EventTypeDoc[] }> {
    const groups: Array<{ category: string; items: EventTypeDoc[] }> = [];
    for (const doc of EVENT_TYPES) {
        let g = groups.find(x => x.category === doc.category);
        if (!g) {
            g = { category: doc.category, items: [] };
            groups.push(g);
        }
        g.items.push(doc);
    }
    return groups;
}
