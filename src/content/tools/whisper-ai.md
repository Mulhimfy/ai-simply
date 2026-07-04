---
name: OpenAI Whisper
description: Open-source speech recognition model that transcribes audio in ~99 languages with high accuracy.
category: ai-voice
subcategory: AI Speech-to-Text
url: https://openai.com/research/whisper
pricing: free
tags: [transcription, speech-to-text, open-source, multilingual, accuracy]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Open-source and free to run locally with no per-minute cost"
  - "Strong accuracy across accents, noise, and ~99 languages"
  - "Can translate speech from other languages into English"
  - "Huge ecosystem of forks (whisper.cpp, faster-whisper) and apps built on it"
cons:
  - "No built-in speaker diarization (who-said-what)"
  - "Larger models need a decent GPU for fast local transcription"
  - "Can hallucinate text on silence or very noisy segments"
---

Whisper is OpenAI's automatic speech recognition (ASR) system, released as open source in 2022 under a permissive MIT license. It was trained on around 680,000 hours of multilingual audio, which is why it holds up so well on accents, background noise, and technical vocabulary. It has effectively become the default transcription engine of the AI era — a large share of transcription apps, meeting-note tools, and captioning services run some flavor of Whisper under the hood.

There are two ways to use it. You can download the model and run it locally for free (weights come in sizes from tiny to large, trading speed for accuracy), or call OpenAI's hosted Whisper API and pay per minute for convenience and scale. Community forks like whisper.cpp (CPU-optimized) and faster-whisper (CTranslate2-based) make local use dramatically faster than the original Python implementation.

Beyond transcription, Whisper can translate speech from any supported language directly into English text.

## Key Features

- Transcription across roughly 99 languages
- Robust to background noise, accents, and cross-talk
- Speech-to-English translation built in
- Word- and segment-level timestamps
- Multiple model sizes (tiny through large) for speed/accuracy trade-offs
- Runs fully offline locally, or via the OpenAI API

## Pricing

- **Open-source**: Free to download and run on your own hardware
- **OpenAI API**: Around $0.006 per minute of audio for the hosted endpoint

## Best For

Developers building transcription or captioning into apps, researchers batch-processing audio, and privacy-conscious users who want accurate speech-to-text they can run entirely offline.

## Limitations

Out of the box Whisper doesn't tell you who is speaking — diarization requires bolt-on tools like pyannote. The most accurate large models want a GPU to run at reasonable speed locally, and on silent or very noisy stretches Whisper can occasionally "hallucinate" phantom phrases. For polished, ready-to-use products with speaker labels and editing, a managed service like Otter or Descript may be less work than wiring up Whisper yourself.
