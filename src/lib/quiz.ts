/**
 * "Find my AI tool" quiz engine — pure functions shared by the page script.
 *
 * FROZEN CONTRACT: the five questions and their option ids, the SCORES matrix,
 * the ranking formula in `scoreTools`, and the `?r=` encoding (comma-joined
 * option ids in question order) all predate the 2026 rebuild. Existing shared
 * links must resolve to the same ranked results, so change wording freely but
 * never the ids, the weights, or the order of the tiebreakers.
 */

export type QuestionId = 'goal' | 'role' | 'budget' | 'freq' | 'tech';
export const QUESTION_IDS: readonly QuestionId[] = ['goal', 'role', 'budget', 'freq', 'tech'];

export interface QuizOption {
	id: string;
	/** Lucide icon name (node_modules/lucide-static/icons/<icon>.svg) */
	icon: string;
	label: string;
	sub: string;
}
export interface QuizQuestion {
	id: QuestionId;
	step: number;
	question: string;
	subtitle: string;
	options: QuizOption[];
}

export const QUESTIONS: QuizQuestion[] = [
	{
		id: 'goal',
		step: 1,
		question: 'What do you mainly want to achieve with AI?',
		subtitle: 'Pick the one that fits best. We personalise your results from 200+ tools.',
		options: [
			{ id: 'write', icon: 'pen-line', label: 'Write better content', sub: 'Blog posts, emails, copy, scripts' },
			{ id: 'images', icon: 'image', label: 'Generate images and visuals', sub: 'Photos, illustrations, art, design' },
			{ id: 'code', icon: 'code-2', label: 'Code and build software', sub: 'Autocomplete, debugging, generation' },
			{ id: 'business', icon: 'bar-chart-3', label: 'Run and grow my business', sub: 'Marketing, automation, CRM, analytics' },
			{ id: 'video', icon: 'clapperboard', label: 'Create videos and audio', sub: 'Video generation, voice cloning, music' },
			{ id: 'research', icon: 'message-square', label: 'Research and get answers', sub: 'Q&A, summarise documents, learn fast' },
			{ id: 'design', icon: 'palette', label: 'Design and creative work', sub: 'UI, logos, branding, 3D, graphics' },
		],
	},
	{
		id: 'role',
		step: 2,
		question: 'Which best describes you?',
		subtitle: 'This weights tools that suit your context and experience.',
		options: [
			{ id: 'student', icon: 'graduation-cap', label: 'Student or researcher', sub: 'Learning, essays, research papers' },
			{ id: 'pro', icon: 'briefcase', label: 'Working professional', sub: 'Productivity, reports, communication' },
			{ id: 'dev', icon: 'terminal', label: 'Developer or engineer', sub: 'APIs, code, technical side projects' },
			{ id: 'creator', icon: 'camera', label: 'Content creator or artist', sub: 'YouTube, social, design, music' },
			{ id: 'biz', icon: 'building-2', label: 'Business owner or marketer', sub: 'Growth, campaigns, customer ops' },
			{ id: 'newcomer', icon: 'sparkles', label: 'Curious AI newcomer', sub: 'Just exploring, new to all this' },
		],
	},
	{
		id: 'budget',
		step: 3,
		question: "What's your budget?",
		subtitle: 'Every recommendation will fit your spending comfort.',
		options: [
			{ id: 'free', icon: 'gift', label: 'Has a free tier', sub: 'Free or freemium, start without paying' },
			{ id: 'freemium', icon: 'credit-card', label: "Open to paying if it's worth it", sub: 'A mix of freemium and paid tools' },
			{ id: 'any', icon: 'rocket', label: "Budget isn't the priority", sub: 'Show me the best, whatever the price' },
		],
	},
	{
		id: 'freq',
		step: 4,
		question: 'How will you use AI day-to-day?',
		subtitle: 'Frequent use and one-off projects call for different tools.',
		options: [
			{ id: 'daily', icon: 'calendar-days', label: 'Every day for work or study', sub: "I'll use this constantly" },
			{ id: 'project', icon: 'target', label: 'For a specific project', sub: "One big use case I'm working on" },
			{ id: 'exploring', icon: 'compass', label: 'Just exploring AI', sub: 'Curious, no specific plan yet' },
			{ id: 'building', icon: 'hammer', label: 'Building something with AI', sub: 'Integrating AI into a product' },
		],
	},
	{
		id: 'tech',
		step: 5,
		question: 'How technical are you?',
		subtitle: "We'll match you with tools that fit your comfort level.",
		options: [
			{ id: 'easy', icon: 'mouse-pointer-click', label: 'Non-technical', sub: 'Point, click, done. No setup please' },
			{ id: 'mid', icon: 'settings', label: 'Somewhat technical', sub: 'Fine with some configuration' },
			{ id: 'dev', icon: 'plug', label: 'Very technical', sub: 'I want APIs, SDKs and integrations' },
		],
	},
];

export type Answers = Partial<Record<QuestionId, string>>;
export type CompleteAnswers = Record<QuestionId, string>;

type CategoryWeights = Record<string, number>;

/* ─── Scoring matrix (frozen) ─────────────────────────────────────────── */
export const SCORES: Record<Exclude<QuestionId, 'budget'>, Record<string, CategoryWeights>> = {
	goal: {
		write: { 'ai-writing': 5, 'ai-marketing': 3, 'ai-productivity': 2 },
		images: { 'ai-image': 5, 'ai-art': 4, 'ai-design': 2 },
		code: { 'ai-coding': 5, 'ai-productivity': 2 },
		business: { 'ai-business': 5, 'ai-marketing': 4, 'ai-productivity': 3 },
		video: { 'ai-video': 5, 'ai-voice': 3 },
		research: { 'ai-chatbot': 5, 'ai-research': 4, 'ai-learning': 3 },
		design: { 'ai-design': 5, 'ai-art': 3, 'ai-image': 2 },
	},
	role: {
		student: { 'ai-learning': 3, 'ai-research': 3, 'ai-writing': 2, 'ai-chatbot': 2 },
		pro: { 'ai-productivity': 3, 'ai-writing': 2, 'ai-business': 2 },
		dev: { 'ai-coding': 4, 'ai-productivity': 2 },
		creator: { 'ai-image': 2, 'ai-video': 2, 'ai-art': 2, 'ai-writing': 2 },
		biz: { 'ai-business': 3, 'ai-marketing': 3, 'ai-productivity': 2 },
		newcomer: { 'ai-chatbot': 3, 'ai-learning': 3 },
	},
	freq: {
		daily: { 'ai-productivity': 2, 'ai-writing': 1 },
		project: {},
		exploring: { 'ai-chatbot': 2, 'ai-learning': 1 },
		building: { 'ai-coding': 2, 'ai-productivity': 1 },
	},
	tech: {
		easy: {},
		mid: {},
		dev: { 'ai-coding': 2 },
	},
};

export type Pricing = 'free' | 'freemium' | 'paid';

export const PRICING_FILTER: Record<string, Pricing[]> = {
	free: ['free', 'freemium'],
	freemium: ['free', 'freemium', 'paid'],
	any: ['free', 'freemium', 'paid'],
};

/** Compact tool record inlined into the page (see quiz.astro frontmatter). */
export interface QuizTool {
	slug: string;
	name: string;
	/** ≤ 110 chars */
	description: string;
	category: string;
	pricing: Pricing;
	rating?: number;
	ratingCount?: number;
	featured?: boolean;
	verified?: boolean;
	/** tagged `api` or `sdk` — feeds the "very technical" bonus */
	api?: boolean;
	/** /tools/<slug>.jpg exists */
	hasShot?: boolean;
	/** /logos/<slug>.png is missing → render a lettermark */
	noLogo?: boolean;
}

export type Tier = 'Best match' | 'Strong match' | 'Good match';

export interface ScoredTool extends QuizTool {
	score: number;
	tier: Tier;
}

/** Honest tiers instead of a fabricated match %. Rank 0 is always the best match. */
export function tierFor(rank: number, score: number, top: number): Tier {
	if (rank === 0) return 'Best match';
	return top > 0 && score / top >= 0.85 ? 'Strong match' : 'Good match';
}

/**
 * Rank every eligible tool against the answers. Formula, bonuses and tiebreakers
 * are byte-for-byte the pre-rebuild logic; only the fake `matchPct` is gone.
 * Returns the top 8 (1 best + 2 runners-up + 5 "also consider").
 */
export function scoreTools(tools: QuizTool[], answers: Answers): ScoredTool[] {
	const catWeights: CategoryWeights = {};
	for (const [qId, optId] of Object.entries(answers)) {
		if (qId === 'budget' || !optId) continue;
		const map = (SCORES as Record<string, Record<string, CategoryWeights>>)[qId]?.[optId] ?? {};
		for (const [cat, w] of Object.entries(map)) catWeights[cat] = (catWeights[cat] ?? 0) + w;
	}

	const allowedPricing = PRICING_FILTER[answers.budget ?? 'any'] ?? PRICING_FILTER.any;

	const scored = tools
		.filter((t) => allowedPricing.includes(t.pricing))
		.map((t) => {
			let score = catWeights[t.category] ?? 0;
			// Quality / curation bonuses — break ties between tools in the same category
			if (t.featured) score += 2;
			if (t.verified) score += 0.5;
			if (t.rating) score += (t.rating - 4.0) * 1.5;
			if (t.ratingCount) score += Math.min(1.5, Math.log10(t.ratingCount + 1) * 0.4);
			// Within "has a free tier", prefer truly free over freemium
			if (answers.budget === 'free' && t.pricing === 'free') score += 0.75;
			// Tech-level bonuses
			if (answers.tech === 'dev' && (t.api || t.category === 'ai-coding')) score += 1;
			if (answers.tech === 'easy' && t.rating && t.rating >= 4.5) score += 0.5;
			return { ...t, score };
		})
		.filter((t) => t.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			if ((b.featured ? 1 : 0) !== (a.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
			if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
			if ((b.ratingCount ?? 0) !== (a.ratingCount ?? 0)) return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
			return a.name.localeCompare(b.name);
		});

	const top = scored[0]?.score ?? 0;
	return scored.slice(0, 8).map((t, i) => ({ ...t, tier: tierFor(i, t.score, top) }));
}

/* ─── `?r=` share contract (frozen) ───────────────────────────────────── */

/** `goal,role,budget,freq,tech` — option ids joined by commas, in question order. */
export function encodeAnswers(answers: Answers): string {
	return QUESTION_IDS.map((k) => answers[k] ?? '').join(',');
}

export function optionOf(q: QuestionId, id: string | undefined): QuizOption | undefined {
	if (!id) return undefined;
	return QUESTIONS.find((x) => x.id === q)?.options.find((o) => o.id === id);
}

/**
 * Parse a shared `r` value. Returns null for anything malformed (missing
 * answers, unknown option ids) so the page can start fresh instead of crashing.
 */
export function decodeAnswers(str: string | null | undefined): CompleteAnswers | null {
	if (!str) return null;
	let raw = str;
	try { raw = decodeURIComponent(str); } catch { /* keep as-is */ }
	const vals = raw.split(',').map((v) => v.trim());
	if (vals.length !== QUESTION_IDS.length) return null;
	const out: Partial<CompleteAnswers> = {};
	for (let i = 0; i < QUESTION_IDS.length; i++) {
		const q = QUESTION_IDS[i];
		if (!optionOf(q, vals[i])) return null;
		out[q] = vals[i];
	}
	return out as CompleteAnswers;
}

/* ─── "Why it fits" bullets ───────────────────────────────────────────── */

const GOAL_FIT: Record<string, { cats: string[]; text: string }> = {
	write: { cats: ['ai-writing', 'ai-marketing', 'ai-productivity'], text: 'Great for writers' },
	images: { cats: ['ai-image', 'ai-art', 'ai-design'], text: 'Built for image creation' },
	code: { cats: ['ai-coding', 'ai-productivity'], text: 'Built for coding' },
	business: { cats: ['ai-business', 'ai-marketing', 'ai-productivity'], text: 'Built for business work' },
	video: { cats: ['ai-video', 'ai-voice'], text: 'Made for video and audio' },
	research: { cats: ['ai-chatbot', 'ai-research', 'ai-learning'], text: 'Strong at research and answers' },
	design: { cats: ['ai-design', 'ai-art', 'ai-image'], text: 'Made for design work' },
};

const ROLE_FIT: Record<string, { cats: string[]; text: string }> = {
	student: { cats: ['ai-learning', 'ai-research', 'ai-writing', 'ai-chatbot'], text: 'Popular with students' },
	pro: { cats: ['ai-productivity', 'ai-writing', 'ai-business'], text: 'Fits a working day' },
	dev: { cats: ['ai-coding', 'ai-productivity'], text: 'A developer favourite' },
	creator: { cats: ['ai-image', 'ai-video', 'ai-art', 'ai-writing'], text: 'Loved by creators' },
	biz: { cats: ['ai-business', 'ai-marketing', 'ai-productivity'], text: 'Built for growing a business' },
	newcomer: { cats: ['ai-chatbot', 'ai-learning'], text: 'A great first AI tool' },
};

function budgetReason(tool: QuizTool, budget: string | undefined): string {
	if (tool.pricing === 'free') return budget === 'free' ? 'Completely free' : 'Free, no catch';
	if (tool.pricing === 'freemium') return budget === 'free' ? 'Fits a free budget' : 'Free tier to start';
	return budget === 'freemium' ? 'Paid, but worth it' : 'A premium pick';
}

/** Up to three short, honest reasons derived from the answers and the tool's data. */
export function matchReasons(tool: QuizTool, answers: Answers, categoryName?: string): string[] {
	const out: string[] = [];
	const push = (s: string | undefined) => { if (s && !out.includes(s)) out.push(s); };

	const g = answers.goal ? GOAL_FIT[answers.goal] : undefined;
	push(g && g.cats.includes(tool.category) ? g.text : categoryName ? `Top ${categoryName} pick` : undefined);
	push(budgetReason(tool, answers.budget));

	const r = answers.role ? ROLE_FIT[answers.role] : undefined;
	push(r && r.cats.includes(tool.category) ? r.text : undefined);

	if (answers.tech === 'easy') push('Beginner-friendly');
	else if (answers.tech === 'dev' && (tool.api || tool.category === 'ai-coding')) push('Has an API for builders');
	else if (answers.tech === 'mid') push('Light setup, quick to learn');

	if (tool.rating && tool.rating >= 4.7) push(`Top-rated ${tool.rating.toFixed(1)}/5`);
	else if (tool.rating && tool.rating >= 4.3) push(`Rated ${tool.rating.toFixed(1)}/5`);
	if (tool.featured) push("Editor's pick");
	if (tool.verified) push('Tested by AI Briefs');
	if (answers.freq === 'daily') push('Made for everyday use');
	if (answers.freq === 'building') push('Slots into a product');
	if (categoryName) push(`Top ${categoryName} pick`);

	return out.slice(0, 3);
}
