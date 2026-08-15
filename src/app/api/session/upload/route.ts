import { createLogger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const log = createLogger("api/session/upload");

async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: buffer.toString("base64") } },
          { text: "Transcribe this audio response accurately. Return only the transcription text, no labels or commentary." },
        ],
      }],
    });
    return result.text?.trim() ?? null;
  } catch (err) {
    log.warn("Transcription failed:", err);
    return null;
  }
}

/**
 * Upload a file (audio recording or screenshot) to Supabase Storage.
 *
 * Expects multipart FormData with:
 *   - file: Blob/File
 *   - sessionId: string
 *   - type: "recording" | "screenshot"
 *   - filename: string (optional, used as the storage path suffix)
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const sessionId = formData.get("sessionId") as string | null;
    const type = formData.get("type") as string | null;
    const filename = formData.get("filename") as string | null;

    if (!file || !sessionId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, sessionId, type" },
        { status: 400 },
      );
    }

    if (type !== "recording" && type !== "screenshot" && type !== "audio_answer") {
      return NextResponse.json(
        { error: 'type must be "recording", "screenshot", or "audio_answer"' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // For audio answers (AUDIO question type), transcribe and return immediately
    if (type === "audio_answer") {
      const mimeType = file.type || "audio/webm";
      const transcript = await transcribeAudio(buffer, mimeType);
      return NextResponse.json({ transcript });
    }

    const bucket = type === "recording" ? "recordings" : "screenshots";
    const defaultExt = type === "recording"
      ? (file.type?.includes("mp4") || file.type?.includes("m4a") ? "m4a" : "webm")
      : "jpg";
    const storagePath = `${sessionId}/${filename || `${Date.now()}.${defaultExt}`}`;

    const defaultContentType = type === "recording"
      ? (file.type?.includes("mp4") ? "audio/mp4" : "audio/webm")
      : "image/jpeg";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || defaultContentType,
        upsert: false,
      });

    if (uploadError) {
      log.error("Storage error:", bucket, uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 },
      );
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

    if (signedError || !signedData?.signedUrl) {
      log.error("Signed URL error:", bucket, signedError);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      path: storagePath,
      bucket,
    });
  } catch (err) {
    log.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
