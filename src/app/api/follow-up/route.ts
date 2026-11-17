import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const requestSchema = z.object({
  question: z.string().trim().min(2).max(500),
  lesson: z.object({
    topic: z.string().max(160),
    title: z.string().max(120),
    summary: z.string().max(500),
    objectives: z.array(z.string()).max(4),
    narration: z.array(z.string()).min(1).max(8),
  }),
});

const answerSchema = z.object({
  answer: z.string().min(10).max(900),
  keyPoints: z.array(z.string().min(2).max(160)).min(1).max(3),
});

const answerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "A complete, friendly plain-language answer between 60 and 100 words.",
    },
    keyPoints: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["answer", "keyPoints"],
} as const;

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json(
      { code: "INVALID_REQUEST", error: "Please ask a clear, specific question." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        code: "GEMINI_NOT_CONFIGURED",
        error: "Connect Gemini to ask live follow-up questions.",
      },
      { status: 503 },
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });
    const lessonContext = body.lesson.narration.join("\n");
    const contents = `
Lesson topic: ${body.lesson.topic}
Lesson title: ${body.lesson.title}
Summary: ${body.lesson.summary}
Objectives: ${body.lesson.objectives.join("; ")}
Lesson narration:
${lessonContext}

Learner question: ${body.question}
      `.trim();
    const config = {
      systemInstruction:
        "Answer as a warm, precise tutor. Stay grounded in the supplied lesson, correct misconceptions, avoid jargon, and match the learner's requested level. Keep the answer complete and between 60 and 100 words.",
      responseMimeType: "application/json",
      responseJsonSchema: answerJsonSchema,
      temperature: 0.45,
      maxOutputTokens: 2_048,
    };
    const models = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];
    let lastError: unknown;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({ model, contents, config });

        if (!response.text) {
          throw new Error(`${model} returned an empty answer.`);
        }

        const answer = answerSchema.parse(JSON.parse(response.text));
        return Response.json(answer);
      } catch (error) {
        lastError = error;
        console.warn(`Follow-up attempt with ${model} failed`, error);
      }
    }

    throw lastError ?? new Error("Gemini could not generate a valid answer.");
  } catch (error) {
    console.error("Follow-up generation failed", error);
    return Response.json(
      {
        code: "FOLLOW_UP_FAILED",
        error: "The tutor is temporarily busy. Please send your question again.",
      },
      { status: 502 },
    );
  }
}

