# TutorCanvas — AI Whiteboard Tutor

TutorCanvas turns a topic into a structured, narrated whiteboard lesson. Gemini generates the lesson plan and timed visual actions, while a deterministic browser timeline keeps the board, narration, and playback controls synchronized.

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

## Tech stack

- Next.js App Router, React, TypeScript
- Google Gemini via `@google/genai`
- Zod validation and structured model output
- SVG for the whiteboard renderer
- Web Speech API for narration

## Architecture

The browser never receives the Gemini key. Next.js route handlers generate and validate lessons on the server. Each lesson is normalized into a timeline of narration segments and board actions. The client advances one shared clock, so seeking or replaying always reconstructs the correct visual state.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
