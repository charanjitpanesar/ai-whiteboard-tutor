import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import {
  lessonSchema,
  normalizeLesson,
} from "@/lib/lesson";

const requestSchema = z.object({
  topic: z.string().trim().min(3).max(160),
});

const systemInstruction = `
You are the lesson planner for TutorCanvas, an interactive visual tutor.
Create a concise, accurate lesson that takes roughly 90 to 120 seconds to narrate.

The visual canvas is exactly 1000 by 560 units. Every visual action must remain
inside it. Build a coherent drawing over time instead of replacing the canvas
every segment. Use short labels and diagrams rather than paragraphs.

Available action types:
- text/equation: needs x, y and text. x is the horizontal center.
- rect/highlight: needs x, y, width and height. x/y are top-left.
- circle: needs x, y and radius. x/y are the center.
- line/arrow: needs x, y, x2 and y2.

Use 5 to 7 segments. Each segment needs 1 to 8 actions and natural spoken
narration. The action atMs value is relative to the segment start and must be
less than that segment's durationMs. Make the visuals genuinely explain the
topic. Prefer this accessible palette: #183f34, #166534, #0369a1, #5b21b6,
#f59e0b, #1e293b, #ffffff, #ecfccb, #e0f2fe, #f3e8ff, #fef3c7.

Return one JSON object with this exact shape:
{
  "id": "short-url-safe-lesson-id",
  "title": "short lesson title",
  "topic": "topic",
  "summary": "one-sentence summary",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "durationMs": 100000,
  "segments": [{
    "id": "segment-1",
    "title": "chapter title",
    "startMs": 0,
    "durationMs": 16000,
    "narration": "spoken explanation",
    "actions": [{
      "id": "action-1",
      "type": "text",
      "atMs": 1000,
      "x": 500,
      "y": 80,
      "text": "short visual label",
      "color": "#183f34",
      "strokeWidth": 3
    }]
  }]
}
Omit action properties that do not apply to that action type.

Return only schema-compliant lesson data. Do not include markdown.
`;

function prepareGeneratedLesson(value: unknown, topic: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const raw = value as Record<string, unknown>;
  const rawSegments = Array.isArray(raw.segments) ? raw.segments : [];
  const segments = rawSegments.map((segment, segmentIndex) => {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) return segment;

    const rawSegment = segment as Record<string, unknown>;
    const rawActions = Array.isArray(rawSegment.actions) ? rawSegment.actions : [];
    const actions = rawActions.map((action, actionIndex) => {
      if (!action || typeof action !== "object" || Array.isArray(action)) return action;

      return {
        id: `segment-${segmentIndex + 1}-action-${actionIndex + 1}`,
        atMs: 0,
        x: 500,
        y: 280,
        ...(action as Record<string, unknown>),
      };
    });

    return {
      id: `segment-${segmentIndex + 1}`,
      startMs: 0,
      ...rawSegment,
      actions,
    };
  });
  const generatedId = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "generated-lesson";
  const calculatedDuration = segments.reduce((total, segment) => {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) return total;
    const duration = Number((segment as Record<string, unknown>).durationMs);
    return total + (Number.isFinite(duration) ? duration : 0);
  }, 0);

  return {
    id: generatedId,
    topic,
    durationMs: calculatedDuration || 90_000,
    ...raw,
    segments,
  };
}

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json(
      { code: "INVALID_TOPIC", error: "Enter a clear topic using at least three characters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        code: "GEMINI_NOT_CONFIGURED",
        error: "Live AI is not configured yet. Add GEMINI_API_KEY to generate a custom lesson.",
      },
      { status: 503 },
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });
    const contents = `Teach this topic visually: ${body.topic}`;
    const attempts = [
      { model: "gemini-3-flash-preview", temperature: 0.55 },
      { model: "gemini-3.1-flash-lite", temperature: 0.35 },
      { model: "gemini-3.1-flash-lite", temperature: 0.15 },
    ];
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const response = await ai.models.generateContent({
          model: attempt.model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: attempt.temperature,
            maxOutputTokens: 8_000,
          },
        });

        if (!response.text) {
          throw new Error(`${attempt.model} returned an empty lesson.`);
        }

        const prepared = prepareGeneratedLesson(JSON.parse(response.text), body.topic);
        const parsed = lessonSchema.parse(prepared);
        const lesson = normalizeLesson(parsed);

        return Response.json({ lesson, source: "gemini", model: attempt.model });
      } catch (error) {
        lastError = error;
        console.warn(`Lesson attempt with ${attempt.model} failed`, error);
      }
    }

    throw lastError ?? new Error("Gemini could not generate a valid lesson.");
  } catch (error) {
    console.error("Lesson generation failed", error);
    return Response.json(
      {
        code: "GENERATION_FAILED",
        error: "The AI could not structure that lesson. Please try the topic once more.",
      },
      { status: 502 },
    );
  }
}

