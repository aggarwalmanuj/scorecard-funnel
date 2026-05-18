import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";

// TTS provider toggle. Default is xAI Grok. Set TTS_PROVIDER=elevenlabs to
// re-enable the legacy ElevenLabs path (kept intact below).
const PROVIDER = (process.env.TTS_PROVIDER || "xai").toLowerCase();

export async function POST(request: NextRequest) {
  try {
    const { beatContent } = await request.json();

    if (!beatContent) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (PROVIDER === "elevenlabs") {
      return await elevenLabsTts(beatContent);
    }

    return await xaiGrokTts(beatContent);

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function xaiGrokTts(text: string): Promise<NextResponse> {
  const apiKey = process.env.XAI_API_KEY;
  const voiceId = process.env.XAI_TTS_VOICE_ID || "eve";
  const language = process.env.XAI_TTS_LANGUAGE || "en";

  if (!apiKey) {
    console.warn("xAI API key is missing");
    return NextResponse.json({ error: 'xAI API key not configured' }, { status: 500 });
  }

  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      language,
      voice_id: voiceId,
      output_format: {
        codec: "mp3",
        sample_rate: 24000,
        bit_rate: 128000,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[TTS API] xAI request failed: ${res.status} ${res.statusText} ${errBody}`);
    return NextResponse.json({ error: `xAI TTS failed: ${res.status}` }, { status: 502 });
  }

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  console.log(`[TTS API] Generated buffer: ${buffer.length} bytes, provider: xai, voiceId: ${voiceId}`);

  if (buffer.length === 0) {
    console.error("[TTS API] xAI returned an empty audio buffer!");
    return NextResponse.json({ error: "Empty audio returned from xAI" }, { status: 502 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
    },
  });
}

// Legacy ElevenLabs path. Disabled by default; re-enable by setting
// TTS_PROVIDER=elevenlabs in the environment.
async function elevenLabsTts(text: string): Promise<NextResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'cR39HTrtXbjvEP4CNYFx';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

  if (!apiKey) {
    console.warn("ElevenLabs API key is missing");
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
  }

  const client = new ElevenLabsClient({ apiKey });

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: modelId,
    output_format: "mp3_44100_128",
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  console.log(`[TTS API] Generated buffer: ${buffer.length} bytes, provider: elevenlabs, voiceId: ${voiceId}, model: ${modelId}`);

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
}
