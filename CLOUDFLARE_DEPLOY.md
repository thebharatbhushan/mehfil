# Cloudflare deploy (Workers + OpenNext)

Already wired: `wrangler.jsonc`, `open-next.config.ts`, `build:cf` / `deploy:cf` scripts. No code changes needed.

## One-time setup
1. (No R2 bucket needed.) Push this repo to GitHub.
3. Cloudflare -> Workers & Pages -> Create -> Import a repository -> pick the repo.
   - Project/Worker name: `mehfil` (must equal `name` in wrangler.jsonc)
   - Build command:  `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
4. Build variables (see .env.example): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. Save and Deploy.

## After deploy
- Backend (Render) CORS: allow your new Cloudflare domain.
- Google OAuth console: add the new domain to Authorized JavaScript origins.
- Re-submit https://<domain>/sitemap.xml in Search Console.

## Local
- `npm run preview:cf` builds and runs it locally in the Workers runtime.
- Free Workers plan limit is 3 MiB (gzip) per Worker; if the deploy complains about size, use the Workers Paid plan.
