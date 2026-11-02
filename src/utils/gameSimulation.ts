/**
 * Game Simulation Engine: Dynamic AI, Economy, Movements, Upkeep & Diplomacy
 */
import { FactionId, GameState, GoodId, Party, Settlement, TroopStack } from '../types/game';
import { INITIAL_DIGNITARIES, INITIAL_FACTIONS, INITIAL_LORDS, INITIAL_NEWS, INITIAL_POLICIES, INITIAL_SETTLEMENTS, TRADE_GOODS, TROOP_CATALOG } from '../data/worldData';

export function createInitialGameState(): GameState {
  // Initial player party setup: Starts completely alone with no army!
  const initialPlayerParty: Party = {
    id: 'player_party',
    name: 'Your Warband',
    nameKu: 'تۆ (سوارچاکی بێلەشکر)',
    type: 'player',
    factionId: 'valoria', // Begins aligned or neutral with Valoria
    x: -48,
    z: -30,
    speed: 4.8, // lone horseman is agile and fast
    troops: [], // Starts with 0 troops, completely alone!
    cargo: {
      grain: 4,
      meat: 2,
    },
    dinars: 150, // Realistic hard purse
    bannerColor: '#18181b',
  };

  // Initial AI Lord parties across scaled continental coordinates
  const initialParties: Record<string, Party> = {
    player_party: initialPlayerParty,
    party_alden: {
      id: 'party_alden',
      name: 'King Alden Royal Host',
      nameKu: 'سوپای شاهانەی ئاڵدن',
      type: 'lord',
      factionId: 'valoria',
      leaderLordId: 'lord_alden',
      x: -45,
      z: -38,
      targetX: -24,
      targetZ: -58,
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
      x: 60,
      z: -50,
      targetX: 88,
      targetZ: -22,
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
      x: 25,
      z: 68,
      targetX: -10,
      targetZ: 80,
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
      x: 18,
      z: 42,
      targetX: -48,
      targetZ: -30,
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
      x: 50,
      z: -18,
      targetX: -16,
      targetZ: 8,
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
      x: 15,
      z: -25,
      targetX: 25,
      targetZ: -8,
      speed: 4.1,
      bannerColor: '#4b5563',
      dinars: 350,
      troops: [
        { troopId: 'recruit', count: 18, wounded: 0 },
        { troopId: 'militia_archer', count: 6, wounded: 0 },
      ],
      cargo: { grain: 10, meat: 8 },
      statusText: 'Stalking trade highways',
      statusTextKu: 'لە بۆسەدایە بۆ کاروانەکان',
    },
    party_ragnar: {
      id: 'party_ragnar',
      name: 'King Ragnar Frost Host',
      nameKu: 'لەشکری بەفرینی پاشا ڕاگنار',
      type: 'lord',
      factionId: 'frostgard',
      leaderLordId: 'lord_ragnar',
      x: 12,
      z: -95,
      targetX: -32,
      targetZ: -105,
      speed: 3.6,
      bannerColor: '#6366f1',
      dinars: 8500,
      troops: [
        { troopId: 'frost_berserker', count: 35, wounded: 0 },
        { troopId: 'heavy_swordsman', count: 30, wounded: 0 },
        { troopId: 'marksman', count: 25, wounded: 0 },
      ],
      cargo: { meat: 30, timber: 20 },
      statusText: 'Patrolling northern glacier passes',
      statusTextKu: 'چاودێری سنووری شاخە بەفرینەکان دەکات',
    },
    party_torstein: {
      id: 'party_torstein',
      name: 'Jarl Torstein Forest Host',
      nameKu: 'لەشکری دارستانی تۆرستاین',
      type: 'lord',
      factionId: 'verdant',
      leaderLordId: 'lord_torstein',
      x: -75,
      z: 30,
      targetX: -100,
      targetZ: 50,
      speed: 3.8,
      bannerColor: '#16a34a',
      dinars: 7200,
      troops: [
        { troopId: 'heavy_swordsman', count: 40, wounded: 0 },
        { troopId: 'marksman', count: 45, wounded: 0 },
      ],
      cargo: { timber: 40, meat: 25 },
      statusText: 'Guarding highland lumber valleys',
      statusTextKu: 'پارێزگاری لە دۆڵ و دارستانەکانی دەکات',
    },
    party_bellini: {
      id: 'party_bellini',
      name: 'Doge Bellini Maritime Fleet Host',
      nameKu: 'لەشکری بازرگانی دۆج بێلینی',
      type: 'lord',
      factionId: 'maritia',
      leaderLordId: 'lord_bellini',
      x: -14,
      z: 12,
      targetX: 14,
      targetZ: 20,
      speed: 4.0,
      bannerColor: '#06b6d4',
      dinars: 16000,
      troops: [
        { troopId: 'heavy_swordsman', count: 35, wounded: 0 },
        { troopId: 'marksman', count: 35, wounded: 0 },
        { troopId: 'horseman', count: 25, wounded: 0 },
      ],
      cargo: { wine: 30, salt: 30 },
      statusText: 'Securing coastal maritime trade',
      statusTextKu: 'پارێزگاری لە ڕێگای کەشتیگەلی کەناراو دەکات',
    },
    caravan_3: {
      id: 'caravan_3',
      name: 'Southern Oasis Camel Caravan',
      nameKu: 'کاروانی وشترەکانی بیابانی سارۆخ',
      type: 'caravan',
      factionId: 'saruq',
      x: 40,
      z: 55,
      targetX: -80,
      targetZ: 24,
      targetSettlementId: 'ver_capital',
      speed: 3.9,
      bannerColor: '#f59e0b',
      dinars: 4200,
      troops: [
        { troopId: 'desert_raider', count: 20, wounded: 0 },
      ],
      cargo: { silk: 25, spices: 30 },
      statusText: 'Transporting luxury spices to forest clans',
      statusTextKu: 'بەهارات و ئاوریشم بەرەو دۆڵی سەوز دەبات',
    },
    bandits_2: {
      id: 'bandits_2',
      name: 'Desert Nomad Outlaws',
      nameKu: 'ڕێگرانی کۆچەری بیابان',
      type: 'bandit',
      factionId: 'saruq',
      x: 18,
      z: 75,
      targetX: 45,
      targetZ: 65,
      speed: 4.4,
      bannerColor: '#78350f',
      dinars: 500,
      troops: [
        { troopId: 'desert_raider', count: 20, wounded: 0 },
      ],
      cargo: { salt: 15, spices: 10 },
      statusText: 'Hunting spice trade convoys',
      statusTextKu: 'بۆسەی بۆ کاروانەکانی بیابان داناوە',
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
      title: 'Free Wanderer',
      titleKu: 'گەڕۆکی بێلەشکر',
      dinars: 150, // Starts with realistic modest traveller purse
      renown: 5,
      honor: 5,
      factionId: 'independent',
      troops: [], // Starts with 0 troops, completely alone!
      inventory: {
        grain: 4,
        meat: 2,
      },
      maxCargoWeight: 350,
      fiefIds: [],
      workshops: [],
      activePolicies: ['royal_granaries'],
      spies: [],
      appointedOffices: [],
      chamberlainBribes: {},
      secretPacts: [],
    },
    policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
    dignitaries: JSON.parse(JSON.stringify(INITIAL_DIGNITARIES)),
    news: JSON.parse(JSON.stringify(INITIAL_NEWS)),
    logs: [
      {
        id: 'log_start',
        day: 1,
        hour: 8,
        textKu: 'بەخێربێیت بۆ جیهانی ئاڵۆزی چەک و تاج. تۆ وەک گەڕۆکێکی بێلەشکر بە تەنها لە نزیک شاری لووتکەی خۆر دەستپێدەکەیت، بەبێ سوپا و تەنها بە ١٥٠ دینار. بە یاسای ڕاستی ئابوری، کڕین و فرۆشتنی ژیرانە، و خەباتی سەخت دەبێت پارە کۆبکەیتەوە و سەرەتا سەرباز بەکرێ بگریت!',
        textEn: 'Welcome to the harsh, realistic medieval realm. You begin alone as a solitary wanderer near Sunspire City with 150 dinars and no army. Earn every coin through genuine trade and steel.',
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
        } else if (p.type === 'lord') {
          // Smart AI Lord logic:
          // 1. If troops low (< 45), return to faction settlement to reinforce
          const totalTroops = p.troops.reduce((a, b) => a + b.count, 0);
          const factionSettlements = Object.values(next.settlements).filter((s) => s.factionId === p.factionId);
          const enemySettlements = Object.values(next.settlements).filter((s) => {
            const fac = next.factions[p.factionId];
            return fac && fac.treaties.some((tr) => tr.type === 'war' && tr.targetFactionId === s.factionId);
          });

          if (totalTroops < 45 && factionSettlements.length > 0) {
            // Reinforce at home
            const home = factionSettlements[Math.floor(Math.random() * factionSettlements.length)];
            p.targetX = home.x + (Math.random() * 3 - 1.5);
            p.targetZ = home.z + (Math.random() * 3 - 1.5);
            p.targetSettlementId = home.id;
            // Recruit new soldiers
            p.troops.push({ troopId: 'footman', count: 6, wounded: 0 });
          } else if (enemySettlements.length > 0 && totalTroops >= 55 && Math.random() < 0.45) {
            // March towards enemy castle/city to threaten or siege!
            const targetEnemy = enemySettlements[Math.floor(Math.random() * enemySettlements.length)];
            p.targetX = targetEnemy.x + (Math.random() * 4 - 2);
            p.targetZ = targetEnemy.z + (Math.random() * 4 - 2);
            p.targetSettlementId = targetEnemy.id;
          } else if (factionSettlements.length > 0) {
            // Patrol between realm settlements
            const patrolTarget = factionSettlements[Math.floor(Math.random() * factionSettlements.length)];
            p.targetX = patrolTarget.x + (Math.random() * 4 - 2);
            p.targetZ = patrolTarget.z + (Math.random() * 4 - 2);
            p.targetSettlementId = patrolTarget.id;
          }
        } else if (p.type === 'caravan') {
          // Dynamic Caravan Trade: Unload goods, purchase regional specialties, alter market prices!
          if (p.targetSettlementId && next.settlements[p.targetSettlementId]) {
            const destS = next.settlements[p.targetSettlementId];
            let soldCount = 0;
            // 1. Sell cargo into destination town (increasing town stock, lowering prices)
            Object.entries(p.cargo).forEach(([gKey, qty]) => {
              const goodId = gKey as GoodId;
              if (qty > 0 && destS.market[goodId]) {
                destS.market[goodId].stock += qty;
                p.dinars += destS.market[goodId].sellPrice * qty;
                p.cargo[goodId] = 0;
                soldCount += qty;
              }
            });

            // 2. Buy local goods that are in surplus
            Object.values(destS.market).forEach((mItem) => {
              if (mItem.stock > 40 && p.dinars > mItem.buyPrice * 6) {
                const buyAmount = Math.min(12, Math.floor(mItem.stock * 0.25));
                mItem.stock -= buyAmount;
                p.cargo[mItem.goodId] = (p.cargo[mItem.goodId] || 0) + buyAmount;
                p.dinars -= mItem.buyPrice * buyAmount;
              }
              // Dynamically recompute market price based on supply & demand
              const goodDef = TRADE_GOODS[mItem.goodId];
              const targetStock = 35;
              const scarcity = Math.pow(targetStock / Math.max(mItem.stock, 2), 0.72);
              mItem.buyPrice = Math.max(2, Math.round(goodDef.basePrice * Math.min(3.5, Math.max(0.35, scarcity))));
              mItem.sellPrice = Math.max(1, Math.round(mItem.buyPrice * 0.76));
            });
          }

          // Smart Caravan AI: Pick a distant settlement across the expanded realm
          const settlementList = Object.values(next.settlements);
          const validDestinations = settlementList.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) > 40);
          const bestTarget = validDestinations[Math.floor(Math.random() * validDestinations.length)] || settlementList[0];
          p.targetX = bestTarget.x + (Math.random() * 4 - 2);
          p.targetZ = bestTarget.z + (Math.random() * 4 - 2);
          p.targetSettlementId = bestTarget.id;
        } else if (p.type === 'bandit') {
          // Wander randomly around highways
          p.targetX = p.x + (Math.random() * 40 - 20);
          p.targetZ = p.z + (Math.random() * 40 - 20);
          // Clamp to expanded world boundaries
          p.targetX = Math.max(-120, Math.min(120, p.targetX));
          p.targetZ = Math.max(-120, Math.min(120, p.targetZ));
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
      netChange += Math.floor(Math.random() * 3 - 1);

      item.stock = Math.max(2, item.stock + netChange);

      // Realistic price determination:
      // Price = basePrice * (baselineTarget / currentStock)^0.72
      const targetStock = 35;
      const supplyFactor = Math.pow(targetStock / Math.max(item.stock, 2), 0.72);
      const clampedFactor = Math.max(0.35, Math.min(3.5, supplyFactor));

      item.buyPrice = Math.max(2, Math.round(goodDef.basePrice * clampedFactor));
      item.sellPrice = Math.max(1, Math.round(item.buyPrice * 0.76));

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

  // If player cannot pay wages, soldiers desert!
  if (player.dinars < totalWages && totalTroopCount > 0) {
    const deserterCount = Math.max(1, Math.ceil(totalTroopCount * 0.3));
    let remainingToDesert = deserterCount;
    player.troops.forEach((st) => {
      if (remainingToDesert > 0 && st.count > 0) {
        const take = Math.min(st.count, remainingToDesert);
        st.count -= take;
        remainingToDesert -= take;
      }
    });
    player.troops = player.troops.filter((st) => st.count > 0);
    logs.push({
      id: `desert_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `قەیرانی مووچە! بەهۆی نەبوونی دیناری پێویست بۆ مەعاش، ${deserterCount} سەرباز لە سوپاکەت هەڵاتن!`,
      textEn: `Wage Deficit! Unable to pay your soldiers, ${deserterCount} troops abandoned your banner!`,
      type: 'alert',
    });
  }

  // Appointed offices salary
  let officeSalaries = 0;
  player.appointedOffices?.forEach((off) => {
    officeSalaries += off.dailySalary;
  });

  // Spies upkeep & intelligence refresh
  let spiesUpkeep = 0;
  if (player.spies && player.spies.length > 0) {
    player.spies.forEach((spy) => {
      spiesUpkeep += spy.dailyUpkeep;
      spy.infiltratedDays += 1;
      const targetSettlement = state.settlements[spy.targetSettlementId];
      if (targetSettlement) {
        let garrisonCount = 0;
        targetSettlement.garrison.forEach((g) => { garrisonCount += g.count; });
        spy.lastIntel = {
          garrisonCount,
          foodDays: targetSettlement.foodReservesDays,
          defenseLevel: targetSettlement.defenseLevel,
          prosperity: targetSettlement.prosperity,
          secretRumorKu: targetSettlement.foodReservesDays < 20 
            ? 'خەڵکی شار بەهۆی کەمی ئازووقە لە لێواری یاخیبوونن.' 
            : 'پاسەوانانی قەڵا لە دۆخی ئاساییدان و چاودێری دەروازەکان دەکەن.',
          vulnerabilitiesKu: targetSettlement.defenseLevel < 4 
            ? ['دیواری لاواز لە بەشی ڕۆژئاوا', 'دەروازەی دارین بە ئاسانی دەشکێت']
            : ['بیری ئاوی دەرەوە لە مەترسی ژەهراویکردندایە'],
        };
      }
    });
  }

  // Net dinars change
  const netIncome = workshopTotal + fiefTaxes + officeSalaries - totalWages - spiesUpkeep;
  player.dinars = Math.max(0, player.dinars + netIncome);

  if (totalWages > 0 || workshopTotal > 0 || fiefTaxes > 0 || officeSalaries > 0 || spiesUpkeep > 0) {
    logs.push({
      id: `wages_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `ڕاپۆرتی دارایی: مووچە و خەرجی: -${totalWages + spiesUpkeep} د | داهاتی کارگە، باج و پلەی فەرمی: +${workshopTotal + fiefTaxes + officeSalaries} د. باڵانس: ${player.dinars}`,
      textEn: `Daily Ledger: Wages & Spies: -${totalWages + spiesUpkeep}d | Enterprise, Fief & Office: +${workshopTotal + fiefTaxes + officeSalaries}d. Treasury: ${player.dinars}`,
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
