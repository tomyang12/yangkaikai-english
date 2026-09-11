import { useCallback, useMemo, useRef, useEffect } from 'react';
import TTS_MANIFEST from '../data/tts-manifest.json';

// —— 神经语音音频库（edge-tts 预生成），查不到的文本回退浏览器合成 ——

// 浏览器 TTS 高质量语音优选（命中率从高到低）
const PREFERRED_VOICE_PATTERNS = [
  /Google US English/i,
  /Microsoft (Aria|Jenny|Michelle|Guy|Ana|Emma|Brian)/i, // Edge/Win 自然语音
  /Samantha|Karen|Moira/i,                               // Apple 高质量语音
  /^en-US/i,
  /^en[-_]/i,
];

export default function useSpeech() {
  const supported = useMemo(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }, []);

  const audioRef = useRef(null);
  const voicesRef = useRef([]);

  // voices 列表是异步加载的：必须监听 voiceschanged，否则永远拿空列表选不到好语音
  useEffect(() => {
    if (!supported) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices() || []; };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, [supported]);

  const pickVoice = useCallback(() => {
    const voices = voicesRef.current;
    for (const pattern of PREFERRED_VOICE_PATTERNS) {
      const hit = voices.find(v => pattern.test(v.name) || pattern.test(v.lang));
      if (hit) return hit;
    }
    return voices.find(v => v.lang?.startsWith('en')) || null;
  }, []);

  // 浏览器合成兜底
  const speakFallback = useCallback((text) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    // 短文本（单词）更慢更清晰，长句稍快显自然
    const words = text.trim().split(/\s+/).length;
    u.rate = words <= 3 ? 0.8 : 0.92;
    u.pitch = 1.05;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }, [supported, pickVoice]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speak = useCallback((text) => {
    if (!text) return;
    stop();
    const file = TTS_MANIFEST[text.trim()];
    if (file) {
      // 神经语音（自然儿童音色）
      const base = import.meta.env.BASE_URL || '/';
      const audio = new Audio(`${base}audio/t/${file}.mp3`);
      audioRef.current = audio;
      audio.play().catch(() => speakFallback(text)); // 资源缺失/自动播放拦截时兜底
    } else {
      speakFallback(text);
    }
  }, [stop, speakFallback]);

  return { speak, supported: supported || Object.keys(TTS_MANIFEST).length > 0 };
}
