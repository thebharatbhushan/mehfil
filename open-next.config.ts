import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

// ISR pages (revalidate = 3600) are stored in an R2 bucket, so a visit is served from cache
// instead of re-rendering the page and calling the backend on every request.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
