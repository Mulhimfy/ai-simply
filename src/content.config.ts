import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			category: z.enum(['ai-explained', 'future-of-work', 'how-ai-works', 'ai-news', 'comparisons', 'guides']).default('guides'),
			tags: z.array(z.string()).default([]),
			readingTime: z.string().optional(),
			author: z.string().default('AI Briefs'),
			authorBio: z.string().optional(),
			authorTwitter: z.string().optional(),
			authorAvatar: z.string().optional(),
			faqs: z.array(z.object({
				question: z.string(),
				answer: z.string(),
			})).optional(),
		}),
});

const tools = defineCollection({
	loader: glob({ base: './src/content/tools', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			description: z.string(),
			category: z.enum([
				'ai-productivity', 'ai-writing', 'ai-video', 'ai-image', 'ai-art',
				'ai-voice', 'ai-chatbot', 'ai-vision', 'ai-marketing',
				'ai-coding', 'ai-learning', 'ai-social', 'ai-business', 'ai-research',
				'ai-insights', 'ai-life', 'ai-health', 'ai-legal', 'ai-design',
				'ai-detection', 'others',
			]),
			subcategory: z.string().optional(),
			url: z.string().url(),
			logo: image().optional(),
			pricing: z.enum(['free', 'freemium', 'paid']).default('freemium'),
			tags: z.array(z.string()).default([]),
			featured: z.boolean().default(false),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			rating: z.number().min(1).max(5).optional(),
			ratingCount: z.number().optional(),
			pros: z.array(z.string()).optional(),
			cons: z.array(z.string()).optional(),
			affiliateUrl: z.string().url().optional(),
			sponsored: z.boolean().default(false),
			verified: z.boolean().default(false),
			/**
			 * Paid listings only. Set to the Polar subscription id that pays for this listing.
			 * `scripts/sync-listings.mjs` archives the file when that subscription stops being
			 * active. Editorial tools leave it unset and are never touched by the sync.
			 */
			polarSubscriptionId: z.string().optional(),
			/** Submission reference shown to the buyer at checkout (e.g. AIB-K3F9QZ2). */
			listingRef: z.string().optional(),
		}),
});

export const collections = { blog, tools };
