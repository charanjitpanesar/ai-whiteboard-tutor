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

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          code: "GEMINI_NOT_CONFIGURED",
          error:
            "Live AI is not configured yet. Add GEMINI_API_KEY to generate a custom lesson.",
        },
        { status: 503 },
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });
    const contents = `Teach this topic visually: ${body.topic}`;
    const config = {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.65,
      maxOutputTokens: 8_000,
    };
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config,
      });
    } catch (primaryError) {
      console.warn("Gemini 3 Flash unavailable; using Flash Lite fallback", primaryError);
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config,
      });
    }

    if (!response.text) {
      throw new Error("Gemini returned an empty lesson.");
    }

    const parsed = lessonSchema.parse(JSON.parse(response.text));
    const lesson = normalizeLesson({ ...parsed, topic: body.topic });

    return Response.json({ lesson, source: "gemini" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Gemini lesson failed validation", JSON.stringify(error.issues));
      return Response.json(
        { code: "INVALID_LESSON", error: "The lesson data was incomplete. Please try again." },
        { status: 422 },
      );
    }

    console.error("Lesson generation failed", error);
    return Response.json(
      { code: "GENERATION_FAILED", error: "We could not build that lesson. Please try a clearer topic." },
      { status: 500 },
    );
  }
}

