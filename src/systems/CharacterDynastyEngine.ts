/**
 * Character and Dynasty Engine
 * Manages noble ambitions, character progression, renown, honor,
 * imprisonment, and vassal loyalty.
 */
import { GameLogMessage, GameState, Lord } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

export class CharacterDynastyEngine implements IEngineModule {
  public name = 'CharacterDynastyEngine';

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const updatedLords: Record<string, Lord> = {};
    const newLogs: GameLogMessage[] = [];

    Object.entries(state.lords).forEach(([lId, lord]) => {
      const l = { ...lord };

      // 1. Lord wealth changes based on owned fiefs
      let fiefRevenue = 0;
      l.fiefIds.forEach((fId) => {
        const s = state.settlements[fId];
        if (s) {
          fiefRevenue += Math.round(s.population * 0.04 * (s.prosperity / 100));
        }
      });

      // Troop maintenance expense
      let troopUpkeep = 0;
      l.troops.forEach((st) => {
        troopUpkeep += st.count * 2;
      });

      l.wealth = Math.max(500, l.wealth + fiefRevenue - troopUpkeep);

      // 2. Prestige growth based on personality
      if (l.personality === 'martial') {
        l.prestige += 0.2;
      } else if (l.personality === 'diplomat') {
        l.prestige += 0.15;
      }

      // 3. Captivity duration and ransom negotiation
      if (l.isImprisoned) {
        // Chance of paying ransom or escaping after 15+ days
        if (Math.random() < 0.08) {
          l.isImprisoned = false;
          l.imprisonedBy = undefined;
          l.wealth = Math.max(200, l.wealth - 1200);

          newLogs.push({
            id: `ransom_${l.id}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `ئازادکردن: ${l.nameKu} فیدیەی خۆی دا و لە زیندان ئازاد کرا.`,
            textEn: `Ransom Paid: ${l.name} negotiated ransom terms and was released from captivity.`,
            type: 'politics',
          });
        }
      }

      updatedLords[lId] = l;
    });

    return {
      lords: updatedLords,
      logs: newLogs.length > 0 ? [...newLogs, ...state.logs.slice(0, 45)] : state.logs,
    };
  }

  /**
   * Award player renown and honor following heroic actions
   */
  public addPlayerGlory(
    player: GameState['player'],
    renownGain: number,
    honorGain: number
  ): GameState['player'] {
    return {
      ...player,
      renown: Math.max(0, player.renown + renownGain),
      honor: Math.max(-100, Math.min(100, player.honor + honorGain)),
    };
  }
}
