import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No R2 / KV bindings, so deploy works on any Cloudflare account without extra setup.
// To enable ISR caching later: enable R2 in the dashboard, create bucket `mehfil-cache`, then add
// `incrementalCache: r2IncrementalCache` (from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache')
// here and the `r2_buckets` binding back in wrangler.jsonc.
export default defineCloudflareConfig();
