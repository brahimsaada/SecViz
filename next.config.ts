import type { NextConfig } from 'next'

/*
 * Two build modes.
 *
 * Default: an ordinary Next build, for `npm run dev`, `npm start` and
 * Vercel.
 *
 * PAGES=1: a fully static export for GitHub Pages. Pages serves the site
 * from a sub-path (/SecViz), so the base path has to be baked in at build
 * time, and every route becomes a directory with an index.html, which is
 * what Pages resolves cleanly without a server.
 *
 * Nothing here is dynamic at request time --- no API routes, no server
 * actions, every route enumerated by generateStaticParams --- so the
 * export carries the whole platform.
 */
const pages = process.env.PAGES === '1'
const repo = process.env.PAGES_BASE_PATH ?? '/SecViz'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(pages
    ? {
        output: 'export',
        basePath: repo,
        assetPrefix: repo,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
}

export default config
