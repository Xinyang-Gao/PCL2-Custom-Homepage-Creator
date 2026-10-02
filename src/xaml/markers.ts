// 替换标记注册表与主题色解析 —— 依据 docs/替换标记.md 与 docs/Custom.xaml
import type { MarkerDoc } from '../core/types';

export const MARKERS: MarkerDoc[] = [
    // 基础信息
    { token: '{pcl_version}', label: 'PCL 版本号', group: '基础信息', desc: '以小数点分隔的版本号，如 2.10.8.0' },
    { token: '{pcl_version_code}', label: 'PCL 版本序号', group: '基础信息', desc: '纯数字版本序号，如 369' },
    { token: '{pcl_build_type}', label: '构建类型（英）', group: '基础信息', desc: 'Snapshot / Release / Debug' },
    { token: '{pcl_version_branch}', label: '构建类型（中）', group: '基础信息', desc: '快照版 / 正式版 / 开发版' },
    { token: '{pcl_branch}', label: '分支名', group: '基础信息', desc: 'Official 或 OpenSource' },
    { token: '{identify}', label: '识别码', group: '基础信息', desc: '每个用户唯一，如 B49F-F9F4-2D63-2FE3' },
    { token: '{path}', label: 'PCL 所在文件夹', group: '基础信息', desc: '完整路径，以 \\ 结尾' },
    { token: '{path_with_name}', label: 'PCL 程序路径', group: '基础信息', desc: '含文件名的完整路径' },
    { token: '{path_temp}', label: '缓存文件夹', group: '基础信息', desc: 'PCL 缓存目录，以 \\ 结尾' },
    // 时间
    { token: '{date}', label: '当前日期', group: '时间', desc: 'yyyy/M/d 格式' },
    { token: '{time}', label: '当前时间', group: '时间', desc: 'HH:mm:ss 格式' },
    // Minecraft 信息
    { token: '{java}', label: 'Java 文件夹', group: 'MC 信息', desc: '本次启动使用的 java.exe 所在文件夹' },
    { token: '{minecraft}', label: 'MC 文件夹', group: 'MC 信息', desc: '当前 .minecraft 路径' },
    { token: '{version_path}', label: '版本文件夹', group: 'MC 信息', desc: '等价 {verpath}' },
    { token: '{version_indie}', label: '版本隔离文件夹', group: 'MC 信息', desc: '等价 {verindie}，隔离关闭时等同 {minecraft}' },
    { token: '{name}', label: 'MC 版本文件夹名', group: 'MC 信息', desc: '如 Forge-1.20.1' },
    { token: '{version}', label: 'MC 版本', group: 'MC 信息', desc: '可读名称，如 1.20.1' },
    // 登录信息
    { token: '{user}', label: 'MC 玩家名', group: '登录信息', desc: '当前登录的玩家名' },
    { token: '{uuid}', label: 'MC 玩家 UUID', group: '登录信息', desc: '小写 UUID' },
    { token: '{login}', label: '登录方式', group: '登录信息', desc: '正版 / 离线 / 统一通行证 / Authlib-Injector' },
    // 高级
    { token: '{hint}', label: '随机「你知道吗？」', group: '高级', desc: '随机提示条目' },
    { token: '{cave}', label: '随机回声洞条目', group: '高级', desc: '回声洞随机内容' },
    { token: '{setup:设置名}', label: '读取 PCL 设置', group: '高级', desc: '如 {setup:UiLauncherTransparent}', param: true },
    { token: '{variable:变量名}', label: '读取自定义变量', group: '高级', desc: '读取「修改变量」事件写入的变量，未设置则为空' },
    { token: '{variable:变量名:默认值}', label: '读取变量（带默认值）', group: '高级', desc: '变量未设置时替换为默认值', param: true }
];

export function getMarkerGroups(): Array<{ group: string; items: MarkerDoc[] }> {
    const groups: Array<{ group: string; items: MarkerDoc[] }> = [];
    for (const m of MARKERS) {
        let g = groups.find(x => x.group === m.group);
        if (!g) {
            g = { group: m.group, items: [] };
            groups.push(g);
        }
        g.items.push(m);
    }
    return groups;
}

// ================== 主题色（DynamicResource ColorBrush1-8） ==================

/** PCL 默认主题色（蓝），可通过设置面板覆盖 */
export const DEFAULT_THEME_COLOR = '#2f7ef7';

let currentThemeColor: string | null = null;

function readStoredColor(): string {
    try {
        return localStorage.getItem('pcl_theme_color') || DEFAULT_THEME_COLOR;
    } catch {
        return DEFAULT_THEME_COLOR;
    }
}

export function getThemeColor(): string {
    if (currentThemeColor === null) currentThemeColor = readStoredColor();
    return currentThemeColor;
}

export function setThemeColor(color: string): void {
    currentThemeColor = color;
    try {
        localStorage.setItem('pcl_theme_color', color);
    } catch {
        /* 非浏览器环境忽略 */
    }
}

function hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return [47, 126, 247];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/**
 * 计算 ColorBrush1-8 对应的颜色。
 * PCL 中浓度 1-4 为较深的主题色（配白字），5-8 为较浅的（配黑字）。
 * 此处基于当前主题色插值出近似效果，仅用于编辑器预览。
 */
export function colorBrush(n: number): string {
    const idx = Math.min(8, Math.max(1, Math.round(n)));
    const base = hexToRgb(getThemeColor());
    const black: [number, number, number] = [10, 14, 24];
    const white: [number, number, number] = [255, 255, 255];
    let rgb: [number, number, number];
    if (idx <= 4) {
        // 1 最深 → 4 接近原色
        rgb = mixRgb(black, base, 0.35 + (idx - 1) * 0.216);
    } else {
        // 5 接近原色 → 8 最浅
        rgb = mixRgb(base, white, (idx - 4) * 0.21);
    }
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * 解析颜色字符串用于预览：
 * - {DynamicResource ColorBrushN} → colorBrush(N)
 * - {DynamicResource ColorBrushN} 出现在其他属性中也同样处理
 * - 其余原样返回（#RRGGBB、rgb() 等浏览器可直接识别的格式）
 */
export function resolveColorValue(value: string): string {
    if (!value) return value;
    const m = value.match(/\{\s*DynamicResource\s+ColorBrush(\d)\s*\}/i);
    if (m) return colorBrush(parseInt(m[1], 10));
    return value;
}

/** 颜色值是否为主题色标记（用于属性面板显示色块） */
export function isThemeColorValue(value: string): boolean {
    return /\{\s*DynamicResource\s+ColorBrush\d\s*\}/i.test(value);
}

const THEME_BRUSH_RE = /\{\s*DynamicResource\s+ColorBrush(\d)\s*\}/gi;

/**
 * 在任意文本中解析主题色标记（用于 Background、BorderBrush 等属性的预览）。
 * 返回 CSS 颜色函数字符串，无法解析时返回 null。
 */
export function resolveThemeBrushes(text: string): string | null {
    if (!text) return null;
    THEME_BRUSH_RE.lastIndex = 0;
    if (!THEME_BRUSH_RE.test(text)) return null;
    THEME_BRUSH_RE.lastIndex = 0;
    const m = text.match(THEME_BRUSH_RE);
    if (!m || m.length === 0) return null;
    // 纯粹就是单个标记时直接替换
    const single = text.trim().match(/^\{\s*DynamicResource\s+ColorBrush(\d)\s*\}$/i);
    if (single) return colorBrush(parseInt(single[1], 10));
    return null;
}
