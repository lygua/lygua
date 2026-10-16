import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsdown';

const wasmInline = () => ({
    name: 'wasm-inline',

    load(id: string) {
        if (!id.endsWith('.wasm')) return;

        const bytes = readFileSync(id);

        return `
            export default new Uint8Array([
                ${Array.from(bytes).join(',')}
            ]);
        `;
    },
});

export default defineConfig({
    entry: { 'gwasm-tar': 'src/index.ts' },

    plugins: [wasmInline()],

    outDir: './dist',
    format: ['iife'],
    platform: 'browser',
    globalName: 'gwasmTar',
});
