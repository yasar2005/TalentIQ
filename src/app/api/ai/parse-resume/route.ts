import OpenAI from "openai";
import { getAuthUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { extractPdfText } from "@/lib/pdf-extract";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
const log = createLogger("api/ai/parse-resume");

const SYSTEM_PROMPT = `You are an expert resume parser. Extract candidate information from the uploaded resume and return a JSON object with the following fields (use null for missing fields):

{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "gender": "Male" | "Female" | "Other" | null,
  "birthday": "YYYY-MM format" | null,
  "education": "College" | "Bachelor" | "Master" | "PhD" | "MBA" | "Other" | null,
  "school": "Most recent school name",
  "major": "Field of study",
  "graduationYear": number | null,
  "workExperience": "Less than one year" | "1 - 3 years" | "3 - 5 years" | "5 - 10 years" | "More than 10 years" | null,
  "notes": "Brief summary of key skills and experience (1-2 sentences)"
}

Rules:
- For workExperience, estimate from the resume dates
- For education, map the highest degree to one of the exact options listed
- Extract ALL contact info including email and phone carefully
- Return ONLY the JSON object, no markdown fences, no explanation`;

type ClientType =
  | { type: "openai"; client: OpenAI; model: string }
  | { type: "gemini"; provider: GeminiProvider; model: string };

function getClient(): ClientType {
  if (process.env.MINIMAX_API_KEY) {
    return {
      type: "openai",
      client: new OpenAI({
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.chat/v1",
      }),
      model: "MiniMax-Text-01",
    };
  }
  if (process.env.KIMI_API_KEY) {
    return {
      type: "openai",
      client: new OpenAI({
        apiKey: process.env.KIMI_API_KEY,
        baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
      }),
      model: "moonshot-v1-32k",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      type: "openai",
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4o-mini",
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      type: "gemini",
      provider: new GeminiProvider(),
      model: "gemini-2.0-flash",
    };
  }
  throw new Error("No LLM provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, KIMI_API_KEY, or MINIMAX_API_KEY.");
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Extract text locally using pdf-parse (preserves emails reliably)
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";
    try {
      resumeText = await extractPdfText(buffer);
    } catch (pdfErr) {
      log.warn("pdf extraction failed:", pdfErr);
    }

    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from this PDF. Please try a different file or copy-paste the resume text manually." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const clientConfig = getClient();

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const messages = [
            {
              role: "system" as const,
              content: `${SYSTEM_PROMPT}\n\nThe following is the full text extracted from the candidate's resume. Parse it carefully and extract ALL fields including email and phone:\n\n${resumeText}`,
            },
            {
              role: "user" as const,
              content: "Parse this resume and return the JSON object with all extracted fields.",
            },
          ];

          const sendToken = (token: string) => {
            for (let i = 0; i < token.length; i += 80) {
              const piece = token.slice(i, i + 80);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: piece })}\n\n`),
              );
            }
          };

          if (clientConfig.type === "gemini") {
            for await (const chunk of clientConfig.provider.streamResponse({
              messages,
              temperature: 0.1,
              maxTokens: 1024,
              model: clientConfig.model,
            })) {
              sendToken(chunk);
            }
          } else {
            const stream = await clientConfig.client.chat.completions.create({
              model: clientConfig.model,
              messages,
              temperature: 0.1,
              max_tokens: 1024,
              stream: true,
            });
            for await (const chunk of stream) {
              const token = chunk.choices[0]?.delta?.content;
              if (token) sendToken(token);
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          log.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    log.error("Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
