import { z } from "zod";

export const boardActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "text",
    "equation",
    "rect",
    "circle",
    "line",
    "arrow",
    "highlight",
  ]),
  atMs: z.number().int().min(0),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(560),
  x2: z.number().min(0).max(1000).optional(),
  y2: z.number().min(0).max(560).optional(),
  width: z.number().min(0).max(1000).optional(),
  height: z.number().min(0).max(560).optional(),
  radius: z.number().min(0).max(280).optional(),
  text: z.string().max(120).optional(),
  color: z.string().max(32).optional(),
  fill: z.string().max(32).optional(),
  fontSize: z.number().min(12).max(72).optional(),
  strokeWidth: z.number().min(1).max(12).optional(),
});

export const lessonSegmentSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().min(0),
  durationMs: z.number().int().min(4_000).max(30_000),
  title: z.string().min(1).max(80),
  narration: z.string().min(20).max(900),
  actions: z.array(boardActionSchema).min(1).max(8),
});

export const lessonSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(2).max(160),
  title: z.string().min(2).max(120),
  summary: z.string().min(20).max(500),
  durationMs: z.number().int().min(20_000).max(180_000),
  objectives: z.array(z.string().min(2).max(160)).min(2).max(4),
  segments: z.array(lessonSegmentSchema).min(4).max(8),
});

export type BoardAction = z.infer<typeof boardActionSchema>;
export type LessonSegment = z.infer<typeof lessonSegmentSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

export const lessonJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Short URL-safe lesson identifier." },
    topic: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    durationMs: { type: "integer", minimum: 60_000, maximum: 130_000 },
    objectives: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    segments: {
      type: "array",
      minItems: 5,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          startMs: { type: "integer", minimum: 0 },
          durationMs: { type: "integer", minimum: 8_000, maximum: 24_000 },
          title: { type: "string" },
          narration: {
            type: "string",
            description: "Natural spoken explanation for this segment.",
          },
          actions: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                type: {
                  type: "string",
                  enum: [
                    "text",
                    "equation",
                    "rect",
                    "circle",
                    "line",
                    "arrow",
                    "highlight",
                  ],
                },
                atMs: { type: "integer", minimum: 0 },
                x: { type: "number", minimum: 0, maximum: 1000 },
                y: { type: "number", minimum: 0, maximum: 560 },
                x2: { type: "number", minimum: 0, maximum: 1000 },
                y2: { type: "number", minimum: 0, maximum: 560 },
                width: { type: "number", minimum: 0, maximum: 1000 },
                height: { type: "number", minimum: 0, maximum: 560 },
                radius: { type: "number", minimum: 0, maximum: 280 },
                text: { type: "string" },
                color: { type: "string" },
                fill: { type: "string" },
                fontSize: { type: "number", minimum: 12, maximum: 72 },
                strokeWidth: { type: "number", minimum: 1, maximum: 12 },
              },
              required: ["id", "type", "atMs", "x", "y"],
            },
          },
        },
        required: ["id", "startMs", "durationMs", "title", "narration", "actions"],
      },
    },
  },
  required: ["id", "topic", "title", "summary", "durationMs", "objectives", "segments"],
} as const;

export function normalizeLesson(input: Lesson): Lesson {
  let cursor = 0;
  const segments = input.segments.map((segment, segmentIndex) => {
    const durationMs = Math.max(8_000, Math.min(24_000, segment.durationMs));
    const normalized = {
      ...segment,
      id: segment.id || `segment-${segmentIndex + 1}`,
      startMs: cursor,
      durationMs,
      actions: segment.actions.map((action, actionIndex) => ({
        ...action,
        id: action.id || `segment-${segmentIndex + 1}-action-${actionIndex + 1}`,
        atMs: Math.max(0, Math.min(durationMs - 250, action.atMs)),
      })),
    };

    cursor += durationMs;
    return normalized;
  });

  return lessonSchema.parse({
    ...input,
    durationMs: cursor,
    segments,
  });
}

export const demoLesson: Lesson = normalizeLesson({
  id: "photosynthesis-demo",
  topic: "How photosynthesis powers a plant",
  title: "How a leaf turns light into fuel",
  summary:
    "Follow sunlight, water, and carbon dioxide through a leaf to see how plants make glucose and release oxygen.",
  durationMs: 78_000,
  objectives: [
    "Identify the three inputs a plant needs",
    "Trace matter through the leaf",
    "Explain the photosynthesis equation",
  ],
  segments: [
    {
      id: "stage",
      startMs: 0,
      durationMs: 13_000,
      title: "Meet the leaf",
      narration:
        "A leaf is a tiny solar-powered factory. Its job is to capture light energy and store that energy inside sugar the plant can use later.",
      actions: [
        { id: "leaf", type: "circle", atMs: 0, x: 500, y: 285, radius: 150, color: "#183f34", fill: "#d9f99d", strokeWidth: 5 },
        { id: "leaf-title", type: "text", atMs: 1_200, x: 500, y: 270, text: "LEAF", color: "#183f34", fontSize: 38 },
        { id: "factory", type: "text", atMs: 3_000, x: 500, y: 320, text: "solar-powered factory", color: "#315c50", fontSize: 22 },
      ],
    },
    {
      id: "inputs",
      startMs: 13_000,
      durationMs: 16_000,
      title: "Three inputs arrive",
      narration:
        "Sunlight reaches the leaf from above. Water travels up from the roots, while carbon dioxide enters through tiny pores in the leaf surface.",
      actions: [
        { id: "sun", type: "circle", atMs: 0, x: 160, y: 105, radius: 52, color: "#f59e0b", fill: "#fef3c7", strokeWidth: 5 },
        { id: "sun-label", type: "text", atMs: 800, x: 160, y: 112, text: "LIGHT", color: "#92400e", fontSize: 20 },
        { id: "light-arrow", type: "arrow", atMs: 2_000, x: 220, y: 135, x2: 385, y2: 225, color: "#f59e0b", strokeWidth: 6 },
        { id: "water", type: "text", atMs: 4_000, x: 175, y: 445, text: "H₂O", color: "#0369a1", fontSize: 30 },
        { id: "water-arrow", type: "arrow", atMs: 4_800, x: 225, y: 425, x2: 390, y2: 340, color: "#0ea5e9", strokeWidth: 6 },
        { id: "co2", type: "text", atMs: 7_000, x: 820, y: 180, text: "CO₂", color: "#5b21b6", fontSize: 30 },
        { id: "co2-arrow", type: "arrow", atMs: 7_800, x: 770, y: 195, x2: 635, y2: 245, color: "#8b5cf6", strokeWidth: 6 },
      ],
    },
    {
      id: "chloroplast",
      startMs: 29_000,
      durationMs: 15_000,
      title: "Chloroplasts do the work",
      narration:
        "Inside leaf cells, chloroplasts contain chlorophyll. This green pigment catches light and uses its energy to rearrange water and carbon dioxide molecules.",
      actions: [
        { id: "cell", type: "rect", atMs: 0, x: 340, y: 155, width: 320, height: 245, color: "#166534", fill: "#ecfccb", strokeWidth: 4 },
        { id: "cp1", type: "circle", atMs: 1_500, x: 425, y: 250, radius: 42, color: "#15803d", fill: "#86efac", strokeWidth: 4 },
        { id: "cp2", type: "circle", atMs: 2_300, x: 560, y: 310, radius: 48, color: "#15803d", fill: "#86efac", strokeWidth: 4 },
        { id: "cp-label", type: "text", atMs: 3_500, x: 500, y: 455, text: "chloroplasts capture light", color: "#166534", fontSize: 25 },
        { id: "energy", type: "highlight", atMs: 6_500, x: 365, y: 180, width: 270, height: 58, color: "#f59e0b", fill: "#fef3c7", strokeWidth: 3 },
        { id: "energy-text", type: "text", atMs: 7_200, x: 500, y: 217, text: "light energy", color: "#92400e", fontSize: 24 },
      ],
    },
    {
      id: "equation",
      startMs: 44_000,
      durationMs: 17_000,
      title: "Build the equation",
      narration:
        "The ingredients are six carbon dioxide molecules and six water molecules. Light energy helps transform them into one glucose molecule and six oxygen molecules.",
      actions: [
        { id: "left", type: "equation", atMs: 0, x: 245, y: 255, text: "6CO₂ + 6H₂O", color: "#1e293b", fontSize: 34 },
        { id: "eq-arrow", type: "arrow", atMs: 3_000, x: 390, y: 245, x2: 610, y2: 245, color: "#f59e0b", strokeWidth: 6 },
        { id: "light-note", type: "text", atMs: 4_000, x: 500, y: 205, text: "light", color: "#b45309", fontSize: 20 },
        { id: "right", type: "equation", atMs: 6_000, x: 760, y: 255, text: "C₆H₁₂O₆ + 6O₂", color: "#166534", fontSize: 34 },
        { id: "glucose", type: "text", atMs: 8_000, x: 720, y: 330, text: "glucose + oxygen", color: "#315c50", fontSize: 23 },
      ],
    },
    {
      id: "outputs",
      startMs: 61_000,
      durationMs: 14_000,
      title: "Store fuel, release oxygen",
      narration:
        "The plant stores chemical energy in glucose for growth and repair. Oxygen leaves the leaf as a useful by-product that animals and people can breathe.",
      actions: [
        { id: "sugar-box", type: "rect", atMs: 0, x: 220, y: 190, width: 250, height: 170, color: "#166534", fill: "#dcfce7", strokeWidth: 4 },
        { id: "sugar", type: "text", atMs: 1_000, x: 345, y: 255, text: "GLUCOSE", color: "#166534", fontSize: 30 },
        { id: "stored", type: "text", atMs: 2_200, x: 345, y: 302, text: "stored energy", color: "#315c50", fontSize: 21 },
        { id: "oxygen", type: "text", atMs: 4_500, x: 695, y: 240, text: "O₂", color: "#0369a1", fontSize: 46 },
        { id: "oxygen-arrow", type: "arrow", atMs: 5_500, x: 610, y: 280, x2: 760, y2: 175, color: "#0ea5e9", strokeWidth: 6 },
        { id: "breathe", type: "text", atMs: 7_500, x: 725, y: 330, text: "released to the air", color: "#0369a1", fontSize: 22 },
      ],
    },
    {
      id: "recap",
      startMs: 75_000,
      durationMs: 12_000,
      title: "The big idea",
      narration:
        "Photosynthesis converts light energy into chemical energy. Matter is rearranged, not created, and the stored glucose powers nearly every food chain on Earth.",
      actions: [
        { id: "recap-box", type: "highlight", atMs: 0, x: 185, y: 170, width: 630, height: 210, color: "#6d28d9", fill: "#f3e8ff", strokeWidth: 4 },
        { id: "recap-1", type: "text", atMs: 1_000, x: 500, y: 235, text: "LIGHT → CHEMICAL ENERGY", color: "#5b21b6", fontSize: 34 },
        { id: "recap-2", type: "text", atMs: 3_000, x: 500, y: 300, text: "matter is rearranged", color: "#1e293b", fontSize: 27 },
        { id: "recap-3", type: "text", atMs: 5_000, x: 500, y: 345, text: "glucose powers food chains", color: "#166534", fontSize: 24 },
      ],
    },
  ],
});

export function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

