---
title: "What Is an AI Reasoning Model? How 'Thinking' AI Actually Works (2026)"
seoTitle: "What Is an AI Reasoning Model? How It Thinks"
description: "AI reasoning models like o3 and DeepSeek R1 pause and think before answering. Here's exactly what that means, how it works, and when you should actually use one."
pubDate: 2026-03-19
updatedDate: 2026-03-19
heroImage: "../../assets/ai-reasoning-model.jpg"
category: "ai-explained"
tags: ["AI reasoning model", "chain of thought AI", "DeepSeek R1", "OpenAI o3", "how AI thinks", "AI explained", "thinking AI", "o1 vs o3", "reasoning vs language model", "beginners", "ChatGPT thinking"]
readingTime: "13 min read"
faqs:
  - question: "What is an AI reasoning model in simple terms?"
    answer: "An AI reasoning model is a type of AI that works through a problem step by step before giving you an answer — like a student showing their work rather than blurting out a guess. Standard AI models generate responses immediately. Reasoning models generate a hidden 'scratchpad' of thinking first, then produce a final answer. This makes them dramatically better at hard problems like math, logic, and complex coding — but slower and more expensive for simple tasks."
  - question: "Why does ChatGPT say 'Thinking...' before some answers?"
    answer: "When you see 'Thinking...' in ChatGPT, you're using a reasoning model (like o3 or o4-mini). The model is generating internal reasoning steps — called thinking tokens — before writing its final response. This pause isn't lag. It's the model working through the problem. The longer it thinks, the more thorough its reasoning. You can usually control how much it thinks via the model settings."
  - question: "What is the difference between a reasoning model and a regular AI?"
    answer: "A regular AI model (like GPT-4o) reads your prompt and immediately starts generating a response, token by token. A reasoning model generates hidden internal reasoning steps first — exploring the problem, checking assumptions, working through logic — then produces a final answer. On simple questions, there's little difference. On hard math, code debugging, or multi-step logic, reasoning models are dramatically more accurate."
  - question: "What are thinking tokens in AI?"
    answer: "Thinking tokens are the internal reasoning steps a reasoning model generates before its final answer. They work like a mental scratchpad — the model writes out its logic, tries approaches, catches mistakes, and refines its thinking. These tokens are usually hidden from you (you just see the result), though Claude's extended thinking mode lets you see the actual reasoning process. You're billed for thinking tokens in API usage, which is why reasoning models cost more."
  - question: "What is DeepSeek R1 and why did it matter?"
    answer: "DeepSeek R1 is an open-source reasoning model released in January 2025 by a Chinese AI company called DeepSeek. It matched OpenAI's o1 on most benchmarks while costing dramatically less to build and run. Its release shocked the AI industry — Nvidia's stock dropped 17% in a single day — because it showed that reasoning-level AI could be achieved without the enormous budgets that US companies were spending. It's also open-weight, meaning anyone can download and run it."
  - question: "When should I use a reasoning model vs a regular AI model?"
    answer: "Use a reasoning model for: complex math or statistics, debugging tricky code, multi-step logic problems, legal or scientific analysis, and anything where the answer depends on getting intermediate steps right. Use a regular model for: writing, summarizing, answering simple questions, brainstorming, and conversational tasks. Using a reasoning model for simple things wastes time and money — it's like hiring an engineer to change a lightbulb."
  - question: "Is o3 the same as ChatGPT?"
    answer: "No. o3 is one of several AI models you can choose inside ChatGPT. When you use ChatGPT, you're typically on GPT-4o by default — a fast, general-purpose model. o3 is OpenAI's reasoning model, available in ChatGPT Plus. It's slower, more expensive, and significantly better at hard problems. Think of ChatGPT as the product and o3 as one of the engines you can switch to inside it."
  - question: "How does chain of thought reasoning work in AI?"
    answer: "Chain of thought (CoT) is the technique reasoning models use internally: instead of jumping straight to an answer, the model explicitly works through intermediate steps. For a math problem, it might write out each calculation. For a logic puzzle, it might consider each constraint in turn. Early researchers discovered that simply adding 'let's think step by step' to a prompt dramatically improved accuracy in standard models. Reasoning models have this built into their training — they do it automatically, at scale."
  - question: "What are the best AI reasoning models in 2026?"
    answer: "The top reasoning models as of 2026 are: OpenAI o3 and o4-mini (best overall performance, especially coding and math), DeepSeek R1 (best open-source option, free to run locally), Anthropic Claude 3.7 Sonnet with extended thinking (best for transparent reasoning you can inspect), and Google Gemini 2.5 Pro (best Google integration). Each has different strengths, cost profiles, and use cases."
  - question: "Do reasoning models hallucinate less?"
    answer: "Yes — significantly less on complex tasks. On hard problems like PhD-level science questions, reasoning models like o3 score 87.7% accuracy, while standard models struggle. However, reasoning models can still hallucinate, especially on factual recall tasks where they 'overthink' themselves into a wrong answer. The improvement is most pronounced on logic and math — not necessarily on factual knowledge retrieval."
  - question: "Are reasoning models slower and more expensive?"
    answer: "Yes to both. Reasoning models generate extra tokens (the internal thinking) before producing a response, which takes more time and costs more to process. o3 can take 10-60 seconds on complex tasks where GPT-4o responds in under 2 seconds. In the API, reasoning models typically cost 3-10x more per query than standard models. For most everyday tasks, this cost isn't worth it — save reasoning models for problems that actually need them."
---

You typed a question into ChatGPT. Then something strange happened.

Instead of the usual instant stream of words, you saw a message: **"Thinking..."**

Seconds passed. Maybe ten. Maybe thirty. Then an answer appeared. Different. More careful. More precise. It showed its work.

That pause wasn't a bug. It was a fundamentally new kind of AI doing something AI wasn't supposed to be able to do.

Welcome to the world of **AI reasoning models**. Understanding them is one of the most useful things you can learn right now. Not because you need to build one, but because you're probably already using one, and knowing how it works will change how you use it.

## What Is an AI Reasoning Model? (The Short Answer)

An AI reasoning model is an AI that works through a problem step by step before giving you an answer.

That might sound obvious. Isn't that what all AI does? No. It isn't.

Standard AI models like GPT-4o and most AI assistants you've used operate on **immediate generation**: you send a message, the model starts producing words instantly, one token after another, straight from your prompt to the response. There's no pause. No intermediate thinking. No checking.

Reasoning models do something different. Before writing a single word of their final answer, they generate a **hidden scratchpad** — a stream of internal thought that works through the problem. They try approaches, catch errors, reconsider assumptions, and build toward a conclusion. Then they produce a final answer based on that reasoning.

The technical name: **thinking tokens**.

The result: for hard problems (complex math, logic puzzles, debugging code, scientific analysis), reasoning models are dramatically more accurate than standard models. On some benchmarks, they've improved accuracy by **500% to 1000%** over previous-generation models.

For simple problems like writing an email, summarizing a document, or answering a basic question, they're overkill. Slower, more expensive, and no better than a standard model.

Knowing when to use which is the whole game.

## Why Regular AI Can't Really "Think"

To understand what reasoning models do differently, you first need to understand what a standard AI model actually is.

A standard [large language model (LLM)](/blog/what-is-a-large-language-model-llm-explained) is trained on enormous amounts of text (trillions of words) until it learns to predict the most likely next word in any sequence. When you type a message, it starts predicting what should come next, token by token, as fast as it can. It doesn't stop and reconsider. It doesn't backtrack. It doesn't say "wait, that's wrong" and start over.

It produces text. Fluently. Confidently. Continuously.

Immediate generation works brilliantly for tasks where the right answer flows naturally from patterns in language: writing, summarizing, translating, explaining concepts. It fails badly for tasks that require **multi-step logical reasoning**, where getting step 3 right depends on getting step 2 right, and getting step 2 right requires actually working through the logic rather than pattern-matching.

The classic example is math. Ask GPT-4o (without reasoning enabled) a complex math problem and it will produce an answer that *looks* correct: proper notation, logical structure, confident tone. But the actual arithmetic is often wrong, because the model isn't calculating. It's predicting what a correct-looking math answer looks like.

That's not a solvable problem with more training data. It's a structural limitation of how pure next-token prediction works. And it's what reasoning models were designed to fix.

## How Reasoning Models Actually Work

### The Thinking Scratchpad

Here is the core mechanism, explained without jargon.

When you send a message to a reasoning model, two things happen instead of one:

**Phase 1 — Thinking:** The model generates a stream of internal reasoning. It works exactly like the model's normal text generation. The model is still predicting tokens, but these tokens are treated as a private scratchpad, not a final answer. The model is essentially "talking to itself," working through the problem. It might try an approach, realize it's wrong, abandon it, try another. It might explicitly list constraints before trying to satisfy them. It might verify intermediate steps.

**Phase 2 — Answering:** Once the internal reasoning reaches a conclusion, the model produces its actual response, drawing on what it worked out in phase 1.

You usually only see phase 2. The thinking tokens are hidden. (Claude's "extended thinking" mode is an exception. It shows you the actual reasoning, which is genuinely fascinating to read. It reads like a smart person talking themselves through a hard problem, complete with self-corrections and uncertainty.)

### The Reinforcement Learning Breakthrough

Here's where it gets interesting: reasoning models aren't just prompted to think step by step. They're *trained* to reason.

Standard LLMs use a training approach called **RLHF** (Reinforcement Learning from Human Feedback), where human raters score model outputs and the model learns to produce outputs that humans prefer. RLHF produces fluent, helpful, polite responses.

Reasoning models use a different training approach: **pure reinforcement learning on outcomes**. The model is given hard problems (math competitions, coding challenges, logic puzzles) and rewarded only for getting the right final answer. It's not taught *how* to reason. It discovers reasoning strategies on its own, through trial and error, during training.

The result is something remarkable: the models develop their own reasoning techniques that often don't match anything humans were explicitly taught. They learn to decompose problems, check intermediate steps, consider edge cases, and backtrack from dead ends, because doing these things consistently produces correct answers, and correct answers are what training rewards.

OpenAI's researchers described it simply: they gave the model a goal, rewarded success, and let it figure out how to think.

### Chain of Thought — The Simpler Version

Before reasoning models existed, researchers discovered something surprising: you could dramatically improve a standard model's accuracy on hard problems by adding five words to your prompt: **"Let's think step by step."**

The technique — called **chain of thought (CoT) prompting** — works because it forces the model to generate intermediate reasoning tokens before the final answer. Those tokens act as context that guides the conclusion.

The problem: it's inconsistent, requires manual prompting, and doesn't scale reliably. You can forget to add those five words. The model might reason badly anyway.

Reasoning models internalize chain of thought. They do it automatically, at scale, trained specifically to reason well rather than just to sound reasonable. The improvement over prompted chain of thought is significant, like the difference between reminding yourself to check your work and having it become an unconscious habit.

## The Numbers: What Reasoning Models Actually Achieve

Let's get concrete. Here are real benchmark results from 2025.

### Math: AIME 2024

The American Invitational Mathematics Examination is a competition-level math test designed for the top 5% of high school students in the US. These aren't textbook problems. They require multi-step reasoning, creative insight, and zero tolerance for arithmetic errors.

| Model | AIME 2024 Score | Notes |
|---|---|---|
| GPT-4o (standard) | ~13% | Fast, general-purpose |
| GPT-4 (standard) | ~9% | Previous generation |
| **o1** | **83.3%** | OpenAI's first reasoning model |
| **DeepSeek R1** | **79.8%** | Open-source, matched o1 |
| **o3** | **96.7%** | Best performance reported |

That's not an incremental improvement. Going from 13% to 96.7% on the same problems is a qualitative leap. The difference between a model that can fake looking at math and one that can actually do it.

### Science: GPQA Diamond

GPQA Diamond is a benchmark of PhD-level science questions in biology, chemistry, and physics. Questions hard enough that domain experts only score around 65% on them.

| Model | GPQA Diamond | Notes |
|---|---|---|
| GPT-4o | 53.6% | Below human expert level |
| **o1** | **78.0%** | Surpasses human experts |
| **o3** | **87.7%** | Significantly above expert level |
| **Claude 3.7 (extended thinking)** | **84.8%** | Strong across science domains |

A model that scores 87.7% on questions that stump human PhD holders is doing something that wasn't achievable 18 months earlier.

### Software Engineering: SWE-bench Verified

SWE-bench is a benchmark of real GitHub issues: actual bugs from real software projects that developers submitted as unsolvable or difficult. The AI is given the codebase and asked to write a fix.

| Model | SWE-bench Score | Notes |
|---|---|---|
| GPT-4o | ~33% | Standard model |
| **o1** | **48.9%** | First reasoning model |
| **o3** | **71.7%** | Current benchmark leader |

Fixing 71% of real GitHub bugs, autonomously, without being told how. That's why [AI agents](/blog/what-is-an-ai-agent-explained-simply) built on reasoning models are increasingly being deployed in software development — and why [vibe coding](/blog/what-is-vibe-coding-explained) (building entire apps from plain-English prompts) actually works in 2026.

### Where Reasoning Models Still Struggle

Honesty requires including the failures.

On **ARC-AGI-2**, a benchmark designed to test novel reasoning that can't be solved through pattern-matching, even o3 scores only around 4%. The benchmark was designed to require genuine generalizable intelligence, and it's remained stubbornly resistant to reasoning models.

The lesson: reasoning models are dramatically better at hard structured problems. They remain limited at the kind of flexible, context-free, never-seen-before reasoning that humans do effortlessly. The gap is narrowing fast. But it's real.

## The Major Reasoning Models in 2026

| Model | Company | Open Source? | Standout Strength |
|---|---|---|---|
| o3 | OpenAI | No | Best overall; highest benchmark scores |
| o4-mini | OpenAI | No | Fast and cheap; strong at coding |
| DeepSeek R1 | DeepSeek | Yes (open-weight) | Free to run locally; matches o1 |
| Claude 3.7 Sonnet (extended thinking) | Anthropic | No | Transparent reasoning you can inspect |
| Gemini 2.5 Pro | Google | No | Best Google integration; strong multimodal |
| Gemini 2.0 Flash Thinking | Google | No | Fast; lower cost than Pro |
| QwQ-32B | Alibaba | Yes | Strong open-source alternative |

### A Note on DeepSeek R1

DeepSeek R1 deserves a paragraph of its own, because its January 2025 release was one of the most disruptive events in AI history.

DeepSeek is a Chinese AI company. R1 is their reasoning model. It matched or exceeded OpenAI's o1 on most benchmarks. That alone would have been notable. What made it seismic was the cost: DeepSeek reported training R1 for approximately **$6 million**. Compare that to GPT-4's estimated training cost of hundreds of millions of dollars.

The day R1's performance was confirmed, Nvidia's stock dropped **17%** in a single trading day, wiping roughly $600 billion in market cap, because investors suddenly questioned whether the massive GPU buildout powering US AI development was necessary at the scale being planned.

R1 is also open-weight: anyone can download it and run it locally, making it the only frontier-level reasoning model you can run with full privacy, on your own hardware, for free.

## Reasoning vs. Non-Reasoning: When to Actually Use Each

The most practical question. It has a clean answer.

**Use a reasoning model when:**

- You're doing **multi-step math**: anything beyond basic arithmetic
- You're **debugging code**, especially logic errors, not syntax errors
- You're analyzing a **complex document** and need to connect information across it
- You're working through a **logic puzzle or constraint problem**
- You need to verify an argument has no logical flaws
- You're doing **scientific or medical analysis** that requires precision
- You're building a workflow where **getting intermediate steps wrong cascades into a wrong final answer**

**Use a standard model when:**

- You're **writing**: emails, articles, summaries, marketing copy
- You're **brainstorming**: generating ideas, not evaluating them
- You're **asking simple questions** that have direct factual answers
- You're **having a conversation**
- You need a response **immediately** and accuracy on complex logic isn't the concern
- You're doing **any task where the output is creative rather than correct**

The mental model: if there's a definitively right answer that requires multiple steps to reach, use a reasoning model. If there's a spectrum of acceptable answers and fluency matters more than precision, use a standard model.

Using o3 to write a birthday card message is like hiring a structural engineer to hang a picture frame. Technically capable. Absurd in context.

## The Tradeoffs You Need to Know

### Speed

Reasoning models are slower. Meaningfully slower.

GPT-4o responds in under 2 seconds for most queries. o3 on a complex task can take **10 to 60 seconds**, sometimes longer. You're watching it think. For use cases where you need instant responses, latency matters.

### Cost

More thinking = more tokens = higher cost.

In OpenAI's API, o3 costs significantly more per query than GPT-4o. On a simple task, that's pure waste. On a complex task, a reasoning model that gets the right answer in one shot is cheaper than a standard model you have to prompt three times.

The economics only make sense when the task actually needs reasoning.

### The "Overthinking" Problem

Here's the counterintuitive part: reasoning models can sometimes get *worse* results than standard models on simple tasks.

Why? Because they overthink. A question with a simple, obvious answer gets subjected to deep analysis. The model considers edge cases that don't apply, introduces uncertainty where there shouldn't be any, and arrives at a muddier answer than a standard model would have produced instantly.

Researchers call it **underthinking and overthinking**. The best use of reasoning models requires some judgment about what actually deserves extended thought.

### The Thinking Budget

In OpenAI's API and increasingly in consumer products, you can set a **thinking budget**: a cap on how many tokens the model is allowed to use for internal reasoning. More budget = longer, more thorough thinking = higher accuracy on hard problems, but higher latency and cost. Less budget = faster and cheaper but less thorough.

For most users, the defaults are fine. But knowing the lever exists helps you understand why the same model can be fast or slow depending on how it's configured.

## What It Means for You

If you use [ChatGPT or Claude](/blog/chatgpt-vs-claude-for-beginners) (or Gemini) regularly, reasoning models are already available to you, often for free or at standard subscription tiers.

**In ChatGPT:** You can switch to o3 or o4-mini in the model selector. For math homework, debugging Python, or any problem where you'd otherwise re-prompt multiple times, switching to o3 often gets you there in one shot.

**In Claude:** Claude 3.7 Sonnet offers "extended thinking" mode. Toggle it on for complex problems and actually watch the reasoning happen in real time, a feature no other consumer product currently matches.

**In Gemini:** Gemini 2.5 Pro with thinking is available in Gemini Advanced and increasingly in Google Workspace.

**The practical shift:** Stop using the same model for everything. Standard models for writing, conversation, and simple questions. Reasoning models for anything that requires working through logic, debugging, or multi-step analysis. The best AI users in 2026 aren't the ones with the most expensive subscription. They're the ones who match the right tool to the task.

## A Note on What Reasoning Models Don't Fix

Reasoning models still [hallucinate](/blog/what-are-ai-hallucinations-why-ai-lies-to-you). They get facts wrong. They have knowledge cutoffs. They can't browse the internet unless given specific tools. They don't remember previous conversations.

What they've fixed is **logical consistency within a problem**: the ability to chain steps correctly. They haven't fixed the underlying issue that they're trained on text rather than grounded in verifiable reality.

Put it plainly: a reasoning model is a brilliant student who is excellent at logic but can still misremember facts. They'll derive the right answer from correct premises. But start them with a wrong premise and their impeccable reasoning will arrive at a confidently wrong conclusion.

The lesson from our [prompt engineering guide](/blog/what-is-prompt-engineering-how-to-talk-to-ai) still applies: give reasoning models accurate context and they'll do remarkable things. Give them bad inputs, and they'll reason their way to bad outputs with impressive thoroughness.

## The Bottom Line

AI reasoning models are AI systems trained to think before they answer, generating a hidden scratchpad of logic, exploration, and self-correction before producing a final response.

The result is a qualitative leap on hard problems: from 13% to 96% on competition math. From "can't debug real code" to fixing 71% of real GitHub issues autonomously. From below-human to well-above-human on PhD science questions.

The key models right now: OpenAI's o3/o4-mini, DeepSeek R1 (the open-source option), Claude with extended thinking, and Gemini 2.5 Pro. Each has different cost, speed, and capability tradeoffs.

The key rule: use them for hard, structured problems where there's a right answer and intermediate steps matter. Use standard models for everything else. The "Thinking..." pause you see in ChatGPT isn't lag. It's the most significant architectural change in AI since the transformer. Now you know what it's actually doing.

## Sources and Further Reading

- [Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) — OpenAI's original o1 technical blog post explaining the reasoning model training approach (OpenAI, September 2024)
- [OpenAI o3 and o4-mini System Card](https://openai.com/index/openai-o3-system-card/) — OpenAI's official technical disclosure for o3, including benchmark data (OpenAI, April 2025)
- [DeepSeek R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948) — DeepSeek's technical paper on R1 (arXiv, January 2025)
- [OpenAI o1 and o3 Explained: How "Thinking" Models Work — Le Wagon](https://blog.lewagon.com/skills/openai-o1-and-o3-explained-how-thinking-models-work/) — Technical walkthrough of chain-of-thought and reinforcement learning in o1/o3
- [AI Reasoning Models Explained — Backblaze](https://www.backblaze.com/blog/ai-reasoning-models-openai-o3-mini-o1-mini-and-deepseek-r1/) — Comparison of o3-mini, o1-mini, and DeepSeek R1 with benchmark data
- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) — Google Brain's original chain-of-thought prompting paper (Wei et al., arXiv, 2022)
- [GPQA: A Graduate-Level Google-Proof Q&A Benchmark](https://arxiv.org/abs/2311.12022) — The GPQA benchmark paper used to measure PhD-level science performance (arXiv, 2023)
- [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) — The software engineering benchmark (Princeton/Chicago, arXiv, 2023)
- [ARC Prize — ARC-AGI Benchmark](https://arcprize.org/) — The ARC-AGI benchmark testing genuine novel reasoning (official site)
- [What Is AI Reasoning? — IBM](https://www.ibm.com/think/topics/ai-reasoning) — IBM's overview of reasoning in AI systems
- [DeepSeek Sends Shockwaves Through AI Industry — Financial Times](https://www.ft.com/content/deepseek) — Coverage of the DeepSeek R1 release and market impact (FT, January 2025)
- [The Reasoning Revolution — Financial Content](https://markets.financialcontent.com/wral/article/tokenring-2026-1-1-the-reasoning-revolution-how-openais-o3-series-and-the-rise-of-inference-scaling-redefined-artificial-intelligence) — Analysis of how the o3 series and inference scaling redefined AI capability
