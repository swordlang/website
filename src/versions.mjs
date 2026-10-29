// Which version of the documentation this build is, and the others it is
// published beside; astro.config.mjs fills it in.
export const versions = __SWORD_VERSIONS__;

// The same page in another version, or that version's home if it has no such
// page: a reader switching versions keeps their place where they can.
export function samePage(version, id) {
	if (version.pages.includes(id)) return `${version.home}${id ? `${id}/` : ''}`;
	return null;
}
