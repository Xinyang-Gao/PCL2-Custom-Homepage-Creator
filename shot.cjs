// 页面截图脚本：主界面 + 各交互状态，用于视觉审查
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EXE = path.join(__dirname, '.browsers', 'chrome-headless-shell', 'win64-154.0.8037.92', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const OUT = path.join(__dirname, 'shots');
const BASE = 'http://127.0.0.1:5000';

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await puppeteer.launch({
        executablePath: EXE,
        args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
        defaultViewport: { width: 1600, height: 900 }
    });
    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
    page.on('pageerror', e => console.log('[pageerror]', e.message));
    page.on('dialog', d => { console.log('[dialog]', d.message().slice(0, 50)); d.accept(); });
    let stepLog = 0;
    const count = async (label) => {
        const n = await page.evaluate(() => document.querySelectorAll('.component-item-wrapper').length);
        console.log(`[${++stepLog}] ${label}: components=${n}`);
    };

    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));

    // 1. 初始空状态
    await page.screenshot({ path: path.join(OUT, '01-empty.png') });

    // 2. 构建一个真实设计：卡片 + 若干组件
    await page.evaluate(() => {
        const cm = window.__test_api;
        if (!cm) return false;
        return true;
    });

    // 通过拖拽 API 不好模拟，直接用 XAML 源码编辑器导入
    await page.click('#xamlExportBtn');
    await new Promise(r => setTimeout(r, 300));
    const xaml = `<local:MyCard Title="功能演示卡片" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">
    <StackPanel Margin="25,40,23,15">
        <TextBlock TextWrapping="Wrap" Margin="0,0,0,4" FontSize="14" Text="这是一段用于视觉审查的说明文本。" />
        <local:MyHint Text="提示条组件" Theme="Blue" />
        <local:MyButton Margin="0,4,0,10" Height="35" Padding="25,0,25,0" ColorType="Highlight" Text="主色按钮" EventType="打开网页" EventData="https://example.com" />
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
            <local:MyButton Margin="0,0,10,0" Width="140" Height="35" Text="打开 B 站" />
            <local:MyButton Margin="0,0,10,0" Width="140" Height="35" ColorType="Red" Text="红色按钮" />
            <local:MyIconTextButton Height="35" Text="图标按钮" ColorType="Highlight" />
        </StackPanel>
        <local:MyListItem Margin="-5,2,-5,8" Title="列表项标题" Info="详细信息文本" Type="Clickable" />
        <local:MyIconButton Width="25" Height="25" Theme="Red" />
    </StackPanel>
</local:MyCard>

<local:MyCard Title="第二张卡片" Margin="0,0,0,15">
    <StackPanel Margin="25,40,23,15">
        <TextBlock Text="第二张卡片的内容" />
    </StackPanel>
</local:MyCard>`;
    await page.evaluate((x) => {
        const ta = document.getElementById('xamlCodeArea');
        ta.value = x;
    }, xaml);
    await page.click('#applyXamlBtn');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUT, '02-design.png') });

    // 3. 选中按钮组件 → 属性面板 + 事件区
    await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.canvas-btn')];
        if (btns[0]) btns[0].click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, '03-props-button.png') });

    // 4. 属性面板滚到底部（prop-actions 区域）
    await page.evaluate(() => {
        const p = document.getElementById('propsPanel');
        p.scrollTop = p.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(OUT, '04-props-bottom.png') });

    // 5. 标记插入菜单
    await page.evaluate(() => {
        const btn = document.querySelector('.marker-insert-btn');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(OUT, '05-marker-menu.png') });
    await page.evaluate(() => document.querySelector('.marker-menu')?.remove());

    // 6. 文件管理弹窗
    await page.click('#serverManageBtn');
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: path.join(OUT, '06-file-modal.png') });
    await page.click('#closeServerModalBtn');
    await new Promise(r => setTimeout(r, 300));

    // 7. 源码编辑器
    await page.click('#xamlExportBtn');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(OUT, '07-source-modal.png') });
    await page.click('#closeModalBtn');
    await new Promise(r => setTimeout(r, 300));

    // 8. Grid 选中 → 网格编辑按钮
    await page.evaluate(() => {
        const xaml = `<local:MyCard Title="网格" Margin="0,0,0,15">
    <Grid Margin="0">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="1*" />
            <ColumnDefinition Width="1.6*" MinWidth="200" />
            <ColumnDefinition Width="150" />
        </Grid.ColumnDefinitions>
        <local:MyButton Grid.Column="0" Height="35" Text="第一列" />
        <local:MyButton Grid.Column="1" Height="35" Text="第二列" />
        <local:MyButton Grid.Column="2" Height="35" Text="第三列" />
    </Grid>
</local:MyCard>`;
        document.getElementById('xamlExportBtn').click();
        setTimeout(() => {
            document.getElementById('xamlCodeArea').value = xaml;
            document.getElementById('applyXamlBtn').click();
        }, 200);
    });
    await new Promise(r => setTimeout(r, 800));
    await page.evaluate(() => {
        const grid = document.querySelector('.grid-component');
        if (grid) grid.closest('.component-item-wrapper').click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, '08-grid-props.png') });
    await count('after-08-screenshot');

    // 9. 网格编辑弹窗
    await page.evaluate(() => document.getElementById('editGridLayoutBtn')?.click());
    await new Promise(r => setTimeout(r, 500));
    await count('after-grid-editor-open');
    await page.screenshot({ path: path.join(OUT, '09-grid-editor.png') });
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.querySelector('.modal[style*="flex"]')?.remove());

    // 10. 深色主题
    await page.click('#themeToggle');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, '10-dark.png') });

    await browser.close();
    console.log('截图完成:', fs.readdirSync(OUT).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
