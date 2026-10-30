import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import codeTheme from './src/code-theme.mjs';

// Written by scripts/fetch-docs.mjs, which runs before every dev and build.
const site = JSON.parse(fs.readFileSync(new URL('./.sword/site.json', import.meta.url), 'utf8'));

// The same grammar the editors use, so the site colours Sword the way they do.
const sword = { ...JSON.parse(fs.readFileSync(site.grammar, 'utf8')), name: 'sword' };

// The release is published at the root and develop under next/. SITE_BASE is
// where GitHub Pages serves the site from, empty once it has its own domain.
// scripts/build.mjs passes SWORD_VERSIONS, what each version holds, so that a
// page can link to itself in the other; a single build knows only itself.
const next = process.env.SITE_VERSION === 'next';
const root = (process.env.SITE_BASE || '').replace(/\/+$/, '');
const known = process.env.SWORD_VERSIONS
	? JSON.parse(fs.readFileSync(process.env.SWORD_VERSIONS, 'utf8'))
	: { [next ? 'next' : 'release']: site };
const versions = {
	current: next ? 'next' : 'release',
	list: [
		known.release && { id: 'release', label: `${known.release.version} ${known.release.releaseName}`, pages: known.release.pages, home: `${root}/` },
		known.next && { id: 'next', label: 'Next', pages: known.next.pages, home: `${root}/next/` },
	].filter(Boolean),
};

export default defineConfig({
	site: process.env.SITE_ORIGIN || 'https://swordlang.com',
	base: next ? `${root}/next` : root || '/',
	outDir: next ? './dist/next' : './dist',
	vite: { define: { __SWORD_VERSIONS__: JSON.stringify(versions), __SWORD_TOUR__: JSON.stringify(site.tour) } },
	integrations: [
		starlight({
			title: 'Sword',
			description:
				'A compiled systems language with Go’s syntax and Zig’s memory model, whose compiler refuses programs with data races.',
			logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg' },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/swordlang/sword' }],
			sidebar: site.sidebar,
			// The site's own 404 is src/pages/404.astro.
			disable404Route: true,
			routeMiddleware: './src/route-data.mjs',
			// Unreleased work is not what a search engine should send anyone to.
			head: next ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } }] : [],
			components: {
				Banner: './src/components/Banner.astro',
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				Pagination: './src/components/Pagination.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				SocialIcons: './src/components/SocialIcons.astro',
			},
			customCss: [
				'@fontsource/inter/400.css',
				'@fontsource/inter/500.css',
				'@fontsource/inter/600.css',
				'@fontsource/inter/700.css',
				'@fontsource/jetbrains-mono/400.css',
				'@fontsource/jetbrains-mono/500.css',
				'./src/styles/sword.css',
			],
			expressiveCode: {
				themes: [codeTheme],
				useStarlightDarkModeSwitch: false,
				useStarlightUiThemeColors: false,
				shiki: { langs: [sword] },
				styleOverrides: {
					borderRadius: '10px',
					borderColor: '#23262D',
					codeFontFamily: "'JetBrains Mono', ui-monospace, monospace",
					codeFontSize: '0.84375rem',
					codeLineHeight: '1.65',
					uiFontFamily: "Inter, system-ui, sans-serif",
					frames: {
						frameBoxShadowCssValue: 'none',
						editorTabBarBackground: '#121418',
						editorActiveTabBackground: '#121418',
						editorTabBarBorderBottomColor: '#23262D',
						terminalBackground: '#121418',
						terminalTitlebarBackground: '#121418',
						terminalTitlebarBorderBottomColor: '#23262D',
					},
				},
			},
		}),
	],
});
