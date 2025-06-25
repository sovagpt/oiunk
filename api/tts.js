export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { text, voice } = req.body;
    
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Voice ID mapping
    let voiceId;
    if (voice === '19STyYD15bswVz51nqLf' || voice === 'perky') {
      voiceId = '19STyYD15bswVz51nqLf'; // Perky's voice
    } else {
      voiceId = '4YYIPFl9wE5c4L2eu2Gb'; // Porky's default voice
    }

    console.log(`Generating speech with ElevenLabs using voice: ${voiceId} (${voice === 'perky' || voice === '19STyYD15bswVz51nqLf' ? 'Perky' : 'Porky'})`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: voice === 'perky' || voice === '19STyYD15bswVz51nqLf' ? 0.6 : 0.4,
          similarity_boost: voice === 'perky' || voice === '19STyYD15bswVz51nqLf' ? 0.9 : 0.8,
          style: voice === 'perky' || voice === '19STyYD15bswVz51nqLf' ? 0.8 : 0.7,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

    console.log(`Speech generated successfully for ${voice === 'perky' || voice === '19STyYD15bswVz51nqLf' ? 'Perky' : 'Porky'}`);

  } catch (error) {
    console.error('TTS generation failed:', error);
    res.status(500).json({ error: error.message });
  }
} =
