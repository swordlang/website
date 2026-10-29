// Says whether the published site is out of date: whether swordlang/sword's
// main or develop, or this repository, has moved since the build that is live.
// The hourly run asks this first, so an hour with nothing new costs seconds.
//
//   node scripts/changed.mjs <site url>      prints "true" or "false"
//
// A site that cannot be read, or that predates build.json, counts as changed.
import { execFileSync } from 'node:child_process';

const url = (process.argv[2] || 'https://swordlang.com').replace(/\/+$/, '');
const heads = Object.fromEntries(
	execFileSync('git', ['ls-remote', 'https://github.com/swordlang/sword.git', 'refs/heads/main', 'refs/heads/develop'], {
		encoding: 'utf8',
	})
		.trim()
		.split('\n')
		.map((line) => line.split('\t').reverse()),
);
const now = {
	site: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
	release: heads['refs/heads/main'],
	next: heads['refs/heads/develop'],
};

let live = null;
try {
	const res = await fetch(`${url}/build.json`, { cache: 'no-store' });
	if (res.ok) live = await res.json();
} catch {}

const stale = Object.keys(now).filter((k) => !live || live[k] !== now[k]);
console.error(stale.length ? `changed: ${stale.join(', ')}` : 'changed: nothing since the live build');
console.log(stale.length > 0);
