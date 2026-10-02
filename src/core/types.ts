// 全局数据模型类型定义

/** 组件上绑定的单个自定义事件 */
export interface EventConfig {
    type: string;
    data: string;
}

/** 一个组件实例（树形结构） */
export interface ComponentModel {
    id: number;
    type: string;
    name: string;
    parentId: number | null;
    children: ComponentModel[];
    /** 已知属性，键来自 ComponentSpec.defaults 与属性分组注册表 */
    props: Record<string, string>;
    events: EventConfig;
    /** 导入时未识别的属性（键值对），导出时原样写回 */
    customProps: Record<string, string>;
}

/** 属性面板中的一个字段 */
export interface PropField {
    key: string;
    val: string;
}

/** 属性面板中的一个分组 */
export interface PropGroup {
    title: string;
    icon: string;
    fields: PropField[];
    /** 特殊分组标记：custom / addCustom */
    kind?: 'custom' | 'addCustom';
}

export interface ColumnDef {
    width: string;
    minWidth?: string;
    maxWidth?: string;
}

export interface RowDef {
    height: string;
    minHeight?: string;
    maxHeight?: string;
}

/** 事件参数说明 */
export interface EventParamDoc {
    name: string;
    required: boolean;
    desc: string;
    example?: string;
}

/** EventType 注册表条目 */
export interface EventTypeDoc {
    type: string;
    /** 分类（用于下拉分组） */
    category: string;
    desc: string;
    params: EventParamDoc[];
    /** EventData 输入框占位提示 */
    placeholder: string;
    /** 版本限制说明（如 "仅 PCL 2.11.1+"） */
    since?: string;
}

/** 替换标记条目 */
export interface MarkerDoc {
    /** 形如 {date} 或 {variable:}（需要参数） */
    token: string;
    label: string;
    group: string;
    desc: string;
    /** 是否为需要参数的高级标记（token 中已含参数骨架） */
    param?: boolean;
}
