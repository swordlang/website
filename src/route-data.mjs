// Where a tour page sits in the tour: its part, its place in the part and in
// the whole. PageTitle and Pagination read it as starlightRoute.tour; the
// part being read shows "4 / 5" in the sidebar instead of its size. A page of
// the reference gets its place in its list as starlightRoute.series.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const tour = __SWORD_TOUR__;
const reference = __SWORD_REFERENCE__;

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	for (const list of reference ? [reference.language, reference.library] : []) {
		const at = list.slugs.indexOf(route.id);
		if (at !== -1) route.series = { label: list.label, index: at + 1, total: list.slugs.length };
	}
	if (!tour || (route.id !== tour.intro && !route.id.startsWith(`${tour.intro}/`))) return;
	const sizes = tour.parts.map((p) => p.slugs.length);
	const total = sizes.reduce((a, b) => a + b, 0);
	let index = 0;
	let here = null;
	tour.parts.forEach((p, part) => {
		const at = p.slugs.indexOf(route.id);
		if (at !== -1) here = { part, at, index: index + at + 1 };
		index += p.slugs.length;
	});
	route.tour = { parts: tour.parts.map((p) => p.label), sizes, total, here };
	if (!here) return;
	const label = tour.parts[here.part].label;
	const group = route.sidebar
		.flatMap((e) => (e.type === 'group' ? [e, ...e.entries.filter((x) => x.type === 'group')] : []))
		.find((g) => g.label === label && g.badge);
	if (group) group.badge = { ...group.badge, text: `${here.at + 1} / ${sizes[here.part]}`, class: 'sw-count sw-count-here' };
});
