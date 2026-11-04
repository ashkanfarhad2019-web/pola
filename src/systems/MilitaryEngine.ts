/**
 * Military and Battle Simulation Engine
 * Manages party speed calculations, unit logistics, daily troop wages & desertion,
 * food rations consumption, spatial movements, and the Advanced Multi-day Siege Camp System.
 */
import { GameLogMessage, GameState, GoodId, Party, Settlement, SiegeCampState, SiegeEngine, SiegeEngineType, TroopStack } from '../types/game';
import { TROOP_CATALOG } from '../data/worldData';
import { GameEventBus, IEngineModule } from './interfaces';

export const SIEGE_CONFIG: Record<SiegeEngineType, {
  type: SiegeEngineType;
  name: string;
  nameKu: string;
  totalDays: number;
  timberCost: number;
  maxAllowed: number;
  descriptionKu: string;
}> = {
  ladders: {
    type: 'ladders',
    name: 'Assault Ladders',
    nameKu: 'پەیژەی سەرکەوتن بەسەر دیواردا',
    totalDays: 1.0,
    timberCost: 10,
    maxAllowed: 4,
    descriptionKu: 'پەیژەی دارین بۆ سەربازانی پیادە تاوەکو ڕاستەوخۆ بەسەر شوورای قەڵاکەدا هەڵبکشن.',
  },
  ram: {
    type: 'ram',
    name: 'Battering Ram',
    nameKu: 'کۆتەکی ئاسنین بۆ شکاندنی دەروازە',
    totalDays: 2.0,
    timberCost: 25,
    maxAllowed: 1,
    descriptionKu: 'تیرەشانی داپۆشراو بە دار و ئاسن بۆ پێشڕەوی بەرەو دەروازەی سەرەکی و تێکشکاندنی.',
  },
  catapult: {
    type: 'catapult',
    name: 'Heavy Trebuchet / Catapult',
    nameKu: 'مەنجەنیقی بەردهاوێژی دیجیار',
    totalDays: 3.5,
    timberCost: 50,
    maxAllowed: 2,
    descriptionKu: 'ئامێری مەزنی بەردهاوێژ کە ڕۆژانە بەرد دەبارێنێت تاوەکو دیواری بەردین بڕووخێنێت و کەلێن بکاتەوە.',
  },
};

export class MilitaryEngine implements IEngineModule {
  public name = 'MilitaryEngine';

  /**
   * Calculate tactical party travel speed based on realistic factors
   */
  public calculatePartySpeed(party: Party, isPlayer: boolean = false): number {
    let baseSpeed = 4.8;
    let totalTroops = 0;
    let cavalryCount = 0;
    let woundedCount = 0;

    party.troops.forEach((st) => {
      totalTroops += st.count;
      woundedCount += st.wounded;
      const def = TROOP_CATALOG[st.troopId];
      if (def?.type === 'cavalry') {
        cavalryCount += st.count;
      }
    });

    if (totalTroops === 0) {
      return 5.2;
    }

    const sizePenalty = Math.min(2.0, Math.log10(Math.max(1, totalTroops)) * 0.95);
    baseSpeed -= sizePenalty;

    const cavRatio = cavalryCount / totalTroops;
    baseSpeed += cavRatio * 1.2;

    const woundedRatio = woundedCount / totalTroops;
    baseSpeed -= woundedRatio * 0.6;

    let cargoWeight = 0;
    Object.values(party.cargo || {}).forEach((qty) => {
      cargoWeight += (qty || 0) * 10;
    });
    if (cargoWeight > 300) {
      baseSpeed -= Math.min(1.2, (cargoWeight - 300) / 400);
    }

    return Math.max(1.8, Math.min(5.5, baseSpeed));
  }

  /**
   * Run daily troop upkeep, food consumption, and desertion
   */
  public processDailyUpkeep(state: GameState, bus: GameEventBus): {
    player: GameState['player'];
    logs: GameLogMessage[];
  } {
    const player = { ...state.player };
    const logs: GameLogMessage[] = [];

    let totalWages = 0;
    let totalTroopCount = 0;

    player.troops.forEach((stack) => {
      const def = TROOP_CATALOG[stack.troopId];
      if (def) {
        totalWages += def.dailyWage * stack.count;
        totalTroopCount += stack.count;
      }
    });

    const foodNeeded = Math.max(1, Math.ceil(totalTroopCount / 8));
    let foodDeducted = 0;
    const inventory = { ...player.inventory };

    if (inventory.grain && inventory.grain > 0) {
      const take = Math.min(inventory.grain, foodNeeded);
      inventory.grain -= take;
      foodDeducted += take;
    }
    if (foodDeducted < foodNeeded && inventory.meat && inventory.meat > 0) {
      const take = Math.min(inventory.meat, foodNeeded - foodDeducted);
      inventory.meat -= take;
      foodDeducted += take;
    }

    player.inventory = inventory;

    if (foodDeducted < foodNeeded && totalTroopCount > 0) {
      logs.push({
        id: `mil_starve_${state.day}`,
        day: state.day,
        hour: state.hour,
        textKu: `سوپاکەت بێ خۆراکە! سەربازەکانت برسین و مۆڕاڵیان دابەزیوە. بە زووترین کات خۆراک بکڕە!`,
        textEn: `Rations exhausted! Your soldiers are starving and cohesion is broken. Procure food immediately!`,
        type: 'alert',
      });
    }

    if (player.dinars < totalWages && totalTroopCount > 0) {
      const deserters = Math.max(1, Math.ceil(totalTroopCount * 0.25));
      let remainingToDesert = deserters;
      player.troops.forEach((st) => {
        if (remainingToDesert > 0 && st.count > 0) {
          const leave = Math.min(st.count, remainingToDesert);
          st.count -= leave;
          remainingToDesert -= leave;
        }
      });
      player.troops = player.troops.filter((st) => st.count > 0);

      logs.push({
        id: `mil_desert_${state.day}`,
        day: state.day,
        hour: state.hour,
        textKu: `قەیرانی مووچە: نەبوونی دیناری پێویست بۆ مەعاش بووە هۆی هەڵاتنی ${deserters} سەرباز لە سوپاکەت!`,
        textEn: `Pay crisis! Inability to disburse daily wages caused ${deserters} soldiers to desert your banner!`,
        type: 'alert',
      });
    }

    return { player, logs };
  }

  /**
   * Process daily progression for all active multi-day siege camps across the world
   */
  public processDailySieges(state: GameState, bus: GameEventBus): {
    settlements: Record<string, Settlement>;
    parties: Record<string, Party>;
    player: GameState['player'];
    logs: GameLogMessage[];
  } {
    const updatedSettlements: Record<string, Settlement> = { ...state.settlements };
    const updatedParties: Record<string, Party> = { ...state.parties };
    const updatedPlayer: GameState['player'] = { ...state.player };
    const newLogs: GameLogMessage[] = [];

    Object.entries(updatedSettlements).forEach(([sId, settlement]) => {
      if (!settlement.siegeCamp) return;

      const s = { ...settlement, siegeCamp: { ...settlement.siegeCamp } };
      const camp = s.siegeCamp;
      camp.daysBesieged += 1;

      // 1. Advance Active Engine Construction
      if (camp.activeConstruction) {
        const eng = { ...camp.activeConstruction };
        eng.progressDays += 1;

        if (eng.progressDays >= eng.totalDays) {
          eng.isReady = true;
          camp.engines = [...camp.engines, eng];
          const completedName = eng.nameKu;
          camp.activeConstruction = undefined;

          newLogs.push({
            id: `engine_ready_${sId}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `ئامێری گەمارۆدان تەواوبوو: (${completedName}) لە کەمپی گەمارۆی ${s.nameKu} ئامادەیە بۆ بەکارهێنان!`,
            textEn: `Siege Engine Complete: (${eng.name}) is ready for the assault on ${s.name}!`,
            type: 'fief',
          });

          bus.dispatch(
            {
              id: `engine_comp_${sId}_${state.day}`,
              type: 'SIEGE_ENGINE_COMPLETED',
              day: state.day,
              hour: state.hour,
              targetId: sId,
              messageKu: `ئامێری (${completedName}) بۆ گەمارۆی ${s.nameKu} تەواوبوو.`,
              messageEn: `Siege engine (${eng.name}) completed for ${s.name}.`,
            },
            state
          );
        } else {
          camp.activeConstruction = eng;
        }
      }

      // 2. Bombardment & Wall Breaches from Catapults
      const activeCatapults = camp.engines.filter((e) => e.type === 'catapult' && e.isReady).length;
      if (activeCatapults > 0 && camp.wallBreaches < 2) {
        // 35% chance per day of opening a breach
        if (Math.random() < 0.35) {
          camp.wallBreaches += 1;
          s.defenseLevel = Math.max(1, s.defenseLevel - 1);

          newLogs.push({
            id: `breach_${sId}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `دیواری قەڵا کەوت! تۆپبارانی مەنجەنیقەکان کەلێنێکی لە دیواری ${s.nameKu} کردەوە (کەلێن: ${camp.wallBreaches}/2)!`,
            textEn: `Wall Breached! Catapult bombardment has smashed a gap in the ramparts of ${s.name} (Breaches: ${camp.wallBreaches}/2)!`,
            type: 'alert',
          });

          bus.dispatch(
            {
              id: `wall_breach_${sId}_${state.day}`,
              type: 'WALL_BREACH_CREATED',
              day: state.day,
              hour: state.hour,
              targetId: sId,
              messageKu: `دیواری ${s.nameKu} کەلێنی تێکەوت!`,
              messageEn: `Rampart breached in ${s.name}!`,
            },
            state
          );
        }
      }

      // 3. Settlement Granary Drain & Attrition
      s.foodReservesDays = Math.max(0, s.foodReservesDays - 1);

      if (s.foodReservesDays === 0) {
        camp.surrenderWillingness = Math.min(100, camp.surrenderWillingness + 25);
        // Garrison desertion due to starvation
        let lostGarrison = 0;
        s.garrison = s.garrison.map((st) => {
          const desertCount = Math.max(1, Math.round(st.count * 0.05));
          lostGarrison += desertCount;
          return { ...st, count: Math.max(0, st.count - desertCount) };
        }).filter((st) => st.count > 0);

        if (lostGarrison > 0) {
          newLogs.push({
            id: `starve_gar_${sId}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `برسیەتی لە ناو ${s.nameKu}! ${lostGarrison} پاسەوانی قەڵا بەهۆی تەواوبوونی خۆراک هەڵاتن یان مردن. ئامادەیی خۆبەدەستەوەدان: ${camp.surrenderWillingness}٪`,
            textEn: `Starvation in ${s.name}! ${lostGarrison} defenders succumbed or deserted. Surrender willingness: ${camp.surrenderWillingness}%`,
            type: 'alert',
          });
        }
      }

      // 4. Anchor besieger party to the settlement
      if (updatedParties[camp.besiegerPartyId]) {
        const bp = { ...updatedParties[camp.besiegerPartyId] };
        bp.x = s.x;
        bp.z = s.z;
        bp.targetX = undefined;
        bp.targetZ = undefined;
        bp.statusTextKu = `گەمارۆی ${s.nameKu}ی داوە (ڕۆژی ${camp.daysBesieged})`;
        bp.statusText = `Besieging ${s.name} (Day ${camp.daysBesieged})`;
        updatedParties[camp.besiegerPartyId] = bp;
      }

      s.siegeDays = camp.daysBesieged;
      s.underSiegeBy = camp.besiegerPartyId;
      updatedSettlements[sId] = s;
    });

    return {
      settlements: updatedSettlements,
      parties: updatedParties,
      player: updatedPlayer,
      logs: newLogs,
    };
  }

  /**
   * Establish a formal overland Siege Camp against a settlement
   */
  public startSiegeCamp(
    state: GameState,
    settlementId: string,
    besiegerPartyId: string,
    bus: GameEventBus
  ): {
    settlement: Settlement;
    party: Party;
    player: GameState['player'];
    log: GameLogMessage;
  } {
    const s: Settlement = { ...state.settlements[settlementId] };
    const p: Party = { ...state.parties[besiegerPartyId] };
    const player: GameState['player'] = { ...state.player };

    const initialCamp: SiegeCampState = {
      settlementId,
      besiegerPartyId,
      startDay: state.day,
      daysBesieged: 1,
      engines: [],
      wallBreaches: 0,
      surrenderWillingness: 0,
      blockadeIntegrity: 95,
    };

    s.siegeCamp = initialCamp;
    s.underSiegeBy = besiegerPartyId;
    s.siegeDays = 1;

    p.x = s.x;
    p.z = s.z;
    p.targetX = undefined;
    p.targetZ = undefined;
    p.besiegingSettlementId = settlementId;
    p.statusTextKu = `کەمپی گەمارۆی لە دەورووبەری ${s.nameKu} دامەزراند`;
    p.statusText = `Established siege camp outside ${s.name}`;

    if (besiegerPartyId === 'player_party') {
      player.isBesiegingSettlementId = settlementId;
    }

    const log: GameLogMessage = {
      id: `siege_est_${settlementId}_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `کەمپی گەمارۆدان دامەزرا! سوپای ${p.nameKu} گەمارۆی فەرمی شاری ${s.nameKu}ی دا. ڕێگاکانی ئازووقە داخران.`,
      textEn: `Siege Camp Formed! ${p.name} has laid formal siege to ${s.name}. Supply lines are severed.`,
      type: 'politics',
    };

    bus.dispatch(
      {
        id: `siege_est_evt_${settlementId}_${state.day}`,
        type: 'SIEGE_CAMP_ESTABLISHED',
        day: state.day,
        hour: state.hour,
        sourceId: besiegerPartyId,
        targetId: settlementId,
        messageKu: `کەمپی گەمارۆدان لە دژی ${s.nameKu} دامەزرا.`,
        messageEn: `Siege camp established against ${s.name}.`,
      },
      state
    );

    return { settlement: s, party: p, player, log };
  }

  /**
   * Commission a siege engine (ladders, ram, catapult) in an active siege camp
   */
  public queueSiegeEngine(
    state: GameState,
    settlementId: string,
    engineType: SiegeEngineType,
    bus: GameEventBus
  ): {
    settlement: Settlement;
    player: GameState['player'];
    success: boolean;
    errorKu?: string;
  } {
    const s = { ...state.settlements[settlementId] };
    const player = { ...state.player };

    if (!s.siegeCamp) {
      return { settlement: s, player, success: false, errorKu: 'هیچ کەمپێکی گەمارۆدان بوونی نییە!' };
    }

    const camp = { ...s.siegeCamp };
    if (camp.activeConstruction) {
      return {
        settlement: s,
        player,
        success: false,
        errorKu: `لە ئێستادا ئامێری (${camp.activeConstruction.nameKu}) لە ژێر دروستکردندایە! چاوەڕێ بکە تا تەواو دەبێت.`,
      };
    }

    const config = SIEGE_CONFIG[engineType];
    const currentCount = camp.engines.filter((e) => e.type === engineType).length;
    if (currentCount >= config.maxAllowed) {
      return {
        settlement: s,
        player,
        success: false,
        errorKu: `نەگەیشتوویتە سنووری دروستکردنی (${config.nameKu})! زۆرترین بڕ: ${config.maxAllowed}`,
      };
    }

    // Check timber requirement
    const timberAvailable = player.inventory.timber || 0;
    if (timberAvailable < config.timberCost) {
      return {
        settlement: s,
        player,
        success: false,
        errorKu: `داری پێویستت نییە! پێویستت بە ${config.timberCost} داری ڕەق هەیە، بەڵام تەنها ${timberAvailable} دانەت هەیە.`,
      };
    }

    // Deduct timber
    player.inventory = {
      ...player.inventory,
      timber: timberAvailable - config.timberCost,
    };

    camp.activeConstruction = {
      id: `eng_${engineType}_${Date.now()}`,
      type: engineType,
      name: config.name,
      nameKu: config.nameKu,
      progressDays: 0,
      totalDays: config.totalDays,
      timberCost: config.timberCost,
      isReady: false,
    };

    s.siegeCamp = camp;
    return { settlement: s, player, success: true };
  }

  /**
   * Lift or abandon an active siege camp
   */
  public abandonSiegeCamp(
    state: GameState,
    settlementId: string,
    bus: GameEventBus
  ): {
    settlement: Settlement;
    party: Party;
    player: GameState['player'];
    log: GameLogMessage;
  } {
    const s = { ...state.settlements[settlementId] };
    const besiegerId = s.siegeCamp?.besiegerPartyId || 'player_party';
    const p = { ...state.parties[besiegerId] };
    const player = { ...state.player };

    s.siegeCamp = undefined;
    s.underSiegeBy = undefined;
    s.siegeDays = undefined;

    p.besiegingSettlementId = undefined;
    p.statusTextKu = undefined;
    p.statusText = undefined;

    if (besiegerId === 'player_party') {
      player.isBesiegingSettlementId = undefined;
    }

    const log: GameLogMessage = {
      id: `siege_lift_${settlementId}_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `کەمپی گەمارۆدان هەڵگیرا: سوپاکە لە گەمارۆی ${s.nameKu} کشانەوە.`,
      textEn: `Siege Lifted: Forces abandoned the siege of ${s.name}.`,
      type: 'politics',
    };

    bus.dispatch(
      {
        id: `siege_aban_evt_${settlementId}_${state.day}`,
        type: 'SIEGE_CAMP_ABANDONED',
        day: state.day,
        hour: state.hour,
        sourceId: besiegerId,
        targetId: settlementId,
        messageKu: `گەمارۆی سەر ${s.nameKu} هەڵگیرا.`,
        messageEn: `Siege of ${s.name} abandoned.`,
      },
      state
    );

    return { settlement: s, party: p, player, log };
  }

  /**
   * Resolve Bloodless Surrender of a starving besieged city
   */
  public executeSurrender(
    state: GameState,
    settlementId: string,
    bus: GameEventBus
  ): {
    settlement: Settlement;
    player: GameState['player'];
    log: GameLogMessage;
    success: boolean;
    errorKu?: string;
  } {
    const s = { ...state.settlements[settlementId] };
    const player = { ...state.player };

    if (!s.siegeCamp) {
      return { settlement: s, player, success: false, log: {} as any, errorKu: 'کەمپی گەمارۆدان بوونی نییە!' };
    }

    if (s.siegeCamp.surrenderWillingness < 75) {
      return {
        settlement: s,
        player,
        success: false,
        log: {} as any,
        errorKu: `پاسەوانانی شار هێشتا ئامادە نین بۆ خۆبەدەستەوەدان! (ئامادەیی: ${s.siegeCamp.surrenderWillingness}٪). خۆراکیان نەماوە، بەڵام بەرگری دەکەن.`,
      };
    }

    // Capture settlement without battle!
    s.factionId = 'player_kingdom';
    s.lordOwnerId = 'player';
    s.defenseLevel = Math.max(1, s.defenseLevel);
    s.foodReservesDays = 10; // Basic rations restored
    s.prosperity = Math.max(5, s.prosperity - 2); // Minimal bloodless damage
    s.garrison = [
      { troopId: 'footman', count: 15, wounded: 0 },
      { troopId: 'militia_archer', count: 10, wounded: 0 },
    ];
    s.siegeCamp = undefined;
    s.underSiegeBy = undefined;
    s.siegeDays = undefined;

    if (!player.fiefIds.includes(settlementId)) {
      player.fiefIds = [...player.fiefIds, settlementId];
    }
    player.isBesiegingSettlementId = undefined;
    player.honor += 5; // Honorable bloodless conquest bonus
    player.renown += 15;

    const log: GameLogMessage = {
      id: `surrender_${settlementId}_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `خۆبەدەستەوەدانی مەزن! شاری ${s.nameKu} بەبێ ڕشتنی خوێن دەروازەکانی کردەوە و تەسلیمی تۆ بوو. (+٥ شەرەف و ڕێزداربوون)`,
      textEn: `Bloodless Capitulation! ${s.name} opened its gates and formally surrendered without bloodshed (+5 Honor).`,
      type: 'fief',
    };

    bus.dispatch(
      {
        id: `surrender_evt_${settlementId}_${state.day}`,
        type: 'SIEGE_SURRENDER_ACCEPTED',
        day: state.day,
        hour: state.hour,
        targetId: settlementId,
        messageKu: `شاری ${s.nameKu} بە ئاشتیانە تەسلیم بوو.`,
        messageEn: `${s.name} surrendered peacefully.`,
      },
      state
    );

    return { settlement: s, player, log, success: true };
  }

  /**
   * Per-frame party spatial movement on the 3D overworld
   */
  public updatePartyPositions(
    parties: Record<string, Party>,
    dtSeconds: number,
    speedMult: number,
    onPlayerArrival?: (settlementId: string) => void
  ): Record<string, Party> {
    const nextParties: Record<string, Party> = {};

    Object.entries(parties).forEach(([pId, party]) => {
      const p = { ...party };

      // Parties actively in a siege camp remain stationed at the siege site
      if (p.besiegingSettlementId) {
        nextParties[pId] = p;
        return;
      }

      if (p.pathWaypoints && p.pathWaypoints.length > 0) {
        const idx = p.waypointIndex || 0;
        const currentTarget = p.pathWaypoints[idx];
        if (currentTarget) {
          const dx = currentTarget.x - p.x;
          const dz = currentTarget.z - p.z;
          const dist = Math.hypot(dx, dz);
          const isFinal = idx >= p.pathWaypoints.length - 1;
          const arrivalThreshold = isFinal ? ((p.type === 'player' && p.targetSettlementId) ? 2.5 : 1.2) : 1.6;

          if (dist > arrivalThreshold) {
            const actualSpeed = this.calculatePartySpeed(p, p.type === 'player');
            const step = actualSpeed * dtSeconds * 0.75 * speedMult;
            p.x += (dx / dist) * Math.min(step, dist);
            p.z += (dz / dist) * Math.min(step, dist);
          } else {
            // Reached this waypoint
            if (!isFinal) {
              p.waypointIndex = idx + 1;
            } else {
              // Final destination reached
              p.pathWaypoints = undefined;
              p.waypointIndex = undefined;
              p.targetX = undefined;
              p.targetZ = undefined;
              if (p.type === 'player' && p.targetSettlementId && onPlayerArrival) {
                onPlayerArrival(p.targetSettlementId);
                p.targetSettlementId = undefined;
              }
            }
          }
        } else {
          p.pathWaypoints = undefined;
          p.waypointIndex = undefined;
        }
      } else if (p.targetX !== undefined && p.targetZ !== undefined) {
        const dx = p.targetX - p.x;
        const dz = p.targetZ - p.z;
        const dist = Math.hypot(dx, dz);
        const arrivalRadius = (p.type === 'player' && p.targetSettlementId) ? 2.8 : 1.2;

        if (dist > arrivalRadius) {
          const actualSpeed = this.calculatePartySpeed(p, p.type === 'player');
          const step = actualSpeed * dtSeconds * 0.75 * speedMult;
          p.x += (dx / dist) * Math.min(step, dist);
          p.z += (dz / dist) * Math.min(step, dist);
        } else {
          // Arrived
          if (p.type === 'player') {
            if (p.targetSettlementId && onPlayerArrival) {
              onPlayerArrival(p.targetSettlementId);
              p.targetSettlementId = undefined;
            }
            p.targetX = undefined;
            p.targetZ = undefined;
          } else {
            // AI parties (Lords, Caravans, Bandits): Continuously pick new patrol & march coordinates!
            if (p.type === 'lord') {
              // Lords patrol between their realm's regional heartlands
              const wanderAngle = Math.random() * Math.PI * 2;
              const wanderDist = 12 + Math.random() * 20;
              p.targetX = Math.max(10, Math.min(90, p.x + Math.cos(wanderAngle) * wanderDist));
              p.targetZ = Math.max(8, Math.min(88, p.z + Math.sin(wanderAngle) * wanderDist));
            } else if (p.type === 'bandit') {
              // Bandits stalk crossroads and mountain routes
              const wanderAngle = Math.random() * Math.PI * 2;
              const wanderDist = 8 + Math.random() * 15;
              p.targetX = Math.max(12, Math.min(88, p.x + Math.cos(wanderAngle) * wanderDist));
              p.targetZ = Math.max(10, Math.min(85, p.z + Math.sin(wanderAngle) * wanderDist));
            } else if (p.type === 'caravan') {
              // Caravans journey across trade hubs
              const wanderAngle = Math.random() * Math.PI * 2;
              const wanderDist = 20 + Math.random() * 30;
              p.targetX = Math.max(10, Math.min(90, p.x + Math.cos(wanderAngle) * wanderDist));
              p.targetZ = Math.max(10, Math.min(85, p.z + Math.sin(wanderAngle) * wanderDist));
            }
          }
        }
      } else if (p.type !== 'player' && (p.targetX === undefined || p.targetZ === undefined)) {
        // AI party without target: Initialize roam target
        const wanderAngle = Math.random() * Math.PI * 2;
        const wanderDist = 15 + Math.random() * 20;
        p.targetX = Math.max(10, Math.min(90, p.x + Math.cos(wanderAngle) * wanderDist));
        p.targetZ = Math.max(10, Math.min(85, p.z + Math.sin(wanderAngle) * wanderDist));
      }

      nextParties[pId] = p;
    });

    return nextParties;
  }
}
