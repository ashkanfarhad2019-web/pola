/**
 * Simplified & Clean City/Castle View
 * Designed for intuitive mobile & desktop navigation with clear Kurdish options
 */
import React, { useState } from 'react';
import { GameState, GoodId, Settlement, Workshop } from '../types/game';
import { TRADE_GOODS, TROOP_CATALOG } from '../data/worldData';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { 
  Building2, 
  Store, 
  Beer, 
  ShieldAlert, 
  Factory, 
  Coins, 
  Users, 
  Crown,
  ChevronLeft,
  X,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';

interface CityViewProps {
  settlement: Settlement;
  gameState: GameState;
  lang: Language;
  onClose: () => void;
  onBuyGood: (settlementId: string, goodId: GoodId, quantity: number) => void;
  onSellGood: (settlementId: string, goodId: GoodId, quantity: number) => void;
  onRecruitTroop: (troopId: string, count: number) => void;
  onBuyWorkshop: (settlementId: string, workshopType: Workshop['type']) => void;
  onInitiateSiege: (settlementId: string) => void;
  onChangeTaxRate: (settlementId: string, rate: Settlement['taxRate']) => void;
}

export const CityView: React.FC<CityViewProps> = ({
  settlement,
  gameState,
  lang,
  onClose,
  onBuyGood,
  onSellGood,
  onRecruitTroop,
  onBuyWorkshop,
  onInitiateSiege,
  onChangeTaxRate,
}) => {
  const t = TRANSLATIONS[lang];
  // 'hub' = main menu, 'market', 'tavern', 'keep', 'workshops', 'siege'
  const [currentSection, setCurrentSection] = useState<'hub' | 'market' | 'tavern' | 'keep' | 'workshops' | 'siege'>('hub');
  const [tradeQuantity, setTradeQuantity] = useState<number>(5);

  const faction = gameState.factions[settlement.factionId];
  const lordOwner = gameState.lords[settlement.lordOwnerId];
  const isPlayerOwned = settlement.lordOwnerId === 'player' || gameState.player.fiefIds.includes(settlement.id);

  const currentWeight = Object.entries(gameState.player.inventory).reduce((acc, [goodKey, count]) => {
    const item = TRADE_GOODS[goodKey as GoodId];
    return acc + (item ? item.weight * (count || 0) : 0);
  }, 0);

  const totalGarrison = settlement.garrison.reduce((acc, g) => acc + g.count, 0);
  const playerTroopCount = gameState.player.troops.reduce((acc, t) => acc + t.count, 0);

  return (
    <div className="absolute inset-0 z-40 bg-stone-950/95 flex flex-col pointer-events-auto text-stone-100 animate-fade-in overflow-hidden select-none">
      {/* Top Bar with Settlement Banner */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border border-white/20 shadow-md"
            style={{ backgroundColor: faction?.color || '#475569' }}
          >
            {settlement.type === 'town' ? '🏛️' : '🏰'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-wide text-amber-200">
                {lang === 'ku' ? settlement.nameKu : settlement.name}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {settlement.type === 'town' ? 'شار' : 'قەڵا'}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {lang === 'ku' ? faction?.nameKu : faction?.name} • فەرمانڕەوا:{' '}
              <span className="text-stone-300 font-semibold">
                {lordOwner ? (lang === 'ku' ? lordOwner.nameKu : lordOwner.name) : 'تۆ (پاشا)'}
              </span>
            </p>
          </div>
        </div>

        {/* Dinars & Leave Button */}
        <div className="flex items-center gap-3">
          <div className="bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm font-bold text-yellow-300 tabular-nums">
              {gameState.player.dinars.toLocaleString()} دینار
            </span>
          </div>

          <button
            onClick={() => {
              sfx.playClick();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold transition shadow"
          >
            <X className="w-4 h-4" />
            <span>{t.leaveSettlement}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* 1. MAIN CITY HUB (Simple, Visual Action Cards) */}
        {currentSection === 'hub' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Quick City Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-900/80 border border-stone-800 p-4 rounded-2xl text-center shadow-lg">
              <div>
                <div className="text-xs text-stone-400">دانیشتووان</div>
                <div className="text-base font-bold text-stone-200 mt-0.5">{settlement.population.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">ئاوەدانی (Prosperity)</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{settlement.prosperity}%</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">پاسەوانی ناوەوە</div>
                <div className="text-base font-bold text-purple-300 mt-0.5">{totalGarrison} {t.troops}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">خۆراکی کۆگا</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">{settlement.foodReservesDays} ڕۆژ</div>
              </div>
            </div>

            {/* Simple Visual Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Card 1: Marketplace */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('market');
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/70 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-105 transition">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-amber-200 transition">
                    🏛️ بازاڕی شار (Marketplace)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    کڕین و فرۆشتنی گەنم، گۆشت، ئاسن، چەک و بەهارات بەپێی یاسای خستنەڕوو و داخوازی.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-amber-400 flex items-center gap-1">
                  <span>چوونە ناو بازاڕ</span>
                  <span>←</span>
                </div>
              </button>

              {/* Card 2: Recruit Troops in Tavern */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('tavern');
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-purple-500/70 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3 group-hover:scale-105 transition">
                    <Beer className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-purple-200 transition">
                    ⚔️ وەرگرتنی سەرباز (Recruit)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    بەکرێگرتنی سەرباز، پیادەی قەڵغانبەدەست و کەواندار بۆ سوپاکەت.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-purple-400 flex items-center gap-1">
                  <span>وەرگرتنی سەرباز</span>
                  <span>←</span>
                </div>
              </button>

              {/* Card 3: Lord's Keep */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('keep');
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-blue-500/70 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 mb-3 group-hover:scale-105 transition">
                    <Crown className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-blue-200 transition">
                    🏰 کۆشکی فەرمانڕەوا (Lord Keep)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    دیدار لەگەڵ فەرمانڕەوا یان بەڕێوەبردنی باجی شار ئەگەر خاوەنی بیت.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-blue-400 flex items-center gap-1">
                  <span>چوونە ناو کۆشک</span>
                  <span>←</span>
                </div>
              </button>

              {/* Card 4: Workshops */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('workshops');
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-emerald-500/70 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 mb-3 group-hover:scale-105 transition">
                    <Factory className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-emerald-200 transition">
                    ⚒️ کڕینی کارگە (Workshops)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    وەبەرهێنان لە کارگەی ئاسن، مەیخانە یان ئاوریشم بۆ قازانجی بەردەوامی ڕۆژانە.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span>بینینی کارگەکان</span>
                  <span>←</span>
                </div>
              </button>

              {/* Card 5: Siege Operation */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('siege');
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-red-500/70 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 mb-3 group-hover:scale-105 transition">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-red-200 transition">
                    🛡️ گەمارۆدان و گرتنی شار (Siege)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    هێرشکردنە سەر شووراکانی شار بە سوپایەکی گەورە بۆ گرتن و حوکمڕانیکردنی!
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-red-400 flex items-center gap-1">
                  <span>ئۆپەراسیۆنی سەربازی</span>
                  <span>←</span>
                </div>
              </button>

              {/* Card 6: Exit */}
              <button
                onClick={() => {
                  sfx.playClick();
                  onClose();
                }}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-stone-600 p-5 rounded-2xl text-left transition flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 mb-3">
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100">
                    🚪 دەرچوون بۆ نەخشە
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    گەڕانەوە بۆ نەخشەی جیهان و بەردەوامبوون لە سەفەرەکەت.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-stone-300 flex items-center gap-1">
                  <span>دەرچوون</span>
                  <span>←</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. SIMPLE MARKETPLACE */}
        {currentSection === 'market' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {/* Header & Back */}
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('hub');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ناو شار</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">بڕ بۆ هەر کلیک:</span>
                {[1, 5, 20].map((qty) => (
                  <button
                    key={qty}
                    onClick={() => {
                      sfx.playClick();
                      setTradeQuantity(qty);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      tradeQuantity === qty
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    {qty}x
                  </button>
                ))}
              </div>
            </div>

            {/* Cargo status */}
            <div className="text-xs text-stone-400 px-2 flex justify-between">
              <span>کێشی بارەکەت: {currentWeight} / {gameState.player.maxCargoWeight} kg</span>
              <span className="text-amber-400 font-semibold">یاسای ئابووری: کڕینی زۆر نرخ بەرز دەکاتەوە!</span>
            </div>

            {/* Simple Grid of Trade Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(TRADE_GOODS) as GoodId[]).map((goodKey) => {
                const itemDef = TRADE_GOODS[goodKey];
                const marketItem = settlement.market[goodKey];
                const playerHas = gameState.player.inventory[goodKey] || 0;
                if (!marketItem) return null;

                const canBuy = marketItem.stock >= tradeQuantity &&
                  gameState.player.dinars >= marketItem.buyPrice * tradeQuantity &&
                  currentWeight + itemDef.weight * tradeQuantity <= gameState.player.maxCargoWeight;

                const canSell = playerHas >= tradeQuantity;

                return (
                  <div
                    key={goodKey}
                    className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="font-bold text-sm text-stone-100">
                        {lang === 'ku' ? itemDef.nameKu : itemDef.name}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        کۆگای شار: <span className="text-stone-300 font-semibold">{marketItem.stock}</span> • لای تۆ:{' '}
                        <span className="text-purple-300 font-bold">{playerHas}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Buy Button */}
                      <button
                        disabled={!canBuy}
                        onClick={() => {
                          sfx.playCoin();
                          onBuyGood(settlement.id, goodKey, tradeQuantity);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-stone-950 font-bold text-xs transition flex flex-col items-center"
                      >
                        <span>کڕین ({tradeQuantity}x)</span>
                        <span className="text-[10px]">{marketItem.buyPrice * tradeQuantity}z</span>
                      </button>

                      {/* Sell Button */}
                      <button
                        disabled={!canSell}
                        onClick={() => {
                          sfx.playCoin();
                          onSellGood(settlement.id, goodKey, tradeQuantity);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold text-xs transition flex flex-col items-center"
                      >
                        <span>فرۆشتن ({tradeQuantity}x)</span>
                        <span className="text-[10px]">+{marketItem.sellPrice * tradeQuantity}z</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. SIMPLE RECRUITMENT */}
        {currentSection === 'tavern' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('hub');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ناو شار</span>
              </button>
              <span className="text-xs text-stone-400">سەربازگرتن بۆ ناو لەشکرەکەت</span>
            </div>

            <div className="space-y-3">
              {['recruit', 'footman', 'militia_archer'].map((troopKey) => {
                const tDef = TROOP_CATALOG[troopKey];
                if (!tDef) return null;
                const costFor5 = tDef.recruitCost * 5;
                const canAfford = gameState.player.dinars >= costFor5;

                return (
                  <div
                    key={troopKey}
                    className="p-4 bg-stone-900/90 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-100 text-base">
                          {lang === 'ku' ? tDef.nameKu : tDef.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-bold border border-stone-700">
                          پلەی {tDef.tier}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-stone-400 mt-1">
                        <span>هێزی لێدان: <b className="text-red-400">{tDef.meleeAttack || tDef.rangedAttack}</b></span>
                        <span>زرێ: <b className="text-blue-400">{tDef.armor}</b></span>
                        <span>تەندروستی: <b className="text-emerald-400">{tDef.maxHp} HP</b></span>
                      </div>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        sfx.playWarHorn();
                        onRecruitTroop(troopKey, 5);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold text-xs transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>وەرگرتنی ٥ سەرباز ({costFor5} دینار)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. SIMPLE WORKSHOPS */}
        {currentSection === 'workshops' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('hub');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ناو شار</span>
              </button>
              <span className="text-xs text-emerald-400 font-semibold">داهاتی ڕۆژانەی کارگەکان مسۆگەرە</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'brewery', name: 'Royal Brewery', nameKu: 'مەیخانەی شاهانە', cost: 4500, dailyProfit: 130 },
                { type: 'iron_forge', name: 'Master Iron Smelter', nameKu: 'کارگەی توانەوەی ئاسن', cost: 5500, dailyProfit: 175 },
                { type: 'weaver', name: 'Fine Silk & Wool Weavery', nameKu: 'کارگەی چنین و بەرگ', cost: 5000, dailyProfit: 150 },
                { type: 'tannery', name: 'Highland Leather Tannery', nameKu: 'کارگەی چەرم و پێستە', cost: 4200, dailyProfit: 120 },
              ].map((w) => {
                const isOwned = gameState.player.workshops.some((pWs) => pWs.type === w.type);

                return (
                  <div
                    key={w.type}
                    className="p-4 bg-stone-900/90 border border-stone-800 rounded-2xl flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <h4 className="font-bold text-stone-100 text-sm">{w.nameKu}</h4>
                      <div className="text-xs text-emerald-400 font-bold mt-1">
                        داهات: +{w.dailyProfit} دینار / ڕۆژ
                      </div>
                      <div className="text-xs text-stone-400 mt-2">
                        نرخی کڕین: <span className="font-bold text-yellow-400">{w.cost} دینار</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-800">
                      {!isOwned ? (
                        <button
                          disabled={gameState.player.dinars < w.cost}
                          onClick={() => {
                            sfx.playCoin();
                            onBuyWorkshop(settlement.id, w.type as Workshop['type']);
                          }}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold rounded-xl text-xs transition shadow"
                        >
                          کڕینی کارگە
                        </button>
                      ) : (
                        <div className="text-xs text-center font-bold text-emerald-400 py-2">
                          ✓ تۆ خاوەنی ئەم کارگەیەی
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SIMPLE KEEP & GOVERNANCE */}
        {currentSection === 'keep' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('hub');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ناو شار</span>
              </button>
              <span className="text-xs text-stone-400">کۆشکی فەرمانڕەوا</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
              {isPlayerOwned ? (
                <>
                  <div className="text-sm text-emerald-300 font-bold">
                    تۆ پاشا و خاوەنی ئەم شارەیت! دەتوانیت ئاستی باج دیاری بکەیت:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['low', 'normal', 'high', 'extortionate'] as const).map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          sfx.playClick();
                          onChangeTaxRate(settlement.id, rate);
                        }}
                        className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                          settlement.taxRate === rate
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                            : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                        }`}
                      >
                        <div className="capitalize">{rate}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-stone-300 space-y-2">
                  <p>
                    فەرمانڕەوای ئەم شارە لە کۆشکەکەی چاوەڕێیە. شارەکە سەر بە شانشینی {lang === 'ku' ? faction?.nameKu : faction?.name}ە.
                  </p>
                  <p className="text-xs text-stone-400">
                    ئەگەر دەتەوێت ئەم شارە بکەیتە موڵکی خۆت، پێویستە لە بەشی گەمارۆدان هێرش بکەیت و بیگریت.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. SIMPLE SIEGE ASSAULT */}
        {currentSection === 'siege' && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <button
                onClick={() => {
                  sfx.playClick();
                  setCurrentSection('hub');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ناو شار</span>
              </button>
              <span className="text-xs text-red-400 font-bold">ئۆپەراسیۆنی گەمارۆدان</span>
            </div>

            <div className="bg-stone-900/90 border border-red-900/50 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                  <div className="text-xs text-stone-400">بەرگریکارانی قەڵا</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{totalGarrison} {t.troops}</div>
                </div>

                <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                  <div className="text-xs text-stone-400">سوپاکەی تۆ</div>
                  <div className="text-2xl font-bold text-purple-300 mt-1">{playerTroopCount} {t.troops}</div>
                </div>
              </div>

              <button
                disabled={playerTroopCount < 10}
                onClick={() => {
                  sfx.playWarHorn();
                  onInitiateSiege(settlement.id);
                }}
                className="w-full py-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 disabled:opacity-40 text-white font-extrabold rounded-2xl text-sm transition shadow-2xl border border-red-500 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>هێرشکردنە سەر شووراکانی شار (دەستپێکردنی شەڕ)!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
