import type { BoardAction } from "@/lib/lesson";

type WhiteboardProps = {
  actions: BoardAction[];
  empty?: boolean;
  loading?: boolean;
};

function splitLabel(text: string, maxLength = 24) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function BoardText({ action }: { action: BoardAction }) {
  const lines = splitLabel(action.text ?? "");
  const fontSize = action.fontSize ?? 28;
  const isEquation = action.type === "equation";

  return (
    <text
      x={action.x}
      y={action.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={action.color ?? "#1e293b"}
      fontSize={fontSize}
      fontWeight={isEquation ? 700 : 650}
      fontFamily={isEquation ? "var(--font-geist-mono)" : "var(--font-geist-sans)"}
      className="board-draw"
    >
      {lines.map((line, index) => (
        <tspan key={`${action.id}-${index}`} x={action.x} dy={index === 0 ? 0 : fontSize * 1.18}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function renderAction(action: BoardAction) {
  const color = action.color ?? "#183f34";
  const fill = action.fill ?? "transparent";
  const strokeWidth = action.strokeWidth ?? 4;

  switch (action.type) {
    case "text":
    case "equation":
      return <BoardText action={action} />;
    case "circle":
      return (
        <circle
          cx={action.x}
          cy={action.y}
          r={action.radius ?? 50}
          fill={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          className="board-draw"
        />
      );
    case "rect":
    case "highlight":
      return (
        <rect
          x={action.x}
          y={action.y}
          width={action.width ?? 180}
          height={action.height ?? 100}
          rx={action.type === "highlight" ? 26 : 16}
          fill={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          className="board-draw"
        />
      );
    case "line":
    case "arrow":
      return (
        <line
          x1={action.x}
          y1={action.y}
          x2={action.x2 ?? action.x + 100}
          y2={action.y2 ?? action.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          markerEnd={action.type === "arrow" ? "url(#arrowhead)" : undefined}
          className="board-stroke"
        />
      );
  }
}

export function Whiteboard({ actions, empty = false, loading = false }: WhiteboardProps) {
  return (
    <div className="whiteboard-shell" aria-label="Interactive lesson whiteboard">
      <svg viewBox="0 0 1000 560" role="img" aria-label="Animated lesson diagram">
        <defs>
          <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#cbd5e1" opacity="0.65" />
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
          </marker>
          <linearGradient id="empty-glow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ede9fe" />
            <stop offset="1" stopColor="#d9f99d" />
          </linearGradient>
        </defs>
        <rect width="1000" height="560" rx="28" fill="#fffef9" />
        <rect width="1000" height="560" rx="28" fill="url(#dot-grid)" />

        {loading ? (
          <g className="board-loading" role="status" aria-label="Building a new lesson">
            <circle cx="500" cy="235" r="82" fill="url(#empty-glow)" opacity="0.7" />
            <circle className="loading-ring" cx="500" cy="235" r="58" fill="none" stroke="#256c4c" strokeWidth="8" strokeLinecap="round" strokeDasharray="98 44" />
            <circle cx="500" cy="235" r="15" fill="#256c4c" />
            <text x="500" y="355" textAnchor="middle" fill="#1e293b" fontSize="29" fontWeight="700">
              Sketching your new lesson…
            </text>
            <text x="500" y="397" textAnchor="middle" fill="#64748b" fontSize="20">
              Planning the visuals, narration, and timeline.
            </text>
          </g>
        ) : empty ? (
          <g className="empty-board">
            <circle cx="500" cy="235" r="82" fill="url(#empty-glow)" opacity="0.92" />
            <path
              d="M466 245c18-42 50-61 82-46 18 8 29 25 30 43-26 2-50 13-65 34-18-14-31-22-47-31Z"
              fill="none"
              stroke="#5b21b6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M499 190v-25M459 204l-18-18M550 198l17-20" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" />
            <text x="500" y="355" textAnchor="middle" fill="#1e293b" fontSize="29" fontWeight="700">
              Your idea becomes a visual lesson
            </text>
            <text x="500" y="397" textAnchor="middle" fill="#64748b" fontSize="20">
              Pick a topic or load the sample to begin.
            </text>
          </g>
        ) : (
          <g filter="url(#soft-shadow)">
            {actions.map((action) => (
              <g key={action.id}>{renderAction(action)}</g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

