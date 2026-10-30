// The card a link to a page shows when it is shared (#13), drawn as SVG and
// rendered to PNG, since the sites that show cards do not take SVG.
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

export const card = { width: 1200, height: 630 };

// resvg reads TrueType but not WOFF, the form the site's fonts come in. A WOFF
// is the same tables, each compressed on its own; unpacking them gives back the
// font as it was.
function sfntOf(woff) {
	const n = woff.readUInt16BE(12);
	const tables = [];
	for (let i = 0; i < n; i++) {
		const at = 44 + i * 20;
		const offset = woff.readUInt32BE(at + 4);
		const packed = woff.readUInt32BE(at + 8);
		const size = woff.readUInt32BE(at + 12);
		const raw = woff.subarray(offset, offset + packed);
		tables.push({ tag: woff.subarray(at, at + 4), sum: woff.readUInt32BE(at + 16), data: packed < size ? inflateSync(raw) : raw });
	}
	let selector = 0;
	while (1 << (selector + 1) <= n) selector++;
	const head = Buffer.alloc(12 + 16 * n);
	head.writeUInt32BE(woff.readUInt32BE(4), 0);
	head.writeUInt16BE(n, 4);
	head.writeUInt16BE((1 << selector) * 16, 6);
	head.writeUInt16BE(selector, 8);
	head.writeUInt16BE(n * 16 - (1 << selector) * 16, 10);
	const body = [];
	let offset = head.length;
	tables.forEach((t, i) => {
		t.tag.copy(head, 12 + i * 16);
		head.writeUInt32BE(t.sum, 16 + i * 16);
		head.writeUInt32BE(offset, 20 + i * 16);
		head.writeUInt32BE(t.data.length, 24 + i * 16);
		const padded = Buffer.alloc((t.data.length + 3) & ~3);
		t.data.copy(padded);
		body.push(padded);
		offset += padded.length;
	});
	return Buffer.concat([head, ...body]);
}

// Astro bundles this module elsewhere before running it; builds run from the
// project's root.
const root = process.cwd();
let fontFiles;
function fonts() {
	if (fontFiles) return fontFiles;
	const dir = path.join(root, '.sword/fonts');
	fs.mkdirSync(dir, { recursive: true });
	fontFiles = [
		'@fontsource/inter/files/inter-latin-400-normal.woff',
		'@fontsource/inter/files/inter-latin-700-normal.woff',
		'@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff',
		'@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff',
	].map((woff) => {
		const ttf = path.join(dir, path.basename(woff, '.woff') + '.ttf');
		if (!fs.existsSync(ttf)) fs.writeFileSync(ttf, sfntOf(fs.readFileSync(path.join(root, 'node_modules', woff))));
		return ttf;
	});
	return fontFiles;
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// label is what the page is, at the bottom right: "A tour of Sword · Tasks".
export function shareCard(label) {
	const shown = label.length > 48 ? `${label.slice(0, 47)}…` : label;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${card.width}" height="${card.height}" viewBox="0 0 ${card.width} ${card.height}">
<rect width="1200" height="630" fill="#FAFAF9"/>
<rect y="620" width="1200" height="10" fill="#B9461A"/>
<g transform="translate(80 72) scale(2.375) rotate(45 16 16)">
<path d="M16 1 18.2 5v16h-4.4V5Z" fill="#15171C"/><rect x="9" y="21" width="14" height="2.4" rx="1" fill="#B9461A"/>
<path d="M14.8 23.4h2.4v5.2h-2.4Z" fill="#15171C"/><circle cx="16" cy="30" r="1.6" fill="#15171C"/>
</g>
<text x="178" y="132" font-family="Inter" font-weight="700" font-size="64" letter-spacing="-1.9" fill="#15171C">sword</text>
<text font-family="Inter" font-weight="700" font-size="68" letter-spacing="-2.4" fill="#15171C">
<tspan x="80" y="318">A systems language that</tspan><tspan x="80" y="389">refuses data races.</tspan>
</text>
<text x="80" y="452" font-family="Inter" font-size="26" fill="#5B616E">A compiled systems language with Go’s syntax and Zig’s memory model.</text>
<text x="80" y="548" font-family="JetBrains Mono" font-size="22" fill="#5B616E">swordlang.com</text>
<text x="1120" y="548" text-anchor="end" font-family="JetBrains Mono" font-weight="500" font-size="22" fill="#8F3412">${escape(shown)}</text>
</svg>`;
	return new Resvg(svg, { font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
}

// What a page is, as its card and the card's alt text say it; the home page is
// the site itself and says nothing more.
export function labelOf(id, title) {
	if (id === '' || id === 'index') return '';
	if (id === 'tour') return 'A tour of Sword';
	if (id.startsWith('tour/')) return `A tour of Sword · ${title}`;
	return title;
}
