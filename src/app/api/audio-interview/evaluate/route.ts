import { getAuthUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getProvider, REPORT_MODEL } from "@/lib/ai/registry";
import { GoogleGenAI } from "@google/genai";

const log = createLogger("api/audio-interview/evaluate");

async function transcribe(buffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: buffer.toString("base64") } },
        { text: "Transcribe this audio accurately. Return only the spoken words, no labels." },
      ],
    }],
  });
  return result.text?.trim() ?? "";
}

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

    let transcript = "";
    try {
      transcript = await transcribe(buffer, mimeType);
    } catch (err) {
      log.error("Transcription failed:", err);
      return Response.json({ error: "Transcription failed. Check GEMINI_API_KEY." }, { status: 500 });
    }

    if (!transcript) {
      return Response.json({ error: "No speech detected in the recording." }, { status: 400 });
    }

    const provider = getProvider(REPORT_MODEL);
    const evalPrompt = `You are an expert interview evaluator. A candidate answered the following interview question via audio (max ${maxSeconds}s).

Question: "${question}"

Candidate's transcribed answer: "${transcript}"

Evaluate and return ONLY valid JSON:
{
  "score": <integer 1-10>,
  "verdict": "<Excellent|Good|Average|Poor>",
  "summary": "<1-2 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "delivery": "<brief note on clarity and confidence>"
}`;

    const evalResponse = await provider.generateResponse({
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.2,
      maxTokens: 512,
      model: REPORT_MODEL,
    });

    let evaluation: Record<string, unknown> = {};
    try {
      const jsonMatch = evalResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) evaluation = JSON.parse(jsonMatch[0]);
    } catch {
      evaluation = { score: 5, verdict: "Average", summary: evalResponse.content };
    }

    return Response.json({ transcript, evaluation });
  } catch (err) {
    log.error("Evaluate error:", err);
    return Response.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
