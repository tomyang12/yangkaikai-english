import { useCallback, useMemo } from 'react';

export default function useSpeech() {
  const supported = useMemo(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }, []);

  const speak = useCallback((word) => {
    if (!supported) return;

    // 取消当前播放的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // 尝试选择英文语音
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, [supported]);

  return { speak, supported };
}
