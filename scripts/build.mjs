// Builds the site as it is published: the documentation of the latest release
// (swordlang/sword at main) at the root, and of develop under next/. Each build
// is told which pages the other has, so that the version selector and the
// banner can take a reader to the same page; then every link is checked.
//
// SITE_ORIGIN and SITE_BASE say where the site is served from (the deploy
// workflow takes them from GitHub Pages); SWORD_RELEASE_REF and SWORD_NEXT_REF
// override the branches.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const state = path.join(root, '.sword');
const refs = { release: process.env.SWORD_RELEASE_REF || 'main', next: process.env.SWORD_NEXT_REF || 'develop' };

// Both versions come from GitHub; a checkout on disk would be the same text twice.
const env = { ...process.env };
delete env.SWORD_DIR;

function run(script, args, extra = {}) {
	execFileSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit', env: { ...env, ...extra } });
}
const fetchDocs = (ref) => run('scripts/fetch-docs.mjs', [], { SWORD_REF: ref });
const astro = (version) =>
	run('node_modules/astro/bin/astro.mjs', ['build'], { SITE_VERSION: version, SWORD_VERSIONS: versionsFile });
const site = () => JSON.parse(fs.readFileSync(path.join(state, 'site.json'), 'utf8'));

const versionsFile = path.join(state, 'versions.json');
const known = {};
fetchDocs(refs.next);
known.next = site();
fetchDocs(refs.release);
known.release = site();
fs.writeFileSync(versionsFile, JSON.stringify(known));

astro('release');
fetchDocs(refs.next);
astro('next');

// What this build was made from, so that a scheduled run can tell whether
// anything has changed since (scripts/changed.mjs).
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(
	path.join(root, 'dist/build.json'),
	`${JSON.stringify({ site: commit, release: known.release.sha, next: known.next.sha }, null, '\t')}\n`,
);
run('scripts/check-links.mjs', ['dist', process.env.SITE_BASE || '']);
