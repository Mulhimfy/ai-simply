---
name: Bolt
description: AI full-stack web app builder — describe your app in plain English and get a working prototype in the browser.
category: ai-coding
subcategory: AI App Builder
url: https://bolt.new
pricing: freemium
tags: [no-code, app-builder, full-stack, web-app, prototyping]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Builds and runs a full-stack app entirely in the browser — no local setup"
  - "You can see, edit, and run the actual code, not a black box"
  - "One-click deploy and easy iteration with follow-up prompts"
  - "Supports mainstream frameworks like React, Next.js, and Astro"
cons:
  - "Token usage burns fast, and debugging loops can drain credits"
  - "Complex or large apps still need real developer intervention"
  - "Generated code can carry bugs or dated dependency choices"
---

Bolt (bolt.new) is an AI app builder from StackBlitz that turns a plain-English prompt into a working full-stack web app — running live in your browser. It writes the code, installs npm packages, spins up a dev server, and shows a preview, all without any local setup. What makes it technically distinct is WebContainers, StackBlitz's technology that runs Node.js entirely in the browser, so the whole environment is client-side. It competes with Lovable, v0 by Vercel, and Replit's AI agent.

Unlike pure no-code builders, Bolt gives you the real project — a full file tree you can inspect, edit by hand, and export. You iterate by chatting ("add a login page," "make the header sticky"), and it modifies the codebase in place. When ready, you can deploy in one click to Netlify or connect a backend like Supabase.

That combination — natural-language building plus full code access — makes Bolt popular with non-technical founders prototyping ideas and with developers who want to skip boilerplate.

## Key Features

- Full-stack app generation from a text prompt
- In-browser Node.js environment via WebContainers (no setup)
- Automatic package installation and live preview
- Editable file tree with real, exportable code
- Iterative changes through follow-up chat prompts
- One-click deploy to Netlify and Supabase integration
- Supports React, Vue, Svelte, Next.js, and Astro

## Pricing

- **Free**: A daily token allowance for light experimentation
- **Pro (around $20/month)**: A larger monthly token pool
- **Higher tiers / Teams**: More tokens and shared workspaces for heavier use

Everything runs on tokens, and edits consume them, so budgets can move quickly during active building.

## Best For

Non-technical founders, designers, and developers who want to rapidly prototype and ship a full-stack web app from an idea without configuring a local environment.

## Limitations

Token consumption is the main gotcha — a stubborn bug can trigger repeated regenerations that eat your allowance fast. Bolt is strongest for prototypes and small apps; larger, production-grade projects will hit its limits and need a developer to take over the generated code, which sometimes ships with bugs or non-ideal dependencies.
