"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";
import {
  Mic, MicOff, Volume2, ChevronRight, CheckCircle2,
  Loader2, RotateCcw, Trophy, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
interface Question {
  id: string;
  text: string;
  options?: { maxSeconds?: number };
}
interface EvalResult {
  score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  delivery: string;
}
interface AnswerRecord {
  questionId: string;
  transcript: string;
  evaluation: EvalResult;
  audioUrl: string;
}
type Phase = "select" | "intro" | "question" | "recording" | "evaluating" | "result" | "done";

const VERDICT_COLOR: Record<string, string> = {
  Excellent: "text-green-600 dark:text-green-400",
  Good: "text-blue-600 dark:text-blue-400",
  Average: "text-yellow-600 dark:text-yellow-400",
  Poor: "text-red-600 dark:text-red-400",
};

/* ── TTS ────────────────────────────────────────────────────────── */
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

/* ── Score ring ─────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#3b82f6" : score >= 4 ? "#eab308" : "#ef4444";
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 34}`}
          strokeDashoffset={`${2 * Math.PI * 34 * (1 - (score / 10))}`}
          strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-bold">{score}<span className="text-sm font-normal text-muted-foreground">/10</span></span>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function AudioInterviewPage() {
  const interviews = trpc.interview.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("select");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentEval, setCurrentEval] = useState<EvalResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  // live words shown while recording
  const [liveText, setLiveText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null); // SpeechRecognition instance
  const currentQRef = useRef<Question | null>(null);
  const maxSecRef = useRef(120);

  const currentQ = questions[qIndex];
  const maxSec = currentQ?.options?.maxSeconds ?? 120;

  /* ── Select interview ─────────────────────────────────────────── */
  const handleSelectInterview = useCallback(async (id: string) => {
    setLoadingInterview(true);
    try {
      const full = await utils.interview.getById.fetch({ id });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioQs = ((full?.questions ?? []) as any[]).filter(
        (q) => q.type === "AUDIO" || q.type === "OPEN_ENDED"
      );
      if (audioQs.length === 0) return;
      setQuestions(audioQs);
      setQIndex(0);
      setAnswers([]);
      setPhase("intro");
    } finally {
      setLoadingInterview(false);
    }
  }, [utils]);

  /* ── Stop live speech recognition ────────────────────────────── */
  const stopSpeechRecognition = useCallback(() => {
    if (srRef.current) {
      srRef.current.stop();
      srRef.current = null;
    }
  }, []);

  /* ── Evaluate after recording stops ──────────────────────────── */
  const evaluateAnswer = useCallback(async (blob: Blob, question: Question, maxSec: number) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setPhase("evaluating");
    try {
      const fd = new FormData();
      fd.append("file", blob, "answer.webm");
      fd.append("question", question.text);
      fd.append("maxSeconds", String(maxSec));
      const res = await fetch("/api/audio-interview/evaluate", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCurrentTranscript(data.transcript ?? "");
      setCurrentEval(data.evaluation);
      setPhase("result");
    } catch (err) {
      console.error("Evaluation error:", err);
      setPhase("intro");
    }
  }, []);

  /* ── Stop recording → triggers evaluate ──────────────────────── */
  const stopRecording = useCallback(() => {
    stopSpeechRecognition();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      mrRef.current.stop(); // onstop fires → evaluateAnswer
    }
    mrRef.current = null;
  }, [stopSpeechRecognition]);

  /* ── Start recording + live speech recognition ────────────────── */
  const startRecording = useCallback(async (question: Question, maxSec: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        void evaluateAnswer(blob, currentQRef.current ?? question, maxSecRef.current);
      };

      mr.start();
      mrRef.current = mr;
      setPhase("recording");
      setLiveText("");
      setSecondsLeft(maxSec);

      // Live speech recognition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const sr = new SR();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = "en-US";
        let finalText = "";
        sr.onresult = (e: { results: SpeechRecognitionResultList }) => {
          let interim = "";
          for (let i = e.results.length - 1; i >= 0; i--) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript + " ";
              break;
            } else {
              interim = e.results[i][0].transcript;
            }
          }
          setLiveText((finalText + interim).trim());
        };
        sr.onerror = () => { /* ignore */ };
        sr.start();
        srRef.current = sr;
      }

      // Countdown timer
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            stopSpeechRecognition();
            if (mrRef.current && mrRef.current.state !== "inactive") {
              mrRef.current.stop();
            }
            mrRef.current = null;
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch {
      setPhase("intro");
    }
  }, [evaluateAnswer, stopSpeechRecognition]);

  /* ── Speak question then record ───────────────────────────────── */
  const startQuestion = useCallback(() => {
    if (!currentQ) return;
    const ms = currentQ.options?.maxSeconds ?? 120;
    currentQRef.current = currentQ;
    maxSecRef.current = ms;
    setPhase("question");
    setSpeaking(true);
    setAudioUrl(null);
    setCurrentEval(null);
    setCurrentTranscript("");
    setLiveText("");
    speak(`Question ${qIndex + 1}. ${currentQ.text}`, () => {
      setSpeaking(false);
      void startRecording(currentQ, ms);
    });
  }, [currentQ, qIndex, startRecording]);

  /* ── Next question / finish ───────────────────────────────────── */
  const handleNext = useCallback(() => {
    if (!currentQ || !currentEval || !audioUrl) return;
    const updated = [...answers, {
      questionId: currentQ.id,
      transcript: currentTranscript,
      evaluation: currentEval,
      audioUrl,
    }];
    setAnswers(updated);
    if (qIndex + 1 >= questions.length) {
      setPhase("done");
    } else {
      setQIndex((i) => i + 1);
      setPhase("intro");
    }
  }, [currentQ, currentEval, audioUrl, currentTranscript, answers, qIndex, questions.length]);

  const avgScore = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.evaluation.score, 0) / answers.length)
    : 0;

  /* ── SELECT phase ─────────────────────────────────────────────── */
  if (phase === "select") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">Live Audio Interview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI reads each question aloud. You record your answer. AI transcribes and scores it.
          </p>
        </div>
        {interviews.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading interviews...
          </div>
        ) : (
          <div className="space-y-2">
            {(interviews.data?.interviews ?? []).map((iv) => {
              const qCount = typeof iv.questions === "number" ? iv.questions : 0;
              return (
                <button key={iv.id} onClick={() => handleSelectInterview(iv.id)}
                  disabled={loadingInterview}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    "hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                  )}>
                  <div>
                    <p className="font-medium">{iv.title}</p>
                    <p className="text-xs text-muted-foreground">{qCount} question{qCount !== 1 ? "s" : ""}</p>
                  </div>
                  {loadingInterview
                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── DONE phase ───────────────────────────────────────────────── */
  if (phase === "done") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-yellow-500" />
          <h1 className="text-2xl font-bold">Interview Complete</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-6 pt-6">
            <ScoreRing score={avgScore} />
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-3xl font-bold">{avgScore}<span className="text-base font-normal text-muted-foreground">/10</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{answers.length} question{answers.length !== 1 ? "s" : ""} answered</p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {answers.map((a, i) => (
            <Card key={a.questionId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm font-medium leading-snug">
                    Q{i + 1}. {questions.find((q) => q.id === a.questionId)?.text}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs font-semibold", VERDICT_COLOR[a.evaluation.verdict])}>
                      {a.evaluation.verdict}
                    </Badge>
                    <span className="text-sm font-bold">{a.evaluation.score}/10</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {a.transcript && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
                    &ldquo;{a.transcript}&rdquo;
                  </div>
                )}
                <p>{a.evaluation.summary}</p>
                {a.evaluation.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strengths</p>
                    <ul className="space-y-0.5 text-xs">
                      {a.evaluation.strengths.map((s, si) => (
                        <li key={si} className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.evaluation.improvements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Improvements</p>
                    <ul className="space-y-0.5 text-xs list-disc list-inside text-muted-foreground">
                      {a.evaluation.improvements.map((s, si) => <li key={si}>{s}</li>)}
                    </ul>
                  </div>
                )}
                <audio src={a.audioUrl} controls className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Button variant="outline" onClick={() => { setPhase("select"); setQuestions([]); }}>
          Start Another Interview
        </Button>
      </div>
    );
  }

  /* ── INTERVIEW phases ─────────────────────────────────────────── */
  const progress = questions.length > 0 ? (qIndex / questions.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Live Audio Interview</h1>
          <span className="text-sm text-muted-foreground">Q{qIndex + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question card */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {qIndex + 1}
            </span>
            <p className="text-base font-medium leading-snug">{currentQ?.text}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Max {maxSec}s to answer
          </div>
        </CardContent>
      </Card>

      {/* INTRO */}
      {phase === "intro" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            AI will read the question aloud, then recording starts automatically.
          </p>
          <Button onClick={startQuestion} className="gap-2">
            <Volume2 className="h-4 w-4" /> Start Question
          </Button>
        </div>
      )}

      {/* AI SPEAKING */}
      {phase === "question" && speaking && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 rounded-full bg-primary animate-bounce"
                style={{ height: `${16 + (i % 3) * 8}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">AI is reading the question...</p>
        </div>
      )}

      {/* RECORDING — with live transcript */}
      {phase === "recording" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white">
              <Mic className="h-7 w-7" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-destructive animate-pulse">Recording...</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{secondsLeft}s</p>
          </div>
          <Progress value={((maxSec - secondsLeft) / maxSec) * 100} className="h-2 w-full" />

          {/* Live speech display */}
          <div className="w-full min-h-[64px] rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">You are saying...</p>
            <p className="text-sm text-foreground leading-relaxed">
              {liveText || <span className="italic text-muted-foreground">Start speaking...</span>}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={stopRecording} className="gap-2">
            <MicOff className="h-4 w-4" /> Done — Evaluate My Answer
          </Button>
        </div>
      )}

      {/* EVALUATING */}
      {phase === "evaluating" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Transcribing and evaluating your answer...</p>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && currentEval && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-5 pt-5">
              <ScoreRing score={currentEval.score} />
              <div>
                <Badge variant="outline" className={cn("mb-1 text-sm font-semibold", VERDICT_COLOR[currentEval.verdict])}>
                  {currentEval.verdict}
                </Badge>
                <p className="text-sm">{currentEval.summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* What you said */}
          {currentTranscript && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">What You Said</p>
              <p className="text-sm italic">&ldquo;{currentTranscript}&rdquo;</p>
            </div>
          )}

          {audioUrl && <audio src={audioUrl} controls className="h-9 w-full" />}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3">
              <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">Strengths</p>
              <ul className="space-y-1">
                {currentEval.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-3">
              <p className="mb-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400">Improve</p>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {currentEval.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {currentEval.delivery && (
            <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3">{currentEval.delivery}</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => { setPhase("intro"); setCurrentEval(null); setAudioUrl(null); setCurrentTranscript(""); setLiveText(""); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleNext}>
              {qIndex + 1 >= questions.length
                ? <><Trophy className="h-3.5 w-3.5" /> Finish Interview</>
                : <><ChevronRight className="h-3.5 w-3.5" /> Next Question</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
