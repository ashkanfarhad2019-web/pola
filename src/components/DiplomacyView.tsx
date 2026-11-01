/**
 * Deep Realm Politics, Treaties, Fealty & Faction Diplomacy Panel
 */
import React, { useState } from 'react';
import { Faction, FactionId, GameState, Lord, RealmPolicy } from '../types/game';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { 
  Crown, 
  Swords, 
  Handshake, 
  ShieldCheck, 
  Scroll, 
  Coins, 
  Users, 
  AlertTriangle,
  X,
  Scale
} from 'lucide-react';

interface DiplomacyViewProps {
  gameState: GameState;
  lang: Language;
  onClose: () => void;
  onDeclareWar: (targetFactionId: FactionId) => void;
  onProposePeace: (targetFactionId: FactionId) => void;
  onSignTradePact: (targetFactionId: FactionId) => void;
  onSignDefensivePact: (targetFactionId: FactionId) => void;
  onBribeLord: (lordId: string) => void;
  onTogglePolicy: (policyId: string) => void;
  onFoundKingdom: () => void;
}

export const DiplomacyView: React.FC<DiplomacyViewProps> = ({
  gameState,
  lang,
  onClose,
  onDeclareWar,
  onProposePeace,
  onSignTradePact,
  onSignDefensivePact,
  onBribeLord,
  onTogglePolicy,
  onFoundKingdom,
}) => {
  const t = TRANSLATIONS[lang];
  const [selectedFactionId, setSelectedFactionId] = useState<FactionId>('valoria');
  const [tab, setTab] = useState<'realms' | 'policies' | 'lords'>('realms');

  const selectedFaction = gameState.factions[selectedFactionId];
  const isPlayerKingdom = gameState.player.factionId === 'player_kingdom';
  const playerHasFief = gameState.player.fiefIds.length > 0;

  // Active treaties for selected faction
  const activeWars = selectedFaction?.treaties.filter((t) => t.type === 'war') || [];
  const activeTradePacts = selectedFaction?.treaties.filter((t) => t.type === 'trade') || [];

  return (
    <div className="absolute inset-0 z-30 bg-stone-950/95 flex flex-col pointer-events-auto backdrop-blur-none text-stone-100 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-300">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-200">{t.diplomacyTitle}</h1>
            <p className="text-xs text-stone-400">هاوسەنگی هێز، پەیماننامەکان، دڵسۆزی سەردارەکان و یاساکانی حوکمڕانی</p>
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
          {t.leaveSettlement}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 border-b border-stone-800 text-sm">
        <button
          onClick={() => {
            sfx.playClick();
            setTab('realms');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            tab === 'realms'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Crown className="w-4 h-4" />
          {t.factionsList}
        </button>

        <button
          onClick={() => {
            sfx.playClick();
            setTab('policies');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            tab === 'policies'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Scroll className="w-4 h-4" />
          {t.policiesTitle}
        </button>

        <button
          onClick={() => {
            sfx.playClick();
            setTab('lords');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            tab === 'lords'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Users className="w-4 h-4" />
          سەردار و فەرماندەکان
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* REALMS & TREATIES TAB */}
        {tab === 'realms' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Faction selector list */}
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2 font-bold">
                {t.factionsList}
              </h3>
              {(Object.keys(gameState.factions) as FactionId[]).map((fId) => {
                const fac = gameState.factions[fId];
                if (fId === 'player_kingdom' && !isPlayerKingdom) return null;
                const isSelected = selectedFactionId === fId;

                return (
                  <button
                    key={fId}
                    onClick={() => {
                      sfx.playClick();
                      setSelectedFactionId(fId);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-stone-800 border-amber-500/70 shadow-lg'
                        : 'bg-stone-900/60 border-stone-800 hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-8 rounded-full"
                        style={{ backgroundColor: fac.color }}
                      />
                      <div>
                        <div className="font-bold text-sm text-stone-200">
                          {lang === 'ku' ? fac.nameKu : fac.name}
                        </div>
                        <div className="text-xs text-stone-400">
                          {lang === 'ku' ? fac.rulerKu : fac.ruler}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-stone-400">{t.militaryStrength}</div>
                      <div className="font-bold text-sm text-stone-200">{fac.militaryPower}</div>
                    </div>
                  </button>
                );
              })}

              {/* Found Kingdom CTA if player has captured land */}
              {!isPlayerKingdom && (
                <div className="mt-4 p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center">
                  <h4 className="text-sm font-bold text-purple-300 mb-1">
                    {t.rebelAndFoundKingdom}
                  </h4>
                  <p className="text-xs text-stone-400 mb-3">
                    {playerHasFief
                      ? 'تۆ خاوەنی قەڵایت! دەتوانیت تاجی سەربەخۆیی بخەیتە سەر سەرت!'
                      : 'پێویستە سەرەتا بە سوپاکەت شارێک یان قەڵایەک بگریت بۆ ئەوەی شانشین دابمەزرێنیت.'}
                  </p>
                  <button
                    disabled={!playerHasFief}
                    onClick={() => {
                      sfx.playVictory();
                      onFoundKingdom();
                    }}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold rounded-lg text-xs transition shadow-lg"
                  >
                    ڕاگەیاندنی تاجی سەربەخۆ
                  </button>
                </div>
              )}
            </div>

            {/* Selected Faction Detail */}
            {selectedFaction && (
              <div className="md:col-span-2 space-y-6">
                <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-amber-200">
                        {lang === 'ku' ? selectedFaction.nameKu : selectedFaction.name}
                      </h2>
                      <div className="text-sm text-stone-400">
                        فەرمانڕەوا:{' '}
                        <span className="text-stone-200 font-semibold">
                          {lang === 'ku' ? selectedFaction.rulerKu : selectedFaction.ruler}
                        </span>
                      </div>
                    </div>

                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20"
                      style={{ backgroundColor: selectedFaction.color }}
                    >
                      خەزێنە: {selectedFaction.treasury.toLocaleString()} دینار
                    </div>
                  </div>

                  <p className="text-sm text-stone-300 mb-4 leading-relaxed">
                    {lang === 'ku' ? selectedFaction.descriptionKu : selectedFaction.description}
                  </p>

                  <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 mb-6 text-xs text-amber-300">
                    <span className="font-bold">تایبەتمەندی: </span>
                    {lang === 'ku' ? selectedFaction.specialtyKu : selectedFaction.specialty}
                  </div>

                  {/* Active Treaties */}
                  <div className="mb-6">
                    <h4 className="text-xs uppercase tracking-wider text-stone-400 mb-2 font-bold">
                      شەڕ و پەیمانە چالاکەکان
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeWars.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300">
                          <Swords className="w-4 h-4 text-red-400" />
                          <span>لە شەڕدایە لەگەڵ: {gameState.factions[w.targetFactionId]?.nameKu}</span>
                        </div>
                      ))}
                      {activeTradePacts.map((tp, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-300">
                          <Handshake className="w-4 h-4 text-blue-400" />
                          <span>پەیمانی بازرگانی: {gameState.factions[tp.targetFactionId]?.nameKu}</span>
                        </div>
                      ))}
                      {activeWars.length === 0 && activeTradePacts.length === 0 && (
                        <div className="text-stone-500 italic p-2">هیچ پەیماننامەیەکی تایبەت نییە</div>
                      )}
                    </div>
                  </div>

                  {/* Diplomatic Actions Bar */}
                  {selectedFactionId !== 'player_kingdom' && (
                    <div className="border-t border-stone-800 pt-5">
                      <h4 className="text-xs uppercase tracking-wider text-stone-400 mb-3 font-bold">
                        کردارە سیاسییەکانت بەرامبەر ئەم وڵاتە
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                          onClick={() => {
                            sfx.playWarHorn();
                            onDeclareWar(selectedFactionId);
                          }}
                          className="p-3 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold transition flex flex-col items-center gap-1.5 shadow"
                        >
                          <Swords className="w-4 h-4 text-red-400" />
                          {t.declareWar}
                        </button>

                        <button
                          onClick={() => {
                            sfx.playClick();
                            onProposePeace(selectedFactionId);
                          }}
                          className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold transition flex flex-col items-center gap-1.5 shadow"
                        >
                          <Handshake className="w-4 h-4 text-emerald-400" />
                          {t.proposePeace}
                        </button>

                        <button
                          onClick={() => {
                            sfx.playCoin();
                            onSignTradePact(selectedFactionId);
                          }}
                          className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold transition flex flex-col items-center gap-1.5 shadow"
                        >
                          <Coins className="w-4 h-4 text-amber-400" />
                          {t.tradeAgreement}
                        </button>

                        <button
                          onClick={() => {
                            sfx.playClick();
                            onSignDefensivePact(selectedFactionId);
                          }}
                          className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold transition flex flex-col items-center gap-1.5 shadow"
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-400" />
                          {t.defensiveAlliance}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* POLICIES TAB */}
        {tab === 'policies' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 mb-4 shadow-xl">
              <h3 className="text-base font-bold text-amber-300 mb-1 flex items-center gap-2">
                <Scroll className="w-5 h-5 text-amber-400" />
                {t.policiesTitle} (Imperial Decrees & Decrees)
              </h3>
              <p className="text-xs text-stone-400">
                یاسا و پەیڕەوەکان کاریگەری ڕاستەوخۆیان هەیە لەسەر داهات، باجی خەڵک، خێرایی سەربازگرتن و ناڕەزایەتی یان خۆشگوزەرانی هاوڵاتیان.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameState.policies.map((p) => {
                const isActive = p.isActive;

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-lg'
                        : 'bg-stone-900/70 border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-stone-200 text-sm">
                          {lang === 'ku' ? p.nameKu : p.name}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            isActive
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {isActive ? 'چالاکە' : 'ناچالاکە'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                        {lang === 'ku' ? p.descriptionKu : p.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                      <div className="text-xs text-stone-400">
                        کاریگەری:{' '}
                        {p.taxBonusPercent !== 0 && (
                          <span className={p.taxBonusPercent > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {p.taxBonusPercent > 0 ? `+${p.taxBonusPercent}% باج ` : `${p.taxBonusPercent}% باج `}
                          </span>
                        )}
                        {p.recruitmentCostDiscount > 0 && (
                          <span className="text-emerald-400 font-bold">
                            -{p.recruitmentCostDiscount}% نرخی سەرباز{' '}
                          </span>
                        )}
                        {p.orderBonus !== 0 && (
                          <span className={p.orderBonus > 0 ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
                            {p.orderBonus > 0 ? `+${p.orderBonus} ئارامی` : `${p.orderBonus} ناڕەزایەتی`}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          sfx.playClick();
                          onTogglePolicy(p.id);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                          isActive
                            ? 'bg-red-900 hover:bg-red-800 text-red-200'
                            : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        }`}
                      >
                        {isActive ? t.revokePolicy : t.adoptPolicy}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LORDS & PERSUASION TAB */}
        {tab === 'lords' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 mb-4 shadow-xl">
              <h3 className="text-base font-bold text-amber-300 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                سەردار و فەرماندەکانی جیهان
              </h3>
              <p className="text-xs text-stone-400">
                هەر سەردارێک خاوەنی کەسایەتی، سامان و سوپای تایبەت بە خۆیەتی. دەتوانیت بە پێشکەشکردنی زێڕ یان مڵک پەیوەندیت لەگەڵیان بەهێز بکەیت بۆ ئەوەی ببنە دۆستت.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(gameState.lords).map((lord) => {
                const fac = gameState.factions[lord.factionId];
                const totalTroops = lord.troops.reduce((a, b) => a + b.count, 0);

                return (
                  <div
                    key={lord.id}
                    className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-stone-200">
                            {lang === 'ku' ? lord.nameKu : lord.name}
                          </h4>
                          <div className="text-xs text-stone-400">
                            {lang === 'ku' ? lord.titleKu : lord.title} • {lang === 'ku' ? fac?.nameKu : fac?.name}
                          </div>
                        </div>

                        <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-purple-300 border border-stone-700">
                          {lord.personality}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-stone-400 my-3 bg-stone-950/50 p-2.5 rounded-xl border border-stone-800/80">
                        <div>سەرباز: <span className="font-bold text-stone-200">{totalTroops}</span></div>
                        <div>سامان: <span className="font-bold text-amber-400">{lord.wealth}</span></div>
                        <div>پەیوەندی: <span className={`font-bold ${lord.relationWithPlayer >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{lord.relationWithPlayer}</span></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                      <span className="text-xs text-stone-500">مڵک: {lord.fiefIds.length} شار</span>
                      <button
                        disabled={gameState.player.dinars < 500}
                        onClick={() => {
                          sfx.playCoin();
                          onBribeLord(lord.id);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold text-xs transition"
                      >
                        {t.bribeLord}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
