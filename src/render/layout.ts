// 布局样式计算：Margin / Padding / 对齐 → DOM 样式
import type { ComponentModel } from '../core/types';
import { resolveColorValue, resolveThemeBrushes } from '../xaml/markers';

export function parseMargin(marginStr: string): [number, number, number, number] {
    if (!marginStr || marginStr.trim() === '') return [0, 0, 0, 0];
    const parts = marginStr.split(',').map(p => {
        const n = parseFloat(p.trim());
        return isNaN(n) ? 0 : n;
    });
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
}

export function formatMargin(l: number, t: number, r: number, b: number): string {
    const n = (x: number) => (isNaN(x) ? 0 : x);
    l = n(l); t = n(t); r = n(r); b = n(b);
    if (l === t && t === r && r === b) return String(l);
    if (l === r && t === b) return `${l},${t}`;
    return `${l},${t},${r},${b}`;
}

/** WPF Thickness → CSS padding */
export function thicknessToCss(thickness: string): string {
    if (!thickness) return '';
    const parts = thickness.split(',').map(p => parseFloat(p.trim()));
    if (parts.some(isNaN)) return '';
    if (parts.length === 1) return `${parts[0]}px`;
    if (parts.length === 2) return `${parts[0]}px ${parts[1]}px`;
    if (parts.length === 3) return `${parts[0]}px ${parts[1]}px ${parts[2]}px`;
    return `${parts[0]}px ${parts[1]}px ${parts[2]}px ${parts[3]}px`;
}

/** 数值自动补 px，其余（如 50%）原样返回 */
export function cssSize(value: string | undefined): string {
    if (!value) return '';
    return /^\d+(\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value;
}

/** 应用通用布局样式（外边距、宽高、对齐） */
export function applyLayoutStyles(wrapper: HTMLElement, comp: ComponentModel): void {
    const [ml, mt, mr, mb] = parseMargin(comp.props.Margin || '0');
    wrapper.style.margin = `${mt}px ${mr}px ${mb}px ${ml}px`;

    wrapper.style.width = cssSize(comp.props.Width);
    wrapper.style.height = cssSize(comp.props.Height);

    const halign = comp.props.HorizontalAlignment || 'Stretch';
    const hasLeft = ml !== 0;
    const hasRight = mr !== 0;

    if (halign === 'Center') {
        if (!hasLeft && !hasRight) {
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = 'auto';
        } else {
            if (hasLeft) wrapper.style.marginLeft = `${ml}px`;
            if (hasRight) wrapper.style.marginRight = `${mr}px`;
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } else if (halign === 'Right') {
        if (!hasRight) {
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = '0';
        } else {
            if (hasLeft) wrapper.style.marginLeft = `${ml}px`;
            wrapper.style.marginRight = `${mr}px`;
        }
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } else if (halign === 'Left') {
        wrapper.style.marginLeft = hasLeft ? `${ml}px` : '0';
        wrapper.style.marginRight = hasRight ? `${mr}px` : 'auto';
        if (!comp.props.Width) wrapper.style.width = 'auto';
    } else {
        if (!comp.props.Width) wrapper.style.width = '100%';
        if (hasLeft) wrapper.style.marginLeft = `${ml}px`;
        if (hasRight) wrapper.style.marginRight = `${mr}px`;
    }

    const valign = comp.props.VerticalAlignment || 'Stretch';
    const alignSelf = valign === 'Top' ? 'flex-start'
        : valign === 'Center' ? 'center'
        : valign === 'Bottom' ? 'flex-end'
        : 'stretch';
    wrapper.style.alignSelf = alignSelf;

    wrapper.setAttribute('data-halign', halign);
    wrapper.setAttribute('data-valign', valign);
}

export function applyPaddingStyles(comp: ComponentModel, el: HTMLElement): void {
    const css = thicknessToCss(comp.props.Padding || '');
    el.style.padding = css;
}

export function applyTextStyles(el: HTMLElement, comp: ComponentModel): void {
    const fg = comp.props.Foreground;
    el.style.color = fg ? resolveColorValue(fg) : '';
    el.style.fontSize = comp.props.FontSize ? `${comp.props.FontSize}px` : '';
    el.style.fontWeight = comp.props.FontWeight || '';
    if (comp.props.TextWrapping === 'NoWrap') {
        el.style.whiteSpace = 'nowrap';
    } else {
        el.style.whiteSpace = 'normal';
        el.style.wordBreak = 'break-word';
    }
}

/** 解析可用于背景的标记（{DynamicResource ...}） */
export function resolveBackground(value: string): string | null {
    return resolveThemeBrushes(value);
}
