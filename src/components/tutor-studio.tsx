"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CircleAlert,
  Clock3,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Whiteboard } from "@/components/whiteboard";
import {
  demoLesson,
  formatTime,
  type Lesson,
  type LessonSegment,
} from "@/lib/lesson";

type FollowUpMessage = {
  id: string;
  role: "learner" | "tutor";
  text: string;
  points?: string[];
};

const topicSuggestions = [
  "Why do eclipses happen?",
  "How does compound interest grow?",
  "Explain the water cycle",
];

function activeSegmentIndex(lesson: Lesson, currentMs: number) {
  const index = lesson.segments.findIndex(
    (segment) =>
      currentMs >= segment.startMs &&
      currentMs < segment.startMs + segment.durationMs,
  );

  return index === -1 ? lesson.segments.length - 1 : index;
}

function speakSegment(segment: LessonSegment) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(segment.narration);
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith("en") &&
      /google|microsoft|samantha|daniel/i.test(voice.name),
  );

  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

export function TutorStudio() {
  const [topic, setTopic] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [seekVersion, setSeekVersion] = useState(0);
  const [question, setQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);
  const spokenSegmentRef = useRef(-1);

  const activeIndex = lesson ? activeSegmentIndex(lesson, currentMs) : 0;
  const activeSegment = isGenerating ? null : lesson?.segments[activeIndex] ?? null;
  const progress = lesson ? (currentMs / lesson.durationMs) * 100 : 0;

  const visibleActions = useMemo(() => {
    if (!lesson || isGenerating) return [];

    return lesson.segments.flatMap((segment) =>
      segment.actions.filter(
        (action) => segment.startMs + action.atMs <= currentMs,
      ),
    );
  }, [currentMs, isGenerating, lesson]);

  useEffect(() => {
    if (!isPlaying || !lesson) return;

    const timer = window.setInterval(() => {
      setCurrentMs((previous) => {
        const next = Math.min(previous + 100, lesson.durationMs);
        if (next >= lesson.durationMs) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isPlaying, lesson]);

  useEffect(() => {
    if (!lesson || !("speechSynthesis" in window)) return;

    if (!speechEnabled) {
      window.speechSynthesis.cancel();
      spokenSegmentRef.current = -1;
      return;
    }

    if (!isPlaying) {
      window.speechSynthesis.pause();
      return;
    }

    if (spokenSegmentRef.current === activeIndex) {
      window.speechSynthesis.resume();
      return;
    }

    spokenSegmentRef.current = activeIndex;
    speakSegment(lesson.segments[activeIndex]);
  }, [activeIndex, isPlaying, lesson, seekVersion, speechEnabled]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function resetPlayback(nextLesson: Lesson) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    spokenSegmentRef.current = -1;
    setLesson(nextLesson);
    setCurrentMs(0);
    setIsPlaying(false);
    setMessages([]);
    setQuestion("");
    setSeekVersion((value) => value + 1);
  }

  function loadDemoLesson() {
    setGenerationError("");
    setTopic(demoLesson.topic);
    setIsDemo(true);
    resetPlayback(demoLesson);
  }

  async function generateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      setGenerationError("Enter a topic with at least three characters.");
      return;
    }

    setIsGenerating(true);
    setGenerationError("");
    setIsPlaying(false);
    spokenSegmentRef.current = -1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    try {
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: cleanTopic }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The lesson could not be generated.");
      }

      setIsDemo(false);
      resetPlayback(payload.lesson as Lesson);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "The lesson could not be generated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function togglePlayback() {
    if (!lesson) return;

    if (currentMs >= lesson.durationMs) {
      setCurrentMs(0);
      spokenSegmentRef.current = -1;
      setSeekVersion((value) => value + 1);
    }
    setIsPlaying((value) => !value);
  }

  function restartLesson() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    spokenSegmentRef.current = -1;
    setCurrentMs(0);
    setIsPlaying(false);
    setSeekVersion((value) => value + 1);
  }

  function seekLesson(nextMs: number) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    spokenSegmentRef.current = -1;
    setCurrentMs(nextMs);
    setSeekVersion((value) => value + 1);
  }

  function jumpToSegment(index: number) {
    if (!lesson) return;
    seekLesson(lesson.segments[index].startMs);
  }

  async function askFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lesson || question.trim().length < 2 || isAnswering) return;

    const cleanQuestion = question.trim();
    const learnerMessage: FollowUpMessage = {
      id: `learner-${Date.now()}`,
      role: "learner",
      text: cleanQuestion,
    };
    setMessages((current) => [...current, learnerMessage]);
    setQuestion("");
    setIsAnswering(true);

    try {
      const response = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          lesson: {
            topic: lesson.topic,
            title: lesson.title,
            summary: lesson.summary,
            objectives: lesson.objectives,
            narration: lesson.segments.map((segment) => segment.narration),
          },
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The tutor could not answer.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `tutor-${Date.now()}`,
          role: "tutor",
          text: payload.answer,
          points: payload.keyPoints,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `tutor-error-${Date.now()}`,
          role: "tutor",
          text:
            error instanceof Error
              ? error.message
              : "I could not answer that just now. Please try again.",
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  }

  return (
    <main className="studio-page">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="TutorCanvas home">
          <span className="brand-mark" aria-hidden="true">
            <Brain size={23} strokeWidth={2.4} />
          </span>
          <span>TutorCanvas</span>
        </a>
        <div className="header-status">
          <span className="live-dot" />
          <span className="status-label">AI lesson studio</span>
        </div>
        <button className="header-pill" type="button" onClick={loadDemoLesson}>
          <Sparkles size={16} />
          <span className="sample-label">Try sample</span>
        </button>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow"><span /> Learn by watching ideas unfold</p>
          <h1>From any topic to a <em>living whiteboard.</em></h1>
        </div>
        <p className="intro-copy">
          TutorCanvas turns a question into a narrated, visual lesson you can pause,
          explore, and ask about.
        </p>
      </section>

      <section className="studio-layout">
        <aside className="lesson-sidebar">
          <div className="sidebar-section topic-section">
            <div className="section-heading">
              <div>
                <span className="step-number">01</span>
                <h2>Choose a topic</h2>
              </div>
              <Lightbulb size={19} />
            </div>

            <form onSubmit={generateLesson}>
              <label className="topic-input-wrap">
                <span className="sr-only">Lesson topic</span>
                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="What do you want to understand?"
                  rows={3}
                  maxLength={160}
                />
                <span className="character-count">{topic.length}/160</span>
              </label>
              <button className="generate-button" type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <><LoaderCircle className="spin" size={18} /> Building your lesson…</>
                ) : (
                  <><Sparkles size={18} /> Generate visual lesson <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {generationError ? (
              <div className="inline-alert" role="alert">
                <CircleAlert size={17} />
                <span>{generationError}</span>
              </div>
            ) : null}

            <div className="suggestions" aria-label="Topic suggestions">
              {topicSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setTopic(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section lesson-map">
            <div className="section-heading compact">
              <div>
                <span className="step-number">02</span>
                <h2>Lesson map</h2>
              </div>
              {lesson ? <span className="duration-badge"><Clock3 size={14} /> {formatTime(lesson.durationMs)}</span> : null}
            </div>

            {lesson ? (
              <ol className="segment-list">
                {lesson.segments.map((segment, index) => {
                  const complete = currentMs >= segment.startMs + segment.durationMs;
                  const active = index === activeIndex;
                  return (
                    <li key={segment.id}>
                      <button
                        type="button"
                        className={`${active ? "active" : ""} ${complete ? "complete" : ""}`}
                        onClick={() => jumpToSegment(index)}
                      >
                        <span className="segment-index">{complete ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>{segment.title}</strong>
                          <small>{formatTime(segment.durationMs)}</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="empty-map">
                <span className="empty-map-icon" aria-hidden="true">
                  <BookOpen size={22} />
                </span>
                <div>
                  <strong>Lesson outline</strong>
                  <p>Your lesson chapters will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="lesson-stage">
          <div className="stage-topbar">
            <div>
              <span className="stage-kicker">Interactive whiteboard</span>
              <h2>{isGenerating ? "Building your new lesson…" : lesson?.title ?? "Your lesson canvas"}</h2>
            </div>
            <div className="stage-badges">
              {isDemo ? <span className="demo-badge">Sample lesson</span> : null}
              <span><Mic2 size={15} /> Narrated</span>
              <span><Sparkles size={15} /> AI structured</span>
            </div>
          </div>

          <Whiteboard actions={visibleActions} empty={!lesson} loading={isGenerating} />

          <div className="player" aria-label="Lesson playback controls">
            <button
              className="icon-button secondary"
              type="button"
              onClick={restartLesson}
              disabled={!lesson || isGenerating}
              aria-label="Restart lesson"
            >
              <RotateCcw size={19} />
            </button>
            <button
              className="play-button"
              type="button"
              onClick={togglePlayback}
              disabled={!lesson || isGenerating}
              aria-label={isPlaying ? "Pause lesson" : "Play lesson"}
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>

            <div className="timeline-wrap">
              <div className="time-row">
                <span>{formatTime(currentMs)}</span>
                <span>{formatTime(lesson?.durationMs ?? 0)}</span>
              </div>
              <div className="range-shell" style={{ "--progress": `${progress}%` } as React.CSSProperties}>
                <input
                  type="range"
                  min={0}
                  max={lesson?.durationMs ?? 1}
                  step={100}
                  value={currentMs}
                  onChange={(event) => seekLesson(Number(event.target.value))}
                  disabled={!lesson || isGenerating}
                  aria-label="Seek lesson timeline"
                />
              </div>
            </div>

            <button
              className="icon-button secondary"
              type="button"
              onClick={() => setSpeechEnabled((value) => !value)}
              disabled={!lesson || isGenerating}
              aria-label={speechEnabled ? "Mute narration" : "Enable narration"}
            >
              {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <div className="active-narration" aria-live="polite">
            <span>{isGenerating ? <LoaderCircle className="spin" size={15} /> : activeSegment ? String(activeIndex + 1).padStart(2, "0") : "—"}</span>
            <div>
              <strong>{isGenerating ? "Sketching your new lesson…" : activeSegment?.title ?? "Ready when you are"}</strong>
              <p>{isGenerating ? "The previous canvas is safely paused while the tutor plans fresh visuals and narration." : activeSegment?.narration ?? "Generate a lesson or load the sample to see synchronized narration here."}</p>
            </div>
          </div>

          <div className="stage-lower-grid">
            <article className="objectives-card">
              <div className="card-title-row">
                <div className="small-icon lime"><BookOpen size={18} /></div>
                <div>
                  <span>Learning goals</span>
                  <h3>By the end, you can…</h3>
                </div>
              </div>
              {lesson ? (
                <ul>
                  {lesson.objectives.map((objective) => (
                    <li key={objective}><span><Check size={14} /></span>{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted-copy">Clear, practical objectives will appear here with your lesson.</p>
              )}
            </article>

            <article className="follow-up-card">
              <div className="card-title-row">
                <div className="small-icon violet"><MessageCircle size={18} /></div>
                <div>
                  <span>Ask the tutor</span>
                  <h3>Still curious?</h3>
                </div>
              </div>

              <div className="message-list" aria-live="polite">
                {messages.length === 0 ? (
                  <p className="muted-copy">Ask anything about the lesson and get an answer grounded in what you just learned.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`message ${message.role}`}>
                      <strong>{message.role === "learner" ? "You" : "Tutor"}</strong>
                      <p>{message.text}</p>
                      {message.points?.length ? (
                        <ul>{message.points.map((point) => <li key={point}>{point}</li>)}</ul>
                      ) : null}
                    </div>
                  ))
                )}
                {isAnswering ? <div className="thinking"><LoaderCircle className="spin" size={16} /> Thinking through the lesson…</div> : null}
              </div>

              <form className="question-form" onSubmit={askFollowUp}>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={lesson ? "Ask a follow-up question…" : "Load a lesson first"}
                  disabled={!lesson || isAnswering}
                  maxLength={500}
                  aria-label="Follow-up question"
                />
                <button type="submit" disabled={!lesson || isAnswering || question.trim().length < 2} aria-label="Send question">
                  <Send size={17} />
                </button>
              </form>
            </article>
          </div>
        </section>
      </section>

      <footer className="app-footer">
        <span><Brain size={16} /> TutorCanvas</span>
        <p>AI plans the lesson. A deterministic timeline keeps every word and visual in step.</p>
      </footer>
    </main>
  );
}

