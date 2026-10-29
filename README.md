# swordlang.com

The website of the [Sword](https://github.com/swordlang/sword) programming
language.

The text of the site is not kept here. It is the documentation in
`swordlang/sword/docs`, fetched when the site is built, so the two cannot drift
apart: a change to the documentation is a change to the site, and every program
on the site is one that the language's own test suite compiles and runs.

To change what a page says, change the documentation in `swordlang/sword`. This
repository holds how the pages look, the home page, and the build.

## Building

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # the site, in dist/
npm run build:site # the site as published, with both versions
```

Both fetch `swordlang/sword` at `main` first. `SWORD_REF=develop` builds from
another branch or tag, and `SWORD_DIR=../sword` builds from a checkout on disk,
which is how a change to the documentation is seen on the site before it is
pushed. Only files git tracks there are published.

## Publishing

The site is published on GitHub Pages by `.github/workflows/deploy.yml`. It
holds two versions of the documentation: the latest release, `swordlang/sword`
at `main`, at the root, and the work not yet released, at `develop`, under
`/next/`. Every page of `/next/` says so, and a selector beside the logo
switches between the two, to the same page where the other version has it.

`npm run build:site` builds both into `dist/` and then checks every link and
anchor on every page; a broken one fails the build, and so does a link from the
documentation to a file `swordlang/sword` does not have.

The workflow runs on a push to `main` here, when `swordlang/sword` sends the
`repository_dispatch` event `docs` (it does on every push that changes what the
site is made from), and by hand. It also runs every hour, in case that event
was missed, but builds then only if `swordlang/sword` or this repository has
moved since the build that is live: each build publishes the commits it was
made from as `build.json`, and `scripts/changed.mjs` compares them. On a pull
request it builds and checks without publishing.
