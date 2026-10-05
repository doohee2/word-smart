import React, { useEffect, useState } from "react";
import { X, AudioLines, PlayCircle, Volume2, Mic2 } from "lucide-react";
import clsx from "clsx";
import { useTTSSettings } from "@/providers/TTSSettingsProvider";

interface TTSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TTSSettingsModal({ isOpen, onClose }: TTSSettingsModalProps) {
  const { settings, updateSettings } = useTTSSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeVoiceLang, setActiveVoiceLang] = useState<'en' | 'ja' | 'ko'>('en');

  useEffect(() => {
    if (!isOpen) return;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      
      // 애플 기기의 특수 효과음(Novelty) 음성 블랙리스트
      const APPLE_NOVELTY_VOICES = [
        'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 
        'Deranged', 'Good News', 'Hysterical', 'Pipe Organ', 'Trinoids', 
        'Whisper', 'Wobble', 'Zarvox', 'Jester', 'Organ', 'Superstar'
      ];

      setVoices(allVoices.filter(v => {
        // 블랙리스트에 포함된 이름이 있는지 확인
        if (APPLE_NOVELTY_VOICES.some(novelty => v.name.includes(novelty))) return false;
        
        if (activeVoiceLang === 'en' && !v.lang.startsWith('en')) return false;
        if (activeVoiceLang === 'ja' && !v.lang.startsWith('ja')) return false;
        if (activeVoiceLang === 'ko' && !v.lang.startsWith('ko')) return false;
        
        return true;
      }));
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [isOpen, activeVoiceLang]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-surface-container-high rounded-3xl p-5 w-full max-w-md shadow-lg flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-container text-on-primary-container rounded-full">
              <AudioLines size={24} />
            </div>
            <h2 className="text-title-lg font-bold text-on-surface">음성 및 사운드 설정</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Section: TTS 목소리 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-label-lg font-bold flex items-center gap-2 text-primary">
              <Mic2 size={18} /> 발음 억양 (Voice)
            </h3>
            
            <div className="flex bg-surface-container rounded-xl p-1 gap-1">
              {[
                { id: 'en', label: '영어' },
                { id: 'ja', label: '일본어' },
                { id: 'ko', label: '한자/한국어' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setActiveVoiceLang(lang.id as 'en' | 'ja' | 'ko')}
                  className={clsx(
                    "flex-1 py-1.5 text-label-sm font-bold rounded-lg transition-colors",
                    activeVoiceLang === lang.id
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <select
              className="w-full p-2.5 rounded-xl bg-surface border border-outline text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              value={activeVoiceLang === 'en' ? (settings.ttsVoiceURI_en || settings.ttsVoiceURI) : activeVoiceLang === 'ja' ? settings.ttsVoiceURI_ja : settings.ttsVoiceURI_ko}
              onChange={(e) => {
                if (activeVoiceLang === 'en') updateSettings({ ttsVoiceURI_en: e.target.value, ttsVoiceURI: e.target.value }); // update legacy field too
                else if (activeVoiceLang === 'ja') updateSettings({ ttsVoiceURI_ja: e.target.value });
                else if (activeVoiceLang === 'ko') updateSettings({ ttsVoiceURI_ko: e.target.value });
              }}
            >
              <option value="">기본 목소리 (Default)</option>
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Section: TTS 세부 설정 */}
          <div className="flex flex-col gap-3 bg-surface-container rounded-2xl p-3 border border-outline-variant/30">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm">
                <span>발화 속도 (Rate)</span>
                <span className="font-mono">{settings.ttsRate.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="1.5" step="0.1" 
                value={settings.ttsRate} 
                onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm">
                <span>음높이 (Pitch)</span>
                <span className="font-mono">{settings.ttsPitch.toFixed(1)}</span>
              </div>
              <input 
                type="range" min="0.0" max="2.0" step="0.1" 
                value={settings.ttsPitch} 
                onChange={(e) => updateSettings({ ttsPitch: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm">
                <span>TTS 볼륨</span>
                <span className="font-mono">{Math.round(settings.ttsVolume * 100)}%</span>
              </div>
              <input 
                type="range" min="0.0" max="1.0" step="0.1" 
                value={settings.ttsVolume} 
                onChange={(e) => updateSettings({ ttsVolume: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Section: 자동 재생 모드 */}
          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-2xl border border-outline-variant/30 cursor-pointer hover:bg-surface-variant/50 transition-colors">
            <input 
              type="checkbox" 
              checked={settings.autoTTS}
              onChange={(e) => updateSettings({ autoTTS: e.target.checked })}
              className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
            />
            <span className="text-body-lg font-bold text-on-surface flex items-center gap-2">
              <PlayCircle size={18} /> 단어 자동 읽기
            </span>
          </label>

          {/* Section: 사운드 효과음 설정 */}
          <div className="flex flex-col gap-2 p-3 bg-surface-container rounded-2xl border border-outline-variant/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!settings.isSfxMuted}
                onChange={(e) => updateSettings({ isSfxMuted: !e.target.checked })}
                className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
              />
              <span className="text-body-lg font-bold text-on-surface flex items-center gap-2">
                <Volume2 size={18} /> 효과음 켜기
                <span className="text-label-sm font-mono text-primary bg-primary-container px-2 py-0.5 rounded-md ml-1">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </span>
            </label>

            <div className={clsx("flex flex-col transition-opacity duration-300 pl-8", settings.isSfxMuted ? "opacity-50 pointer-events-none" : "opacity-100")}>
              <input 
                type="range" min="0.0" max="1.0" step="0.1" 
                value={settings.sfxVolume} 
                onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>

        </div>

        <button 
          onClick={onClose}
          className="mt-1 w-full py-2.5 bg-primary text-on-primary rounded-xl text-label-lg font-bold hover:bg-primary/90 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
