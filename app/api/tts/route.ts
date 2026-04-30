import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { beatContent } = await request.json();

    if (!beatContent) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'cR39HTrtXbjvEP4CNYFx';
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

    if (!apiKey) {
      console.warn("ElevenLabs API key is missing");
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: beatContent,
      model_id: modelId,
      output_format: "mp3_44100_128",
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(`[TTS API] Generated buffer: ${buffer.length} bytes, voiceId: ${voiceId}, model: ${modelId}`);

    if (buffer.length === 0) {
      console.error("[TTS API] ElevenLabs returned an empty audio buffer!");
      return NextResponse.json({ error: "Empty audio returned from ElevenLabs" }, { status: 502 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
