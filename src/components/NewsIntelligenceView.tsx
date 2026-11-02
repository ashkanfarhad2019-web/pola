/**
 * News Dispatches & Spymaster Intelligence Network Panel
 */
import React, { useState } from 'react';
import { GameState, NewsDispatch, Settlement, SpyAgent } from '../types/game';
import { Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { 
  Eye, 
  Newspaper, 
  ShieldAlert, 
  Swords, 
  Coins, 
  Skull, 
  TrendingUp, 
  UserPlus, 
  AlertCircle, 
  Flame, 
  Droplet, 
  X,
  Castle,
  KeyRound
} from 'lucide-react';

interface NewsIntelligenceViewProps {
  gameState: GameState;
  lang: Language;
  onClose: () => void;
  onRecruitSpy: (settlementId: string) => void;
  onSpySabotage: (spyId: string, actionType: 'poison_water' | 'burn_granary' | 'bribe_gate') => void;
}

export const NewsIntelligenceView: React.FC<NewsIntelligenceViewProps> = ({
  gameState,
  lang,
  onClose,
  onRecruitSpy,
  onSpySabotage,
}) => {
  const [tab, setTab] = useState<'news' | 'spies'>('news');
  const [selectedTargetCity, setSelectedTargetCity] = useState<string>('eis_capital');
  const [sabotageFeedback, setSabotageFeedback] = useState<string | null>(null);

  const spies = gameState.player.spies || [];
  const newsList = gameState.news || [];
  const playerDinars = gameState.player.dinars;

  const handleSabotage = (spyId: string, action: 'poison_water' | 'burn_granary' | 'bribe_gate') => {
    sfx.playClick();
    onSpySabotage(spyId, action);
    if (action === 'poison_water') {
      setSabotageFeedback('بیری ئاوی دەرەوە بە سەرکەوتوویی ژەهراوی کرا! ئازووقە و خۆڕاگری قەڵاکە دابەزی.');
    } else if (action === 'burn_granary') {
      setSabotageFeedback('ئاگر بەربووە کۆگای گەنمی شارەکە! ئازووقە و داهاتی شارەکە زەرەرمەند بوو.');
    } else {
      setSabotageFeedback('دەرگاوانی قەڵا بەرتیلی پێدرا! لە کاتی هێرشدا دەروازە ئاسانتر دەکرێتەوە.');
    }
    setTimeout(() => setSabotageFeedback(null), 4000);
  };

  return (
    <div className="absolute inset-0 z-30 bg-stone-950/95 flex flex-col pointer-events-auto backdrop-blur-none text-stone-100 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-200">
              هەواڵە گرنگەکان و تۆڕی سیخوڕان
            </h1>
            <p className="text-xs text-stone-400">
              چاودێری ڕووداوە هەستیارەکانی جیهان، دزەکردنە ناو قەڵاکان و پیلانگێڕی
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sfx.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-semibold transition"
        >
          <X className="w-4 h-4" />
          داخستن
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 border-b border-stone-800 text-sm">
        <button
          onClick={() => {
            sfx.playClick();
            setTab('news');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            tab === 'news'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          هەواڵە گرنگەکانی جیهان ({newsList.length})
        </button>

        <button
          onClick={() => {
            sfx.playClick();
            setTab('spies');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            tab === 'spies'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          تۆڕی سیخوڕان و ئۆپەراسیۆن ({spies.length})
        </button>
      </div>

      {/* Sabotage Toast */}
      {sabotageFeedback && (
        <div className="mx-6 mt-3 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{sabotageFeedback}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* NEWS TAB */}
        {tab === 'news' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 flex items-center justify-between">
              <span>ئەم بەشە تەنها ڕووداوە ستراتیژی و گرنگەکانی جیهان تۆمار دەکات؛ هیچ پڕوپاگەندە و هەواڵی بێ کەڵکی تێدا نییە.</span>
              <span className="text-amber-400 font-bold">ڕۆژی: {gameState.day}</span>
            </div>

            {newsList.map((item) => {
              const fac = item.factionId ? gameState.factions[item.factionId] : null;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      {item.type === 'war' && (
                        <div className="p-1.5 rounded-lg bg-red-950 border border-red-500/50 text-red-300">
                          <Swords className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'peace' && (
                        <div className="p-1.5 rounded-lg bg-blue-950 border border-blue-500/50 text-blue-300">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'scandal' && (
                        <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/50 text-purple-300">
                          <Skull className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'market' && (
                        <div className="p-1.5 rounded-lg bg-yellow-950 border border-yellow-500/50 text-yellow-300">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'spy_report' && (
                        <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-300">
                          <Eye className="w-4 h-4" />
                        </div>
                      )}

                      <span className="font-bold text-sm text-stone-200">{item.titleKu}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      {fac && (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                          style={{ backgroundColor: fac.color }}
                        >
                          {fac.nameKu}
                        </span>
                      )}
                      <span className="text-stone-500">ڕۆژی {item.day}</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed font-normal">
                    {item.contentKu}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* SPIES TAB */}
        {tab === 'spies' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Recruit Spy Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 border border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-600/20 border border-amber-500/40 text-amber-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-100">
                    دامەزراندنی سیخوڕی نوێ (Recruit Covert Operative)
                  </h3>
                  <p className="text-xs text-stone-400">
                    تێچووی سەرەتایی: ۳٥۰ دینار | مووچەی ڕۆژانەی سیخوڕ: ۲٥ دینار
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedTargetCity}
                  onChange={(e) => setSelectedTargetCity(e.target.value)}
                  className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-xl px-3 py-2.5 outline-none font-medium flex-1 md:w-56"
                >
                  {Object.values(gameState.settlements).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameKu} ({s.type === 'town' ? 'شار' : 'قەڵا'})
                    </option>
                  ))}
                </select>

                <button
                  disabled={playerDinars < 350}
                  onClick={() => {
                    sfx.playCoin();
                    onRecruitSpy(selectedTargetCity);
                  }}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold rounded-xl text-xs transition shadow-lg shrink-0 flex items-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  دامەزراندن و دزەکردن
                </button>
              </div>
            </div>

            {/* Active Spies List */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 font-bold">
                سیخوڕە چالاکەکان لە شار و قەڵاکاندا
              </h3>

              {spies.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-stone-900/40 border border-stone-800/60 text-stone-500 text-xs">
                  هیچ سیخوڕێکت لە شارەکانی تر دانەمەزراندووە. سیخوڕێک بنێرە بۆ ئاشکراکردنی هەواڵی نهێنی و لاوازییەکانی قەڵای دوژمن!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {spies.map((spy) => {
                    const targetCity = gameState.settlements[spy.targetSettlementId];
                    const intel = spy.lastIntel;

                    return (
                      <div
                        key={spy.id}
                        className="p-5 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <div>
                            <div className="font-bold text-sm text-amber-300">{spy.nameKu}</div>
                            <div className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                              <Castle className="w-3.5 h-3.5 text-stone-500" />
                              <span>مەڵبەند: {targetCity?.nameKu || 'نەزانراو'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                              پۆشراوی: {spy.coverIntegrity}%
                            </span>
                            <div className="text-[10px] text-stone-500 mt-1">
                              {spy.infiltratedDays} ڕۆژ لەم شارەدایە
                            </div>
                          </div>
                        </div>

                        {/* Classified Intel Card */}
                        {intel ? (
                          <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800/80 space-y-2 text-xs">
                            <div className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>دۆسیەی زانیاری نهێنی سیخوڕ:</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1 text-center border-y border-stone-800/60">
                              <div>
                                <span className="text-stone-400 text-[10px] block">پاسەوان</span>
                                <span className="font-bold text-stone-200">{intel.garrisonCount} کەس</span>
                              </div>
                              <div>
                                <span className="text-stone-400 text-[10px] block">ئازووقە</span>
                                <span className="font-bold text-amber-300">{intel.foodDays} ڕۆژ</span>
                              </div>
                              <div>
                                <span className="text-stone-400 text-[10px] block">ئاستی دیوار</span>
                                <span className="font-bold text-purple-300">{intel.defenseLevel}/5</span>
                              </div>
                            </div>

                            <div className="text-stone-300 text-[11px] pt-1 italic">
                              "{intel.secretRumorKu}"
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-stone-400 italic">
                            سیخوڕ سەرقاڵی کۆکردنەوەی زانیاری سەرەتاییە...
                          </div>
                        )}

                        {/* Covert Sabotage Actions */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] text-stone-400 font-bold block">
                            ئۆپەراسیۆنە نهێنییەکان (Covert Sabotage):
                          </span>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              disabled={playerDinars < 180}
                              onClick={() => handleSabotage(spy.id, 'poison_water')}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 border border-stone-700 text-stone-200 text-[11px] font-semibold flex flex-col items-center gap-1 transition"
                            >
                              <Droplet className="w-4 h-4 text-cyan-400" />
                              <span>ژەهری ئاو</span>
                              <span className="text-[10px] text-yellow-400 font-bold">۱۸۰ د</span>
                            </button>

                            <button
                              disabled={playerDinars < 220}
                              onClick={() => handleSabotage(spy.id, 'burn_granary')}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 border border-stone-700 text-stone-200 text-[11px] font-semibold flex flex-col items-center gap-1 transition"
                            >
                              <Flame className="w-4 h-4 text-orange-400" />
                              <span>سووتانی کۆگا</span>
                              <span className="text-[10px] text-yellow-400 font-bold">۲۲۰ د</span>
                            </button>

                            <button
                              disabled={playerDinars < 350}
                              onClick={() => handleSabotage(spy.id, 'bribe_gate')}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 border border-stone-700 text-stone-200 text-[11px] font-semibold flex flex-col items-center gap-1 transition"
                            >
                              <KeyRound className="w-4 h-4 text-amber-400" />
                              <span>بەرتیلی دەرگەوان</span>
                              <span className="text-[10px] text-yellow-400 font-bold">۳٥۰ د</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
