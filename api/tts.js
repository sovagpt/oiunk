async textToSpeech(text) {
    try {
        console.log('🎙️ Generating Porky speech with ElevenLabs...');
        this.updateStatus('🎙️ Porky is warming up his voice...');
        
        // Call our TTS API
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                text: text,
                voice: 'porky'
            })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log('✅ ElevenLabs speech ready, playing...');
            
            return new Promise((resolve) => {
                const audio = new Audio(audioUrl);
                
                audio.oncanplaythrough = () => {
                    audio.play();
                };
                
                audio.onended = () => {
                    console.log('🎙️ Porky finished speaking');
                    URL.revokeObjectURL(audioUrl); // Clean up memory
                    resolve();
                };
                
                audio.onerror = (error) => {
                    console.error('ElevenLabs audio playback failed:', error);
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
            });
        } else {
            throw new Error(`TTS API error: ${response.status}`);
        }
    } catch (error) {
        console.error('ElevenLabs TTS error, falling back to browser TTS:', error);
        this.updateStatus('⚠️ Using backup voice...');
        
        // Fallback to browser TTS
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                utterance.volume = 0.8;
                
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(voice => 
                    voice.name.includes('Google') || 
                    voice.name.includes('Microsoft') ||
                    voice.lang.includes('en-US')
                );
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }
                
                utterance.onend = resolve;
                utterance.onerror = resolve;
                
                speechSynthesis.speak(utterance);
            } else {
                setTimeout(resolve, text.length * 50);
            }
        });
    }
}
