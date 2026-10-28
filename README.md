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
```

Both fetch `swordlang/sword` at `main` first. `SWORD_REF=develop` builds from
another branch or tag, and `SWORD_DIR=../sword` builds from a checkout on disk,
which is how a change to the documentation is seen on the site before it is
pushed. Only files git tracks there are published.
