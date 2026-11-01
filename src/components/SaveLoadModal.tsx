/**
 * Save / Load Game & Settings Modal
 */
import React, { useState } from 'react';
import { GameState } from '../types/game';
import { TRANSLATIONS, Language } from '../localization/translations';
import { exportSaveToFile, getSaveSlots, importSaveFromFile, saveGameToStorage, loadGameFromStorage, SaveMetadata } from '../utils/saveManager';
import { sfx } from '../audio/soundFx';
import { 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Globe, 
  CheckCircle,
  X,
  FileText
} from 'lucide-react';

interface SaveLoadModalProps {
  gameState: GameState;
  lang: Language;
  isMuted: boolean;
  onClose: () => void;
  onLoadState: (state: GameState) => void;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  gameState,
  lang,
  isMuted,
  onClose,
  onLoadState,
  onToggleSound,
  onToggleLanguage,
}) => {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'save' | 'load' | 'settings'>('save');
  const [slots, setSlots] = useState<(SaveMetadata | null)[]>(getSaveSlots());
  const [notification, setNotification] = useState<string | null>(null);

  const handleSave = (slotId: string, name: string) => {
    sfx.playCoin();
    const success = saveGameToStorage(slotId, gameState, name);
    if (success) {
      setSlots(getSaveSlots());
      setNotification(`سەیڤکرا لە [${name}]!`);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleLoad = (slotId: string) => {
    sfx.playClick();
    const state = loadGameFromStorage(slotId);
    if (state) {
      onLoadState(state);
      setNotification('یاری بە سەرکەوتوویی بارکرا!');
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1000);
    }
  };

  const handleExport = () => {
    sfx.playClick();
    exportSaveToFile(gameState);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const loaded = await importSaveFromFile(file);
        sfx.playClick();
        onLoadState(loaded);
        setNotification('فایلی سەیڤ بە سەرکەوتوویی خوێندرایەوە!');
        setTimeout(() => {
          setNotification(null);
          onClose();
        }, 1200);
      } catch (err) {
        alert('هەڵە ڕوویدا لە خوێندنەوەی فایلی سەیڤ');
      }
    }
  };

  const toggleFullscreen = () => {
    sfx.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const slotKeys = [
    { id: 'auto', name: 'ئۆتۆ سەیڤ (Auto Save)' },
    { id: 'slot1', name: 'سەیڤی گشتی ١ (Slot 1)' },
    { id: 'slot2', name: 'سەیڤی گشتی ٢ (Slot 2)' },
    { id: 'slot3', name: 'سەیڤی گشتی ٣ (Slot 3)' },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pointer-events-auto backdrop-blur-none animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full p-6 text-stone-100 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-200">
                {t.saveGame} & {t.settings}
              </h2>
              <p className="text-xs text-stone-400">
                بەڕێوەبردنی سەیڤ و هێنانەوەی یاری و ڕێکخستنی شاشە و دەنگ
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 border-b border-stone-800 pb-3 mb-4">
          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('save');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'save'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {t.saveGame}
          </button>

          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('load');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'load'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.loadGame}
          </button>

          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('settings');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {t.settings}
          </button>
        </div>

        {/* Notification banner */}
        {notification && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {activeTab === 'save' && (
            <div className="space-y-3">
              {slotKeys.map((slot, idx) => {
                const meta = slots[idx];

                return (
                  <div
                    key={slot.id}
                    className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-stone-200">{slot.name}</h4>
                      {meta ? (
                        <div className="text-xs text-stone-400 mt-1">
                          ڕۆژی {meta.day} • {meta.dinars} دینار • {meta.troopCount} سەرباز •{' '}
                          {new Date(meta.savedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-500 italic mt-1">بەتاڵە (سەیڤ نەکراوە)</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSave(slot.id, slot.name)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow"
                    >
                      {t.saveGameBtn}
                    </button>
                  </div>
                );
              })}

              {/* JSON Export */}
              <div className="pt-2 border-t border-stone-800">
                <button
                  onClick={handleExport}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-stone-700"
                >
                  <Download className="w-4 h-4" />
                  داگرتنی فایلی سەیڤ وەک دۆسیە (Export JSON Save)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'load' && (
            <div className="space-y-3">
              {slotKeys.map((slot, idx) => {
                const meta = slots[idx];

                return (
                  <div
                    key={slot.id}
                    className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-stone-200">{slot.name}</h4>
                      {meta ? (
                        <div className="text-xs text-stone-400 mt-1">
                          ڕۆژی {meta.day} • {meta.dinars} دینار • {meta.troopCount} سەرباز •{' '}
                          {new Date(meta.savedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-500 italic mt-1">بەتاڵە</div>
                      )}
                    </div>

                    <button
                      disabled={!meta}
                      onClick={() => handleLoad(slot.id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold rounded-xl text-xs transition shadow"
                    >
                      {t.loadGameBtn}
                    </button>
                  </div>
                );
              })}

              {/* JSON Import */}
              <div className="pt-2 border-t border-stone-800">
                <label className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-stone-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  بارکردن لە فایلی دەرەکی (Import JSON Save)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-stone-200">زمان (Language)</div>
                  <div className="text-xs text-stone-400">گۆڕینی زمانی یاری نێوان کوردی و ئینگلیزی</div>
                </div>
                <button
                  onClick={() => {
                    sfx.playClick();
                    onToggleLanguage();
                  }}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-amber-300"
                >
                  {lang === 'ku' ? 'کوردی سۆرانی' : 'English'}
                </button>
              </div>

              <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-stone-200">دەنگی کلیک و کاریگەرییەکان (SFX)</div>
                  <div className="text-xs text-stone-400">بێدەنگکردن یان چالاککردنی دەنگ</div>
                </div>
                <button
                  onClick={() => {
                    sfx.playClick();
                    onToggleSound();
                  }}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-2"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  {isMuted ? t.soundOff : t.soundOn}
                </button>
              </div>

              <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-stone-200">تەواوی شاشە (Fullscreen)</div>
                  <div className="text-xs text-stone-400">شاشەی تەواو بۆ مۆبایل و کۆمپیوتەر</div>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-2"
                >
                  <Maximize2 className="w-4 h-4 text-purple-400" />
                  {t.fullscreen}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
