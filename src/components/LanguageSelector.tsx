import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  testPhrase: string;
}

const supportedLanguages: Language[] = [
  { code: 'en-US', name: 'English (US)', testPhrase: 'Hello, this is a test' },
  { code: 'en-GB', name: 'English (UK)', testPhrase: 'Hello, this is a test' },
  { code: 'sw-KE', name: 'Swahili (Kenya)', testPhrase: 'Hujambo, hii ni jaribio' },
  { code: 'sw-TZ', name: 'Swahili (Tanzania)', testPhrase: 'Habari, hii ni mtihani' },
  { code: 'ar', name: 'Arabic', testPhrase: 'مرحبا، هذا اختبار' },
  { code: 'fr', name: 'French', testPhrase: 'Bonjour, ceci est un test' },
  { code: 'es', name: 'Spanish', testPhrase: 'Hola, esto es una prueba' }
];

export function LanguageSelector() {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(supportedLanguages[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      console.log('🌍 Available voices loaded:', voices.length);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const testLanguage = (language: Language) => {
    if (isSpeaking) return;

    console.log(`🗣️ Testing ${language.name}: "${language.testPhrase}"`);
    setIsSpeaking(true);

    // Find best voice for this language
    const voice = availableVoices.find(v => v.lang === language.code) ||
                  availableVoices.find(v => v.lang.startsWith(language.code.split('-')[0])) ||
                  availableVoices[0];

    const utterance = new SpeechSynthesisUtterance(language.testPhrase);
    utterance.rate = 0.8;
    utterance.volume = 1.0;
    utterance.lang = language.code;

    if (voice) {
      utterance.voice = voice;
      console.log(`🎙️ Using voice: ${voice.name} (${voice.lang})`);
    }

    utterance.onstart = () => {
      console.log(`🎤 ${language.name} speech started`);
    };

    utterance.onend = () => {
      console.log(`✅ ${language.name} speech completed`);
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error(`❌ ${language.name} speech error:`, e.error);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  };

  const getVoiceCount = (langCode: string) => {
    return availableVoices.filter(v => 
      v.lang === langCode || v.lang.startsWith(langCode.split('-')[0])
    ).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Language & Voice Test</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {supportedLanguages.map((language) => {
          const voiceCount = getVoiceCount(language.code);
          const hasVoices = voiceCount > 0;

          return (
            <div key={language.code} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{language.name}</span>
                  <Badge variant={hasVoices ? "default" : "secondary"}>
                    {voiceCount} voices
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{language.testPhrase}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testLanguage(language)}
                disabled={isSpeaking || !hasVoices}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>• Click the speaker button to test each language</p>
        <p>• Available voices depend on your operating system</p>
        <p>• Windows typically has more language support</p>
      </div>
    </div>
  );
}