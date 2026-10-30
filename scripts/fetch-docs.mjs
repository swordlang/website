// Turns the documentation of swordlang/sword into this site's pages.
//
// The text is never copied into this repository: it is read from a checkout of
// the language at SWORD_REF (default main), or from the directory SWORD_DIR
// points at, which is how a change to the docs is previewed before it is
// pushed. What it writes, src/content/docs/ and .sword/site.json, is generated
// on every build and ignored by git.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';

const root = path.resolve(import.meta.dirname, '..');
const ref = process.env.SWORD_REF || 'main';
const repo = 'https://github.com/swordlang/sword';
const state = path.join(root, '.sword');
const out = path.join(root, 'src/content/docs');

function git(cwd, ...args) {
	return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

let dir = process.env.SWORD_DIR && path.resolve(process.env.SWORD_DIR);
if (!dir) {
	dir = path.join(state, ref.replace(/[^A-Za-z0-9._-]/g, '_'));
	if (fs.existsSync(path.join(dir, '.git'))) {
		git(dir, 'fetch', '-q', '--depth=1', 'origin', ref);
		git(dir, 'checkout', '-q', '--detach', 'FETCH_HEAD');
	} else {
		fs.mkdirSync(state, { recursive: true });
		git(state, 'clone', '-q', '--depth=1', '--branch', ref, `${repo}.git`, dir);
	}
}
const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');

const versionH = read('src/version.h');
const version = versionH.match(/SWORD_VERSION "([^"]+)"/)[1];
const releaseName = versionH.match(/SWORD_RELEASE_NAME "([^"]+)"/)[1];

// Only what git tracks is published: a draft lying in a working tree is not
// documentation yet, and the design notes kept beside the docs never are.
const files = git(dir, 'ls-files', 'README.md', 'CHANGELOG.md', 'docs/*.md').split('\n').filter(Boolean);

// Everything a page may link to on GitHub: the tracked files and the
// directories that hold them.
const tracked = new Set();
for (const f of git(dir, 'ls-files').split('\n').filter(Boolean)) {
	for (let p = f; p !== '.'; p = path.posix.dirname(p)) tracked.add(p);
}
const broken = [];

function slugOf(file) {
	if (file === 'README.md') return '';
	if (file === 'CHANGELOG.md') return 'changelog';
	return file.replace(/^docs\//, '').replace(/\.md$/, '');
}

// The text a heading is slugged from, as GitHub and Astro see it once rendered.
function headingText(md) {
	return md
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`+/g, '')
		.replace(/(\*\*|__|\*|_)(\S[\s\S]*?)\1/g, '$2')
		.trim();
}

// Lines outside fenced code, with the index of each, so that headings and
// links inside an example are left alone.
function* prose(lines) {
	let fence = null;
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^(`{3,}|~{3,})/);
		if (m) {
			if (!fence) fence = m[1];
			else if (lines[i].startsWith(fence) && lines[i].trim() === fence) fence = null;
			continue;
		}
		if (!fence) yield i;
	}
}

// The documents read a section at a time: the tour by its `##`, the reference
// by its `##` and its standard library a package at a time (`### std/io`).
const cutsOf = {
	'docs/tour.md': (h) => h.depth === 2,
	'docs/reference.md': (h) => h.depth === 2 || (h.depth === 3 && h.text.startsWith('std/')),
};

// Splits a document into its title and the pages it becomes: one per cut
// above, or the whole document as one page with its own table of contents.
function paginate(file) {
	const lines = read(file).split('\n');
	let title = null;
	const heads = [];
	for (const i of prose(lines)) {
		const m = lines[i].match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
		if (!m) continue;
		if (m[1].length === 1 && title === null) title = { line: i, text: headingText(m[2]) };
		else heads.push({ line: i, depth: m[1].length, text: headingText(m[2]) });
	}
	if (!title) throw new Error(`${file}: no "# " title`);
	lines.splice(title.line, 1);
	for (const h of heads) if (h.line > title.line) h.line--;

	const slug = slugOf(file);
	const cuts = heads.filter(cutsOf[file] ?? (() => false));
	const pages = [];
	const pageSlugger = new GithubSlugger();
	const starts = [0, ...cuts.map((h) => h.line)];
	for (let p = 0; p < starts.length; p++) {
		const from = starts[p];
		const to = p + 1 < starts.length ? starts[p + 1] : lines.length;
		const cut = p > 0 ? cuts[p - 1] : null;
		pages.push({
			file,
			slug: cut ? `${slug}/${cut.text.startsWith('std/') ? cut.text : pageSlugger.slug(cut.text)}` : slug,
			title: cut ? cut.text : title.text,
			lines: lines.slice(cut ? from + 1 : from, to),
			start: from,
		});
	}

	// Where each heading of the whole document ended up: a link written as
	// tour.md#tasks has to find the page that `## Tasks` became.
	const anchors = new Map();
	const docSlugger = new GithubSlugger();
	docSlugger.slug(title.text);
	const perPage = new Map(pages.map((pg) => [pg, new GithubSlugger()]));
	for (const h of heads) {
		const page = pages.findLast((pg) => pg.start <= h.line);
		const id = docSlugger.slug(h.text);
		anchors.set(id, { slug: page.slug, id: cuts.includes(h) ? '' : perPage.get(page).slug(h.text) });
	}
	return { file, title: title.text, pages, anchors };
}

const docs = new Map(files.map((f) => [f, paginate(f)]));

function href(from, file, anchor) {
	const doc = docs.get(file);
	let slug = doc.pages[0].slug;
	let id = anchor;
	if (anchor && doc.anchors.has(anchor)) ({ slug, id } = doc.anchors.get(anchor));
	const rel = path.posix.relative(`/${from}`, `/${slug}`);
	const where = rel === '' ? '' : `${rel}/`;
	if (!where && !id) return './';
	return `${where}${id ? `#${id}` : ''}`;
}

function rewriteLinks(text, page) {
	const base = path.posix.dirname(page.file);
	return text.replace(/\]\(([^()\s]+)\)/g, (whole, target) => {
		if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) return whole;
		// A section of a split document may have become another page.
		if (target.startsWith('#')) return docs.get(page.file).pages.length > 1 ? `](${href(page.slug, page.file, target.slice(1))})` : whole;
		const [p, anchor = ''] = target.split('#');
		const file = path.posix.normalize(path.posix.join(base, p));
		if (docs.has(file)) return `](${href(page.slug, file, anchor)})`;
		if (!tracked.has(file.replace(/\/$/, ''))) broken.push(`${page.file}: ${target}`);
		return `](${repo}/blob/${ref}/${file}${anchor ? `#${anchor}` : ''})`;
	});
}

// A link inside `code` is code, not a link.
function rewriteProse(line, page) {
	let result = '';
	let last = 0;
	for (const m of line.matchAll(/(`+)[\s\S]*?\1/g)) {
		result += rewriteLinks(line.slice(last, m.index), page) + m[0];
		last = m.index + m[0].length;
	}
	return result + rewriteLinks(line.slice(last), page);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// tests/docs.sh holds a program followed by one of these markers to what it
// says, on every change to the language, so the reader is told so. The
// markers themselves are HTML comments and would show nothing.
function markers(lines, i) {
	let prints = null;
	let exits = null;
	let j = i;
	for (;;) {
		const e = lines[j]?.match(/^<!-- exits: (\d+) -->$/);
		if (e) {
			exits = e[1];
			j++;
			continue;
		}
		if (lines[j] === '<!-- prints:') {
			const end = lines.indexOf('-->', j);
			prints = lines.slice(j + 1, end).join('\n');
			j = end + 1;
			continue;
		}
		break;
	}
	if (prints === null && exits === null) return null;
	let label = 'Checked on every change';
	if (prints !== null) label += exits && exits !== '0' ? ` · prints this, exits with ${exits}` : ' · prints';
	else label += ` · exits with ${exits}`;
	const html =
		prints === null
			? `<pre class="sw-run sw-run-quiet" data-label="${label}"></pre>`
			: `<pre class="sw-run" data-label="${label}">${escape(prints)}</pre>`;
	return { html, next: j };
}

function render(page) {
	const src = page.lines;
	const body = [];
	const isProse = new Set(prose(src));
	for (let i = 0; i < src.length; i++) {
		if (isProse.has(i)) {
			body.push(rewriteProse(src[i], page));
			continue;
		}
		// The grammar's EBNF has no highlighter; said outright, it is shown as
		// the plain text it would have fallen back to anyway.
		body.push(src[i].replace(/^(`{3,}|~{3,})ebnf\s*$/, '$1text'));
		// A fence followed by prose is the one that closed the block.
		if (/^(`{3,}|~{3,})\s*$/.test(src[i]) && isProse.has(i + 1)) {
			const m = markers(src, i + 1);
			if (m) {
				body.push(m.html);
				i = m.next - 1;
			}
		}
	}
	const front = [
		'---',
		`title: ${JSON.stringify(page.title)}`,
		`editUrl: ${JSON.stringify(`${repo}/edit/develop/${page.file}`)}`,
		'---',
		'',
	];
	return front.join('\n') + body.join('\n').replace(/^\n+/, '');
}

const rendered = [...docs.values()].flatMap((doc) => doc.pages.map((page) => [page, render(page)]));
// A link to a file the language does not have would ship as a 404 on GitHub.
if (broken.length) {
	console.error(`docs: links to files that are not in swordlang/sword ${ref}:\n  ${broken.join('\n  ')}`);
	process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
for (const [page, text] of rendered) {
	const target = path.join(out, page.slug === '' ? 'index.md' : `${page.slug}.md`);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, text);
}

// The tour has no parts of its own; these exist only so that its twenty-odd
// sections are not one flat list. A section the tour gains that is not named
// here goes in the last part rather than vanishing.
const tourParts = [
	['Basics', ['Running a program', 'Values', 'Functions', 'Control flow', 'Arrays and slices', 'Strings']],
	['Data and errors', ['Structs', 'Pointers and optionals', 'Enums', 'Errors', 'defer']],
	['Abstraction', ['Methods and interfaces', 'Function values', 'Generics']],
	['Memory, packages and tasks', ['Memory', 'Packages', 'Tasks', 'Channels']],
	['Beyond the program', ['The outside world', 'Build modes', 'Looking inside', 'Testing', 'Where to go next']],
];

function tourItems(doc) {
	const [intro, ...sections] = doc.pages;
	const parts = tourParts.map(([label]) => ({ label, collapsed: true, items: [] }));
	for (const pg of sections) {
		const at = tourParts.findIndex(([, titles]) => titles.includes(pg.title));
		parts[at === -1 ? parts.length - 1 : at].items.push({ label: pg.title, slug: pg.slug });
	}
	const kept = parts.filter((p) => p.items.length);
	// Each part says how many sections it holds; on a tour page the part being
	// read says where in it the reader is (src/route-data.mjs).
	for (const p of kept) p.badge = { text: String(p.items.length), variant: 'default', class: 'sw-count' };
	tour = { intro: intro.slug, parts: kept.map((p) => ({ label: p.label, slugs: p.items.map((i) => i.slug) })) };
	return [{ label: 'Introduction', slug: intro.slug }, ...kept];
}
let tour = null;

// The reference is two lists: the language, section by section, and the
// standard library, package by package.
function referenceItems(doc) {
	const [intro, ...sections] = doc.pages;
	const std = sections.filter((pg) => pg.title === 'Standard library' || pg.title.startsWith('std/'));
	const lang = sections.filter((pg) => !std.includes(pg));
	const [stdIntro, ...packages] = std;
	reference = {
		language: { label: 'Language reference', slugs: lang.map((pg) => pg.slug) },
		library: { label: 'Standard library', slugs: packages.map((pg) => pg.slug) },
	};
	const items = (pages) => pages.map((pg) => ({ label: pg.title, slug: pg.slug }));
	return [
		{ label: 'Language reference', collapsed: true, items: [{ label: 'Overview', slug: intro.slug }, ...items(lang)] },
		{ label: 'Standard library', collapsed: true, items: [...(stdIntro ? [{ label: 'Overview', slug: stdIntro.slug }] : []), ...items(packages)] },
	];
}
let reference = null;

// The sidebar, in reading order. A page the language adds that is not named
// here still appears, under "More", rather than being left unreachable; the
// README is the home page, reached from the logo.
const groups = [
	['Start here', [['docs/why.md'], ['docs/install.md', 'Install']]],
	['A tour of Sword', [['docs/tour.md']]],
	['Guides', [['docs/concurrency.md'], ['docs/http.md', 'HTTP servers'], ['docs/testing.md']]],
	['Reference', [['docs/reference.md', 'Language reference'], ['docs/grammar.md']]],
	['Project', [['docs/roadmap.md'], ['CHANGELOG.md', 'Changelog']]],
];
const placed = new Set(['README.md']);
const sidebar = groups.map(([label, entries]) => ({
	label,
	items: entries.flatMap(([file, name]) => {
		const doc = docs.get(file);
		if (!doc) return [];
		placed.add(file);
		if (file === 'docs/tour.md') return tourItems(doc);
		if (file === 'docs/reference.md') return referenceItems(doc);
		return [{ label: name ?? doc.title, slug: doc.pages[0].slug }];
	}),
}));
const more = [...docs.values()].filter((d) => !placed.has(d.file));
if (more.length) sidebar.push({ label: 'More', items: more.map((d) => ({ label: d.title, slug: d.pages[0].slug })) });

const sha = git(dir, 'rev-parse', 'HEAD');
fs.mkdirSync(state, { recursive: true });
fs.writeFileSync(
	path.join(state, 'site.json'),
	JSON.stringify(
		{
			ref,
			sha,
			version,
			releaseName,
			grammar: path.join(dir, 'editors/vscode/syntaxes/sword.tmLanguage.json'),
			sidebar,
			tour,
			reference,
			pages: rendered.map(([page]) => page.slug),
		},
		null,
		'\t',
	),
);
const count = [...docs.values()].reduce((n, d) => n + d.pages.length, 0);
console.log(`docs: ${count} pages from ${files.length} files of swordlang/sword ${ref} (${sha.slice(0, 7)}), ${version} ${releaseName}`);
