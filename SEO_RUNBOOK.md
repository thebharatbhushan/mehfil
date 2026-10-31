# Mehfil SEO runbook

## Index policy (crawl audit)
| URL | Indexable | In sitemap | Notes |
|---|---|---|---|
| `/`, `/poems`, `/poets`, `/category`, `/about-contact` | yes | yes | `/poems?page=N` indexable, self-canonical, not in sitemap |
| `/category/<slug>` | yes if >= 3 poems | yes if >= 3 poems | else `noindex,follow` (thin) |
| `/poem/<slug>` | yes | yes | 404 only when API answers 404 |
| `/u/<username>` | yes if author has >= 1 poem | same | else `noindex,follow` |
| `/feedback` | no (`noindex,follow`) | no | low value |
| `/login /signup /profile /publish /author` | no (`noindex`) + robots disallow | no | |
| tag pages | **do not exist** | - | tags are text only (thin, near-duplicate pages hurt more than help). Revisit only if a tag has 10+ poems and unique intro text |
| `/search?q=` | not a route | - | robots disallows `/search`; if ever added, use `noindex,follow` |

## Slug redirects (needs backend)
Frontend cannot know old slugs. Add `previousSlugs: [String]` to Poem and `previousUsernames` to User; on slug/username change push the old value. Then in `app/poem/[slug]/layout.tsx` / `app/u/[username]/layout.tsx`, when the API returns the record under an old slug, call `permanentRedirect(newPath)` (Next 13.5: `redirect` from `next/navigation`).

## After deploy (manual, in Google tools)
1. Search Console -> add property -> Sitemaps -> submit `https://<domain>/sitemap.xml`.
2. Weekly: Pages (indexed / not indexed reasons), Crawl stats, Core Web Vitals, Performance -> Queries.
3. Rich Results Test on one poem, one author, one category URL (Article, Person, BreadcrumbList, CollectionPage).
4. PageSpeed Insights on `/`, `/poems`, a poem page; compare LCP/CLS/INP before and after.
5. View-source on `/poem/<slug>` and `/category/prem`: title, canonical, og:*, ld+json, and poem links are in the raw HTML.
6. `public/og-image.png` (1200x630) is in place.
