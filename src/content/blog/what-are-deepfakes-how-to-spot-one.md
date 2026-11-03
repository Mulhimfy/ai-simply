---
title: "What Are Deepfakes? How AI Fakes Reality (And How to Spot One)"
seoTitle: "What Are Deepfakes? And How to Spot One"
description: "Deepfakes cost one company $25 million. Here's exactly what deepfakes are, how AI makes them, and how to spot one before it fools you."
pubDate: 2026-03-13
updatedDate: 2026-03-13
heroImage: "../../assets/deepfakes.jpg"
category: "ai-explained"
tags: ["deepfakes", "what are deepfakes", "how to spot a deepfake", "deepfake detection", "deepfake examples", "are deepfakes illegal", "deepfake scams", "voice cloning", "AI generated video", "how are deepfakes made", "deepfake tools", "AI fraud", "AI explained", "synthetic media", "ai-explained"]
readingTime: "12 min read"
faqs:
  - question: "What are deepfakes?"
    answer: "Deepfakes are AI-generated videos, images, or audio recordings that make a real person appear to say or do something they never actually said or did. The word combines 'deep learning' (the AI technique used) with 'fake.' They range from swapping one face onto another person's body in a video, to cloning someone's voice from just a few seconds of audio. The technology has advanced so fast that many deepfakes are now indistinguishable from real footage to the human eye."
  - question: "How can you tell if a video is a deepfake?"
    answer: "Look for unnatural blinking (too rare or too frequent), skin that looks waxy or overly smooth, hair that moves as a single mass rather than individual strands, teeth that appear as one white block, inconsistent lighting or shadows that don't match the background, and lip movements that are slightly out of sync with the audio. The edges of the face — especially where hair meets the forehead — often blur or shimmer. For audio deepfakes, listen for robotic breathing, unnatural pauses, or a voice that sounds slightly too perfect. However, state-of-the-art deepfakes in 2026 defeat most of these checks. No visual method is reliable for high-quality fakes — use detection tools instead."
  - question: "Are deepfakes illegal?"
    answer: "It depends on what the deepfake depicts and where you are. Non-consensual sexual deepfakes are illegal in 46 US states and federally under the DEFIANCE Act. Using deepfakes to commit fraud or impersonate someone for financial gain is criminal in most jurisdictions. The EU AI Act (fully enforced from August 2, 2026) requires all AI-generated content to be labeled as such — violations carry fines up to €35 million or 7% of global annual turnover. Political deepfakes are regulated in 26 US states. However, satirical or clearly labeled deepfakes remain legal in most places."
  - question: "What is a deepfake example?"
    answer: "The most famous real-world examples: In early 2024, British engineering firm Arup lost $25 million when an employee was tricked into wiring funds during a video call with deepfake versions of company executives. In January 2024, AI-generated explicit images of Taylor Swift spread across X (Twitter), viewed 45 million times in 17 hours before being taken down. In March 2026, the Republican National Senatorial Committee released a deepfake video of Democratic Senate candidate James Talarico, marking the first use of a candidate deepfake in the 2026 US midterms."
  - question: "How are deepfakes made?"
    answer: "Most deepfakes use one of three AI techniques: face-swapping (an AI maps one person's facial movements onto another's body in video), diffusion models (the same technology behind DALL-E and Stable Diffusion, which generates entirely new images of a person in any setting from a dataset of their photos), or voice cloning (an AI learns someone's voice patterns from as little as 3 seconds of audio and can generate speech in their voice saying anything). All three methods are now accessible to non-experts through consumer apps and open-source software."
  - question: "Can deepfakes be detected by AI?"
    answer: "Yes, but imperfectly. Intel's FakeCatcher detects deepfakes with 96% accuracy by analyzing subtle blood flow changes in the skin (real faces have slight color variations from blood pumping — AI faces do not). Other tools include Microsoft's Video Authenticator, Hive Moderation, and free tools like Deepware Scanner. The C2PA Content Credentials standard, backed by Adobe, Google, and Microsoft, embeds tamper-evident metadata in authentic media so viewers can verify a file's provenance. However, detection and creation are in an arms race: as detectors improve, so do the fakes."
  - question: "What is the deepfake voice scam?"
    answer: "Voice deepfake scams use AI-cloned voices to impersonate a family member or colleague in distress. In the 'virtual kidnapping' version, you receive a call and hear what sounds exactly like your child or grandchild crying and asking for help. Scammers can clone a voice from as little as 3 seconds of audio pulled from social media. 1 in 4 Americans reported receiving a deepfake voice call in 2026. To protect yourself: establish a secret family codeword, always hang up and call back on a number you trust, and never transfer money or gift cards based on an emergency call alone."
  - question: "What is the difference between a deepfake and a cheap fake?"
    answer: "A deepfake uses AI to synthetically generate or replace content — a face, voice, or entire scene. A 'cheap fake' uses simple editing techniques like slowing down footage, cutting clips out of context, or using basic video editing — no AI required. Cheap fakes are often more dangerous in practice because they're faster to produce and harder to classify as 'fake' under existing laws. The Nancy Pelosi 'drunk' video of 2019 was a cheap fake — the video was just slowed down to make her speech slurred. Deepfakes are technically sophisticated; cheap fakes are deceptively simple."
---

Your phone rings. It's your son's number. You answer, and there he is: his voice, his accent, the specific way he says "Mum" — telling you he's been in a car accident, he needs $3,000 wired immediately, please don't call the police.

He's not there. He never called. The voice is fake.

This isn't a hypothetical. It's happening right now. 1 in 4 Americans have received a deepfake voice call in the past year. And it's the least sophisticated version of what deepfake technology can do.

Here's everything you need to know: what deepfakes actually are, how they're made, what's already happened, and how to protect yourself.

## What Are Deepfakes? (The Plain English Definition)

**A deepfake is AI-generated media (video, audio, or image) that makes a real person appear to say or do something they never actually did.**

The word is a mashup of "deep learning" (the AI technique involved) and "fake." The output can be:

- A video of a political figure saying something they never said
- A voice clone of your CEO on a phone call ordering a wire transfer
- An explicit image of a celebrity who never posed for it
- A video call where every person on screen is an AI-generated replica of a real colleague

What separates deepfakes from older photo manipulation is **scale and accessibility**. A Hollywood studio once needed months and millions of dollars to convincingly put one actor's face on another's body. Today, consumer apps do it in minutes. Voice can be cloned from 3 seconds of audio. The technology that took a decade to develop in labs is now in the hands of anyone with a laptop.

## How Deepfakes Are Made (Without the Jargon)

There are three main methods, and they're converging into tools that require zero technical skill.

### Method 1: Face Swapping

The original deepfake technique. An AI maps one person's facial movements (eyes, mouth, nose, expressions) onto another person's body in a video.

Two neural networks are trained on thousands of images of both the source face and target face. The first learns to encode faces as patterns. The second learns to reconstruct them. By swapping the encoders, the AI can take every frame of a video and replace one face with another while preserving the original person's head movements and background.

Early face swaps were obvious: blurry edges, wrong skin tones, frozen expressions. Modern versions are seamless.

### Method 2: Diffusion Models

This is the same underlying technology behind [generative AI image tools](/blog/what-is-generative-ai/) like DALL-E and Stable Diffusion, but trained on photos of a specific person to generate entirely new images of them in any pose, setting, or context.

Feed the model 20–50 photos of someone. Train it using a technique called LoRA (Low-Rank Adaptation). The model learns their face so precisely it can then generate photorealistic images of them doing things they never did, in places they've never been.

This is how the Taylor Swift images were created. This is how explicit deepfakes are made at scale.

### Method 3: Voice Cloning

The most accessible and fastest-moving category. AI voice models learn the unique acoustic fingerprint of a voice (its pitch, cadence, accent, rhythm) and can reproduce it saying anything.

**The threshold for cloning has collapsed.** In 2022, you needed 30 minutes of clean audio. In 2024, quality voice clones were generated from under 10 seconds. By 2026, credible clones are achievable from 3 seconds of audio: a voicemail greeting, a social media clip, a YouTube video.

The result: anyone's voice, saying anything, in real time.

## The Numbers Are Worse Than You Think

The deepfake problem has moved from "emerging threat" to "active crisis" faster than almost anyone predicted.

- **500,000** deepfake files existed online in 2023. By 2025, that number hit **8 million**, a **900% increase** in two years.
- Deepfake fraud attempts increased **3,000% in 2023** alone.
- Businesses lost an average of **$500,000 per deepfake-related incident** in 2024.
- AI-enabled fraud losses in the US are projected to climb from $12.3 billion in 2023 to **$40 billion by 2027**.
- Only **0.1% of people** correctly identified all fakes and real media in an iProov 2025 study.
- Human detection accuracy for high-quality deepfake video: **24.5%**, worse than a coin flip.

The detection gap is real: the people creating deepfakes improve faster than the average person's ability to spot them.

## Real Cases That Show What's At Stake

These aren't theoretical risks. They've already happened.

### The $25 Million Video Call (Arup, 2024)

In early 2024, an employee at Arup (one of Britain's largest engineering firms) received a message about a confidential transaction. Suspicious, he joined a video call with what appeared to be multiple senior colleagues, including the CFO, all of whom vouched for the instruction.

Every person on that call was a deepfake.

He transferred **$25.6 million** across 15 transactions before realizing the call was fake. The investigation is ongoing. No funds have been recovered.

The employee said he only realized something was wrong after contacting the UK head office directly. Everything on the call matched his real colleagues: the faces, the voices, the mannerisms.

### Taylor Swift (January 2024)

AI-generated explicit images of Taylor Swift circulated on X (formerly Twitter) in January 2024. They received **45 million views, 24,000 reposts, and hundreds of thousands of likes** before being removed, 17 hours after they first appeared.

The incident forced a public debate that had been avoided for years. Within days, bipartisan senators introduced the DEFIANCE Act. The White House called it "alarming." Swift herself did not publicly address it.

### The 2026 Midterm Elections

On March 11, 2026, the Republican National Senatorial Committee published an AI deepfake video of Democratic Senate candidate James Talarico in Texas. It shows a realistic AI version of Talarico speaking directly to camera for over a minute, saying things he never said.

CNN called it "the first example of a phony version of a candidate talking in a lifelike manner for so long."

26 US states now have laws regulating political deepfakes. Texas has one of the strictest — but it only activates within 30 days of an election. The video was published 8 months before polling day.

### The Grandparent Voice Scam

A woman in Lafayette, Louisiana, received a call in early 2025. It was her grandson's voice — the exact voice, the exact way he spoke — saying he was in trouble and needed $60,000. She wired it.

This is the "virtual kidnapping" scam, now powered by AI voice cloning. It works because scammers harvest voice audio from social media, YouTube, or voicemail greetings and clone it in seconds. They then call elderly relatives with fabricated emergencies.

**1 in 4 Americans** say they've now received a deepfake voice call. Among those who believed the voice and sent money, **77% lost funds** they never recovered.

## How to Spot a Deepfake (What to Look For)

Visual detection is unreliable for high-quality fakes in 2026. But these signs still flag lower-quality deepfakes — and knowing them helps calibrate your suspicion.

### Video Deepfakes: What to Check

**The eyes:** Real humans blink every 2–10 seconds spontaneously. AI faces often stare without blinking for unnaturally long periods, or blink at mechanically regular intervals.

**The skin:** Deepfake skin tends to look waxy — too smooth, lacking pores and fine texture visible in real 4K footage. In bright light, the texture appears painted rather than natural.

**The hair:** Hair in deepfakes often moves as a single solid mass rather than individual strands. Edges where hair meets the forehead or neck frequently blur or shimmer, especially in motion.

**The edges of the face:** Watch the jawline, ears, and hairline when the subject turns their head. Profile shots — where the face moves to the side — expose most deepfake models because they train primarily on frontal data.

**Teeth:** Often rendered as a single white block without individual definition or natural spacing.

**Lighting consistency:** AI often ignores physics. Check whether shadows on the face match the light source in the background. Inconsistency is a red flag.

**Lip sync:** A delay of even 100 milliseconds between mouth movement and audio is detectable. Watch for lips that are slightly ahead of or behind the speech, or that don't form consonants correctly.

### Audio Deepfakes: What to Listen For

**Breathing:** AI audio inserts breath sounds at syntactically wrong moments, or loops identical breath sounds at regular intervals. Natural breathing is irregular.

**Emotional flatness:** Voice clones often capture the pitch and accent of a voice but miss its emotional texture. A stressed or excited voice clone sounds slightly too controlled.

**Background audio mismatch:** If someone is supposedly calling from a car or outdoors but the audio sounds studio-clean, that's a flag.

**Over-perfect pronunciation:** Human speech has subtle imperfections — stumbles, natural emphasis, slight distortion on hard consonants. Cloned voices can sound slightly too precise.

### The Most Reliable Check

**Context, not content.** If a video or audio message is asking you to do something urgent and financial — transfer money, share credentials, send gift cards — treat that as an automatic red flag regardless of how real it looks. The sophistication of the medium doesn't change the mechanics of the scam.

Call back independently. Don't use the number they called from. Don't trust the face on the screen.

## Deepfake Detection Tools (What Actually Works)

The most reliable detection is AI detecting AI. Here are the tools worth knowing:

**Intel FakeCatcher** — Currently the most accurate commercial deepfake detector. It analyzes subtle blood flow changes in skin (real faces have tiny color variations from circulation — synthetic faces don't). Achieves **96% accuracy**. A free demo is available.

**Deepware Scanner** — Free online tool. Upload a video and it runs multiple AI detection models against it. Works best for common deepfake methods. Accuracy 80–88%.

**Hive Moderation** — API-based platform used by large content platforms. High-throughput, scans large volumes. Better suited for platforms than individuals.

**Microsoft Video Authenticator** — Assigns a manipulation probability score to video content. Highlights specific regions of a frame where manipulation is most likely. Built for verification teams.

**C2PA Content Credentials** — A provenance standard backed by Adobe, Google, Microsoft, Meta, BBC, and OpenAI. Embeds tamper-evident metadata into authentic media at the moment of creation — like a digital chain of custody. Browser extensions can read this metadata. If a file has Content Credentials, you can verify whether it was captured by a real camera or generated by AI. This is the long-term solution — but only works on content that opted in at the source.

**The honest caveat:** Detection and creation are in a direct arms race. Intel's 96% accuracy was measured against known deepfake methods. Novel techniques specifically designed to evade detection reduce that number. No tool is infallible. Treat detection as a probability signal, not a verdict.

## Are Deepfakes Illegal?

**Yes — for specific uses, in specific places.** The law is catching up, but patchwork is an understatement.

### United States

**Non-consensual sexual deepfakes:** The DEFIANCE Act, introduced in 2024 following the Taylor Swift incident, creates a federal civil cause of action. Victims can sue creators, distributors, and anyone who knowingly hosts non-consensual explicit deepfakes. Statutory damages reach $150,000 — up to $250,000 when linked to sexual assault, stalking, or harassment. 46 states now have their own laws.

**Political deepfakes:** 26 states regulate AI-generated political content. Laws vary — some require disclosure labels, some ban deepfakes within 30 or 60 days of an election, some criminalize intent to deceive. There is no federal law yet.

**Fraud:** Using a deepfake to impersonate someone for financial gain is prosecutable under existing wire fraud, identity theft, and computer fraud statutes. The Arup case, for example, is a straightforward criminal fraud case regardless of the technology used.

**No federal AI law:** The US still has no single comprehensive federal AI legislation. Regulation is fragmented across state laws, federal agency guidance, and voluntary standards.

### European Union

The **EU AI Act** reaches full enforcement on **August 2, 2026**. It requires:

- All AI-generated or manipulated images, audio, and video to be clearly labeled as artificially generated
- Deployers to disclose synthetic content at first interaction
- Machine-readable labeling of deepfakes so detection systems can flag them

**Penalties:** Up to **€35 million** or **7% of global annual turnover** — whichever is higher.

This is the most comprehensive deepfake regulation in the world. It applies to any organization doing business in the EU, regardless of where they're based.

### Practical Reality

The law is 2–3 years behind the technology, enforcement is difficult across borders, and creation tools are globally distributed and increasingly open source. Legal deterrence exists but is not a reliable protection. Personal defense — skepticism, verification habits, family codewords — matters more than waiting for the law to catch up.

## How to Protect Yourself and Your Family

These are the actions that actually work:

**Create a family codeword.** A word or phrase only real family members know. If you receive an emergency call from a "family member," ask for the codeword before doing anything. Scammers can clone a voice but can't know a secret they were never told.

**Always call back on a known number.** If someone contacts you with an urgent request — whether by phone, video, or message — hang up and call them back using a number you independently know (from your contacts, not the number they called from). Takes 30 seconds. Defeats the scam.

**Lock down your social media voice samples.** Public videos, voice notes, and reels are how scammers harvest source audio. Private accounts and limited public audio reduce your cloneability.

**Be skeptical of urgency.** Deepfake scams always involve urgency — "don't tell anyone," "I need it now," "don't call the police." Real emergencies can withstand a 2-minute verification call.

**Check Content Credentials.** For images and videos from news sources, look for the Content Credentials icon (a small "CR" symbol) in supported apps like Adobe, LinkedIn, and major browsers. It shows the provenance chain.

**Verify before you share.** AI-generated political content is flowing faster than fact-checkers can track in the 2026 election cycle. Before sharing a shocking video of a politician, check whether it has been independently verified by a news outlet. If only one source has it, treat it with suspicion.

The broader context matters here too. [AI's erosion of privacy](/blog/how-ai-is-eroding-your-privacy/) extends well beyond deepfakes — the data pipelines that enable voice cloning and face mapping start with the personal information already circulating about you online. Understanding that landscape helps you see deepfakes as one part of a larger picture.

[Predictive AI surveillance](/blog/predictive-ai-surveillance-stops-watching-starts-deciding/) uses similar pattern-recognition technology to track and classify people in real time. Deepfakes are surveillance technology's dark mirror: instead of watching you, they impersonate you.

## The Honest Assessment: How Bad Does It Get?

The trajectory is uncomfortable.

A University of Buffalo researcher predicted in late 2025 that 2026 would be "the year you get fooled by a deepfake." Voice cloning has crossed what researchers call the "indistinguishable threshold" — where average listeners can no longer tell the difference between real and cloned voices.

The 2026 US midterms are already seeing deepfake candidates. By 2027, AI fraud losses in the US alone are projected to exceed $40 billion.

At the same time, the technical response is accelerating. Intel's blood-flow analysis, C2PA provenance chains, and YouTube's newly-launched deepfake detection tool for politicians and journalists represent a genuine counter-movement. The EU AI Act creates compliance pressure on the largest platforms. State laws are multiplying.

The realistic near-term outcome is not "deepfakes defeated" or "deepfakes win." It's an ongoing arms race, with growing public skepticism filling the gap between what detection tools can do and what the average person encounters.

**The skill that matters most isn't spotting deepfakes. It's verifying the context they arrive in.** A stunning video that arrives via an anonymous share, attached to an urgent request, from a source you've never heard of — doesn't need AI detection tools. It needs the same healthy suspicion you'd apply to any unsolicited claim.

[AI hallucinations](/blog/what-are-ai-hallucinations-why-ai-lies-to-you/) taught us that AI can be confidently wrong. Deepfakes teach us that AI can be convincingly fake. Both require the same response: verify independently before you trust, share, or act.

## The Bottom Line

**A deepfake is AI-generated media — video, voice, or image — that makes a real person appear to say or do something they never did.**

The technology uses deep learning: face-swapping, diffusion models, and voice cloning — all now accessible to non-experts at minimal cost. In 2026, deepfakes are flooding the 2026 US midterms, draining business accounts, cloning family members' voices in real time, and generating explicit images of people without their consent.

Detection is hard. Human accuracy is 24.5% for high-quality fakes. The best AI tools reach 96% but are in an arms race with creators.

The protections that work: a family codeword, always calling back on a number you trust, and defaulting to skepticism when urgency and money appear together.

The laws are coming — the EU AI Act, the DEFIANCE Act, 26 state election laws — but enforcement is 2–3 years behind the technology.

You will encounter a deepfake this year. The question is whether you'll recognize the situation before you act on it.

---

## Sources and Further Reading

- [Deepfake Statistics & Trends 2026](https://keepnetlabs.com/blog/deepfake-statistics-and-trends) — Keepnet Labs: Comprehensive statistics including 900% growth rate and $500K average business loss per incident
- [Deepfake Statistics 2025: The Data Behind the AI Fraud Wave](https://deepstrike.io/blog/deepfake-statistics-2025) — DeepStrike: 3,000% increase in fraud attempts, 8 million deepfakes online by 2025
- [2026 Will Be the Year You Get Fooled by a Deepfake](https://fortune.com/2025/12/27/2026-deepfakes-outlook-forecast/) — Fortune / University of Buffalo researcher prediction; voice cloning crossing the indistinguishable threshold
- [A Deepfake CFO Tricked Arup in $25 Million Fraud](https://fortune.com/europe/2024/05/17/arup-deepfake-fraud-scam-victim-hong-kong-25-million-cfo/) — Fortune: Full account of the Arup video call fraud
- [Cybercrime: Lessons Learned from a $25M Deepfake Attack](https://www.weforum.org/stories/2025/02/deepfake-ai-cybercrime-arup/) — World Economic Forum: Analysis of the Arup case and corporate defense implications
- [Republicans Release AI Deepfake of James Talarico](https://us.cnn.com/2026/03/13/politics/james-talarico-ai-deepfake-republicans-midterms) — CNN Politics: First use of candidate-likeness deepfake in 2026 US midterms
- [State of the Call 2026: AI Deepfake Voice Calls Hit 1 in 4 Americans](https://natlawreview.com/press-releases/state-call-2026-ai-deepfake-voice-calls-hit-1-4-americans-consumers-say) — National Law Review / Hiya research: 2026 voice deepfake prevalence data
- [Scammers Using Deepfakes — Losses Could Reach $16B by Late 2026](https://moneywise.com/news/scammers-are-using-deepfakes-to-mimic-your-familys-face-and-voice-and-losses-could-reach-16b-by-late-2026-can-you-spot-it-before-its-too-late) — Moneywise: Family emergency scam mechanics and financial projections
- [DEFIANCE Act — US Senate Judiciary Committee](https://www.judiciary.senate.gov/press/releases/durbin-graham-klobuchar-hawley-introduce-defiance-act-to-hold-accountable-those-responsible-for-the-proliferation-of-nonconsensual-sexually-explicit-deepfake-images-and-videos) — Official Senate press release: Full text of DEFIANCE Act provisions and penalties
- [EU AI Act — Article 50: Transparency Obligations](https://artificialintelligenceact.eu/article/50/) — Official EU AI Act text: Deepfake disclosure requirements and enforcement timeline
- [Deepfake Disclosure & the EU AI Act: Is Your Brand Compliant?](https://www.aiipprotection.org/news/eu-ai-act-deepfake-disclosure-compliance.php) — AI IP Protection: August 2026 compliance deadline and penalty structure
- [Intel FakeCatcher — Trusted Media Deepfake Detection](https://www.intel.com/content/www/us/en/research/trusted-media-deepfake-detection.html) — Intel Research: Blood flow analysis methodology and 96% accuracy benchmark
- [How to Detect Deepfakes in 2026](https://www.missioncloud.com/blog/how-to-detect-deepfakes-in-2026) — Mission Cloud: Visual detection guide and tool comparison
- [Detect DeepFakes — MIT Media Lab](https://www.media.mit.edu/projects/detect-fakes/overview/) — MIT: Academic research on human detection rates and model vulnerability
- [C2PA Content Credentials — Official Specification](https://c2pa.org/) — Coalition for Content Provenance and Authenticity: Technical standard for media provenance
- [Deepfake Face Deepfakes: A Comprehensive Review](https://arxiv.org/html/2502.09812v1) — arXiv (2025): Academic survey of face synthesis methods including diffusion-based approaches
- [Tracker: State Legislation on Deepfakes in Elections](https://www.citizen.org/article/tracker-legislation-on-deepfakes-in-elections/) — Public Citizen: Live tracker of all 26 state deepfake election laws
