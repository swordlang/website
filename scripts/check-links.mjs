// Fails when a page of the built site links to a page, a file or an anchor
// that the site does not have. Astro writes links as it is given them, so a
// section renamed in the documentation would otherwise ship as a dead link.
//
//   node scripts/check-links.mjs dist [base]
//
// base is the path the site is served under ("/website" on a project's Pages
// URL): a link that leaves it is broken there even if it works locally.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist');
const base = (process.argv[3] || '').replace(/\/+$/, '');

const unescape = (s) =>
	s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[e]);

const pages = new Map();
function walk(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = path.join(dir, e.name);
		if (e.isDirectory()) walk(file);
		else if (e.name.endsWith('.html')) pages.set(file, fs.readFileSync(file, 'utf8'));
	}
}
walk(dist);

const ids = new Map();
function idsOf(file) {
	if (!ids.has(file)) ids.set(file, new Set([...pages.get(file).matchAll(/\sid="([^"]*)"/g)].map((m) => unescape(m[1]))));
	return ids.get(file);
}

// The file a path of the site is served from, as GitHub Pages finds it.
function served(p) {
	const file = path.join(dist, p);
	if (p.endsWith('/')) return fs.existsSync(path.join(file, 'index.html')) ? path.join(file, 'index.html') : null;
	if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
	if (fs.existsSync(path.join(file, 'index.html'))) return path.join(file, 'index.html');
	if (fs.existsSync(`${file}.html`)) return `${file}.html`;
	return null;
}

const broken = [];
let checked = 0;
for (const [file, html] of pages) {
	const rel = path.relative(dist, file).split(path.sep).join('/');
	const url = `${base}/${rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel}`;
	// A share card's address is absolute, so only its path is checked.
	const cards = [...html.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => new URL(unescape(m[1])).pathname);
	for (const link of [...[...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => unescape(m[1])), ...cards]) {
		if (!link || link.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
		const target = new URL(link, `https://site${url}`);
		const p = decodeURIComponent(target.pathname);
		checked++;
		if (p !== base && !p.startsWith(`${base}/`)) {
			broken.push(`${url}: ${link} (outside ${base}/)`);
			continue;
		}
		const to = served(p.slice(base.length) || '/');
		if (!to) broken.push(`${url}: ${link} (no such page)`);
		else if (target.hash && to.endsWith('.html') && !idsOf(to).has(decodeURIComponent(target.hash.slice(1))))
			broken.push(`${url}: ${link} (no such anchor)`);
	}
}

if (broken.length) {
	console.error(`links: ${broken.length} broken:\n  ${[...new Set(broken)].join('\n  ')}`);
	process.exit(1);
}
console.log(`links: ${checked} links on ${pages.size} pages, none broken`);
