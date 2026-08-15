import { getAuthUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getProvider, REPORT_MODEL } from "@/lib/ai/registry";

const log = createLogger("api/audio-interview/evaluate");

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const question = formData.get("question") as string | null;
    const maxSeconds = Number(formData.get("maxSeconds") ?? 120);

    if (!file || !question) {
      return Response.json({ error: "file and question are required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/webm";
    const audioBase64 = buffer.toString("base64");

    const provider = getProvider(REPORT_MODEL);

    // Step 1: transcribe
    let transcript = "";
    try {
      const transcribeRes = await provider.generateResponse({
        messages: [
          {
            role: "user",
            content: [
              { type: "inline_audio", mimeType, data: audioBase64 },
              { type: "text", text: "Transcribe this audio accurately. Return only the spoken words, no labels or commentary." },
            ],
          },
        ],
        temperature: 0.1,
        maxTokens: 512,
        model: REPORT_MODEL,
      });
      transcript = transcribeRes.content.trim();
    } catch (err) {
      log.error("Transcription failed:", err);
      return Response.json({ error: "Transcription failed." }, { status: 500 });
    }

    if (!transcript) {
      return Response.json({ error: "No speech detected in the recording." }, { status: 400 });
    }

    // Step 2: evaluate
    const evalPrompt = `You are an expert interview evaluator. A candidate answered the following interview question via audio (max ${maxSeconds}s).

Question: "${question}"

Candidate's transcribed answer: "${transcript}"

Evaluate and return ONLY valid JSON (no markdown fences):
{
  "score": <integer 1-10>,
  "verdict": "<Excellent|Good|Average|Poor>",
  "summary": "<1-2 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "delivery": "<brief note on clarity and confidence>"
}`;

    let evaluation: Record<string, unknown> = {};
    try {
      const evalRes = await provider.generateResponse({
        messages: [{ role: "user", content: evalPrompt }],
        temperature: 0.2,
        maxTokens: 512,
        model: REPORT_MODEL,
      });
      const match = evalRes.content.match(/\{[\s\S]*\}/);
      if (match) evaluation = JSON.parse(match[0]);
    } catch (err) {
      log.error("Evaluation failed:", err);
      evaluation = { score: 5, verdict: "Average", summary: "Could not evaluate.", strengths: [], improvements: [], delivery: "" };
    }

    return Response.json({ transcript, evaluation });
  } catch (err) {
    log.error("Evaluate error:", err);
    return Response.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
