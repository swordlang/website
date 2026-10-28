import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import codeTheme from './src/code-theme.mjs';

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
			logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg' },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/swordlang/sword' }],
			sidebar: site.sidebar,
			components: { SocialIcons: './src/components/SocialIcons.astro' },
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
