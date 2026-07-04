---
name: Aider
description: Open-source terminal AI pair programmer that edits code across files and commits changes to git for you.
category: ai-coding
subcategory: AI Code Editor
url: https://aider.chat
pricing: free
tags: [coding, terminal, open-source, claude, gpt-4, pair-programming]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Free and open-source, bring your own model key"
  - "Automatic, well-labeled git commits per change"
  - "Works with Claude, GPT, and local models"
  - "Repo map gives it context without indexing services"
cons:
  - "Terminal-only, no graphical editor"
  - "You pay per-token API costs, which add up"
  - "Steeper setup than a plug-in IDE assistant"
---

Aider is an open-source command-line tool that turns a terminal session into an AI pair-programming loop. You point it at a git repository, describe a change in plain English, and it edits the relevant files and commits the result with a descriptive message. Because every change is a git commit, the edit history stays clean and reviewable — you can inspect diffs, undo, or branch as you would with any human collaborator.

Unlike Cursor or Windsurf, Aider has no editor of its own; it lives in the terminal alongside whatever editor you already use. It is model-agnostic: connect an Anthropic Claude key, an OpenAI key, or a local model, and Aider handles the prompting. Its "repo map" builds a compact picture of your codebase so the model gets relevant context without a heavyweight indexing backend. That combination has made it a favorite among developers who want control and transparency over convenience.

## Key Features

- Natural-language edits applied across multiple files
- Automatic git commits with generated commit messages
- Works with Claude, GPT, and local/open models via your own API key
- Repo map for codebase context without a separate index
- Voice-to-code input mode
- Runs anywhere a terminal and Python do

## Pricing

- **Free**: The tool itself is open-source and free; you pay only for the LLM API tokens it consumes (or nothing if you run a local model)

## Best For

Terminal-centric developers who want an AI assistant that makes coordinated, version-controlled changes without locking them into a proprietary IDE, and anyone who wants to choose their own model and control costs directly.

## Limitations

There is no graphical interface, so the workflow assumes comfort with the command line and git. API usage is billed per token by your model provider, which can get expensive on large tasks, and initial setup — keys, model selection, config — takes more effort than installing a one-click IDE extension.
