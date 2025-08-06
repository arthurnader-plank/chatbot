// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
    const data = await req.formData();
    const audio = data.get("file") as File;

    console.log("AUDIO", audio);

    const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
});

    return NextResponse.json({ text: transcription.text });
}
