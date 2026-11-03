/**
 * Espionage Engine
 * Manages covert spy networks, clandestine intelligence gathering,
 * cover integrity deterioration, and counter-espionage discovery.
 */
import { GameLogMessage, GameState, SpyAgent } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

export class EspionageEngine implements IEngineModule {
  public name = 'EspionageEngine';

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const player = { ...state.player };
    const newLogs: GameLogMessage[] = [];
    const updatedSpies: SpyAgent[] = [];

    if (!player.spies || player.spies.length === 0) {
      return {};
    }

    player.spies.forEach((spy) => {
      const s = { ...spy };
      s.infiltratedDays += 1;

      const targetSettlement = state.settlements[s.targetSettlementId];
      if (!targetSettlement) {
        updatedSpies.push(s);
        return;
      }

      // 1. Gather fresh, accurate intelligence
      const totalGarrison = targetSettlement.garrison.reduce((acc, st) => acc + st.count, 0);

      const secretRumorKu =
        targetSettlement.foodReservesDays < 15
          ? 'خەڵکی شار بەهۆی گرانی و کەمبوونەوەی ئازووقە لە لێواری یاخیبوونن.'
          : targetSettlement.publicOrder < 30
          ? 'پاسەوانانی قەڵا چەندین دەستپێشخەری یاخیبوونیان بە زۆر سەرکوت کردووە.'
          : 'کاروانی بازرگانی لە ڕۆژانی داهاتوودا بە بڕێکی زۆر زێڕ و کاڵاوە دەگاتە شار.';

      const vulnerabilitiesKu: string[] = [];
      if (targetSettlement.defenseLevel <= 3) {
        vulnerabilitiesKu.push('دیواری بەشی باکوور کۆنە و بە ئاسانی دەڕووخێت');
      }
      if (targetSettlement.foodReservesDays <= 12) {
        vulnerabilitiesKu.push('کۆگای خۆراک زۆر لاوازە، بە مانگێک گەمارۆدان خۆیان بەدەستەوە دەدەن');
      }
      if (vulnerabilitiesKu.length === 0) {
        vulnerabilitiesKu.push('بیری ئاوی دەرەوە لە مەترسی ژەهراویکردندایە');
      }

      s.lastIntel = {
        garrisonCount: totalGarrison,
        foodDays: targetSettlement.foodReservesDays,
        defenseLevel: targetSettlement.defenseLevel,
        prosperity: targetSettlement.prosperity,
        secretRumorKu,
        vulnerabilitiesKu,
      };

      // 2. Cover integrity decay based on target settlement defense & public order
      const suspicionRate = targetSettlement.defenseLevel * 0.8 + (targetSettlement.publicOrder > 70 ? 1.5 : 0.5);
      s.coverIntegrity = Math.max(0, Math.round(s.coverIntegrity - suspicionRate));

      // 3. Counter-espionage detection: if cover integrity < 15%, chance of discovery
      if (s.coverIntegrity < 15 && Math.random() < 0.28) {
        newLogs.push({
          id: `spy_captured_${s.id}_${state.day}`,
          day: state.day,
          hour: state.hour,
          textKu: `ئاگاداری مەترسیدار: سیخوڕەکەت (${s.nameKu}) لە ${targetSettlement.nameKu} لەلایەن پاسەوانانەوە ئاشکرا کرا و دەستگیر کرا!`,
          textEn: `Critical Breach: Your spy (${s.nameKu}) in ${targetSettlement.name} was exposed and imprisoned by the city watch!`,
          type: 'alert',
        });
        // Spy is captured and removed from player network
        return;
      }

      updatedSpies.push(s);
    });

    player.spies = updatedSpies;

    return {
      player,
      logs: newLogs.length > 0 ? [...newLogs, ...state.logs.slice(0, 45)] : state.logs,
    };
  }
}
