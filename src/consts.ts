export const SITE_TITLE = 'AI Briefs';
export const SITE_DESCRIPTION = 'Discover the best AI tools. Browse 200+ AI tools across 21 categories — free, freemium, and paid.';
export const SITE_URL = 'https://getaibriefs.com';
export const SITE_AUTHOR = 'AI Briefs';

export const DEFAULT_AUTHOR = {
	name: 'AI Briefs',
	slug: 'ai-briefs',
	role: 'Editorial Team',
	bio: 'AI Briefs is an independent publication that tests AI tools hands-on and explains them in plain English — so readers can get the gist without the hype.',
	avatar: '/favicon.svg',
	twitter: 'getaibriefs',
};
export const BEEHIIV_FORM_URL = 'https://subscribe-forms.beehiiv.com/fda3e0ad-bcc8-4e4d-8f5b-123db9391be9';

/**
 * Paid directory listing, sold as a Polar subscription.
 *
 * IMPORTANT — `checkoutUrl` must stay a *reusable* Polar Checkout Link on the
 * `buy.polar.sh/polar_cl_…` host. Visiting it mints a fresh single-use session per buyer.
 * Never replace it with the `polar.sh/checkout/polar_c_…` URL that a session redirects to:
 * that one is single-use and expires ~24h after it is created, so the button would break.
 * Manage it under Polar → Products → "briefs" → Checkout Links.
 *
 * Verified against the Polar product on 2026-08-16: $99.99 USD, recurring_interval "month",
 * success URL → /submit/success?checkout_id={CHECKOUT_ID}, return URL → /submit.
 * Keep `price`/`interval` in sync with the product or the page will misquote the charge.
 */
export const TOOL_LISTING = {
	price: '$99.99',
	interval: 'month',
	priceLabel: '$99.99 / month',
	currency: 'USD',
	checkoutUrl: 'https://buy.polar.sh/polar_cl_K4iTZyJTnV0ouLOGzbqf7BLD0aT2eouDGaj094b2OsV',
	formspreeUrl: 'https://formspree.io/f/xkopzklp',
	/** Polar's hosted customer portal — where buyers cancel. */
	portalUrl: 'https://polar.sh/iqplot/portal',
};

export const TOOL_OF_THE_WEEK = { slug: 'chatgpt', label: 'Tool of the Week' };

export const CATEGORY_COLORS: Record<string, string> = {
	'ai-explained':   '#EEF3FF',
	'future-of-work': '#FFF4E6',
	'how-ai-works':   '#F0FFF4',
	'comparisons':    '#F5F0FF',
	'guides':         '#F0F9FF',
};

export interface ToolCategory {
	slug: string;
	name: string;
	emoji: string;
	description: string;
	subcategories: string[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
	{
		slug: 'ai-productivity',
		name: 'AI Productivity',
		emoji: '⚡',
		description: 'Boost your workflow with AI',
		subcategories: ['AI Assistant', 'AI Agent', 'AI Copilot', 'AI Search Engine', 'AI Email Assistant', 'AI Email', 'AI Meeting Assistant', 'AI Note Taker', 'AI Resume Builder', 'AI Task Management', 'AI Scheduling', 'AI PDF', 'AI Report Generator', 'AI Documents Generator', 'AI Presentation Generator'],
	},
	{
		slug: 'ai-writing',
		name: 'AI Writing',
		emoji: '✍️',
		description: 'AI-powered writing and content',
		subcategories: ['AI Writing Assistants', 'AI Summarizer', 'AI Text Generator', 'AI Blog Generator', 'AI Copywriting', 'AI Story Generator', 'AI Rewriter', 'AI Grammar Checker', 'AI Essay Writer', 'AI Email Writer', 'AI Script Writing', 'AI Paraphraser', 'AI Cover Letter Generator', 'AI Proofreading'],
	},
	{
		slug: 'ai-video',
		name: 'AI Video',
		emoji: '🎬',
		description: 'Generate and edit videos with AI',
		subcategories: ['AI Video Generator', 'Text to Video', 'AI Video Editor', 'Image to Video', 'AI Short Video Generator', 'AI Animation Generator', 'AI Video Summarizer', 'AI Lip Sync Generator', 'AI Face Swap Video', 'AI Avatar Video Generator'],
	},
	{
		slug: 'ai-image',
		name: 'AI Image',
		emoji: '🖼️',
		description: 'Create and edit images with AI',
		subcategories: ['AI Image Generator', 'Text to Image', 'AI Photo Editor', 'AI Background Remover', 'AI Avatar Generator', 'AI Image Enhancer', 'AI Image Upscaler', 'AI Headshot Generator', 'AI Face Swap Generator', 'AI Product Photography', 'AI Watermark Remover', 'AI Photo Restoration'],
	},
	{
		slug: 'ai-art',
		name: 'AI Art',
		emoji: '🎨',
		description: 'Generate stunning AI artwork',
		subcategories: ['AI Art Generator', 'AI Image Creation', 'AI Logo Generator', 'AI Illustration Generator', 'AI Anime Generator', 'AI 3D Model Generator', 'AI Cartoon Generator', 'AI Graphic Design', 'AI Drawing', 'AI Poster Generator', 'AI Sticker Generator'],
	},
	{
		slug: 'ai-voice',
		name: 'AI Voice',
		emoji: '🎤',
		description: 'AI voice generation and cloning',
		subcategories: ['AI Text-to-Speech', 'AI Text to Speech', 'AI Speech-to-Text', 'AI Transcription', 'AI Voice Generator', 'AI Voice Cloning', 'AI Voice Over', 'AI Voiceover', 'AI Dubbing', 'AI Voice Changer', 'AI Podcast', 'AI Podcast Tools', 'AI Audio Enhancer'],
	},
	{
		slug: 'ai-chatbot',
		name: 'AI Chatbot',
		emoji: '💬',
		description: 'Conversational AI assistants',
		subcategories: ['AI Chatbot', 'AI Character', 'AI Assistant', 'AI Roleplay', 'AI Dating Assistant'],
	},
	{
		slug: 'ai-vision',
		name: 'AI Vision',
		emoji: '👁️',
		description: 'Computer vision and image recognition',
		subcategories: ['AI Image Recognition', 'AI OCR', 'AI Face Recognition', 'AI Face Analyzer', 'AI Describe Image', 'Image to Prompt', 'Computer Vision API', 'Computer Vision Platform', 'AI Content Moderation', 'AI Data Labeling'],
	},
	{
		slug: 'ai-marketing',
		name: 'AI Marketing',
		emoji: '📢',
		description: 'AI tools for marketing and growth',
		subcategories: ['AI Marketing', 'AI Marketing Assistant', 'AI SEO Tools', 'AI Lead Generation', 'AI Sales Assistant', 'AI Ad Generator', 'AI Advertising', 'AI Email Marketing', 'AI Email Generator', 'AI Copywriting', 'SEO Writing AI', 'AI Digital Marketing'],
	},
	{
		slug: 'ai-coding',
		name: 'AI Coding',
		emoji: '💻',
		description: 'AI-powered coding and development',
		subcategories: ['AI Code Generator', 'AI Code Assistant', 'AI Code Editor', 'AI Developer Tools', 'AI Software Engineer', 'No-Code & Low-Code', 'AI App Builder', 'AI Website Builder', 'AI Code Review', 'AI Testing'],
	},
	{
		slug: 'ai-learning',
		name: 'AI Learning',
		emoji: '📚',
		description: 'AI tools for education and learning',
		subcategories: ['AI Translate', 'AI Homework Helper', 'AI Language Learning', 'AI Education', 'AI Quiz Generator', 'AI Flashcard Maker', 'AI Course', 'AI Coaching', 'AI Math', 'AI Answer', 'AI Mind Mapping'],
	},
	{
		slug: 'ai-social',
		name: 'AI Social',
		emoji: '📱',
		description: 'AI tools for social media',
		subcategories: ['AI Social Media Post Generator', 'Social Media Management', 'AI Caption Generator', 'AI YouTube', 'AI Twitter', 'AI Instagram', 'AI Hashtag', 'AI Meme Generator', 'AI TikTok', 'AI LinkedIn', 'AI Bio Generator'],
	},
	{
		slug: 'ai-business',
		name: 'AI Business',
		emoji: '💼',
		description: 'AI tools for business operations',
		subcategories: ['AI Customer Service', 'AI Workflow', 'AI Automation', 'AI Workspace', 'AI Recruiting', 'AI CRM', 'AI Project Management', 'AI Call Center', 'AI Interview Assistant'],
	},
	{
		slug: 'ai-research',
		name: 'AI Research',
		emoji: '🔬',
		description: 'AI-powered research and analysis',
		subcategories: ['AI Research Tool', 'AI Research Assistant', 'AI Academic Research', 'AI Literature Search', 'AI For Data Analytics', 'AI Predictions', 'AI Research Papers', 'AI Data Mining'],
	},
	{
		slug: 'ai-insights',
		name: 'AI Insights',
		emoji: '📊',
		description: 'Data analysis and business intelligence',
		subcategories: ['AI Consulting', 'AI For Data Analytics', 'AI Data Analysis', 'Business Intelligence', 'AI Business Ideas Generator', 'AI Crypto', 'AI Business Name Generator', 'AI Domain Name Generator'],
	},
	{
		slug: 'ai-life',
		name: 'AI Life',
		emoji: '🌟',
		description: 'AI for everyday life',
		subcategories: ['AI Travel', 'AI Travel Planner', 'AI Trip Planner', 'AI Fitness', 'AI Recipe', 'AI Nutrition', 'AI Wellness', 'AI Shopping Assistant', 'AI Outfit Generator', 'AI News', 'AI Gift Ideas'],
	},
	{
		slug: 'ai-health',
		name: 'AI Health',
		emoji: '🏥',
		description: 'AI tools for health and wellness',
		subcategories: ['AI Healthcare', 'AI Mental Health', 'AI Health Coach', 'AI Therapist', 'AI Medical Diagnosis', 'AI Symptom Checker'],
	},
	{
		slug: 'ai-legal',
		name: 'AI Legal',
		emoji: '⚖️',
		description: 'AI tools for legal and finance',
		subcategories: ['AI Legal Assistant', 'AI Legal Research', 'AI Contract Review', 'AI Contract Management', 'AI IP Research', 'AI For Finance', 'AI Investing', 'AI Contract Generator', 'AI Accounting', 'AI Tax Assistant', 'AI Real Estate'],
	},
	{
		slug: 'ai-design',
		name: 'AI Design',
		emoji: '✏️',
		description: 'AI-powered interior and space design',
		subcategories: ['AI Interior Design', 'AI UI Design', 'AI Logo Design', 'AI Color Tools', 'AI Room Planner', 'AI Landscape Generator', 'AI Kitchen Design', 'AI Floor Plan Generator'],
	},
	{
		slug: 'ai-detection',
		name: 'AI Detection',
		emoji: '🔍',
		description: 'Detect AI-generated content',
		subcategories: ['AI Detector', 'AI Content Detector', 'AI Content Moderation', 'AI Plagiarism Checker', 'Humanizer AI', 'AI Image Detector'],
	},
	{
		slug: 'others',
		name: 'Others',
		emoji: '🔮',
		description: 'Other AI tools and utilities',
		subcategories: ['Large Language Models', 'AI Models', 'Open Source AI', 'AI Platform', 'AI Infrastructure', 'AI Benchmarking', 'AI Games'],
	},
];

/** Unique editorial intros for subcategory pages — helps differentiate from parent category pages for SEO. */
export const SUBCATEGORY_INTROS: Record<string, string> = {
	// AI Image
	'AI Image Generator': 'AI image generators turn text prompts into original visuals in seconds. They range from photorealistic renderers to stylized art engines — the right choice depends on whether you need stock-photo replacements, marketing assets, or creative exploration.',
	// AI Chatbot
	'AI Chatbot': 'AI chatbots use large language models to hold natural conversations, answer questions, and complete tasks. Some focus on general knowledge, others on coding, research, or creative writing — each with different strengths in accuracy, speed, and personality.',
	// AI Art
	'AI Art Generator': 'AI art generators create original artwork from text descriptions or reference images. They differ in artistic style range, output resolution, and how much creative control they give you over composition, lighting, and detail.',
	// AI Writing
	'AI Writing Assistants': 'AI writing assistants help draft, edit, and polish text across formats — from emails and blog posts to marketing copy and reports. The best ones adapt to your voice and catch issues human proofreaders miss.',
	// AI Video
	'AI Video Generator': 'AI video generators create clips from text prompts, images, or templates. They vary widely in output quality, motion realism, and length limits — some excel at short social clips, others at longer narrative content.',
	'Text to Video': 'Text-to-video tools convert written descriptions directly into video clips. Quality has improved dramatically, but each tool handles motion, camera angles, and scene consistency differently.',
	'AI Video Editor': 'AI video editors automate tedious editing tasks — cutting silences, adding captions, color grading, and removing backgrounds. They save hours compared to traditional editing workflows.',
	'AI Avatar Video Generator': 'AI avatar video generators create talking-head videos from text scripts using realistic digital presenters. They are popular for training videos, product demos, and multilingual content without needing a camera or studio.',
	// AI Productivity
	'AI Task Management': 'AI task management tools automatically prioritize, organize, and schedule your work. They go beyond simple to-do lists by learning your patterns, suggesting deadlines, and surfacing what needs attention first.',
	'AI Note Taker': 'AI note-taking tools transcribe meetings, summarize key points, and extract action items automatically. They integrate with video conferencing platforms so you can focus on the conversation instead of typing.',
	'AI Presentation Generator': 'AI presentation generators turn outlines, documents, or prompts into polished slide decks. They handle layout, design, and content structure — you edit and refine instead of building from scratch.',
	'AI Scheduling': 'AI scheduling tools eliminate the back-and-forth of finding meeting times. They analyze availability, preferences, and priorities to suggest optimal slots and handle rescheduling automatically.',
	'AI Meeting Assistant': 'AI meeting assistants join your calls to record, transcribe, and summarize discussions. They capture decisions, action items, and follow-ups so nothing falls through the cracks.',
	'AI Assistant': 'AI assistants handle a broad range of tasks — answering questions, drafting content, managing workflows, and connecting to other apps. They serve as general-purpose productivity multipliers.',
	// AI Social
	'AI Social Media Post Generator': 'AI social media tools generate platform-optimized posts, suggest hashtags, and schedule content across channels. They help maintain a consistent posting cadence without spending hours on content creation.',
	// AI Detection
	'AI Content Detector': 'AI content detectors analyze text to estimate whether it was written by a human or generated by AI. Accuracy varies by model and writing style — no detector is perfect, but the best ones catch most unedited AI output.',
	'AI Detector': 'AI detectors identify machine-generated content across text, images, and code. They are used by educators, publishers, and platforms to maintain content authenticity standards.',
	// AI Coding
	'AI Code Assistant': 'AI code assistants autocomplete, explain, and debug code inside your editor. They support multiple languages and frameworks, turning natural-language instructions into working implementations.',
	// AI Health
	'AI Mental Health': 'AI mental health tools provide guided therapy exercises, mood tracking, and conversational support. They supplement — but do not replace — professional care, offering accessible help between sessions.',
	// AI Marketing
	'AI SEO Tools': 'AI SEO tools automate keyword research, content optimization, and competitor analysis. They surface ranking opportunities and suggest improvements that would take hours to find manually.',
	'AI Copywriting': 'AI copywriting tools generate ad copy, product descriptions, email sequences, and landing page text. They produce first drafts quickly, letting you focus on strategy and voice rather than blank-page writing.',
	// AI Learning
	'AI Language Learning': 'AI language learning tools use speech recognition and adaptive lessons to personalize your study path. They provide real-time pronunciation feedback and conversation practice that traditional apps cannot match.',
	'AI Flashcard Maker': 'AI flashcard makers generate study cards from notes, textbooks, or documents automatically. They use spaced repetition algorithms to optimize review timing and improve long-term retention.',
	// AI Research
	'AI Research Papers': 'AI research paper tools help find, summarize, and analyze academic literature. They surface relevant papers, extract key findings, and identify connections across studies faster than manual search.',
	'AI For Data Analytics': 'AI data analytics tools let you query databases in plain English, generate visualizations, and spot trends without writing code. They make data analysis accessible to non-technical teams.',
	'AI Research Tool': 'AI research tools accelerate information gathering by searching, synthesizing, and summarizing sources. They help you go from question to comprehensive answer in minutes instead of hours.',
	// AI Legal
	'AI Legal Assistant': 'AI legal assistants draft contracts, review documents, and answer legal questions. They reduce routine legal work from hours to minutes — though complex matters still need a human lawyer.',
	'AI Contract Review': 'AI contract review tools scan agreements for risks, missing clauses, and unusual terms. They flag issues that even experienced reviewers might miss under time pressure.',
	// AI Design
	'AI Interior Design': 'AI interior design tools visualize room makeovers from photos. Upload a picture of your space and see it transformed with different styles, furniture, and color schemes — before spending a dollar.',
	// AI Image (more)
	'AI Image Recognition': 'AI image recognition tools identify objects, faces, text, and scenes in photos and video. They power everything from automated tagging to security systems and accessibility features.',
	// AI Blog/Grammar
	'AI Blog Generator': 'AI blog generators produce full-length articles from topics or outlines. They handle research, structure, and drafting — though the best results come from editing AI output with your own expertise and voice.',
	'AI Grammar Checker': 'AI grammar checkers go beyond spell-check to fix sentence structure, tone, clarity, and style. They catch errors that standard tools miss and suggest rewrites that make your writing sharper.',
	'AI Graphic Design': 'AI graphic design tools create social media graphics, banners, logos, and marketing materials from templates or prompts. They democratize design for teams without dedicated designers.',
	// AI Email
	'AI Email Marketing': 'AI email marketing tools write subject lines, personalize content, optimize send times, and segment audiences automatically. They improve open rates and conversions with less manual effort.',
	'AI Email Writer': 'AI email writers draft professional emails from brief instructions. They match your tone, suggest improvements, and handle everything from cold outreach to customer replies.',
};

export const PRICING_BADGE: Record<string, { bg: string; text: string; label: string }> = {
	free:     { bg: '#E0F5EE', text: '#00875A', label: 'Free' },
	freemium: { bg: '#EEF3FF', text: '#3B5BDB', label: 'Freemium' },
	paid:     { bg: '#FFF4E6', text: '#E67700', label: 'Paid' },
};
