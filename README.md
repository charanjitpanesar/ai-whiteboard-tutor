# TutorCanvas — AI Whiteboard Tutor

TutorCanvas turns a topic into a structured, narrated whiteboard lesson. Gemini generates the lesson plan and timed visual actions, while a deterministic browser timeline keeps the board, narration, and playback controls synchronized.

## Live demo

[Open TutorCanvas](https://ai-whiteboard-tutor-ten.vercel.app/)

## Features

- Real Gemini-generated lessons with learning objectives and timed drawing actions
- SVG whiteboard with text, equations, shapes, arrows, lines, and highlights
- Browser voice narration synchronized to each lesson segment
- Play, pause, resume, seek, restart, replay, and mute controls
- Context-aware follow-up questions
- Built-in demo lesson so reviewers can explore the full interface without an API key
- Responsive layout for desktop and mobile

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add a valid Gemini key to `.env.local`, then open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Server-only Gemini API key used for lessons and follow-up answers |

Copy `.env.example` to `.env.local` and replace the placeholder value. Never commit `.env.local` or a real API key.

## Tech stack

- Next.js App Router, React, TypeScript
- Google Gemini via `@google/genai`
- Zod validation and structured model output
- SVG for the whiteboard renderer
- Web Speech API for narration

## Architecture

The browser never receives the Gemini key. Next.js route handlers generate and validate lessons on the server. Each lesson is normalized into a timeline of narration segments and board actions. The client advances one shared clock, so seeking or replaying always reconstructs the correct visual state.

Gemini 3 Flash is used first, with automatic validation retries and a Flash Lite fallback when the primary model is busy or returns incomplete structured data. This keeps the public demo reliable without exposing model errors to the learner.

## Known limitations

- Narration uses the browser Web Speech API, so the available voice varies by browser and operating system.
- Lesson-generation speed depends on Gemini availability; a visible loading canvas is shown while the lesson is prepared.
- The whiteboard supports a focused visual vocabulary of text, equations, shapes, arrows, lines, and highlights rather than freehand drawing.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
