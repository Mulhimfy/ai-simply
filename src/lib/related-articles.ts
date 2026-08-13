import type { CollectionEntry } from 'astro:content';
import { TOOL_CATEGORIES } from '../consts';

/**
 * Curated topical fallback: tool category → ordered blog slugs.
 *
 * The scoring pass below handles obvious matches (a tool named in an article
 * title, or overlapping keywords). This map guarantees every tool page still
 * links into the editorial side when scoring finds nothing — which was the
 * case for 184 of 222 tools before, because blog tags are search phrases
 * ("best AI chatbot") while tool tags are product terms ("openai", "gpt-4"),
 * so the old exact-match never fired.
 */
export const CATEGORY_FALLBACK_ARTICLES: Record<string, string[]> = {
	'ai-productivity': ['best-ai-meeting-assistants', 'best-ai-presentation-makers', 'how-to-use-ai-at-work'],
	'ai-writing':      ['best-ai-writing-assistants', 'best-ai-grammar-checkers', 'what-is-prompt-engineering-how-to-talk-to-ai'],
	'ai-video':        ['best-ai-video-generators', 'what-is-generative-ai', 'what-are-deepfakes-how-to-spot-one'],
	'ai-image':        ['best-ai-image-generators', 'what-is-generative-ai', 'what-are-deepfakes-how-to-spot-one'],
	'ai-art':          ['best-ai-image-generators', 'what-is-generative-ai', 'what-is-prompt-engineering-how-to-talk-to-ai'],
	'ai-voice':        ['best-ai-text-to-speech', 'what-are-deepfakes-how-to-spot-one', 'what-is-generative-ai'],
	'ai-chatbot':      ['best-ai-chatbots', 'chatgpt-vs-claude-for-beginners', 'what-is-a-large-language-model-llm-explained'],
	'ai-vision':       ['how-ai-is-eroding-your-privacy', 'predictive-ai-surveillance-stops-watching-starts-deciding', 'can-ai-read-your-emotions-emotion-ai-explained'],
	'ai-marketing':    ['best-ai-seo-tools', 'best-ai-writing-assistants', 'how-to-start-ai-side-hustles-that-make-money'],
	'ai-coding':       ['best-ai-code-assistants', 'what-is-vibe-coding-explained', 'what-is-an-ai-agent-explained-simply'],
	'ai-learning':     ['best-ai-flashcard-apps', 'best-ai-language-learning', 'is-ai-making-us-dumber-deskilling-problem'],
	'ai-social':       ['best-ai-writing-assistants', 'how-to-start-ai-side-hustles-that-make-money', 'how-to-use-ai-at-work'],
	'ai-business':     ['how-to-use-ai-at-work', 'what-is-an-ai-agent-explained-simply', 'will-ai-replace-my-job'],
	'ai-research':     ['what-is-an-ai-reasoning-model-explained', 'what-are-ai-hallucinations-why-ai-lies-to-you', 'what-is-a-large-language-model-llm-explained'],
	'ai-insights':     ['what-is-machine-learning-explained', 'how-to-use-ai-at-work', 'what-is-an-ai-agent-explained-simply'],
	'ai-life':         ['how-to-use-ai-at-work', 'what-is-generative-ai', 'how-to-start-ai-side-hustles-that-make-money'],
	'ai-health':       ['can-ai-read-your-emotions-emotion-ai-explained', 'how-ai-is-eroding-your-privacy', 'what-are-ai-hallucinations-why-ai-lies-to-you'],
	'ai-legal':        ['what-are-ai-hallucinations-why-ai-lies-to-you', 'how-ai-is-eroding-your-privacy', 'will-ai-replace-my-job'],
	'ai-design':       ['best-ai-image-generators', 'what-is-generative-ai', 'what-is-prompt-engineering-how-to-talk-to-ai'],
	'ai-detection':    ['what-are-deepfakes-how-to-spot-one', 'what-are-ai-hallucinations-why-ai-lies-to-you', 'how-ai-is-eroding-your-privacy'],
	'others':          ['what-is-a-large-language-model-llm-explained', 'what-is-generative-ai', 'what-is-machine-learning-explained'],
};

/** Last-resort evergreen picks, used only if a fallback slug has been deleted. */
const EVERGREEN = [
	'what-is-generative-ai',
	'how-to-use-ai-at-work',
	'what-is-prompt-engineering-how-to-talk-to-ai',
];

/** Lowercase, strip punctuation, collapse whitespace — so "Text-to-Speech" ≈ "text to speech". */
function norm(str: string): string {
	return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when either phrase contains the other as a whole-word run. */
function overlaps(a: string, b: string): boolean {
	if (!a || !b) return false;
	return ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);
}

/**
 * Rank blog posts by topical relevance to a tool, then top up from the curated
 * fallback so the "Related Articles" block is never empty.
 */
export function relatedArticlesForTool(
	tool: CollectionEntry<'tools'>,
	posts: CollectionEntry<'blog'>[],
	limit = 3,
): CollectionEntry<'blog'>[] {
	const name = norm(tool.data.name);
	const sub = norm(tool.data.subcategory ?? '');
	const catName = norm(TOOL_CATEGORIES.find(c => c.slug === tool.data.category)?.name ?? '');
	const toolTags = (tool.data.tags ?? []).map(norm).filter(t => t.length > 2);

	const scored = posts
		.map(post => {
			const title = norm(post.data.title);
			const tags = (post.data.tags ?? []).map(norm);
			let score = 0;

			// Article explicitly covers this tool — strongest possible signal.
			if (tags.some(t => t === name)) score += 12;
			if (overlaps(title, name)) score += 10;

			// Subcategory phrase inside a post tag, e.g. "ai chatbot" ⊂ "best ai chatbot".
			if (sub && tags.some(t => overlaps(t, sub))) score += 6;
			if (catName && tags.some(t => overlaps(t, catName))) score += 4;

			// Shared keywords between the tool and the article.
			score += toolTags.filter(t => tags.some(x => overlaps(x, t))).length * 2;

			return { post, score };
		})
		.filter(s => s.score > 0)
		.sort((a, b) =>
			b.score - a.score || b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf(),
		)
		.map(s => s.post);

	const picked = scored.slice(0, limit);
	if (picked.length >= limit) return picked;

	const taken = new Set(picked.map(p => p.id));
	const fallbackSlugs = [...(CATEGORY_FALLBACK_ARTICLES[tool.data.category] ?? []), ...EVERGREEN];

	for (const slug of fallbackSlugs) {
		if (picked.length >= limit) break;
		if (taken.has(slug)) continue;
		const post = posts.find(p => p.id === slug);
		if (!post) continue;
		picked.push(post);
		taken.add(slug);
	}

	return picked;
}
