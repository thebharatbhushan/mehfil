# Mehfil SEO changes (applied to a copy of mehfil-main; apply with `git apply SEO-safe-fixes.patch`)

NOT RUN: npm install is blocked in this environment, so `next build`, `npm run typecheck`, lint and a local server were NOT run.
Only checks done: next.config.js loads in Node; edited TSX files have no TypeScript syntax errors (tsc syntax pass, no type resolution).
Run `npm run build && npm run typecheck` before deploying.

## Applied (SEO-safe-fixes.patch) - no visible/UI/route/API change
| File | Change | Reason |
|---|---|---|
| app/poem/[slug]/layout.tsx | Article JSON-LD: add `image` (same image as og:image) and `publisher.logo` (/mehfil-logo.png, 1200x536) | Missing recommended Article properties |
| app/layout.tsx | Add standalone Organization JSON-LD (name, url, logo only) | Entity for publisher; no invented data |
| app/poets/page.tsx | Page 2+ metadata now has description, OG description, Twitter tags | M-14 inherited stale values |
| components/home/HomeClient.tsx | `aria-label` on hero search input | Accessible name; invisible |
| next.config.js | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` | Invisible hardening |

## Not applied - needs your approval (OPTIONAL-H01-H02-throw-on-api-failure.patch, untested)
Fixes H-01/H-02 (empty pages / shrunken sitemap cached when the backend is cold). Trade-offs:
- Poem/author: on API timeout the server now throws, so ISR keeps the last good page, but a user hitting a never-cached page during a cold start sees an error instead of the current loading shell that recovers via client fetch. Add an error.tsx with retry (like app/dictionary/[slug]/error.tsx) or fix backend cold starts first.
- Sitemap: throws if the poem list fails. If the API is down during `next build`, the build fails (deploys blocked). Consider `export const dynamic = 'force-dynamic'` plus the throw.
- Home, /category, /category/[slug] not changed: they are prerendered at build, so throwing couples deploys to API uptime.

## Not changed on purpose (design/URL/behaviour or unproven)
Poem title pattern (M-05), poem quality gate (M-06), image optimisation and logo resize (M-01/02), splash loader (M-03), Font Awesome (M-04), <main>/heading-order/footer anchor text (touch markup or visible text), custom domain (M-08), Next.js upgrade (M-13), dead assets.
