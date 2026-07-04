---
name: DeepSeek
description: Powerful open-weight AI from China — competitive with frontier models at a fraction of the cost.
category: ai-chatbot
subcategory: AI Chatbot
url: https://chat.deepseek.com
pricing: freemium
tags: [open-source, reasoning, coding, china, free]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Free web chat with strong coding and math performance"
  - "Open-weight models (MIT license) you can self-host or fine-tune"
  - "API pricing is a small fraction of comparable US frontier models"
  - "R1 shows its full chain-of-thought reasoning step by step"
cons:
  - "Data is processed in China, a privacy and compliance concern for many"
  - "Content moderation reflects Chinese regulations on sensitive topics"
  - "Web service has had capacity outages during demand spikes"
---

DeepSeek is a Chinese AI lab whose DeepSeek-V3 and DeepSeek-R1 models drew global attention for matching much pricier American models on reasoning, coding, and math benchmarks — while being released as open weights under an MIT license. The January 2026 launch of R1 was a genuine shock to the market, briefly rattling AI stock prices because it showed frontier-level reasoning could be trained far more cheaply than assumed.

Two models matter most. V3 is a large mixture-of-experts model for general chat and coding. R1 is a reasoning model that "thinks" through problems step by step, similar to OpenAI's o-series and DeepSeek's answer to models that show their work. Because the weights are open, developers can download, self-host, and fine-tune them rather than being locked to an API.

The trade-off is jurisdiction: the hosted app and API run on infrastructure in China, so data handling and content moderation follow Chinese rules. Many teams therefore run the open weights on their own servers instead of using DeepSeek's cloud.

## Key Features

- DeepSeek-R1 reasoning model with visible chain-of-thought
- DeepSeek-V3 for general chat and coding
- Open weights under a permissive MIT license
- Very low API pricing versus US frontier providers
- Self-hosting and fine-tuning for full data control
- Free web and mobile chat interface

## Pricing

- **Free**: Web and app chat, subject to occasional capacity limits
- **API**: Pay-per-token pricing that is dramatically cheaper than OpenAI or Anthropic, with off-peak discounts
- **Self-hosted**: Free to run the open weights on your own hardware (you pay only compute)

## Best For

Developers, researchers, and cost-conscious teams who want strong coding and reasoning without frontier-model prices — especially those able to self-host to sidestep data-residency concerns.

## Limitations

The biggest catch isn't quality but governance: using the hosted service means sending data to servers in China, and responses are moderated per Chinese regulations, which rules it out for many regulated or privacy-sensitive uses. For those cases, running the open weights yourself is the safer path.
