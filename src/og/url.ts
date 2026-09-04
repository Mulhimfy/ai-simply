/**
 * Paths of the build-time Open Graph cards emitted by `src/pages/og/`.
 *
 *   ogUrl('tool', 'chatgpt')        → /og/tools/chatgpt.png
 *   ogUrl('article', 'best-ai-…')   → /og/blog/best-ai-….png
 *   ogUrl('vs', 'claude-vs-chatgpt')→ /og/vs/claude-vs-chatgpt.png
 *   ogUrl('category', 'ai-writing') → /og/category/ai-writing.png
 *   ogUrl('news', '2026-09-02')     → /og/news/2026-09-02.png
 *   ogUrl('site')                   → /og/default.png
 *
 * `og:image` must be absolute, so pages should emit `ogUrlAbsolute(...)`.
 */
import { SITE_URL } from '../consts';

export type OgUrlKind = 'tool' | 'article' | 'blog' | 'vs' | 'category' | 'news' | 'quiz' | 'site';

const PREFIX: Record<Exclude<OgUrlKind, 'site'>, string> = {
	tool: '/og/tools/',
	article: '/og/blog/',
	blog: '/og/blog/',
	vs: '/og/vs/',
	category: '/og/category/',
	news: '/og/news/',
	quiz: '/og/quiz/',
};

/** Site-relative path to the card. */
export function ogUrl(kind: OgUrlKind, slug?: string): string {
	if (kind === 'site' || !slug) return '/og/default.png';
	return `${PREFIX[kind]}${slug}.png`;
}

/** Absolute URL, ready for `<meta property="og:image">`. */
export function ogUrlAbsolute(kind: OgUrlKind, slug?: string): string {
	return `${SITE_URL}${ogUrl(kind, slug)}`;
}

/** Intrinsic size of every card, for `og:image:width` / `og:image:height`. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
