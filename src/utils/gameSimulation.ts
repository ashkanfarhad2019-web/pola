/**
 * Game Simulation Engine: Dynamic AI, Economy, Movements, Upkeep & Diplomacy
 */
import { FactionId, GameState, GoodId, Party, Settlement, TroopStack } from '../types/game';
import { INITIAL_FACTIONS, INITIAL_LORDS, INITIAL_POLICIES, INITIAL_SETTLEMENTS, TRADE_GOODS, TROOP_CATALOG } from '../data/worldData';

export function createInitialGameState(): GameState {
  // Initial player party setup
  const initialPlayerParty: Party = {
    id: 'player_party',
    name: 'Your Warband',
    nameKu: 'سوپای تۆ',
    type: 'player',
    factionId: 'valoria', // Begins aligned or neutral with Valoria
    x: -25,
    z: -15,
    speed: 4.2,
    troops: [
      { troopId: 'recruit', count: 12, wounded: 0 },
      { troopId: 'footman', count: 4, wounded: 0 },
    ],
    cargo: {
      grain: 15,
      meat: 6,
    },
    dinars: 1200,
    bannerColor: '#8b5cf6',
  };

  // Initial AI Lord parties
  const initialParties: Record<string, Party> = {
    player_party: initialPlayerParty,
    party_alden: {
      id: 'party_alden',
      name: 'King Alden Royal Host',
      nameKu: 'سوپای شاهانەی ئاڵدن',
      type: 'lord',
      factionId: 'valoria',
      leaderLordId: 'lord_alden',
      x: -28,
      z: -24,
      targetX: -15,
      targetZ: -38,
      speed: 3.5,
      bannerColor: '#3b82f6',
      dinars: 8000,
      troops: [
        { troopId: 'paladin_knight', count: 25, wounded: 0 },
        { troopId: 'heavy_swordsman', count: 40, wounded: 0 },
        { troopId: 'marksman', count: 30, wounded: 0 },
      ],
      cargo: { grain: 40, meat: 20 },
      statusText: 'Patrolling Sunspire March',
      statusTextKu: 'چاودێری سنووری لووتکەی خۆر دەکات',
    },
    party_varek: {
      id: 'party_varek',
      name: 'Eisenreich Iron Legion',
      nameKu: 'لەشکری پۆڵاینی ڤاریک',
      type: 'lord',
      factionId: 'eisenreich',
      leaderLordId: 'lord_varek',
      x: 35,
      z: -30,
      targetX: 55,
      targetZ: -15,
      speed: 3.2,
      bannerColor: '#dc2626',
      dinars: 9000,
      troops: [
        { troopId: 'royal_guard', count: 40, wounded: 0 },
        { troopId: 'heavy_swordsman', count: 50, wounded: 0 },
      ],
      cargo: { iron: 30, weapons: 15 },
      statusText: 'Mobilizing border patrols',
      statusTextKu: 'لەشکرکێشی بە سنوورەکاندا دەکات',
    },
    party_tariq: {
      id: 'party_tariq',
      name: 'Sultan Desert Vanguard',
      nameKu: 'سوارچاکانی سوڵتان تاریق',
      type: 'lord',
      factionId: 'saruq',
      leaderLordId: 'lord_tariq',
      x: 15,
      z: 40,
      targetX: -5,
      targetZ: 50,
      speed: 4.8,
      bannerColor: '#eab308',
      dinars: 11000,
      troops: [
        { troopId: 'desert_raider', count: 45, wounded: 0 },
        { troopId: 'royal_marksman', count: 35, wounded: 0 },
      ],
      cargo: { spices: 25, silk: 15 },
      statusText: 'Guarding oasis trade routes',
      statusTextKu: 'پارێزگاری لە ڕێگای بازرگانی دەکات',
    },
    caravan_1: {
      id: 'caravan_1',
      name: 'Great Silk & Spice Caravan',
      nameKu: 'کاروانی گەورەی ئاوریشم و بەهارات',
      type: 'caravan',
      factionId: 'saruq',
      x: 10,
      z: 25,
      targetX: -30,
      targetZ: -20,
      targetSettlementId: 'val_capital',
      speed: 3.8,
      bannerColor: '#f59e0b',
      dinars: 4500,
      troops: [
        { troopId: 'footman', count: 20, wounded: 0 },
        { troopId: 'militia_archer', count: 15, wounded: 0 },
      ],
      cargo: { spices: 35, silk: 20 },
      statusText: 'Trading in foreign realms',
      statusTextKu: 'بەرەو بازاڕی ڤالۆریا دەڕوات بۆ فرۆشتن',
    },
    caravan_2: {
      id: 'caravan_2',
      name: 'Northern Ore & Steel Caravan',
      nameKu: 'کاروانی ئاسن و چەکی باکوور',
      type: 'caravan',
      factionId: 'eisenreich',
      x: 30,
      z: -10,
      targetX: -10,
      targetZ: 5,
      targetSettlementId: 'mar_capital',
      speed: 3.6,
      bannerColor: '#ef4444',
      dinars: 3800,
      troops: [
        { troopId: 'heavy_swordsman', count: 18, wounded: 0 },
      ],
      cargo: { iron: 45, weapons: 12 },
      statusText: 'Transporting manufactured steel',
      statusTextKu: 'ئاسن بەرەو بەندەری ماریتیا دەبات',
    },
    bandits_1: {
      id: 'bandits_1',
      name: 'Mountain Brigands',
      nameKu: 'ڕێگرانی ناوچە شاخاوییەکان',
      type: 'bandit',
      factionId: 'eisenreich',
      x: 10,
      z: -15,
      targetX: 15,
      targetZ: -5,
      speed: 4.1,
      bannerColor: '#4b5563',
      dinars: 350,
      troops: [
        { troopId: 'recruit', count: 22, wounded: 0 },
        { troopId: 'militia_archer', count: 8, wounded: 0 },
      ],
      cargo: { grain: 10, meat: 8 },
      statusText: 'Stalking trade highways',
      statusTextKu: 'لە بۆسەدایە بۆ کاروانەکان',
    },
  };

  return {
    day: 1,
    hour: 8,
    timeSpeed: 1,
    factions: JSON.parse(JSON.stringify(INITIAL_FACTIONS)),
    lords: JSON.parse(JSON.stringify(INITIAL_LORDS)),
    settlements: JSON.parse(JSON.stringify(INITIAL_SETTLEMENTS)),
    parties: initialParties,
    player: {
      name: 'Commander',
      title: 'Free Captain',
      dinars: 1200,
      renown: 25,
      honor: 10,
      factionId: 'independent',
      troops: [
        { troopId: 'recruit', count: 12, wounded: 0 },
        { troopId: 'footman', count: 4, wounded: 0 },
      ],
      inventory: {
        grain: 15,
        meat: 6,
      },
      maxCargoWeight: 350,
      fiefIds: [],
      workshops: [],
      activePolicies: ['royal_granaries'],
    },
    policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
    logs: [
      {
        id: 'log_start',
        day: 1,
        hour: 8,
        textKu: 'بەخێربێیت بۆ جیهانی دێرین. تۆ سەردەستەی کۆمەڵێک شەرکەری ئازایت. بە بازرگانی ژیرانە، شەڕی بوێرانە و سیاسەتی قووڵ ناوبانگ بەدەستبهێنە!',
        textEn: 'Welcome to the ancient realm. Lead your warband with honorable trade, battlefield command, and astute diplomacy to forge a dynasty.',
        type: 'alert',
      },
    ],
  };
}

/**
 * Step forward in simulation time
 */
export function simulateTick(state: GameState, dtSeconds: number): GameState {
  if (state.timeSpeed === 0 || state.battle?.isActive) {
    return state;
  }

  const next = { ...state };
  const speedMult = state.timeSpeed;
  const timeAdvanceHours = (dtSeconds * 0.8 * speedMult);

  let newHour = next.hour + timeAdvanceHours;
  let newDay = next.day;
  let didDayChange = false;

  if (newHour >= 24) {
    newDay += Math.floor(newHour / 24);
    newHour = newHour % 24;
    didDayChange = true;
  }

  next.hour = newHour;
  next.day = newDay;

  // 1. Move roaming parties
  const nextParties = { ...next.parties };
  Object.keys(nextParties).forEach((pId) => {
    const p = { ...nextParties[pId] };

    // Move towards target if exists
    if (p.targetX !== undefined && p.targetZ !== undefined) {
      const dx = p.targetX - p.x;
      const dz = p.targetZ - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const arrivalThreshold = (p.type === 'player' && p.targetSettlementId) ? 2.8 : 1.2;
      if (dist > arrivalThreshold) {
        const step = (p.speed * dtSeconds * 0.75 * speedMult);
        p.x += (dx / dist) * Math.min(step, dist);
        p.z += (dz / dist) * Math.min(step, dist);
      } else {
        // Reached target destination
        if (p.type === 'player') {
          if (p.targetSettlementId) {
            next.arrivedAtSettlementId = p.targetSettlementId;
            p.targetSettlementId = undefined;
          }
          p.targetX = undefined;
          p.targetZ = undefined;
          next.targetDestinationName = undefined;
        } else if (p.type === 'caravan' || p.type === 'lord' || p.type === 'patrol') {
          const settlementList = Object.values(next.settlements);
          const randomTarget = settlementList[Math.floor(Math.random() * settlementList.length)];
          p.targetX = randomTarget.x + (Math.random() * 4 - 2);
          p.targetZ = randomTarget.z + (Math.random() * 4 - 2);
          p.targetSettlementId = randomTarget.id;
        } else if (p.type === 'bandit') {
          // Wander randomly around highways
          p.targetX = p.x + (Math.random() * 30 - 15);
          p.targetZ = p.z + (Math.random() * 30 - 15);
          // Clamp to world boundaries
          p.targetX = Math.max(-80, Math.min(80, p.targetX));
          p.targetZ = Math.max(-80, Math.min(80, p.targetZ));
        }
      }
    }
    nextParties[pId] = p;
  });
  next.parties = nextParties;

  // Sync player position with player party
  const playerParty = next.parties['player_party'];
  if (playerParty) {
    playerParty.troops = next.player.troops;
    playerParty.dinars = next.player.dinars;
  }

  // 2. Daily calculations (Food, wages, market production, workshop income, AI diplomacy)
  if (didDayChange) {
    next.settlements = simulateSettlementEconomy(next.settlements);
    const upkeepResult = processDailyUpkeep(next);
    next.player = upkeepResult.player;
    next.logs = [...upkeepResult.logs, ...next.logs.slice(0, 40)];

    // AI Lord & Kingdom strategic logic
    const diploResult = simulateAIDiplomacyAndWars(next);
    next.factions = diploResult.factions;
    next.logs = [...diploResult.logs, ...next.logs.slice(0, 40)];
  }

  return next;
}

/**
 * Realistic market economy simulation
 * Supply & demand adjustment based on production, consumption, and stocks
 */
function simulateSettlementEconomy(settlements: Record<string, Settlement>): Record<string, Settlement> {
  const updated = { ...settlements };

  Object.keys(updated).forEach((sId) => {
    const s = { ...updated[sId] };
    const market = { ...s.market };

    (Object.keys(TRADE_GOODS) as GoodId[]).forEach((goodKey) => {
      const item = { ...market[goodKey] };
      const goodDef = TRADE_GOODS[goodKey];

      // Production & consumption
      let netChange = item.productionRate - item.consumptionRate;
      // Slight randomness to emulate seasonal harvests or workshop surges
      netChange += Math.floor(Math.random() * 3 - 1);

      item.stock = Math.max(2, item.stock + netChange);

      // Realistic price determination:
      // Price = basePrice * (baselineTarget / currentStock)^0.7
      const targetStock = 35;
      const supplyFactor = Math.pow(targetStock / item.stock, 0.65);
      const clampedFactor = Math.max(0.4, Math.min(2.8, supplyFactor));

      item.buyPrice = Math.max(2, Math.round(goodDef.basePrice * clampedFactor));
      item.sellPrice = Math.max(1, Math.round(item.buyPrice * 0.78));

      market[goodKey] = item;
    });

    // Food days calculation
    const grainStock = market.grain?.stock || 0;
    const meatStock = market.meat?.stock || 0;
    s.foodReservesDays = Math.max(5, Math.floor((grainStock * 2 + meatStock * 3) / Math.max(1, s.population / 2000)));

    s.market = market;
    updated[sId] = s;
  });

  return updated;
}

/**
 * Process Player & Lord Upkeep, Food Consumption & Workshop Revenues
 */
function processDailyUpkeep(state: GameState): { player: GameState['player']; logs: GameState['logs'] } {
  const player = { ...state.player };
  const logs: GameState['logs'] = [];

  // Calculate troop wages
  let totalWages = 0;
  let totalTroopCount = 0;
  player.troops.forEach((stack) => {
    const tDef = TROOP_CATALOG[stack.troopId];
    if (tDef) {
      totalWages += tDef.dailyWage * stack.count;
      totalTroopCount += stack.count;
    }
  });

  // Food consumption: roughly 1 food item per 8 soldiers per day
  const neededFood = Math.max(1, Math.ceil(totalTroopCount / 8));
  let foodDeducted = 0;
  const inventory = { ...player.inventory };

  if (inventory.grain && inventory.grain > 0) {
    const take = Math.min(inventory.grain, neededFood);
    inventory.grain -= take;
    foodDeducted += take;
  }
  if (foodDeducted < neededFood && inventory.meat && inventory.meat > 0) {
    const take = Math.min(inventory.meat, neededFood - foodDeducted);
    inventory.meat -= take;
    foodDeducted += take;
  }

  player.inventory = inventory;

  // Starvation penalty
  if (foodDeducted < neededFood && totalTroopCount > 0) {
    logs.push({
      id: `starve_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `سوپاکەت خۆراکی تەواوی نەبوو! سەربازەکانت برسین و مۆڕاڵیان دابەزیوە.`,
      textEn: `Your party ran out of rations! Troops are starving and disquiet is spreading.`,
      type: 'alert',
    });
  }

  // Workshop income
  let workshopTotal = 0;
  player.workshops.forEach((ws) => {
    workshopTotal += ws.dailyProfit;
  });

  // Fief tax revenue
  let fiefTaxes = 0;
  player.fiefIds.forEach((fId) => {
    const settlement = state.settlements[fId];
    if (settlement) {
      let baseTax = settlement.population * 0.05 * (settlement.prosperity / 100);
      if (settlement.taxRate === 'low') baseTax *= 0.7;
      if (settlement.taxRate === 'high') baseTax *= 1.3;
      if (settlement.taxRate === 'extortionate') baseTax *= 1.6;
      fiefTaxes += Math.round(baseTax);
    }
  });

  // Net dinars change
  const netIncome = workshopTotal + fiefTaxes - totalWages;
  player.dinars = Math.max(0, player.dinars + netIncome);

  if (totalWages > 0 || workshopTotal > 0 || fiefTaxes > 0) {
    logs.push({
      id: `wages_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `ڕاپۆرتی دارایی ڕۆژ: مەعاشی سوپا: -${totalWages} دینار | داهاتی کارگە و باج: +${workshopTotal + fiefTaxes} دینار. باڵانس: ${player.dinars}`,
      textEn: `Daily Ledger: Troop Wages: -${totalWages} Dinars | Enterprise & Tax: +${workshopTotal + fiefTaxes} Dinars. Current Treasury: ${player.dinars}`,
      type: 'fief',
    });
  }

  return { player, logs };
}

/**
 * Smart AI Diplomacy & Kingdom Decisions
 */
function simulateAIDiplomacyAndWars(state: GameState): { factions: GameState['factions']; logs: GameState['logs'] } {
  const factions = { ...state.factions };
  const logs: GameState['logs'] = [];

  // Occasionally check for dynamic peace or war declarations based on balance of power
  const factionIds = (Object.keys(factions) as FactionId[]).filter((f) => f !== 'player_kingdom');

  factionIds.forEach((f1Id) => {
    const f1 = { ...factions[f1Id] };
    factionIds.forEach((f2Id) => {
      if (f1Id === f2Id) return;
      const relation = f1.relations[f2Id] ?? 0;

      // Small chance of relation drift or diplomacy
      if (Math.random() < 0.08) {
        if (relation < -45 && !f1.treaties.some((t) => t.targetFactionId === f2Id && t.type === 'war')) {
          // Declare War!
          f1.treaties.push({ id: `war_${f1Id}_${f2Id}_${state.day}`, targetFactionId: f2Id, type: 'war', durationDays: 35 });
          logs.push({
            id: `war_decl_${f1Id}_${f2Id}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `شەڕ هەڵگیرسا! ${f1.nameKu} شەڕی فەرمی دژی ${factions[f2Id].nameKu} ڕاگەیاند!`,
            textEn: `War Declared! The ${f1.name} has declared war upon the ${factions[f2Id].name}!`,
            type: 'politics',
          });
        }
      }
    });
    factions[f1Id] = f1;
  });

  return { factions, logs };
}
