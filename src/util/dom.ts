// 通用 DOM 与字符串工具

/** 按 id 获取元素并断言非空（元素缺失视为编程错误，直接抛出） */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`缺少必需的 DOM 元素: #${id}`);
    return el as T;
}

/** 按选择器获取第一个元素 */
export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
    return root.querySelector<T>(selector);
}

/** 按选择器获取全部元素 */
export function qsa<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
}

export function escapeHtml(str: unknown): string {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

export function escapeAttr(str: unknown): string {
    if (str === null || str === undefined) return '';
    return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * XAML 属性值转义。
 * 换行/回车/制表符必须输出为字符引用（&#xA; 等），否则 XML 解析器会把
 * 属性值中的原始换行按空格归一化，导致导出→导入往返不一致。
 */
export function escapeXml(str: unknown): string {
    if (str === null || str === undefined) return '';
    return escapeAttr(str)
        .replace(/\r\n|\r|\n/g, '&#xA;')
        .replace(/\t/g, '&#x9;');
}

/** 用于 innerHTML 模板中包裹用户可控文本 */
export function esc(str: unknown): string {
    return escapeHtml(str);
}

export function isSafeUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().trim();
    if (lower.startsWith('javascript:')) return false;
    if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return false;
    return true;
}

/**
 * 将 PCL 内置图片的 pack:// 路径转换为后端可访问的 /images/ 路径
 * pack://application:,,,/images/Blocks/Grass.png -> /images/Blocks/Grass.png
 */
export function normalizeImageUrl(url: string): string {
    if (!url) return '';
    const m = url.match(/^pack:\/\/application:,,,\/images\/(.+)/i);
    if (m) return `/images/${m[1]}`;
    return url;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): T {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return ((...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn(...args);
            timer = null;
        }, delay);
    }) as T;
}
