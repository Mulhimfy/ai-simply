/**
 * The five editorial rating criteria and their weights (must sum to 100).
 * Single source of truth for /rating-methodology/, /reviews/, tool pages and the About page.
 */
export interface RatingCriterion {
	key: string;
	name: string;
	weight: number; // percent
	icon: string;   // lucide icon name
	short: string;  // one-line summary
	description: string;
}

export const RATING_CRITERIA: RatingCriterion[] = [
	{
		key: 'ease',
		name: 'Ease of use',
		weight: 25,
		icon: 'mouse-pointer-click',
		short: 'How fast a new user gets real value.',
		description:
			'How quickly can a new user get value from the tool? We assess onboarding, UI clarity, prompt guidance, and learning curve. A tool that delivers results within minutes scores higher than one requiring extensive configuration.',
	},
	{
		key: 'quality',
		name: 'Output quality',
		weight: 30,
		icon: 'sparkles',
		short: 'Accuracy, coherence and usefulness of results.',
		description:
			'The most important factor. We test the tool across a range of representative tasks and evaluate the accuracy, creativity, coherence, and usefulness of the results. We compare outputs against competing tools in the same category.',
	},
	{
		key: 'value',
		name: 'Value for money',
		weight: 20,
		icon: 'badge-dollar-sign',
		short: 'Fair pricing, honest limits, generous free tiers.',
		description:
			"We assess whether the tool's pricing is fair relative to what it delivers. Free tiers, usage limits, hidden paywalls, and the generosity of trial periods all factor into this score. A generous free tier can significantly boost this dimension.",
	},
	{
		key: 'depth',
		name: 'Features & depth',
		weight: 15,
		icon: 'layers',
		short: 'Breadth, integrations, API, customisation.',
		description:
			'Does the tool do what it claims, and does it go beyond the basics? We evaluate the breadth of capabilities, integrations, API access, customisation options, and unique features that differentiate it from the crowd.',
	},
	{
		key: 'trust',
		name: 'Reliability & trust',
		weight: 10,
		icon: 'shield-check',
		short: 'Uptime, speed, privacy, transparency.',
		description:
			'We assess uptime, response speed, data privacy practices, and how transparent the company is about how its AI works. Tools with clear privacy policies, a known team, and a solid track record score higher here.',
	},
];

export const RATING_PROCESS = [
	{ step: 1, name: 'Discover', text: 'We identify tools through submissions, product launches, community feedback, and our own research. Every tool is checked against our listing criteria before evaluation begins.' },
	{ step: 2, name: 'Test hands-on', text: 'At least two editors use the tool on real tasks for a minimum of a week, across free and paid tiers where available.' },
	{ step: 3, name: 'Score', text: 'Each reviewer independently scores the five criteria. Scores are combined into a weighted average, rounded to one decimal place, and reviewed against peer tools to ensure consistency.' },
	{ step: 4, name: 'Re-check', text: 'Ratings are revisited when a tool ships major changes, and at least every six months. Paid listings receive no scoring advantage.' },
];
