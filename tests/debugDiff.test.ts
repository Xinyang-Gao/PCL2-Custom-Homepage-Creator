import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importFromXAML } from '../src/xaml/parser';
import { generateXAML } from '../src/xaml/generator';
import { store } from '../src/core/store';

const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).XMLSerializer = dom.window.XMLSerializer;
(globalThis as any).localStorage = dom.window.localStorage;

const xaml = readFileSync(join(__dirname, '..', 'docs', 'Custom.xaml'), 'utf-8');
importFromXAML(xaml);
const out1 = generateXAML(store.components);
importFromXAML(out1);
const out2 = generateXAML(store.components);

const a = out1.split('\n');
const b = out2.split('\n');
for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
        console.log(`行 ${i + 1} 差异:`);
        console.log(`  1: ${a[i]}`);
        console.log(`  2: ${b[i]}`);
        if (i > 3) break;
    }
}
