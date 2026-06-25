// xamlProcessor.js
import { ComponentTypes } from './componentTypes.js';
import { ComponentManager } from './componentManager.js';
import { App } from './appCore.js';
import { Utils } from './utils.js';
import { ComponentFinder } from './componentFinder.js';

export class XamlProcessor {
    static getLocalTagName(node) {
        const tag = node.tagName;
        if (!tag) return '';
        const colonIndex = tag.indexOf(':');
        return colonIndex !== -1 ? tag.substring(colonIndex + 1).toLowerCase() : tag.toLowerCase();
    }

    importFromXAML(xmlStr) {
        const unknownTags = new Set();
        try {
            if (xmlStr.charCodeAt(0) === 0xFEFF) xmlStr = xmlStr.slice(1);
            const wrappedXml = `<root xmlns:local="http://tempuri.org/pcl">${xmlStr}</root>`;
            const parser = new DOMParser();
            const xml = parser.parseFromString(wrappedXml, 'text/xml');
            const parseError = xml.querySelector('parsererror');
            if (parseError) {
                let errMsg = parseError.textContent || 'XML 格式错误';
                let line = null, column = null;
                const lineAttr = parseError.getAttribute('line') || parseError.getAttribute('lineNumber');
                const colAttr = parseError.getAttribute('column') || parseError.getAttribute('columnNumber');
                if (lineAttr) line = parseInt(lineAttr);
                if (colAttr) column = parseInt(colAttr);
                if (!line) {
                    const lineMatch = errMsg.match(/line:?\s*(\d+)/i) || errMsg.match(/行\s*(\d+)/);
                    if (lineMatch) line = parseInt(lineMatch[1]);
                }
                if (!column) {
                    const colMatch = errMsg.match(/column:?\s*(\d+)/i) || errMsg.match(/列\s*(\d+)/);
                    if (colMatch) column = parseInt(colMatch[1]);
                }
                let location = '';
                if (line) location += `第 ${line} 行`;
                if (column) location += `第 ${column} 列`;
                throw new Error(`XAML 解析失败: ${errMsg.substring(0, 200)}${location ? ` (${location})` : ''}`);
            }

            // 基于当前组件树的最大全局 ID 生成新 ID，避免冲突
            let maxId = ComponentManager.getMaxGlobalId();
            let nextId = maxId + 1;

            const parseNode = (node, parentId = null) => {
                const tagName = XamlProcessor.getLocalTagName(node);
                if (!tagName) return null;

                let type = null;
                if (tagName === 'mycard') type = 'card';
                else if (tagName === 'textblock') type = 'text';
                else if (tagName === 'myhint') type = 'hint';
                else if (tagName === 'myimage') type = 'image';
                else if (tagName === 'mybutton') type = 'button';
                else if (tagName === 'mytextbutton') type = 'textbutton';
                else if (tagName === 'mylistitem') type = 'listitem';
                else if (tagName === 'stackpanel') {
                    const orientation = node.getAttribute('Orientation') || node.getAttribute('orientation');
                    type = orientation && orientation.toLowerCase() === 'horizontal' ? 'horizontalstack' : 'stackpanel';
                }
                else if (tagName === 'grid') type = 'grid';

                if (!type || !ComponentTypes[type]) {
                    unknownTags.add(tagName);
                    // 保留未知元素为注释：将整个节点序列化为字符串存入父组件的 customProps
                    if (parentId !== null) {
                        const parentComp = ComponentFinder.findComponentById(parentId);
                        if (parentComp) {
                            if (!parentComp.customProps._unknownChildren) {
                                parentComp.customProps._unknownChildren = [];
                            }
                            const serializer = new XMLSerializer();
                            const unknownXml = serializer.serializeToString(node);
                            parentComp.customProps._unknownChildren.push(unknownXml);
                        }
                    }
                    return null;
                }

                // 使用全局唯一的 nextId 创建组件，并自动递增
                const comp = ComponentManager.createComponent(type, parentId, nextId++);

                const commonProps = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible'];
                commonProps.forEach(prop => {
                    const val = node.getAttribute(prop);
                    if (val !== null) comp.props[prop] = val;
                });

                const gridRow = node.getAttribute('Grid.Row');
                if (gridRow !== null) comp.props['Grid.Row'] = gridRow;
                const gridColumn = node.getAttribute('Grid.Column');
                if (gridColumn !== null) comp.props['Grid.Column'] = gridColumn;
                const gridRowSpan = node.getAttribute('Grid.RowSpan');
                if (gridRowSpan !== null) comp.props['Grid.RowSpan'] = gridRowSpan;
                const gridColumnSpan = node.getAttribute('Grid.ColumnSpan');
                if (gridColumnSpan !== null) comp.props['Grid.ColumnSpan'] = gridColumnSpan;

                // 已知属性集合（包含新增图片属性）
                const knownProps = new Set([
                    ...commonProps,
                    'Title', 'Text', 'Source', 'Height', 'ColorType', 'Padding', 'FontSize', 'TextWrapping', 'Foreground',
                    'Theme', 'Logo', 'Type', 'Info', 'ColumnsDefinition', 'RowsDefinition', 'Orientation',
                    'CanSwap', 'IsSwapped', 'UseAnimation', 'SwapLogoRight', 'HasMouseAnimation',
                    'Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan', 'EventType', 'EventData',
                    'EnableCache', 'FallbackSource', 'LoadingSource'
                ]);
                for (let attr of node.attributes) {
                    const name = attr.name;
                    const value = attr.value;
                    if (!knownProps.has(name)) {
                        comp.customProps[name] = value;
                    }
                }

                if (type === 'card') {
                    comp.props.Title = node.getAttribute('Title') || '卡片';
                    comp.props.CanSwap = node.getAttribute('CanSwap') ?? 'True';
                    comp.props.IsSwapped = node.getAttribute('IsSwapped') ?? 'True';
                    comp.props.UseAnimation = node.getAttribute('UseAnimation') ?? 'True';
                    comp.props.SwapLogoRight = node.getAttribute('SwapLogoRight') ?? 'False';
                    comp.props.HasMouseAnimation = node.getAttribute('HasMouseAnimation') ?? 'True';
                    for (let child of node.children) {
                        const childComp = parseNode(child, comp.id);
                        if (childComp) comp.children.push(childComp);
                    }
                }
                else if (type === 'grid') {
                    let colsDef = [], rowsDef = [];
                    for (let child of node.children) {
                        const childName = XamlProcessor.getLocalTagName(child);
                        if (childName === 'grid.columndefinitions') {
                            for (let cd of child.children) {
                                const width = cd.getAttribute('Width') || '';
                                const minWidth = cd.getAttribute('MinWidth') || '';
                                const maxWidth = cd.getAttribute('MaxWidth') || '';
                                colsDef.push({ width, minWidth, maxWidth });
                            }
                        }
                        else if (childName === 'grid.rowdefinitions') {
                            for (let rd of child.children) {
                                const height = rd.getAttribute('Height') || '';
                                const minHeight = rd.getAttribute('MinHeight') || '';
                                const maxHeight = rd.getAttribute('MaxHeight') || '';
                                rowsDef.push({ height, minHeight, maxHeight });
                            }
                        }
                        else {
                            const childComp = parseNode(child, comp.id);
                            if (childComp) comp.children.push(childComp);
                        }
                    }
                    if (colsDef.length) comp.props.ColumnsDefinition = JSON.stringify(colsDef);
                    else comp.props.ColumnsDefinition = "[]";
                    if (rowsDef.length) comp.props.RowsDefinition = JSON.stringify(rowsDef);
                    else comp.props.RowsDefinition = "[]";
                }
                else if (type === 'stackpanel' || type === 'horizontalstack') {
                    if (type === 'horizontalstack') comp.props.Orientation = 'Horizontal';
                    for (let child of node.children) {
                        const childComp = parseNode(child, comp.id);
                        if (childComp) comp.children.push(childComp);
                    }
                }
                else if (type === 'text') {
                    comp.props.Text = node.getAttribute('Text') || '文本';
                    comp.props.FontSize = node.getAttribute('FontSize') || '14';
                    comp.props.TextWrapping = node.getAttribute('TextWrapping') || 'Wrap';
                    comp.props.Foreground = node.getAttribute('Foreground') || '#1e293b';
                }
                else if (type === 'hint') {
                    comp.props.Text = node.getAttribute('Text') || '提示';
                    comp.props.Theme = node.getAttribute('Theme') || 'Blue';
                }
                else if (type === 'image') {
                    comp.props.Source = node.getAttribute('Source') || '';
                    comp.props.Height = node.getAttribute('Height') || '60';
                    comp.props.HorizontalAlignment = node.getAttribute('HorizontalAlignment') || 'Center';
                    // 新增图片属性 #C1
                    comp.props.EnableCache = node.getAttribute('EnableCache') ?? 'True';
                    comp.props.FallbackSource = node.getAttribute('FallbackSource') || '';
                    comp.props.LoadingSource = node.getAttribute('LoadingSource') || '';
                }
                else if (type === 'button') {
                    comp.props.Text = node.getAttribute('Text') || '按钮';
                    comp.props.ColorType = node.getAttribute('ColorType') || 'Highlight';
                    comp.props.Height = node.getAttribute('Height') || '35';
                    comp.props.Padding = node.getAttribute('Padding') || '20,0';
                    comp.props.Margin = node.getAttribute('Margin') || '0,4,0,10';
                }
                else if (type === 'textbutton') {
                    comp.props.Text = node.getAttribute('Text') || '文本按钮';
                    comp.props.Margin = node.getAttribute('Margin') || '0,8,0,10';
                }
                else if (type === 'listitem') {
                    comp.props.Title = node.getAttribute('Title') || '';
                    comp.props.Info = node.getAttribute('Info') || '';
                    comp.props.Logo = node.getAttribute('Logo') || 'pack://application:,,,/images/Blocks/Grass.png';
                    comp.props.Type = node.getAttribute('Type') || 'Clickable';
                }

                let evType = node.getAttribute('EventType') || node.getAttribute('eventtype');
                let evData = node.getAttribute('EventData') || node.getAttribute('eventdata');
                if (evType) comp.events = { type: evType, data: evData || '' };

                return comp;
            };

            let newComponents = [];
            for (let node of xml.documentElement.children) {
                const comp = parseNode(node);
                if (comp) newComponents.push(comp);
            }

            if (newComponents.length) {
                App.state.components = newComponents;
                App.state.selectedId = null;
                App.renderManager.renderCanvas();
                Utils.showToast(`成功导入 ${newComponents.length} 个组件`);
                if (unknownTags.size > 0) {
                    Utils.showToast(`警告：发现未知组件类型: ${Array.from(unknownTags).join(', ')}，它们已被保留为注释`, true);
                }
                App.resetDirty();
                App.history.reset();
            } else {
                Utils.showToast('未找到有效组件', true);
                if (unknownTags.size > 0) {
                    Utils.showToast(`文件中仅包含未知组件: ${Array.from(unknownTags).join(', ')}，已保留为注释`, true);
                }
            }
        } catch (e) {
            console.error(e);
            Utils.showToast('解析失败: ' + e.message, true);
        }
    }

    generateXAML(comps, indent = 0) {
        let xaml = '';
        const spaces = '  '.repeat(indent);

        for (let comp of comps) {
            // 首先输出该组件之前保存的未知元素注释
            if (comp.customProps && comp.customProps._unknownChildren) {
                for (let unknownXml of comp.customProps._unknownChildren) {
                    xaml += `${spaces}<!-- 未知元素保留: ${Utils.escapeXml(unknownXml)} -->\n`;
                }
            }

            const attrs = [];
            const commonAttrs = ['Margin', 'ToolTip', 'HorizontalAlignment', 'VerticalAlignment', 'IsHitTestVisible'];
            commonAttrs.forEach(attr => {
                if (comp.props[attr] && comp.props[attr] !== '') {
                    attrs.push(`${attr}="${Utils.escapeXml(comp.props[attr])}"`);
                }
            });

            const gridAttrs = ['Grid.Row', 'Grid.Column', 'Grid.RowSpan', 'Grid.ColumnSpan'];
            gridAttrs.forEach(attr => {
                if (comp.props[attr] && comp.props[attr] !== '') {
                    attrs.push(`${attr}="${Utils.escapeXml(comp.props[attr])}"`);
                }
            });

            if (comp.events?.type) {
                attrs.push(`EventType="${Utils.escapeXml(comp.events.type)}"`);
                attrs.push(`EventData="${Utils.escapeXml(comp.events.data || '')}"`);
            }

            for (const [key, val] of Object.entries(comp.customProps || {})) {
                // 跳过内部使用的 _unknownChildren
                if (key === '_unknownChildren') continue;
                attrs.push(`${key}="${Utils.escapeXml(val)}"`);
            }

            if (comp.type === 'card') {
                attrs.push(`Title="${Utils.escapeXml(comp.props.Title)}"`);
                attrs.push(`CanSwap="${comp.props.CanSwap || 'True'}"`);
                attrs.push(`IsSwapped="${comp.props.IsSwapped || 'True'}"`);
                if (comp.props.UseAnimation) attrs.push(`UseAnimation="${comp.props.UseAnimation}"`);
                if (comp.props.SwapLogoRight) attrs.push(`SwapLogoRight="${comp.props.SwapLogoRight}"`);
                if (comp.props.HasMouseAnimation) attrs.push(`HasMouseAnimation="${comp.props.HasMouseAnimation}"`);
                xaml += `${spaces}<local:MyCard ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</local:MyCard>\n\n`;
            }
            else if (comp.type === 'grid') {
                xaml += `${spaces}<Grid ${attrs.join(' ')}>\n`;
                let cols = [];
                let rows = [];
                try { cols = JSON.parse(comp.props.ColumnsDefinition); } catch (e) { cols = []; }
                try { rows = JSON.parse(comp.props.RowsDefinition); } catch (e) { rows = []; }
                if (cols.length) {
                    xaml += `${spaces}  <Grid.ColumnDefinitions>\n`;
                    cols.forEach(def => {
                        let colAttrs = [];
                        if (def.width) colAttrs.push(`Width="${def.width}"`);
                        if (def.minWidth) colAttrs.push(`MinWidth="${def.minWidth}"`);
                        if (def.maxWidth) colAttrs.push(`MaxWidth="${def.maxWidth}"`);
                        xaml += `${spaces}    <ColumnDefinition ${colAttrs.join(' ')}/>\n`;
                    });
                    xaml += `${spaces}  </Grid.ColumnDefinitions>\n`;
                }
                if (rows.length) {
                    xaml += `${spaces}  <Grid.RowDefinitions>\n`;
                    rows.forEach(def => {
                        let rowAttrs = [];
                        if (def.height) rowAttrs.push(`Height="${def.height}"`);
                        if (def.minHeight) rowAttrs.push(`MinHeight="${def.minHeight}"`);
                        if (def.maxHeight) rowAttrs.push(`MaxHeight="${def.maxHeight}"`);
                        xaml += `${spaces}    <RowDefinition ${rowAttrs.join(' ')}/>\n`;
                    });
                    xaml += `${spaces}  </Grid.RowDefinitions>\n`;
                }
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</Grid>\n\n`;
            }
            else if (comp.type === 'stackpanel') {
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</StackPanel>\n\n`;
            }
            else if (comp.type === 'horizontalstack') {
                attrs.push('Orientation="Horizontal"');
                xaml += `${spaces}<StackPanel ${attrs.join(' ')}>\n`;
                for (let child of comp.children) {
                    xaml += this.generateXAML([child], indent + 1);
                }
                xaml += `${spaces}</StackPanel>\n\n`;
            }
            else if (comp.type === 'text') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.FontSize) attrs.push(`FontSize="${comp.props.FontSize}"`);
                if (comp.props.TextWrapping) attrs.push(`TextWrapping="${comp.props.TextWrapping}"`);
                if (comp.props.Foreground) attrs.push(`Foreground="${comp.props.Foreground}"`);
                xaml += `${spaces}<TextBlock ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'hint') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.Theme) attrs.push(`Theme="${comp.props.Theme}"`);
                xaml += `${spaces}<local:MyHint ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'image') {
                attrs.push(`Source="${Utils.escapeXml(comp.props.Source)}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                // 新增图片属性 #C1
                if (comp.props.EnableCache) attrs.push(`EnableCache="${comp.props.EnableCache}"`);
                if (comp.props.FallbackSource) attrs.push(`FallbackSource="${Utils.escapeXml(comp.props.FallbackSource)}"`);
                if (comp.props.LoadingSource) attrs.push(`LoadingSource="${Utils.escapeXml(comp.props.LoadingSource)}"`);
                xaml += `${spaces}<local:MyImage ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'button') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                if (comp.props.ColorType) attrs.push(`ColorType="${comp.props.ColorType}"`);
                if (comp.props.Height) attrs.push(`Height="${comp.props.Height}"`);
                if (comp.props.Padding) attrs.push(`Padding="${comp.props.Padding}"`);
                xaml += `${spaces}<local:MyButton ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'textbutton') {
                attrs.push(`Text="${Utils.escapeXml(comp.props.Text)}"`);
                xaml += `${spaces}<local:MyTextButton ${attrs.join(' ')} />\n`;
            }
            else if (comp.type === 'listitem') {
                attrs.push(`Title="${Utils.escapeXml(comp.props.Title)}"`);
                attrs.push(`Info="${Utils.escapeXml(comp.props.Info)}"`);
                attrs.push(`Logo="${Utils.escapeXml(comp.props.Logo)}"`);
                attrs.push(`Type="${comp.props.Type || 'Clickable'}"`);
                xaml += `${spaces}<local:MyListItem ${attrs.join(' ')} />\n`;
            }
        }
        return xaml;
    }
}