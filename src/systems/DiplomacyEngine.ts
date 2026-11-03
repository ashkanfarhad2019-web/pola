/**
 * Political and Diplomacy Engine
 * Manages realm alliances, war declarations, truces, defensive pacts,
 * diplomatic drift, and court access protocols.
 */
import { Faction, FactionId, GameLogMessage, GameState, Treaty } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

export class DiplomacyEngine implements IEngineModule {
  public name = 'DiplomacyEngine';

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const updatedFactions: Record<FactionId, Faction> = { ...state.factions };
    const newLogs: GameLogMessage[] = [];

    const factionIds = (Object.keys(state.factions) as FactionId[]).filter((f) => f !== 'player_kingdom');

    factionIds.forEach((fId) => {
      const faction = { ...state.factions[fId] };
      const updatedTreaties: Treaty[] = [];

      // 1. Process active treaties and check expiration
      faction.treaties.forEach((treaty) => {
        const remainingDays = treaty.durationDays - 1;
        if (remainingDays > 0) {
          updatedTreaties.push({ ...treaty, durationDays: remainingDays });
        } else {
          // Treaty expired!
          if (treaty.type === 'war') {
            // War exhaustion results in truce
            updatedTreaties.push({
              id: `truce_${fId}_${treaty.targetFactionId}_${state.day}`,
              targetFactionId: treaty.targetFactionId,
              type: 'truce',
              durationDays: 20,
            });

            const targetName = state.factions[treaty.targetFactionId]?.nameKu || treaty.targetFactionId;
            newLogs.push({
              id: `peace_exp_${fId}_${state.day}`,
              day: state.day,
              hour: state.hour,
              textKu: `ئاگربەست: جەنگی نێوان ${faction.nameKu} و ${targetName} بەهۆی ماندووبوونی لەشکر کۆتایی هات.`,
              textEn: `Truce concluded between ${faction.name} and ${targetName} due to war exhaustion.`,
              type: 'politics',
            });

            bus.dispatch(
              {
                id: `peace_${fId}_${treaty.targetFactionId}_${state.day}`,
                type: 'PEACE_SIGNED',
                day: state.day,
                hour: state.hour,
                sourceId: fId,
                targetId: treaty.targetFactionId,
                messageKu: `ئاگربەست لە نێوان ${faction.nameKu} و ${targetName} بەسترا.`,
                messageEn: `Peace signed between ${faction.name} and ${targetName}.`,
              },
              state
            );
          }
        }
      });

      // 2. Diplomatic relations natural drift
      factionIds.forEach((otherId) => {
        if (fId === otherId) return;
        const currentRel = faction.relations[otherId] ?? 0;
        const hasWar = updatedTreaties.some((t) => t.targetFactionId === otherId && t.type === 'war');
        const hasTrade = updatedTreaties.some((t) => t.targetFactionId === otherId && t.type === 'trade');

        if (hasWar && currentRel > -80) {
          faction.relations[otherId] = Math.max(-100, currentRel - 2);
        } else if (hasTrade && currentRel < 60) {
          faction.relations[otherId] = Math.min(100, currentRel + 1);
        }
      });

      // 3. Emergent war declarations based on deep hostility
      factionIds.forEach((otherId) => {
        if (fId === otherId) return;
        const relation = faction.relations[otherId] ?? 0;
        const isAlreadyAtWar = updatedTreaties.some((t) => t.targetFactionId === otherId && t.type === 'war');
        const isTruce = updatedTreaties.some((t) => t.targetFactionId === otherId && t.type === 'truce');

        if (!isAlreadyAtWar && !isTruce && relation <= -55 && Math.random() < 0.04) {
          // Declare War!
          updatedTreaties.push({
            id: `war_${fId}_${otherId}_${state.day}`,
            targetFactionId: otherId,
            type: 'war',
            durationDays: 30 + Math.floor(Math.random() * 20),
          });

          const otherName = state.factions[otherId]?.nameKu || otherId;
          newLogs.push({
            id: `war_log_${fId}_${otherId}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `ڕاگەیاندنی شەڕ: ${faction.nameKu} شەڕی فەرمی دژی ${otherName} ڕاگەیاند!`,
            textEn: `War Declared: The ${faction.name} declared war on ${otherName}!`,
            type: 'politics',
          });

          bus.dispatch(
            {
              id: `war_event_${fId}_${otherId}_${state.day}`,
              type: 'WAR_DECLARED',
              day: state.day,
              hour: state.hour,
              sourceId: fId,
              targetId: otherId,
              messageKu: `شەڕ لە نێوان ${faction.nameKu} و ${otherName} بەرپابوو!`,
              messageEn: `War declared between ${faction.name} and ${otherName}!`,
            },
            state
          );
        }
      });

      faction.treaties = updatedTreaties;
      updatedFactions[fId] = faction;
    });

    if (state.factions['player_kingdom']) {
      updatedFactions['player_kingdom'] = state.factions['player_kingdom'];
    }

    return {
      factions: updatedFactions,
      logs: newLogs.length > 0 ? [...newLogs, ...state.logs.slice(0, 45)] : state.logs,
    };
  }

  /**
   * Check if player has legitimate royal audience access
   */
  public hasAudienceAccess(player: GameState['player'], factionId: FactionId): {
    allowed: boolean;
    reasonKu?: string;
  } {
    const chamberlainBribed = player.chamberlainBribes?.[factionId] || false;
    if (chamberlainBribed) return { allowed: true };
    if (player.renown >= 45) return { allowed: true };
    if (player.fiefIds.length > 0) return { allowed: true };

    return {
      allowed: false,
      reasonKu: 'پاسەوانانی کۆشک: ناوبانگت لە ٤٥ کەمترە و هیچ شارێکت لەژێر دەستدا نییە. کارگێڕی کۆشک (Chamberlain) بە بەخشیش ڕازی بکە تا ڕێگات پێبدات!',
    };
  }
}
