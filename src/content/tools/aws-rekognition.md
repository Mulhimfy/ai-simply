---
name: Amazon Rekognition
description: AWS cloud AI for image and video analysis — face detection, object recognition, and content moderation via API.
category: ai-vision
subcategory: AI Face Recognition
url: https://aws.amazon.com/rekognition
pricing: freemium
tags: [aws, cloud, face-recognition, content-moderation, enterprise, api]
featured: false
pubDate: 2026-03-31
updatedDate: 2026-07-04
pros:
  - "Fully managed — no model training or ML infrastructure to run"
  - "Scales from a handful of images to billions with pay-per-use pricing"
  - "Deep integration with S3, Lambda, and the wider AWS stack"
  - "Broad feature set: faces, objects, text, moderation, PPE, custom labels"
cons:
  - "Costs add up quickly at high volume, especially for video"
  - "Face recognition raises privacy and regulatory concerns"
  - "Accuracy on faces has drawn bias criticism in past studies"
  - "Locks you into the AWS ecosystem"
---

Amazon Rekognition is AWS's managed computer vision service. You send it an image or video via API and it returns structured analysis — objects and scenes, faces and facial attributes, text (OCR), unsafe or explicit content, and even personal protective equipment on workers. Because it is fully managed, developers get production computer vision without training models or provisioning GPUs.

It competes with Google Cloud Vision and Microsoft Azure AI Vision, and its main advantage is tight coupling with the rest of AWS: images in S3, event triggers via Lambda, and results into DynamoDB or downstream pipelines. Rekognition Custom Labels also lets teams train a domain-specific detector (a particular product defect, logo, or part) on their own images without ML expertise.

Face recognition is its most powerful and most scrutinized capability. Amazon paused police use of the face-matching feature in 2020 amid accuracy and bias concerns, and it remains sensitive to regulation, so many teams use only the non-identifying features (object detection, moderation, text).

## Key Features

- Object, scene, and activity detection in images and video
- Face detection, comparison, and searchable face collections
- Text detection and extraction (OCR) from images
- Content moderation for unsafe or explicit media
- PPE detection for workplace safety monitoring
- Custom Labels — train a detector on your own images, no code
- Streaming and stored video analysis with per-minute pricing

## Pricing

- **Free Tier**: 5,000 images/month and limited video for the first 12 months
- **Pay-as-you-go**: Image analysis around $0.001 per image ($1 per 1,000), with volume discounts at higher tiers
- **Video**: Priced per minute of footage analyzed; Custom Labels billed separately for training and inference hours

## Best For

Developers and enterprises already on AWS who need scalable image and video analysis — content moderation for user uploads, identity verification, media tagging, and automated safety or compliance workflows.

## Limitations

Per-image pricing looks cheap but compounds fast at scale, and video analysis in particular can get expensive. Face recognition carries real privacy, bias, and regulatory baggage, so many organizations avoid the identity features entirely. It is also AWS-native — moving off it later means re-integrating a different vision API.
