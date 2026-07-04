---
name: LMSYS Chatbot Arena
description: Free platform to compare AI models head-to-head — blind tests with real user votes to rank the best LLMs.
category: others
subcategory: AI Benchmarking
url: https://chat.lmsys.org
pricing: free
tags: [benchmarking, model-comparison, research, llm, open-source]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Blind voting removes brand bias — you rank the answer, not the logo"
  - "The most cited public leaderboard for real-world model quality"
  - "Free access to dozens of frontier and open-source models in one place"
  - "Open preference dataset that researchers can study and reuse"
cons:
  - "Human-preference ranking rewards style and can miss factual accuracy"
  - "Rankings can be gamed and shift with the voter population"
  - "Not a substitute for task-specific benchmarks or your own testing"
---

LMSYS Chatbot Arena (now run under LMArena) is a research platform where you type one prompt and get answers from two anonymous models side by side, then vote for the better response. Only after voting are the model names revealed. Those millions of pairwise votes feed an Elo-style rating system that produces the Arena leaderboard — the ranking that labs, journalists and developers most often cite when arguing which model is actually best in practice.

It started as a project from UC Berkeley's LMSYS group (the same team behind Vicuna and the MT-Bench evaluation). What makes it different from static benchmarks like MMLU or the Hugging Face Open LLM Leaderboard is that scores come from real humans reacting to real prompts, so it captures things automated tests miss — tone, instruction-following, refusals. The arena hosts frontier models like GPT, Claude and Gemini alongside dozens of open-source LLMs.

## Key Features

- Blind, side-by-side "battle" mode with post-vote reveal
- Elo/Bradley-Terry leaderboard built from human preference votes
- Direct chat access to dozens of proprietary and open models
- Category leaderboards (coding, math, long queries, hard prompts)
- Publicly released preference and conversation datasets for research
- Free to use, no account required for basic voting and chat

## Pricing

- **Free**: Full access to voting, side-by-side battles, and the leaderboard at no cost.

## Best For

Researchers, developers and AI enthusiasts who want a quick, brand-neutral read on how models compare on everyday prompts, and a place to try many models without juggling separate accounts.

## Limitations

Because ratings reflect human preference, they can reward confident, well-formatted answers over correct ones, and a model can rank highly while still hallucinating. The leaderboard is also sensitive to who is voting and has faced criticism over possible gaming and private test variants. Treat it as one strong signal, not the final word — pair it with domain benchmarks and your own evaluation.
