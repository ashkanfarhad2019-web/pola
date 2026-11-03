/**
 * City Management Engine
 * Governs population dynamics, public order, prosperity, food reserves,
 * taxation consequences, and rebellion outbreaks.
 */
import { GameLogMessage, GameState, Settlement } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

export class CityManagementEngine implements IEngineModule {
  public name = 'CityManagementEngine';

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const updatedSettlements: Record<string, Settlement> = {};
    const newLogs: GameLogMessage[] = [];

    Object.entries(state.settlements).forEach(([id, settlement]) => {
      const s = { ...settlement };

      // 1. Food reserves check and famine consequences
      const isStarving = s.foodReservesDays <= 1;
      let orderDelta = 0;
      let prosperityDelta = 0;
      let popDelta = 0;

      if (isStarving) {
        orderDelta -= 8;
        prosperityDelta -= 3;
        popDelta -= Math.round(s.population * 0.015); // Emigration and starvation mortality

        bus.dispatch(
          {
            id: `famine_${s.id}_${state.day}`,
            type: 'FAMINE_ALERT',
            day: state.day,
            hour: state.hour,
            targetId: s.id,
            messageKu: `قەیرانی خۆراک لە ${s.nameKu}! ئازووقە تەواو بووە و خەڵکی شار لە لێواری برسیەتیدان.`,
            messageEn: `Severe famine in ${s.name}! Granaries are depleted and population is in distress.`,
          },
          state
        );

        if (s.lordOwnerId === 'player' || state.player.fiefIds.includes(s.id)) {
          newLogs.push({
            id: `city_starve_${s.id}_${state.day}`,
            day: state.day,
            hour: state.hour,
            textKu: `هۆشداری: شاری ${s.nameKu} ئازووقەی خۆراکی نەماوە! خەڵک ناڕازین و یاخیبوون نزیکە.`,
            textEn: `Warning: ${s.name} is out of food reserves! Public unrest is escalating rapidly.`,
            type: 'alert',
          });
        }
      } else if (s.foodReservesDays > 25) {
        // Abundant granaries boost health and order
        orderDelta += 1;
        prosperityDelta += 0.5;
        popDelta += Math.round(s.population * 0.003); // Natural growth
      }

      // 2. Taxation effects on public order and prosperity
      switch (s.taxRate) {
        case 'low':
          orderDelta += 2;
          prosperityDelta += 1;
          break;
        case 'normal':
          // Neutral
          break;
        case 'high':
          orderDelta -= 3;
          prosperityDelta -= 1;
          break;
        case 'extortionate':
          orderDelta -= 7;
          prosperityDelta -= 3;
          break;
      }

      // 3. Garrison presence reinforces order
      const garrisonCount = s.garrison.reduce((acc, st) => acc + st.count, 0);
      const neededGarrison = Math.max(15, Math.round(s.population / 400));
      if (garrisonCount >= neededGarrison) {
        orderDelta += 2;
      } else {
        orderDelta -= 2; // Lawlessness due to undermanned garrison
      }

      // 4. Under siege penalties
      if (s.underSiegeBy) {
        orderDelta -= 5;
        prosperityDelta -= 4;
        s.foodReservesDays = Math.max(0, s.foodReservesDays - 1);
      }

      // Apply deltas with realistic clamping
      s.publicOrder = Math.max(0, Math.min(100, Math.round(s.publicOrder + orderDelta)));
      s.prosperity = Math.max(5, Math.min(100, Math.round(s.prosperity + prosperityDelta)));
      s.population = Math.max(500, Math.round(s.population + popDelta));

      // 5. Rebellion Check: if public order < 15 and starving, peasant riot or uprising
      if (s.publicOrder < 15 && Math.random() < 0.25) {
        // Rebellion damages prosperity and kills garrison
        s.prosperity = Math.max(5, s.prosperity - 8);
        if (s.garrison.length > 0 && s.garrison[0].count > 5) {
          s.garrison[0].count = Math.max(2, s.garrison[0].count - 6);
        }

        bus.dispatch(
          {
            id: `rebel_${s.id}_${state.day}`,
            type: 'REBELLION_OUTBREAK',
            day: state.day,
            hour: state.hour,
            targetId: s.id,
            messageKu: `یاخیبوونی خەڵک لە ${s.nameKu}! بەهۆی نادادپەروەری و گرانی، جەماوەر هێرشیان کردە سەر بەشێک لە پاسەوانان.`,
            messageEn: `Civil riot in ${s.name}! Discontent and starvation triggered unrest against city guards.`,
          },
          state
        );

        newLogs.push({
          id: `rebel_log_${s.id}_${state.day}`,
          day: state.day,
          hour: state.hour,
          textKu: `ئاگاداری: یاخیبوونی خەڵک لە ${s.nameKu}! ئارامی شار شێوا و بەشێک لە سەربازانی پاسەوان زیانیان بەرکەوت.`,
          textEn: `Uprising in ${s.name}! Low public order sparked civil riot, damaging urban security.`,
          type: 'alert',
        });
      }

      updatedSettlements[id] = s;
    });

    return {
      settlements: updatedSettlements,
      logs: newLogs.length > 0 ? [...newLogs, ...state.logs.slice(0, 45)] : state.logs,
    };
  }
}
