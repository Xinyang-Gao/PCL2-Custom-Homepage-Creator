// XAML → 组件树 解析器
import type { ComponentModel, ColumnDef, RowDef } from '../core/types';
import { COMPONENT_SPECS, getSpec } from '../components/specs';
import { getMaxGlobalId } from '../components/tree';
import { store } from '../core/store';
import { toast } from '../ui/toast';

/** 标签 → 类型键 映射（小写局部名） */
const TAG_TO_TYPE: Record<string, string> = {
    mycard: 'card',
    textblock: 'text',
    myhint: 'hint',
    myimage: 'image',
    mybutton: 'button',
    mytextbutton: 'textbutton',
    myicontextbutton: 'icontextbutton',
    myiconbutton: 'iconbutton',
    mylistitem: 'listitem',
    path: 'path'
};

const COMMON_PROPS = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible', 'Width', 'Height'];
const GRID_ATTACH = ['Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan'];

function localTagName(el: Element): string {
    const tag = el.tagName;
    const i = tag.indexOf(':');
    return (i !== -1 ? tag.substring(i + 1) : tag).toLowerCase();
}

export interface ImportResult {
    ok: boolean;
    count: number;
    unknownTags: string[];
}

/**
 * 导入 XAML 字符串，成功时替换 store 中的组件树。
 */
export function importFromXAML(xmlStr: string): ImportResult {
    const unknownTags = new Set<string>();
    try {
        if (xmlStr.charCodeAt(0) === 0xFEFF) xmlStr = xmlStr.slice(1);
        const wrapped = `<root xmlns:local="http://tempuri.org/pcl" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">${xmlStr}</root>`;
        const doc = new DOMParser().parseFromString(wrapped, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            const msg = parseError.textContent || 'XML 格式错误';
            let lineAttr = parseError.getAttribute('line') || parseError.getAttribute('lineNumber') || '';
            let colAttr = parseError.getAttribute('column') || parseError.getAttribute('columnNumber') || '';
            if (!lineAttr) {
                const m = msg.match(/line:?\s*(\d+)/i) || msg.match(/行\s*(\d+)/);
                if (m) lineAttr = m[1];
            }
            if (!colAttr) {
                const m = msg.match(/column:?\s*(\d+)/i) || msg.match(/列\s*(\d+)/);
                if (m) colAttr = m[1];
            }
            const loc = [lineAttr ? `第 ${lineAttr} 行` : '', colAttr ? `第 ${colAttr} 列` : ''].filter(Boolean).join(' ');
            throw new Error(`XAML 解析失败: ${msg.substring(0, 200)}${loc ? ` (${loc})` : ''}`);
        }

        let nextId = getMaxGlobalId() + 1;
        /** 解析期间的组件索引：parent 可能尚未挂入 store，需用此表查找 */
        const parsedById = new Map<number, ComponentModel>();

        const parseNode = (node: Element, parentId: number | null): ComponentModel | null => {
            const tagName = localTagName(node);
            if (!tagName) return null;

            let type = TAG_TO_TYPE[tagName] ?? null;
            if (tagName === 'stackpanel') {
                const orientation = node.getAttribute('Orientation') || node.getAttribute('orientation');
                type = orientation && orientation.toLowerCase() === 'horizontal' ? 'horizontalstack' : 'stackpanel';
            } else if (tagName === 'grid') {
                type = 'grid';
            }

            if (!type || !COMPONENT_SPECS[type]) {
                unknownTags.add(tagName);
                const parent = parentId !== null ? parsedById.get(parentId) : null;
                if (parent) {
                    const serialized = new XMLSerializer().serializeToString(node);
                    const existing = (parent.customProps as Record<string, unknown>)._unknownChildren;
                    (parent.customProps as Record<string, unknown>)._unknownChildren = [
                        ...(Array.isArray(existing) ? existing : []),
                        serialized
                    ];
                }
                return null;
            }

            const spec = COMPONENT_SPECS[type];
            const comp: ComponentModel = {
                id: nextId++,
                type,
                name: spec.name,
                parentId,
                children: [],
                props: JSON.parse(JSON.stringify(spec.defaults)),
                events: { type: '', data: '' },
                customProps: {}
            };
            // 先登记再递归：解析子元素（含未知元素回填）时需要按 id 找到本节点
            parsedById.set(comp.id, comp);

            // 已知属性集合 = 默认属性 ∪ 通用属性 ∪ Grid 附加属性 ∪ 事件属性
            const knownProps = new Set([
                ...Object.keys(spec.defaults),
                ...COMMON_PROPS,
                ...GRID_ATTACH,
                'EventType', 'EventData',
                'Orientation', 'FontStyle', 'TextDecorations'
            ]);

            for (const attr of Array.from(node.attributes)) {
                // 事件属性由 comp.events 单独承载，不进入 props（避免在属性面板重复展示）
                if (attr.name === 'EventType' || attr.name === 'EventData' ||
                    attr.name === 'eventtype' || attr.name === 'eventdata') {
                    continue;
                }
                if (!knownProps.has(attr.name)) {
                    comp.customProps[attr.name] = attr.value;
                } else {
                    comp.props[attr.name] = attr.value;
                }
            }

            // 特殊处理：确保默认属性存在（XML 中缺省时保留默认值）
            for (const [k, v] of Object.entries(spec.defaults)) {
                if (comp.props[k] === undefined) comp.props[k] = v;
            }

            // 子元素
            const childNodes = Array.from(node.children);
            if (type === 'grid') {
                const cols: ColumnDef[] = [];
                const rows: RowDef[] = [];
                for (const child of childNodes) {
                    const name = localTagName(child);
                    if (name === 'grid.columndefinitions') {
                        for (const cd of Array.from(child.children)) {
                            cols.push({
                                width: cd.getAttribute('Width') || '',
                                minWidth: cd.getAttribute('MinWidth') || '',
                                maxWidth: cd.getAttribute('MaxWidth') || ''
                            });
                        }
                    } else if (name === 'grid.rowdefinitions') {
                        for (const rd of Array.from(child.children)) {
                            rows.push({
                                height: rd.getAttribute('Height') || '',
                                minHeight: rd.getAttribute('MinHeight') || '',
                                maxHeight: rd.getAttribute('MaxHeight') || ''
                            });
                        }
                    } else {
                        const c = parseNode(child, comp.id);
                        if (c) comp.children.push(c);
                    }
                }
                comp.props.ColumnsDefinition = JSON.stringify(cols);
                comp.props.RowsDefinition = JSON.stringify(rows);
            } else if (spec.canNest) {
                for (const child of childNodes) {
                    const c = parseNode(child, comp.id);
                    if (c) comp.children.push(c);
                }
            } else if (childNodes.length) {
                // 非容器控件（如 MyButton）的子元素：编辑器暂不建模，
                // 序列化为内部字段，导出时原样写回，避免高级事件等内容丢失
                const serializer = new XMLSerializer();
                const preserved = childNodes.map(child => serializer.serializeToString(child));
                (comp.customProps as Record<string, unknown>)._unknownChildren = preserved;
            }

            const evType = node.getAttribute('EventType') || node.getAttribute('eventtype');
            const evData = node.getAttribute('EventData') || node.getAttribute('eventdata');
            if (evType) comp.events = { type: evType, data: evData || '' };

            return comp;
        };

        const newComponents: ComponentModel[] = [];
        for (const node of Array.from(doc.documentElement.children)) {
            const comp = parseNode(node, null);
            if (comp) newComponents.push(comp);
        }

        if (newComponents.length) {
            store.reset(newComponents);
            const result: ImportResult = { ok: true, count: newComponents.length, unknownTags: [...unknownTags] };
            return result;
        }
        return { ok: false, count: 0, unknownTags: [...unknownTags] };
    } catch (e) {
        console.error(e);
        toast('解析失败: ' + (e as Error).message, true);
        return { ok: false, count: 0, unknownTags: [...unknownTags] };
    }
}
