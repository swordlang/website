import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Written by scripts/fetch-docs.mjs, which runs before every dev and build.
const site = JSON.parse(fs.readFileSync(new URL('./.sword/site.json', import.meta.url), 'utf8'));

// The same grammar the editors use, so the site colours Sword the way they do.
const sword = { ...JSON.parse(fs.readFileSync(site.grammar, 'utf8')), name: 'sword' };

export default defineConfig({
	site: 'https://swordlang.com',
	integrations: [
		starlight({
			title: 'Sword',
			description:
				'A compiled systems language with Go’s syntax and Zig’s memory model, whose compiler refuses programs with data races.',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/swordlang/sword' }],
			sidebar: site.sidebar,
			expressiveCode: { shiki: { langs: [sword] } },
		}),
	],
});
