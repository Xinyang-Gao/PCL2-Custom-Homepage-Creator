// 组件类型声明式规格 —— 新增组件只需在此注册 + 在 renderer 提供渲染分支
import type { ComponentModel } from '../core/types';

export interface ComponentSpec {
    /** 稳定类型键 */
    key: string;
    /** 显示名称 */
    name: string;
    /** 组件库图标（Font Awesome 类名） */
    icon: string;
    /** 是否可包含子元素 */
    canNest: boolean;
    /** XAML 标签名（不含命名空间前缀），stackpanel 依 Orientation 区分 */
    xamlTag: string;
    /** 分类（组件库分组） */
    category: '容器' | '基础' | '控件' | '图形';
    defaults: Record<string, string>;
    /** 画布上的渲染方式 */
    renderKind: 'card' | 'stack' | 'grid' | 'leaf';
}

const COMMON_LAYOUT = {
    Margin: '0',
    HorizontalAlignment: 'Stretch',
    VerticalAlignment: 'Stretch'
};

export const COMPONENT_SPECS: Record<string, ComponentSpec> = {
    card: {
        key: 'card',
        name: '卡片 (MyCard)',
        icon: 'fas fa-layer-group',
        canNest: true,
        xamlTag: 'local:MyCard',
        category: '容器',
        renderKind: 'card',
        defaults: {
            Title: '新卡片',
            Margin: '0,0,0,15',
            CanSwap: 'True',
            IsSwapped: 'True',
            ToolTip: '',
            HorizontalAlignment: 'Stretch',
            VerticalAlignment: 'Stretch',
            UseAnimation: 'True',
            SwapLogoRight: 'False',
            HasMouseAnimation: 'True'
        }
    },
    stackpanel: {
        key: 'stackpanel',
        name: '垂直布局 (StackPanel)',
        icon: 'fas fa-align-justify',
        canNest: true,
        xamlTag: 'StackPanel',
        category: '容器',
        renderKind: 'stack',
        defaults: {
            Margin: '0',
            ToolTip: '',
            HorizontalAlignment: 'Stretch',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    horizontalstack: {
        key: 'horizontalstack',
        name: '水平布局 (StackPanel)',
        icon: 'fas fa-arrows-alt-h',
        canNest: true,
        xamlTag: 'StackPanel',
        category: '容器',
        renderKind: 'stack',
        defaults: {
            Orientation: 'Horizontal',
            HorizontalAlignment: 'Center',
            Margin: '0',
            ToolTip: '',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    grid: {
        key: 'grid',
        name: '网格布局 (Grid)',
        icon: 'fas fa-th',
        canNest: true,
        xamlTag: 'Grid',
        category: '容器',
        renderKind: 'grid',
        defaults: {
            ColumnsDefinition: '[]',
            RowsDefinition: '[]',
            Margin: '0',
            ToolTip: '',
            HorizontalAlignment: 'Stretch',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    text: {
        key: 'text',
        name: '文本 (TextBlock)',
        icon: 'fas fa-font',
        canNest: false,
        xamlTag: 'TextBlock',
        category: '基础',
        renderKind: 'leaf',
        defaults: {
            Text: '这是一段文本',
            FontSize: '14',
            TextWrapping: 'Wrap',
            FontWeight: '',
            Foreground: '',
            ToolTip: '',
            ...COMMON_LAYOUT,
            IsHitTestVisible: 'True'
        }
    },
    hint: {
        key: 'hint',
        name: '提示条 (MyHint)',
        icon: 'fas fa-info-circle',
        canNest: false,
        xamlTag: 'local:MyHint',
        category: '基础',
        renderKind: 'leaf',
        defaults: {
            Text: '提示信息',
            Theme: 'Blue',
            ToolTip: '',
            ...COMMON_LAYOUT,
            IsHitTestVisible: 'True'
        }
    },
    image: {
        key: 'image',
        name: '图片 (MyImage)',
        icon: 'fas fa-image',
        canNest: false,
        xamlTag: 'local:MyImage',
        category: '基础',
        renderKind: 'leaf',
        defaults: {
            Source: 'https://www.baidu.com/img/flexible/logo/pc/result.png',
            Height: '60',
            HorizontalAlignment: 'Center',
            ToolTip: '',
            Margin: '0',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True',
            EnableCache: 'True',
            FallbackSource: '',
            LoadingSource: 'pack://application:,,,/images/Icons/NoIcon.png'
        }
    },
    button: {
        key: 'button',
        name: '按钮 (MyButton)',
        icon: 'fas fa-hand-pointer',
        canNest: false,
        xamlTag: 'local:MyButton',
        category: '控件',
        renderKind: 'leaf',
        defaults: {
            Text: '按钮',
            ColorType: 'Highlight',
            Height: '35',
            Padding: '25,0,25,0',
            Margin: '0,4,0,10',
            ToolTip: '',
            HorizontalAlignment: 'Stretch',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    textbutton: {
        key: 'textbutton',
        name: '文本按钮 (MyTextButton)',
        icon: 'fas fa-minus-square',
        canNest: false,
        xamlTag: 'local:MyTextButton',
        category: '控件',
        renderKind: 'leaf',
        defaults: {
            Text: '文本按钮',
            Margin: '0,8,0,10',
            ToolTip: '',
            HorizontalAlignment: 'Center',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    icontextbutton: {
        key: 'icontextbutton',
        name: '图标文本按钮 (MyIconTextButton)',
        icon: 'fas fa-icons',
        canNest: false,
        xamlTag: 'local:MyIconTextButton',
        category: '控件',
        renderKind: 'leaf',
        defaults: {
            Text: '带图标的按钮',
            Logo: 'M1091 0H78C35 0 0 35 0 78v863c0 43 35 78 78 78H1091c43 0 78-35 78-78V78C1170 35 1134 0 1091 0z m-8 87v78H87v-78h994zM87 933V254h994v679H87v0z',
            LogoScale: '1',
            ColorType: 'Black',
            Height: '35',
            Margin: '0,4,0,8',
            ToolTip: '',
            HorizontalAlignment: 'Center',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    iconbutton: {
        key: 'iconbutton',
        name: '图标按钮 (MyIconButton)',
        icon: 'fas fa-circle',
        canNest: false,
        xamlTag: 'local:MyIconButton',
        category: '控件',
        renderKind: 'leaf',
        defaults: {
            Logo: 'M149 873c47 47 101 83 162 109 63 26 130 40 199 40 69 0 136-13 199-40 61-25 115-62 162-109s83-101 109-162c26-63 40-130 40-199 0-69-13-136-40-199-25-61-62-115-109-162-46-46-101-83-162-109C648 13 580 0 511 0s-136 13-199 40c-61 25-115 62-162 109s-83 101-109 162C13 375 0 442 0 511s13 136 40 199c25 61 62 115 109 162zM97 511c0-228 185-414 414-414 228 0 414 185 414 414S740 926 511 926c-228 0-414-185-414-414z M539 244c-8-4-17-7-27-7-9 0-19 2-27 7-16 9-27 27-27 47 0 30 24 54 54 54 30 0 54-24 54-54 0-19-10-37-27-47zM566 732v-284c0-30-24-54-54-54-30 0-54 24-54 54v284c0 30 24 54 54 54 30 0 54-24 54-54z',
            LogoScale: '1',
            Theme: 'Color',
            Width: '25',
            Height: '25',
            Margin: '4,4,4,4',
            ToolTip: '',
            HorizontalAlignment: 'Center',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    listitem: {
        key: 'listitem',
        name: '列表项 (MyListItem)',
        icon: 'fas fa-list',
        canNest: false,
        xamlTag: 'local:MyListItem',
        category: '控件',
        renderKind: 'leaf',
        defaults: {
            Title: '标题',
            Info: '描述',
            Logo: 'pack://application:,,,/images/Blocks/Grass.png',
            Type: 'Clickable',
            ToolTip: '',
            Margin: '-5,0,-5,8',
            HorizontalAlignment: 'Stretch',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    },
    path: {
        key: 'path',
        name: '矢量图形 (Path)',
        icon: 'fas fa-bezier-curve',
        canNest: false,
        xamlTag: 'Path',
        category: '图形',
        renderKind: 'leaf',
        defaults: {
            Data: 'M149 873c47 47 101 83 162 109 63 26 130 40 199 40 69 0 136-13 199-40 61-25 115-62 162-109s83-101 109-162c26-63 40-130 40-199 0-69-13-136-40-199-25-61-62-115-109-162-46-46-101-83-162-109C648 13 580 0 511 0s-136 13-199 40c-61 25-115 62-162 109s-83 101-109 162C13 375 0 442 0 511s13 136 40 199c25 61 62 115 109 162zM97 511c0-228 185-414 414-414 228 0 414 185 414 414S740 926 511 926c-228 0-414-185-414-414z',
            Fill: '{DynamicResource ColorBrush1}',
            Stretch: 'Uniform',
            Width: '24',
            Height: '24',
            Margin: '4,4,4,4',
            ToolTip: '',
            HorizontalAlignment: 'Center',
            VerticalAlignment: 'Stretch',
            IsHitTestVisible: 'True'
        }
    }
};

export const COMPONENT_KEYS = Object.keys(COMPONENT_SPECS);

export function getSpec(type: string): ComponentSpec | undefined {
    return COMPONENT_SPECS[type];
}

/** 属性下拉选项（键名 → 选项列表） */
export const PROP_SELECT_OPTIONS: Record<string, string[]> = {
    HorizontalAlignment: ['Stretch', 'Left', 'Center', 'Right'],
    VerticalAlignment: ['Stretch', 'Top', 'Center', 'Bottom'],
    TextWrapping: ['Wrap', 'NoWrap'],
    FontWeight: ['', 'Normal', 'Bold'],
    Theme: ['Blue', 'Yellow', 'Red'],
    // MyButton ColorType：Highlight=主题色，Red=红色，留空（默认）=黑色
    ColorType: ['', 'Highlight', 'Red'],
    Type: ['', 'Clickable'],
    Orientation: ['Vertical', 'Horizontal'],
    CanSwap: ['True', 'False'],
    IsSwapped: ['True', 'False'],
    EnableCache: ['True', 'False'],
    UseAnimation: ['True', 'False'],
    SwapLogoRight: ['True', 'False'],
    HasMouseAnimation: ['True', 'False'],
    IsHitTestVisible: ['True', 'False'],
    Stretch: ['Uniform', 'Fill', 'None', 'UniformToFill']
};

/** 按组件类型覆盖的选项 */
export const TYPE_SELECT_OPTIONS: Record<string, Record<string, string[]>> = {
    // MyIconTextButton ColorType：Black（默认）与 Highlight
    icontextbutton: { ColorType: ['Black', 'Highlight'] },
    // MyIconButton Theme：Color（默认）、White、Black、Red
    iconbutton: { Theme: ['Color', 'White', 'Black', 'Red'] },
    hint: { Theme: ['Blue', 'Yellow', 'Red'] }
};

export function getSelectOptions(type: string, key: string): string[] | null {
    const override = TYPE_SELECT_OPTIONS[type]?.[key];
    if (override) return override;
    const opts = PROP_SELECT_OPTIONS[key];
    return opts && opts.length ? opts : null;
}

/** 属性分组定义：键 → 分组标题 */
const PROP_GROUPS: Array<{ title: string; icon: string; keys: string[] }> = [
    { title: '内容', icon: 'fas fa-align-left', keys: ['Text', 'Title', 'Info', 'Source', 'Logo', 'Data', 'FallbackSource', 'LoadingSource'] },
    { title: '外观样式', icon: 'fas fa-palette', keys: ['Foreground', 'Fill', 'Background', 'FontSize', 'TextWrapping', 'FontWeight', 'Theme', 'ColorType', 'LogoScale', 'Type', 'Stretch'] },
    { title: '布局与边距', icon: 'fas fa-expand-alt', keys: ['Margin', 'Padding', 'Width', 'Height', 'HorizontalAlignment', 'VerticalAlignment', 'ColumnsDefinition', 'RowsDefinition', 'Orientation'] },
    { title: 'Grid 布局附加属性', icon: 'fas fa-th', keys: ['Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan'] },
    { title: '行为', icon: 'fas fa-cog', keys: ['CanSwap', 'IsSwapped', 'ToolTip', 'EnableCache', 'UseAnimation', 'SwapLogoRight', 'HasMouseAnimation', 'IsHitTestVisible'] }
];

const GROUP_BY_KEY = new Map<string, string>();
for (const g of PROP_GROUPS) for (const k of g.keys) GROUP_BY_KEY.set(k, g.title);

export function getPropGroupTitle(key: string): string {
    return GROUP_BY_KEY.get(key) ?? '其他';
}

export const PROP_GROUP_DEFS = PROP_GROUPS;

/** 创建组件实例（id 由调用方分配） */
export function createComponentModel(type: string, id: number, parentId: number | null): ComponentModel | null {
    const spec = COMPONENT_SPECS[type];
    if (!spec) return null;
    return {
        id,
        type,
        name: spec.name,
        parentId,
        children: [],
        props: JSON.parse(JSON.stringify(spec.defaults)),
        events: { type: '', data: '' },
        customProps: {}
    };
}
