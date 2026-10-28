// Code is dark in both the light and the dark page, so that a program reads
// the same wherever it appears. The scopes are the ones the editor grammar in
// swordlang/sword defines; sh, lua and the rest fall on the generic ones.
export default {
	name: 'sword-forge',
	type: 'dark',
	colors: {
		'editor.background': '#121418',
		'editor.foreground': '#E6E8EC',
		'editor.selectionBackground': '#2A2F3A',
		'editorLineNumber.foreground': '#4A505B',
	},
	tokenColors: [
		{ scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8B929C' } },
		{
			scope: ['keyword', 'storage', 'storage.modifier', 'keyword.control', 'keyword.declaration'],
			settings: { foreground: '#F0A27A' },
		},
		{
			scope: ['support.type', 'entity.name.type', 'support.type.primitive', 'storage.type'],
			settings: { foreground: '#8CC4E8' },
		},
		{ scope: ['string', 'constant.character.escape'], settings: { foreground: '#A6D38F' } },
		{
			scope: ['constant.numeric', 'constant.language', 'variable.other.enummember'],
			settings: { foreground: '#E3C17E' },
		},
		{ scope: ['entity.name.function', 'support.function'], settings: { foreground: '#F2F3F5' } },
		{ scope: ['variable.parameter', 'variable.other'], settings: { foreground: '#E6E8EC' } },
	],
};
