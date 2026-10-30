import type { Recipe } from './types';

/** Hashtags in a post's caption or title (#word), plus its recipe tags written as one word. */
export const tagsOf = (r: Recipe) => [...new Set([
  ...[...`${r.caption ?? ''} ${r.title ?? ''}`.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)].map((m) => m[1].toLowerCase()),
  ...(r.tags ?? []).map((t) => t.toLowerCase().replace(/\s+/g, '')),
])];
