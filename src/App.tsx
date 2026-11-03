/**
 * Main Application Entry Point
 * Steel & Crown: Medieval Realm (Steel and Flesh inspired RPG)
 */
import React, { useEffect, useRef, useState } from 'react';
import { CombatUnit, FactionId, GameState, GoodId, Party, Settlement, SpyAgent, TroopStack, Workshop } from './types/game';
import { createInitialGameState, simulateTick } from './utils/gameSimulation';
import { loadGameFromStorage, saveGameToStorage } from './utils/saveManager';
import { Language, TRANSLATIONS } from './localization/translations';
import { sfx } from './audio/soundFx';
import { WorldMap3D, MapCameraControls } from './components/WorldMap3D';
import { TacticalHUD } from './components/TacticalHUD';
import { CityView } from './components/CityView';
import { PartyView } from './components/PartyView';
import { DiplomacyView } from './components/DiplomacyView';
import { Battlefield3D } from './components/Battlefield3D';
import { SaveLoadModal } from './components/SaveLoadModal';
import { TitleScreen } from './components/TitleScreen';
import { LogView } from './components/LogView';
import { NewsIntelligenceView } from './components/NewsIntelligenceView';
import { SiegeCampModal } from './components/SiegeCampModal';
import { MilitaryEngine } from './systems/MilitaryEngine';
import { GameEventBus } from './systems/interfaces';
import { TRADE_GOODS, TROOP_CATALOG } from './data/worldData';
import { SiegeEngine, SiegeEngineType } from './types/game';

export default function App() {
  const [screen, setScreen] = useState<'title' | 'playing'>('title');
  const [lang, setLang] = useState<Language>('ku');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);

  // Active overlay view on top of 3D map
  const [activeView, setActiveView] = useState<'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log' | 'siege_camp'>('map');
  const [currentSettlementId, setCurrentSettlementId] = useState<string | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [activeSiegeSettlementId, setActiveSiegeSettlementId] = useState<string | null>(null);
  const [cameraControls, setCameraControls] = useState<MapCameraControls | null>(null);

  // Check if save file exists in storage
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(() => {
    return !!loadGameFromStorage('auto') || !!loadGameFromStorage('slot1');
  });

  // Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    return createInitialGameState();
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Sync language direction with HTML document
  useEffect(() => {
    document.documentElement.dir = lang === 'ku' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Main Simulation Loop (Ticks when playing and not paused)
  useEffect(() => {
    if (screen !== 'playing') return;

    let lastTime = performance.now();
    let frameId = 0;
    let prevDay = gameStateRef.current.day;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const current = gameStateRef.current;
      const next = simulateTick(current, dt);

      // Check if player arrived at a target settlement
      if (next.arrivedAtSettlementId) {
        const arrivingId = next.arrivedAtSettlementId;
        next.arrivedAtSettlementId = undefined;
        sfx.playCityEnter();
        setCurrentSettlementId(arrivingId);
        setSelectedSettlementId(null);
        setActiveView('city');
      }

      // Auto-save on day change
      if (next.day !== prevDay) {
        prevDay = next.day;
        saveGameToStorage('auto', next, 'Auto Save');
      }

      setGameState(next);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [screen]);

  // Handle setting player target coordinates on the map
  const handleSetDestination = (x: number, z: number, targetSettlementId?: string, targetPartyId?: string) => {
    setGameState((prev) => {
      const next = { ...prev };
      const playerParty = { ...next.parties['player_party'] };
      playerParty.targetX = x;
      playerParty.targetZ = z;
      playerParty.targetSettlementId = targetSettlementId;
      playerParty.targetPartyId = targetPartyId;
      next.parties = { ...next.parties, player_party: playerParty };
      if (!targetSettlementId) {
        next.targetDestinationName = undefined;
      }
      return next;
    });
  };

  // Handle selecting a settlement on map: opens contextual settlement inspector panel
  const handleSelectSettlement = (settlementId: string) => {
    const settlement = gameState.settlements[settlementId];
    if (!settlement) return;
    sfx.playClick();
    setSelectedSettlementId(settlementId);
  };

  // Direct march to settlement from the inspector panel
  const handleMarchToSettlement = (settlementId: string) => {
    const settlement = gameState.settlements[settlementId];
    if (!settlement) return;
    sfx.playTroopMarch();
    const settlementName = lang === 'ku' ? settlement.nameKu : settlement.name;
    handleSetDestination(settlement.x, settlement.z, settlementId);
    setGameState((prev) => ({
      ...prev,
      targetDestinationName: settlementName,
    }));
  };

  // Enter settlement directly from inspector
  const handleEnterSettlement = (settlementId: string) => {
    sfx.playCityEnter();
    setCurrentSettlementId(settlementId);
    setSelectedSettlementId(null);
    setActiveView('city');
  };

  // Handle interacting with an AI Party (Lord, Caravan, Bandit)
  const handleSelectParty = (partyId: string) => {
    const party = gameState.parties[partyId];
    if (!party) return;

    const playerParty = gameState.parties['player_party'];
    const dist = Math.hypot(playerParty.x - party.x, playerParty.z - party.z);

    if (dist < 8) {
      // Engage in tactical field battle!
      initiateBattle(party);
    } else {
      // March towards party to intercept
      handleSetDestination(party.x, party.z, undefined, partyId);
    }
  };

  // Start field combat encounter
  const initiateBattle = (enemyParty: Party) => {
    sfx.playWarHorn();

    // Spawn tactical combat units (Always includes the Commander Hero in person!)
    const playerUnits: CombatUnit[] = [
      {
        id: 'p_hero',
        troopId: 'player_hero',
        isPlayerSide: true,
        hp: 280,
        maxHp: 280,
        x: 0,
        z: 16,
        type: 'cavalry',
        order: 'charge',
        cooldown: 0,
        kills: 0,
        isDead: false,
      },
    ];
    let pIdx = 0;
    gameState.player.troops.forEach((stack) => {
      const tDef = TROOP_CATALOG[stack.troopId];
      for (let i = 0; i < stack.count; i++) {
        playerUnits.push({
          id: `p_${pIdx++}`,
          troopId: stack.troopId,
          isPlayerSide: true,
          hp: tDef ? tDef.maxHp : 80,
          maxHp: tDef ? tDef.maxHp : 80,
          x: (i % 8) * 3 - 12,
          z: 20 + Math.floor(i / 8) * 3,
          type: tDef ? tDef.type : 'infantry',
          order: 'charge',
          cooldown: Math.random() * 0.5,
          kills: 0,
          isDead: false,
        });
      }
    });

    const enemyUnits: CombatUnit[] = [];
    let eIdx = 0;
    enemyParty.troops.forEach((stack) => {
      const tDef = TROOP_CATALOG[stack.troopId];
      for (let i = 0; i < stack.count; i++) {
        enemyUnits.push({
          id: `e_${eIdx++}`,
          troopId: stack.troopId,
          isPlayerSide: false,
          hp: tDef ? tDef.maxHp : 80,
          maxHp: tDef ? tDef.maxHp : 80,
          x: (i % 8) * 3 - 12,
          z: -18 - Math.floor(i / 8) * 3,
          type: tDef ? tDef.type : 'infantry',
          order: 'charge',
          cooldown: Math.random() * 0.5,
          kills: 0,
          isDead: false,
        });
      }
    });

    setGameState((prev) => ({
      ...prev,
      battle: {
        isActive: true,
        enemyPartyId: enemyParty.id,
        isSiege: false,
        playerUnits,
        enemyUnits,
        initialPlayerCount: playerUnits.length,
        initialEnemyCount: enemyUnits.length,
        playerCasualties: 0,
        enemyCasualties: 0,
        lootDinars: enemyParty.dinars ? Math.floor(enemyParty.dinars * 0.6) : 250,
        lootItems: enemyParty.cargo || {},
        capturedPrisoners: [],
      },
    }));
  };

  // Start Siege assault
  const handleInitiateSiege = (
    settlementId: string,
    customEngines?: SiegeEngine[],
    wallBreaches?: number
  ) => {
    const s = gameState.settlements[settlementId];
    if (!s) return;

    sfx.playWarHorn();

    // Spawn player army (Led by the Commander Hero!)
    const playerUnits: CombatUnit[] = [
      {
        id: 'p_hero',
        troopId: 'player_hero',
        isPlayerSide: true,
        hp: 280,
        maxHp: 280,
        x: 0,
        z: 22,
        type: 'cavalry',
        order: 'charge',
        cooldown: 0,
        kills: 0,
        isDead: false,
      },
    ];
    let pIdx = 0;
    gameState.player.troops.forEach((stack) => {
      const tDef = TROOP_CATALOG[stack.troopId];
      for (let i = 0; i < stack.count; i++) {
        playerUnits.push({
          id: `ps_${pIdx++}`,
          troopId: stack.troopId,
          isPlayerSide: true,
          hp: tDef ? tDef.maxHp : 80,
          maxHp: tDef ? tDef.maxHp : 80,
          x: (i % 8) * 3.5 - 14,
          z: 26 + Math.floor(i / 8) * 3,
          type: tDef ? tDef.type : 'infantry',
          order: 'charge',
          cooldown: Math.random() * 0.5,
          kills: 0,
          isDead: false,
        });
      }
    });

    // Spawn garrison
    const enemyUnits: CombatUnit[] = [];
    let eIdx = 0;
    s.garrison.forEach((stack) => {
      const tDef = TROOP_CATALOG[stack.troopId];
      for (let i = 0; i < stack.count; i++) {
        enemyUnits.push({
          id: `eg_${eIdx++}`,
          troopId: stack.troopId,
          isPlayerSide: false,
          hp: tDef ? tDef.maxHp : 80,
          maxHp: tDef ? tDef.maxHp : 80,
          x: (i % 8) * 3.5 - 14,
          z: -16 - Math.floor(i / 8) * 2,
          type: tDef ? tDef.type : 'infantry',
          order: 'charge',
          cooldown: Math.random() * 0.5,
          kills: 0,
          isDead: false,
        });
      }
    });

    setActiveView('map');
    setGameState((prev) => ({
      ...prev,
      battle: {
        isActive: true,
        enemySettlementId: settlementId,
        isSiege: true,
        playerUnits,
        enemyUnits,
        initialPlayerCount: playerUnits.length,
        initialEnemyCount: enemyUnits.length,
        playerCasualties: 0,
        enemyCasualties: 0,
        lootDinars: Math.floor(s.population * 0.15),
        lootItems: { grain: 20, weapons: 5 },
        capturedPrisoners: [],
        siegeEngines: customEngines || s.siegeCamp?.engines,
        wallBreaches: wallBreaches !== undefined ? wallBreaches : (s.siegeCamp?.wallBreaches || 0),
      },
    }));
  };

  // Advanced Siege Camp Handlers
  const handleStartSiegeCamp = (settlementId: string) => {
    const militaryEngine = new MilitaryEngine();
    const eventBus = GameEventBus.getInstance();
    const result = militaryEngine.startSiegeCamp(gameState, settlementId, 'player_party', eventBus);
    setGameState((prev) => ({
      ...prev,
      settlements: { ...prev.settlements, [settlementId]: result.settlement },
      parties: { ...prev.parties, player_party: result.party },
      player: result.player,
      logs: [result.log, ...prev.logs.slice(0, 45)],
    }));
    setActiveSiegeSettlementId(settlementId);
    setActiveView('siege_camp');
  };

  const handleQueueSiegeEngine = (settlementId: string, engineType: SiegeEngineType) => {
    const militaryEngine = new MilitaryEngine();
    const eventBus = GameEventBus.getInstance();
    const result = militaryEngine.queueSiegeEngine(gameState, settlementId, engineType, eventBus);
    if (result.success) {
      setGameState((prev) => ({
        ...prev,
        settlements: { ...prev.settlements, [settlementId]: result.settlement },
        player: result.player,
      }));
    }
  };

  const handleDemandSurrender = (settlementId: string) => {
    const militaryEngine = new MilitaryEngine();
    const eventBus = GameEventBus.getInstance();
    const result = militaryEngine.executeSurrender(gameState, settlementId, eventBus);
    if (result.success) {
      setGameState((prev) => ({
        ...prev,
        settlements: { ...prev.settlements, [settlementId]: result.settlement },
        player: result.player,
        logs: [result.log, ...prev.logs.slice(0, 45)],
      }));
      setActiveSiegeSettlementId(null);
      setCurrentSettlementId(settlementId);
      setActiveView('city');
    }
  };

  const handleAbandonSiege = (settlementId: string) => {
    const militaryEngine = new MilitaryEngine();
    const eventBus = GameEventBus.getInstance();
    const result = militaryEngine.abandonSiegeCamp(gameState, settlementId, eventBus);
    setGameState((prev) => ({
      ...prev,
      settlements: { ...prev.settlements, [settlementId]: result.settlement },
      parties: { ...prev.parties, player_party: result.party },
      player: result.player,
      logs: [result.log, ...prev.logs.slice(0, 45)],
    }));
    setActiveSiegeSettlementId(null);
    setActiveView('map');
  };

  const handleOrderAssault = (settlementId: string) => {
    const s = gameState.settlements[settlementId];
    const engines = s?.siegeCamp?.engines;
    const breaches = s?.siegeCamp?.wallBreaches || 0;
    setActiveSiegeSettlementId(null);
    setActiveView('map');
    handleInitiateSiege(settlementId, engines, breaches);
  };

  // Finish Battle callback (Victory or Defeat)
  const handleFinishBattle = (
    result: 'victory' | 'defeat' | 'retreat',
    lootDinars: number,
    capturedPrisoners: TroopStack[]
  ) => {
    setGameState((prev) => {
      const next = { ...prev };
      const b = next.battle;

      if (result === 'victory') {
        next.player.dinars += lootDinars;
        next.player.renown += 20;

        // If it was a siege, flip settlement ownership to player!
        if (b?.isSiege && b.enemySettlementId) {
          const settlement = next.settlements[b.enemySettlementId];
          if (settlement) {
            settlement.factionId = 'player_kingdom';
            settlement.lordOwnerId = 'player';
            settlement.garrison = [
              { troopId: 'footman', count: 20, wounded: 0 },
              { troopId: 'militia_archer', count: 15, wounded: 0 },
            ];
            // Clear any active siege camp
            settlement.siegeCamp = undefined;
            settlement.underSiegeBy = undefined;
            settlement.siegeDays = undefined;
            next.player.isBesiegingSettlementId = undefined;

            if (!next.player.fiefIds.includes(settlement.id)) {
              next.player.fiefIds.push(settlement.id);
            }

            next.logs.unshift({
              id: `conquest_${settlement.id}_${next.day}`,
              day: next.day,
              hour: next.hour,
              textKu: `سەرکەوتنی مەزن! شاری ${settlement.nameKu} بە تەواوی ڕووخا و کەوتە ژێر حوکمڕانی تۆ!`,
              textEn: `Glorious Conquest! ${settlement.name} has fallen and is now under your domain!`,
              type: 'fief',
            });
          }
        }

        // If it was an enemy party, remove or scatter it
        if (b?.enemyPartyId && next.parties[b.enemyPartyId]) {
          delete next.parties[b.enemyPartyId];
        }
      } else if (result === 'defeat') {
        // Player defeated: loses 30% dinars and surviving mercenaries scatter
        next.player.dinars = Math.max(20, Math.floor(next.player.dinars * 0.7));
        next.player.troops = [];

        if (b?.isSiege && b.enemySettlementId) {
          const settlement = next.settlements[b.enemySettlementId];
          if (settlement) {
            settlement.siegeCamp = undefined;
            settlement.underSiegeBy = undefined;
            settlement.siegeDays = undefined;
          }
          next.player.isBesiegingSettlementId = undefined;
        }
      }

      next.battle = undefined;
      return next;
    });
  };

  // Trade: Buy Good (Strict Dynamic Supply & Demand)
  const handleBuyGood = (settlementId: string, goodId: GoodId, quantity: number) => {
    setGameState((prev) => {
      const next = { ...prev };
      const s = next.settlements[settlementId];
      if (!s) return prev;
      const mItem = s.market[goodId];
      if (!mItem || mItem.stock < quantity) return prev;

      const totalCost = mItem.buyPrice * quantity;
      if (next.player.dinars < totalCost) return prev;

      // Deduct dinars & stock
      next.player.dinars -= totalCost;
      mItem.stock -= quantity;

      // Dynamic supply & demand law: Purchasing stock causes local market prices to surge
      const goodDef = TRADE_GOODS[goodId];
      const targetStock = 35;
      const scarcity = Math.pow(targetStock / Math.max(mItem.stock, 2), 0.72);
      mItem.buyPrice = Math.max(2, Math.round(goodDef.basePrice * Math.min(3.5, Math.max(0.35, scarcity))));
      mItem.sellPrice = Math.max(1, Math.round(mItem.buyPrice * 0.76));

      // Add to inventory
      next.player.inventory[goodId] = (next.player.inventory[goodId] || 0) + quantity;

      return next;
    });
  };

  // Trade: Sell Good (Strict Dynamic Supply & Demand)
  const handleSellGood = (settlementId: string, goodId: GoodId, quantity: number) => {
    setGameState((prev) => {
      const next = { ...prev };
      const s = next.settlements[settlementId];
      if (!s) return prev;
      const mItem = s.market[goodId];
      if (!mItem) return prev;

      const playerHas = next.player.inventory[goodId] || 0;
      if (playerHas < quantity) return prev;

      const totalGain = mItem.sellPrice * quantity;
      next.player.dinars += totalGain;
      next.player.inventory[goodId] = playerHas - quantity;
      mItem.stock += quantity;

      // Dynamic supply & demand law: Flooding the market lowers prices
      const goodDef = TRADE_GOODS[goodId];
      const targetStock = 35;
      const scarcity = Math.pow(targetStock / Math.max(mItem.stock, 2), 0.72);
      mItem.buyPrice = Math.max(2, Math.round(goodDef.basePrice * Math.min(3.5, Math.max(0.35, scarcity))));
      mItem.sellPrice = Math.max(1, Math.round(mItem.buyPrice * 0.76));

      return next;
    });
  };

  // Recruit Troops from Tavern
  const handleRecruitTroop = (troopId: string, count: number) => {
    const tDef = TROOP_CATALOG[troopId];
    if (!tDef) return;
    const totalCost = tDef.recruitCost * count;
    if (gameState.player.dinars < totalCost) return;

    setGameState((prev) => {
      const next = { ...prev };
      next.player.dinars -= totalCost;

      const existingStack = next.player.troops.find((st) => st.troopId === troopId);
      if (existingStack) {
        existingStack.count += count;
      } else {
        next.player.troops.push({ troopId, count, wounded: 0 });
      }

      return next;
    });
  };

  // Upgrade Troops
  const handleUpgradeTroop = (troopId: string, targetTroopId: string, count: number) => {
    const currentDef = TROOP_CATALOG[troopId];
    const cost = (currentDef?.upgradeCost || 40) * count;
    if (gameState.player.dinars < cost) return;

    setGameState((prev) => {
      const next = { ...prev };
      const stack = next.player.troops.find((st) => st.troopId === troopId);
      if (!stack || stack.count < count) return prev;

      next.player.dinars -= cost;
      stack.count -= count;

      const targetStack = next.player.troops.find((st) => st.troopId === targetTroopId);
      if (targetStack) {
        targetStack.count += count;
      } else {
        next.player.troops.push({ troopId: targetTroopId, count, wounded: 0 });
      }

      // Filter out zero stacks
      next.player.troops = next.player.troops.filter((st) => st.count > 0);
      return next;
    });
  };

  // Disband Troops
  const handleDisbandTroop = (troopId: string, count: number) => {
    setGameState((prev) => {
      const next = { ...prev };
      const stack = next.player.troops.find((st) => st.troopId === troopId);
      if (!stack) return prev;

      stack.count = Math.max(0, stack.count - count);
      next.player.troops = next.player.troops.filter((st) => st.count > 0);
      return next;
    });
  };

  // Buy Workshop
  const handleBuyWorkshop = (settlementId: string, workshopType: Workshop['type']) => {
    const workshopDefaults = {
      brewery: { name: 'Royal Brewery', nameKu: 'مەیخانەی شاهانە', cost: 4500, dailyProfit: 130 },
      iron_forge: { name: 'Master Iron Smelter', nameKu: 'کارگەی توانەوەی ئاسن', cost: 5500, dailyProfit: 175 },
      weaver: { name: 'Silk & Wool Weavery', nameKu: 'کارگەی چنین و بەرگ', cost: 5000, dailyProfit: 150 },
      tannery: { name: 'Leather Tannery', nameKu: 'کارگەی پێستە و چەرم', cost: 4200, dailyProfit: 120 },
      oil_press: { name: 'Oil & Salt Mill', nameKu: 'ئاش و پاڵاوگە', cost: 4000, dailyProfit: 110 },
    };

    const def = workshopDefaults[workshopType];
    if (!def || gameState.player.dinars < def.cost) return;

    setGameState((prev) => {
      const next = { ...prev };
      next.player.dinars -= def.cost;

      const ws: Workshop = {
        id: `ws_${Date.now()}`,
        name: def.name,
        nameKu: def.nameKu,
        type: workshopType,
        ownerId: 'player',
        dailyProfit: def.dailyProfit,
        cost: def.cost,
      };

      next.player.workshops.push(ws);
      return next;
    });
  };

  // Diplomacy Actions
  const handleDeclareWar = (targetFactionId: FactionId) => {
    setGameState((prev) => {
      const next = { ...prev };
      const targetFaction = next.factions[targetFactionId];
      if (!targetFaction) return prev;

      targetFaction.relations['player_kingdom'] = -80;
      targetFaction.treaties.push({
        id: `war_player_${targetFactionId}`,
        targetFactionId: 'player_kingdom',
        type: 'war',
        durationDays: 40,
      });

      next.logs.unshift({
        id: `war_player_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `تۆ شەڕت ڕاگەیاند دژی ${targetFaction.nameKu}! لەشکرەکانت ئامادەن بۆ جەنگ.`,
        textEn: `You declared war against ${targetFaction.name}! Your armies take up arms.`,
        type: 'politics',
      });

      return next;
    });
  };

  const handleProposePeace = (targetFactionId: FactionId) => {
    setGameState((prev) => {
      const next = { ...prev };
      const targetFaction = next.factions[targetFactionId];
      if (!targetFaction) return prev;

      targetFaction.relations['player_kingdom'] = 0;
      targetFaction.treaties = targetFaction.treaties.filter(
        (t) => !(t.type === 'war' && t.targetFactionId === 'player_kingdom')
      );

      next.logs.unshift({
        id: `peace_player_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `پەیمانی ئاشتی واژۆکرا لەگەڵ ${targetFaction.nameKu}. دەستدرێژییەکان وەستێنران.`,
        textEn: `Peace treaty ratified with ${targetFaction.name}. Hostilities ceased.`,
        type: 'politics',
      });

      return next;
    });
  };

  const handleSignTradePact = (targetFactionId: FactionId) => {
    setGameState((prev) => {
      const next = { ...prev };
      const targetFaction = next.factions[targetFactionId];
      if (!targetFaction) return prev;

      targetFaction.treaties.push({
        id: `trade_player_${targetFactionId}`,
        targetFactionId: 'player_kingdom',
        type: 'trade',
        durationDays: 60,
      });

      next.logs.unshift({
        id: `trade_player_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `پەیمانی بازرگانی واژۆکرا لەگەڵ ${targetFaction.nameKu}! بازرگانان بە ئازادی هاتوچۆ دەکەن.`,
        textEn: `Trade pact established with ${targetFaction.name}! Merchant caravans flow freely.`,
        type: 'politics',
      });

      return next;
    });
  };

  const handleSignDefensivePact = (targetFactionId: FactionId) => {
    setGameState((prev) => {
      const next = { ...prev };
      const targetFaction = next.factions[targetFactionId];
      if (!targetFaction) return prev;

      targetFaction.relations['player_kingdom'] = 50;
      targetFaction.treaties.push({
        id: `def_player_${targetFactionId}`,
        targetFactionId: 'player_kingdom',
        type: 'defensive_pact',
        durationDays: 80,
      });

      return next;
    });
  };

  const handleBribeLord = (lordId: string) => {
    if (gameState.player.dinars < 500) return;

    setGameState((prev) => {
      const next = { ...prev };
      const lord = next.lords[lordId];
      if (!lord) return prev;

      next.player.dinars -= 500;
      lord.relationWithPlayer = Math.min(100, lord.relationWithPlayer + 20);

      next.logs.unshift({
        id: `bribe_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `٥٠٠ دیناری زێڕت پێشکەش بە ${lord.nameKu} کرد. دڵسۆزی بەرامبەر تۆ زیادی کرد (+20).`,
        textEn: `Offered 500 Gold Dinars to ${lord.name}. Fealty and favor increased (+20).`,
        type: 'politics',
      });

      return next;
    });
  };

  const handleTogglePolicy = (policyId: string) => {
    setGameState((prev) => {
      const next = { ...prev };
      const pol = next.policies.find((p) => p.id === policyId);
      if (pol) {
        pol.isActive = !pol.isActive;
      }
      return next;
    });
  };

  const handleFoundKingdom = () => {
    setGameState((prev) => {
      const next = { ...prev };
      next.player.factionId = 'player_kingdom';
      next.player.title = 'Sovereign High King';
      next.logs.unshift({
        id: `found_kingdom_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `پیرۆزە! بە فەرمی تاجی پاشایەتی سەربەخۆت خستە سەر سەرت و شانشینی خۆت ڕاگەیاند!`,
        textEn: `Hail the Sovereign! You have proclaimed your independent Royal Crown and dynasty!`,
        type: 'politics',
      });
      return next;
    });
  };

  const handleChangeTaxRate = (settlementId: string, rate: Settlement['taxRate']) => {
    setGameState((prev) => {
      const next = { ...prev };
      const s = next.settlements[settlementId];
      if (s) {
        s.taxRate = rate;
      }
      return next;
    });
  };

  // Secret Treaty Sealed with King
  const handleSealSecretPact = (factionId: FactionId, titleKu: string, termsKu: string) => {
    setGameState((prev) => {
      const next = { ...prev };
      const pactId = `pact_${Date.now()}`;
      next.player.secretPacts = [
        ...(next.player.secretPacts || []),
        { id: pactId, factionId, titleKu, termsKu, active: true },
      ];
      const fac = next.factions[factionId];
      if (fac) {
        fac.relations['player_kingdom'] = (fac.relations['player_kingdom'] || 0) + 20;
      }
      next.logs.unshift({
        id: `pact_log_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `پەیمانی نهێنی بە سەرکەوتوویی لەگەڵ ${fac?.nameKu || factionId} واژۆ کرا! هاوپەیمانی لە سێبەردا بەردەوامە.`,
        textEn: `Secret treaty sealed with ${fac?.name || factionId}!`,
        type: 'politics',
      });
      next.news.unshift({
        id: `news_pact_${Date.now()}`,
        day: next.day,
        titleKu: `پەیماننامەیەکی نهێنی لە سێبەردا واژۆ کرا`,
        contentKu: `دەنگۆی گرێبەستی نهێنی نێوان فەرماندە و دەسەڵاتدارانی ${fac?.nameKu} لە نێو کۆشکەکاندا بڵاوبووەتەوە.`,
        type: 'scandal',
        importance: 'high',
        factionId,
      });
      return next;
    });
  };

  // Grant Official Court Office
  const handleGrantOffice = (officeId: string, titleKu: string, dailySalary: number, perkKu: string) => {
    setGameState((prev) => {
      const next = { ...prev };
      const dig = next.dignitaries[officeId];
      next.player.appointedOffices = [
        ...(next.player.appointedOffices || []),
        {
          id: officeId,
          office: dig?.office || 'chancellor',
          settlementId: dig?.settlementId || 'val_capital',
          titleKu,
          dailySalary,
          perkKu,
        },
      ];
      next.player.honor += 5;
      next.player.renown += 10;
      next.logs.unshift({
        id: `office_log_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `پیرۆزە! پلەی فەرمی (${titleKu}) بە مووچەی ڕۆژانەی ${dailySalary} دینار پێت بەخشرا!`,
        textEn: `Appointed to official post: ${titleKu} with ${dailySalary} daily salary!`,
        type: 'fief',
      });
      return next;
    });
  };

  // Bribe Chamberlain for Royal Audience
  const handleBribeChamberlain = (factionId: FactionId, cost: number) => {
    setGameState((prev) => {
      if (prev.player.dinars < cost) return prev;
      const next = { ...prev };
      next.player.dinars -= cost;
      next.player.chamberlainBribes = {
        ...(next.player.chamberlainBribes || {}),
        [factionId]: true,
      };
      next.logs.unshift({
        id: `bribe_cham_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `بڕی ${cost} دینار بەرتیل درایە کارگێڕی کۆشک بۆ کردنەوەی دەرگای دیداری تایبەتی پاشا.`,
        textEn: `Paid ${cost} dinars bribe to chamberlain for royal audience access.`,
        type: 'politics',
      });
      return next;
    });
  };

  // Recruit Spy
  const handleRecruitSpy = (settlementId: string) => {
    setGameState((prev) => {
      if (prev.player.dinars < 350) return prev;
      const next = { ...prev };
      next.player.dinars -= 350;
      const settlement = next.settlements[settlementId];
      let garrisonCount = 0;
      settlement?.garrison.forEach((g) => { garrisonCount += g.count; });

      const newSpy: SpyAgent = {
        id: `spy_${Date.now()}`,
        nameKu: `سیخوڕی شاراوە ${ (next.player.spies?.length || 0) + 1}`,
        targetSettlementId: settlementId,
        infiltratedDays: 1,
        coverIntegrity: 92,
        dailyUpkeep: 25,
        lastIntel: {
          garrisonCount,
          foodDays: settlement?.foodReservesDays || 50,
          defenseLevel: settlement?.defenseLevel || 3,
          prosperity: settlement?.prosperity || 70,
          secretRumorKu: 'پاسەوانانی قەڵا لە دۆخی ئاساییدان و چاودێری دەروازەکان دەکەن.',
          vulnerabilitiesKu: ['بیری ئاوی دەرەوە لە مەترسی ژەهراویکردندایە'],
        },
      };

      next.player.spies = [...(next.player.spies || []), newSpy];
      next.logs.unshift({
        id: `spy_rec_${Date.now()}`,
        day: next.day,
        hour: next.hour,
        textKu: `سیخوڕێک بە سەرکەوتوویی دزەی کردە ناو شاری ${settlement?.nameKu || settlementId}. ڕاپۆرتی زانیاری لە بەشی هەواڵەکان نوێ دەبێتەوە.`,
        textEn: `Spy successfully infiltrated ${settlement?.name || settlementId}.`,
        type: 'politics',
      });
      return next;
    });
  };

  // Spy Sabotage Action
  const handleSpySabotage = (spyId: string, actionType: 'poison_water' | 'burn_granary' | 'bribe_gate') => {
    setGameState((prev) => {
      const spy = prev.player.spies?.find((s) => s.id === spyId);
      if (!spy) return prev;

      let cost = 180;
      if (actionType === 'burn_granary') cost = 220;
      if (actionType === 'bribe_gate') cost = 350;
      if (prev.player.dinars < cost) return prev;

      const next = { ...prev };
      next.player.dinars -= cost;
      const s = next.settlements[spy.targetSettlementId];

      if (s) {
        if (actionType === 'poison_water') {
          s.foodReservesDays = Math.max(5, s.foodReservesDays - 25);
          s.publicOrder = Math.max(20, s.publicOrder - 15);
        } else if (actionType === 'burn_granary') {
          s.foodReservesDays = Math.max(5, s.foodReservesDays - 35);
          s.prosperity = Math.max(20, s.prosperity - 15);
        } else if (actionType === 'bribe_gate') {
          s.defenseLevel = Math.max(1, s.defenseLevel - 2);
        }
      }

      spy.coverIntegrity = Math.max(30, spy.coverIntegrity - 12);
      return next;
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 select-none">
      {/* TITLE SCREEN */}
      {screen === 'title' && (
        <TitleScreen
          lang={lang}
          hasExistingSave={hasExistingSave}
          isMuted={isMuted}
          onStartNewGame={() => {
            setGameState(createInitialGameState());
            setScreen('playing');
          }}
          onContinueGame={() => {
            const saved = loadGameFromStorage('auto') || loadGameFromStorage('slot1');
            if (saved) {
              setGameState(saved);
            }
            setScreen('playing');
          }}
          onToggleLanguage={() => setLang((prev) => (prev === 'ku' ? 'en' : 'ku'))}
          onToggleSound={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            sfx.setMuted(nextMuted);
          }}
        />
      )}

      {/* 3D WORLD MAP VIEW */}
      {screen === 'playing' && (
        <>
          <WorldMap3D
            gameState={gameState}
            onSelectSettlement={handleSelectSettlement}
            onSelectParty={handleSelectParty}
            onSetDestination={handleSetDestination}
            onRegisterCameraControls={setCameraControls}
          />

          {/* Tactical HUD & Unified Navigation Rail */}
          <TacticalHUD
            gameState={gameState}
            lang={lang}
            activeView={activeView}
            currentSettlementId={currentSettlementId}
            selectedSettlementId={selectedSettlementId}
            cameraControls={cameraControls}
            onSelectSettlement={setSelectedSettlementId}
            onEnterSettlement={handleEnterSettlement}
            onMarchToSettlement={handleMarchToSettlement}
            onOpenView={(view) => {
              if (view === 'siege_camp' && gameState.player.isBesiegingSettlementId) {
                setActiveSiegeSettlementId(gameState.player.isBesiegingSettlementId);
              }
              setActiveView(view);
            }}
            onOpenSaveModal={() => setSaveModalOpen(true)}
            onChangeSpeed={(spd) => {
              setGameState((prev) => ({ ...prev, timeSpeed: spd }));
            }}
            onOpenSiegeCamp={(sId) => {
              setActiveSiegeSettlementId(sId);
              setActiveView('siege_camp');
            }}
            onStartSiegeCamp={handleStartSiegeCamp}
            onInitiateSiege={(sId) => handleInitiateSiege(sId)}
          />

          {/* CITY / CASTLE VIEW MODAL */}
          {activeView === 'city' && currentSettlementId && gameState.settlements[currentSettlementId] && (
            <CityView
              settlement={gameState.settlements[currentSettlementId]}
              gameState={gameState}
              lang={lang}
              onClose={() => setActiveView('map')}
              onBuyGood={handleBuyGood}
              onSellGood={handleSellGood}
              onRecruitTroop={handleRecruitTroop}
              onBuyWorkshop={handleBuyWorkshop}
              onInitiateSiege={handleInitiateSiege}
              onChangeTaxRate={handleChangeTaxRate}
              onOpenSiegeCamp={(sId) => {
                setActiveSiegeSettlementId(sId);
                setActiveView('siege_camp');
              }}
              onStartSiegeCamp={handleStartSiegeCamp}
            />
          )}

          {/* ADVANCED SIEGE CAMP OPERATIONS MODAL */}
          {activeView === 'siege_camp' && activeSiegeSettlementId && gameState.settlements[activeSiegeSettlementId] && (
            <SiegeCampModal
              settlement={gameState.settlements[activeSiegeSettlementId]}
              gameState={gameState}
              lang={lang}
              onClose={() => setActiveView('map')}
              onQueueEngine={handleQueueSiegeEngine}
              onDemandSurrender={handleDemandSurrender}
              onOrderAssault={handleOrderAssault}
              onAbandonSiege={handleAbandonSiege}
            />
          )}

          {/* PARTY & TROOPS MANAGEMENT */}
          {activeView === 'party' && (
            <PartyView
              gameState={gameState}
              lang={lang}
              onClose={() => setActiveView('map')}
              onUpgradeTroop={handleUpgradeTroop}
              onDisbandTroop={handleDisbandTroop}
            />
          )}

          {/* DIPLOMACY & POLITICS */}
          {activeView === 'diplomacy' && (
            <DiplomacyView
              gameState={gameState}
              lang={lang}
              onClose={() => setActiveView('map')}
              onDeclareWar={handleDeclareWar}
              onProposePeace={handleProposePeace}
              onSignTradePact={handleSignTradePact}
              onSignDefensivePact={handleSignDefensivePact}
              onBribeLord={handleBribeLord}
              onTogglePolicy={handleTogglePolicy}
              onFoundKingdom={handleFoundKingdom}
              onSealSecretPact={handleSealSecretPact}
              onGrantOffice={handleGrantOffice}
              onBribeChamberlain={handleBribeChamberlain}
            />
          )}

          {/* NEWS & INTELLIGENCE DISPATCH */}
          {activeView === 'news' && (
            <NewsIntelligenceView
              gameState={gameState}
              lang={lang}
              onClose={() => setActiveView('map')}
              onRecruitSpy={handleRecruitSpy}
              onSpySabotage={handleSpySabotage}
            />
          )}

          {/* CHRONICLES / LOG VIEW */}
          {activeView === 'log' && (
            <LogView
              logs={gameState.logs}
              lang={lang}
              onClose={() => setActiveView('map')}
            />
          )}

          {/* 3D BATTLEFIELD & SIEGE ENCOUNTER */}
          {gameState.battle?.isActive && (
            <Battlefield3D
              gameState={gameState}
              battle={gameState.battle}
              lang={lang}
              onFinishBattle={handleFinishBattle}
            />
          )}

          {/* SAVE & LOAD & SETTINGS MODAL */}
          {saveModalOpen && (
            <SaveLoadModal
              gameState={gameState}
              lang={lang}
              isMuted={isMuted}
              onClose={() => setSaveModalOpen(false)}
              onLoadState={(loaded) => setGameState(loaded)}
              onToggleSound={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                sfx.setMuted(nextMuted);
              }}
              onToggleLanguage={() => setLang((prev) => (prev === 'ku' ? 'en' : 'ku'))}
            />
          )}
        </>
      )}
    </div>
  );
}
