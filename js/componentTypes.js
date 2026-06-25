// componentTypes.js
export const ComponentTypes = {
    card: {
        name: "卡片 (MyCard)",
        icon: "fas fa-layer-group",
        canNest: true,
        defaults: {
            Title: "新卡片",
            Margin: "0,0,0,15",
            CanSwap: "True",
            IsSwapped: "True",
            ToolTip: "",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            UseAnimation: "True",
            SwapLogoRight: "False",
            HasMouseAnimation: "True"
        }
    },
    text: {
        name: "文本 (TextBlock)",
        icon: "fas fa-font",
        canNest: false,
        defaults: {
            Text: "这是一段文本",
            FontSize: "14",
            TextWrapping: "Wrap",
            Foreground: "#1e293b",
            ToolTip: "",
            Margin: "0",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    hint: {
        name: "提示条 (MyHint)",
        icon: "fas fa-info-circle",
        canNest: false,
        defaults: {
            Text: "提示信息",
            Theme: "Blue",
            ToolTip: "",
            Margin: "0",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    image: {
        name: "图片 (MyImage)",
        icon: "fas fa-image",
        canNest: false,
        defaults: {
            Source: "https://www.baidu.com/img/flexible/logo/pc/result.png",
            Height: "60",
            HorizontalAlignment: "Center",
            ToolTip: "",
            Margin: "0",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True",
            EnableCache: "True",
            FallbackSource: "",
            LoadingSource: "pack://application:,,,/images/Icons/NoIcon.png"
        }
    },
    button: {
        name: "按钮 (MyButton)",
        icon: "fas fa-hand-pointer",
        canNest: false,
        defaults: {
            Text: "按钮",
            ColorType: "Highlight",
            Height: "35",
            Padding: "20,0",
            Margin: "0,4,0,10",
            ToolTip: "",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    textbutton: {
        name: "文本按钮 (MyTextButton)",
        icon: "fas fa-minus-square",
        canNest: false,
        defaults: {
            Text: "文本按钮",
            Margin: "0,8,0,10",
            ToolTip: "",
            HorizontalAlignment: "Center",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    listitem: {
        name: "列表项 (MyListItem)",
        icon: "fas fa-list",
        canNest: false,
        defaults: {
            Title: "标题",
            Info: "描述",
            Logo: "pack://application:,,,/images/Blocks/Grass.png",
            Type: "Clickable",
            ToolTip: "",
            Margin: "-5,0,-5,8",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    stackpanel: {
        name: "垂直布局 (StackPanel)",
        icon: "fas fa-align-justify",
        canNest: true,
        defaults: {
            Margin: "0,0,0,0",
            ToolTip: "",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    horizontalstack: {
        name: "水平布局 (StackPanel Horizontal)",
        icon: "fas fa-arrows-alt-h",
        canNest: true,
        defaults: {
            Orientation: "Horizontal",
            HorizontalAlignment: "Center",
            Margin: "0,0,0,0",
            ToolTip: "",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    },
    grid: {
        name: "网格布局 (Grid)",
        icon: "fas fa-th",
        canNest: true,
        defaults: {
            ColumnsDefinition: "[]",
            RowsDefinition: "[]",
            Margin: "0",
            ToolTip: "",
            HorizontalAlignment: "Stretch",
            VerticalAlignment: "Stretch",
            IsHitTestVisible: "True"
        }
    }
};

// 属性下拉选项映射
export const PROP_SELECT_OPTIONS = {
    HorizontalAlignment: ['Stretch', 'Left', 'Center', 'Right', 'Top', 'Bottom'],
    VerticalAlignment: ['Stretch', 'Top', 'Center', 'Bottom'],
    TextWrapping: ['Wrap', 'NoWrap', 'WrapWithOverflow'],
    Theme: ['Blue', 'Yellow', 'Red'],
    ColorType: ['Highlight', 'Primary', 'Secondary', 'Success', 'Danger'],
    Type: ['Clickable', 'Toggle', 'Radio'],
    Orientation: ['Horizontal', 'Vertical'],
    CanSwap: ['True', 'False'],
    IsSwapped: ['True', 'False'],
    EnableCache: ['True', 'False'],
    UseAnimation: ['True', 'False'],
    SwapLogoRight: ['True', 'False'],
    HasMouseAnimation: ['True', 'False'],
    IsHitTestVisible: ['True', 'False']
};