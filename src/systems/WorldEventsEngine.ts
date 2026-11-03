/**
 * World Events Engine
 * Generates emergent historical dispatches, economic shocks, and regional crises
 * that make the medieval world feel alive and unpredictable.
 */
import { GameLogMessage, GameState, NewsDispatch, Settlement } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

interface HistoricalEventTemplate {
  type: NewsDispatch['type'];
  titleKu: string;
  contentKu: (s: Settlement) => string;
  effect: (s: Settlement) => Settlement;
}

export class WorldEventsEngine implements IEngineModule {
  public name = 'WorldEventsEngine';

  private templates: HistoricalEventTemplate[] = [
    {
      type: 'market',
      titleKu: 'وشکەساڵی و گرانی دانەوێڵە',
      contentKu: (s) => `بەهۆی کەمی باران لە دەشتەکانی دەورووبەری ${s.nameKu}، بەرهەمی دانەوێڵە کەمیکردووە و نرخی گەنم لە بازاڕەکان بەرزبووەتەوە.`,
      effect: (s) => {
        const next = { ...s, market: { ...s.market } };
        if (next.market.grain) {
          next.market.grain.stock = Math.max(3, Math.round(next.market.grain.stock * 0.45));
          next.market.grain.buyPrice = Math.round(next.market.grain.buyPrice * 1.8);
          next.market.grain.sellPrice = Math.round(next.market.grain.buyPrice * 0.75);
        }
        return next;
      },
    },
    {
      type: 'market',
      titleKu: 'دۆزینەوەی دەمارە ئاسنێکی نوێ لە شاخەکان',
      contentKu: (s) => `کۆمەڵێک ئاسنگەر لە نزیک ${s.nameKu} کانێکی گەورەی ئاسنی خاویان دۆزییەوە. ئەمە بووەتە هۆی بووژانەوەی کارگەکانی چەکسازی.`,
      effect: (s) => {
        const next = { ...s, market: { ...s.market } };
        if (next.market.iron) {
          next.market.iron.stock += 35;
          next.market.iron.buyPrice = Math.max(15, Math.round(next.market.iron.buyPrice * 0.65));
          next.market.iron.sellPrice = Math.round(next.market.iron.buyPrice * 0.75);
        }
        next.prosperity = Math.min(100, next.prosperity + 5);
        return next;
      },
    },
    {
      type: 'scandal',
      titleKu: 'کەشفبوونی گەندەڵی لە خەزێنەی باج',
      contentKu: (s) => `بەرپرسێکی باجگری لە ${s.nameKu} بە دزینی زێڕی خەڵک تۆمەتبار کرا. متمانەی جەماوەر بە دەسەڵاتداران دابەزی.`,
      effect: (s) => {
        const next = { ...s };
        next.publicOrder = Math.max(5, next.publicOrder - 10);
        return next;
      },
    },
    {
      type: 'market',
      titleKu: 'کاروانی ئاوریشمی گەورە گەیشت',
      contentKu: (s) => `کاروانێکی دەیان وشتر لە ڕێگای ئاوریشمەوە گەیشتە ${s.nameKu}، بەهارات و قوماشی شاهانە بە بازاڕدا بڵاو بووەوە.`,
      effect: (s) => {
        const next = { ...s, market: { ...s.market } };
        if (next.market.silk) {
          next.market.silk.stock += 25;
        }
        if (next.market.spices) {
          next.market.spices.stock += 30;
        }
        next.prosperity = Math.min(100, next.prosperity + 6);
        return next;
      },
    },
  ];

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    // Only trigger occasional world events (roughly once every 5-8 days)
    if (state.day % 6 !== 0 && Math.random() > 0.18) {
      return {};
    }

    const settlements = Object.values(state.settlements);
    if (settlements.length === 0) return {};

    const targetSettlement = settlements[Math.floor(Math.random() * settlements.length)];
    const template = this.templates[Math.floor(Math.random() * this.templates.length)];

    const updatedSettlement = template.effect(targetSettlement);
    const newDispatch: NewsDispatch = {
      id: `dispatch_${state.day}_${Math.random().toString(36).substring(2, 7)}`,
      day: state.day,
      type: template.type,
      importance: 'high',
      titleKu: template.titleKu,
      contentKu: template.contentKu(targetSettlement),
      settlementId: targetSettlement.id,
      factionId: targetSettlement.factionId,
    };

    const newLog: GameLogMessage = {
      id: `event_log_${state.day}`,
      day: state.day,
      hour: state.hour,
      textKu: `ڕووداو: ${template.titleKu} لە ${targetSettlement.nameKu}`,
      textEn: `World Event: ${template.titleKu} in ${targetSettlement.name}`,
      type: 'alert',
    };

    bus.dispatch(
      {
        id: newDispatch.id,
        type: 'WORLD_EVENT_TRIGGERED',
        day: state.day,
        hour: state.hour,
        targetId: targetSettlement.id,
        data: { templateTitle: template.titleKu },
        messageKu: newDispatch.contentKu,
        messageEn: `World event triggered in ${targetSettlement.name}`,
      },
      state
    );

    return {
      settlements: {
        ...state.settlements,
        [targetSettlement.id]: updatedSettlement,
      },
      news: [newDispatch, ...state.news.slice(0, 30)],
      logs: [newLog, ...state.logs.slice(0, 45)],
    };
  }
}
