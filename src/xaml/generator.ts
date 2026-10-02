// 组件树 → XAML 生成器
import type { ComponentModel, ColumnDef, RowDef } from '../core/types';
import { getSpec } from '../components/specs';
import { escapeXml } from '../util/dom';

/** 组件通用属性输出顺序 */
const COMMON_ATTRS = ['Margin', 'Padding', 'Width', 'Height', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible', 'ToolTip'];
const GRID_ATTRS = ['Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan'];

/** 各类型专属属性输出顺序（在通用属性之后、customProps 之前） */
const TYPE_ATTR_ORDER: Record<string, string[]> = {
    card: ['Title', 'CanSwap', 'IsSwapped', 'UseAnimation', 'SwapLogoRight', 'HasMouseAnimation'],
    text: ['Text', 'FontSize', 'FontWeight', 'TextWrapping', 'Foreground'],
    hint: ['Text', 'Theme'],
    image: ['Source', 'FallbackSource', 'LoadingSource', 'EnableCache'],
    button: ['Text', 'ColorType', 'Padding'],
    textbutton: ['Text'],
    icontextbutton: ['Text', 'Logo', 'LogoScale', 'ColorType'],
    iconbutton: ['Logo', 'LogoScale', 'Theme'],
    listitem: ['Title', 'Info', 'Logo', 'Type'],
    path: ['Data', 'Fill', 'Stretch'],
    stackpanel: ['Orientation'],
    horizontalstack: ['Orientation'],
    grid: ['ColumnsDefinition', 'RowsDefinition']
};

function attrStr(name: string, value: string): string {
    return `${name}="${escapeXml(value)}"`;
}

/** 收集一个组件的全部属性（不含子元素定义） */
function collectAttrs(comp: ComponentModel): string[] {
    const attrs: string[] = [];
    const seen = new Set<string>();
    const spec = getSpec(comp.type);

    // 1. 通用布局属性
    for (const key of COMMON_ATTRS) {
        const val = comp.props[key];
        if (val !== undefined && val !== '') {
            attrs.push(attrStr(key, val));
            seen.add(key);
        }
    }

    // 2. Grid 附加属性
    for (const key of GRID_ATTRS) {
        const val = comp.props[key];
        if (val !== undefined && val !== '') {
            attrs.push(attrStr(key, val));
            seen.add(key);
        }
    }

    // 3. 类型专属属性
    for (const key of TYPE_ATTR_ORDER[comp.type] ?? []) {
        if (seen.has(key)) continue;
        const val = comp.props[key];
        if (val !== undefined && val !== '' && key !== 'ColumnsDefinition' && key !== 'RowsDefinition') {
            attrs.push(attrStr(key, val));
            seen.add(key);
        }
    }

    // 4. 事件
    if (comp.events?.type) {
        attrs.push(attrStr('EventType', comp.events.type));
        attrs.push(attrStr('EventData', comp.events.data || ''));
    }

    // 5. 其余已知属性（未在上述顺序中出现的，按声明顺序）
    if (spec) {
        for (const key of Object.keys(spec.defaults)) {
            if (seen.has(key) || key === 'ColumnsDefinition' || key === 'RowsDefinition') continue;
            const val = comp.props[key];
            if (val !== undefined && val !== '') {
                attrs.push(attrStr(key, val));
                seen.add(key);
            }
        }
    }

    // 6. 自定义属性（跳过内部字段）
    for (const [key, val] of Object.entries(comp.customProps || {})) {
        if (key === '_unknownChildren') continue;
        attrs.push(attrStr(key, String(val)));
        seen.add(key);
    }

    return attrs;
}

function generateDefinitionChildren(comp: ComponentModel, indent: string): string {
    let out = '';
    let cols: ColumnDef[] = [];
    let rows: RowDef[] = [];
    try { cols = JSON.parse(comp.props.ColumnsDefinition || '[]'); } catch { cols = []; }
    try { rows = JSON.parse(comp.props.RowsDefinition || '[]'); } catch { rows = []; }

    if (cols.length) {
        out += `${indent}  <Grid.ColumnDefinitions>\n`;
        for (const def of cols) {
            const a: string[] = [];
            if (def.width) a.push(`Width="${escapeXml(def.width)}"`);
            if (def.minWidth) a.push(`MinWidth="${escapeXml(def.minWidth)}"`);
            if (def.maxWidth) a.push(`MaxWidth="${escapeXml(def.maxWidth)}"`);
            out += `${indent}    <ColumnDefinition ${a.join(' ')}/>\n`;
        }
        out += `${indent}  </Grid.ColumnDefinitions>\n`;
    }
    if (rows.length) {
        out += `${indent}  <Grid.RowDefinitions>\n`;
        for (const def of rows) {
            const a: string[] = [];
            if (def.height) a.push(`Height="${escapeXml(def.height)}"`);
            if (def.minHeight) a.push(`MinHeight="${escapeXml(def.minHeight)}"`);
            if (def.maxHeight) a.push(`MaxHeight="${escapeXml(def.maxHeight)}"`);
            out += `${indent}    <RowDefinition ${a.join(' ')}/>\n`;
        }
        out += `${indent}  </Grid.RowDefinitions>\n`;
    }
    return out;
}

/** 将保留的未知子元素 XML 写入（仅首行加缩进，内部行保持原样以保证幂等） */
function serializePreserved(preserved: unknown, indent: number): string {
    if (!Array.isArray(preserved)) return '';
    const pad = '  '.repeat(indent);
    let out = '';
    for (const item of preserved) {
        if (typeof item !== 'string' || !item.trim()) continue;
        out += pad + item.replace(/\s+$/, '') + '\n';
    }
    return out;
}

function serializeNode(comp: ComponentModel, indent: number): string {
    const pad = '  '.repeat(indent);
    const spec = getSpec(comp.type);
    const tag = spec?.xamlTag ?? comp.type;

    const preserved = comp.customProps?._unknownChildren;
    const hasPreserved = Array.isArray(preserved) && preserved.length > 0;

    const attrs = collectAttrs(comp);
    const attrStrAll = attrs.length ? ' ' + attrs.join(' ') : '';

    const isContainer = comp.children.length > 0 || comp.type === 'grid' || hasPreserved ||
        (spec?.canNest && ['card', 'stackpanel', 'horizontalstack'].includes(comp.type));

    if (!isContainer) {
        return `${pad}<${tag}${attrStrAll} />\n`;
    }

    let out = `${pad}<${tag}${attrStrAll}>\n`;
    if (comp.type === 'grid') {
        out += generateDefinitionChildren(comp, pad);
    }
    for (const child of comp.children) {
        out += serializeNode(child, indent + 1);
    }
    out += serializePreserved(preserved, indent + 1);
    out += `${pad}</${tag}>\n`;
    return out;
}

/** 生成完整 XAML（顶层组件之间空行分隔） */
export function generateXAML(components: ComponentModel[]): string {
    let out = '';
    for (const comp of components) {
        out += serializeNode(comp, 0);
        out += '\n';
    }
    return out;
}
