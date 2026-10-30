// One share card per page, written next to the site at og/<page>.png.
import { getCollection } from 'astro:content';
import { labelOf, shareCard } from '../../og.mjs';

export async function getStaticPaths() {
	const docs = await getCollection('docs');
	return docs.map((doc) => ({ params: { slug: doc.id }, props: { label: labelOf(doc.id, doc.data.title) } }));
}

export function GET({ props }) {
	return new Response(shareCard(props.label), { headers: { 'Content-Type': 'image/png' } });
}
