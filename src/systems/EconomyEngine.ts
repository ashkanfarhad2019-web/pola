/**
 * Economy and Trade Engine
 * Realistic market dynamics, supply-demand curves, caravan routes, and workshop logistics
 */
import { GameState, GoodId, Party, Settlement, SettlementMarketItem } from '../types/game';
import { TRADE_GOODS } from '../data/worldData';
import { GameEventBus, IEngineModule } from './interfaces';

export class EconomyEngine implements IEngineModule {
  public name = 'EconomyEngine';

  /**
   * Run daily market simulation across all settlements
   */
  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const updatedSettlements: Record<string, Settlement> = {};

    Object.entries(state.settlements).forEach(([id, settlement]) => {
      const s = { ...settlement };
      const market: Record<GoodId, SettlementMarketItem> = { ...s.market };

      (Object.keys(TRADE_GOODS) as GoodId[]).forEach((goodKey) => {
        const item = { ...market[goodKey] };
        const goodDef = TRADE_GOODS[goodKey];

        // Production scaled by settlement prosperity (higher prosperity = more efficient craft)
        const prosperityFactor = 0.5 + (s.prosperity / 100);
        const actualProduction = Math.round(item.productionRate * prosperityFactor);

        // Consumption scaled by population and tax rate
        let taxConsumptionMult = 1.0;
        if (s.taxRate === 'low') taxConsumptionMult = 1.15;
        if (s.taxRate === 'high') taxConsumptionMult = 0.85;
        if (s.taxRate === 'extortionate') taxConsumptionMult = 0.65;

        const popDemandScale = Math.max(0.5, s.population / 4000);
        const actualConsumption = Math.round(item.consumptionRate * popDemandScale * taxConsumptionMult);

        const netChange = actualProduction - actualConsumption + (Math.floor(Math.random() * 3) - 1);
        item.stock = Math.max(1, item.stock + netChange);

        // Economic supply-demand formula:
        // Price = basePrice * (targetStock / currentStock)^0.72
        const targetStock = 35;
        const supplyRatio = targetStock / Math.max(item.stock, 2);
        const scarcityExponent = 0.72;
        const scarcityMultiplier = Math.pow(supplyRatio, scarcityExponent);
        const clampedMultiplier = Math.max(0.35, Math.min(3.8, scarcityMultiplier));

        item.buyPrice = Math.max(2, Math.round(goodDef.basePrice * clampedMultiplier));
        // Merchant spread (buy vs sell)
        item.sellPrice = Math.max(1, Math.round(item.buyPrice * 0.76));

        market[goodKey] = item;
      });

      // Update food reserves days
      const grainStock = market.grain?.stock || 0;
      const meatStock = market.meat?.stock || 0;
      const dailyFoodNeed = Math.max(1, Math.round(s.population / 2200));
      s.foodReservesDays = Math.max(1, Math.floor((grainStock * 1.8 + meatStock * 2.5) / dailyFoodNeed));

      s.market = market;
      updatedSettlements[id] = s;
    });

    return { settlements: updatedSettlements };
  }

  /**
   * Process caravan trading transaction when caravan arrives at destination
   */
  public processCaravanArrival(caravan: Party, settlement: Settlement, bus: GameEventBus): {
    updatedCaravan: Party;
    updatedSettlement: Settlement;
  } {
    const updatedCaravan = { ...caravan, cargo: { ...caravan.cargo } };
    const updatedSettlement = { ...settlement, market: { ...settlement.market } };

    let totalSoldVal = 0;

    // 1. Unload and sell imported goods
    (Object.keys(updatedCaravan.cargo) as GoodId[]).forEach((goodId) => {
      const qty = updatedCaravan.cargo[goodId] || 0;
      if (qty > 0 && updatedSettlement.market[goodId]) {
        const item = { ...updatedSettlement.market[goodId] };
        item.stock += qty;
        const earn = item.sellPrice * qty;
        updatedCaravan.dinars += earn;
        updatedCaravan.cargo[goodId] = 0;
        totalSoldVal += earn;
        updatedSettlement.market[goodId] = item;
      }
    });

    // 2. Buy surplus local goods to export
    Object.values(updatedSettlement.market).forEach((mItem) => {
      if (mItem.stock > 38 && updatedCaravan.dinars > mItem.buyPrice * 8) {
        const item = { ...updatedSettlement.market[mItem.goodId] };
        const buyAmount = Math.min(14, Math.floor(item.stock * 0.28));
        item.stock -= buyAmount;
        updatedCaravan.cargo[item.goodId] = (updatedCaravan.cargo[item.goodId] || 0) + buyAmount;
        updatedCaravan.dinars -= item.buyPrice * buyAmount;
        updatedSettlement.market[item.goodId] = item;
      }

      // Dynamic price rebalance after bulk purchase/sale
      const goodDef = TRADE_GOODS[mItem.goodId];
      const targetStock = 35;
      const scarcity = Math.pow(targetStock / Math.max(mItem.stock, 2), 0.72);
      mItem.buyPrice = Math.max(2, Math.round(goodDef.basePrice * Math.min(3.8, Math.max(0.35, scarcity))));
      mItem.sellPrice = Math.max(1, Math.round(mItem.buyPrice * 0.76));
    });

    if (totalSoldVal > 0) {
      bus.dispatch(
        {
          id: `caravan_trade_${Date.now()}_${Math.random()}`,
          type: 'CARAVAN_TRADED',
          day: 0,
          hour: 0,
          sourceId: caravan.id,
          targetId: settlement.id,
          messageKu: `${caravan.nameKu} بڕی ${totalSoldVal} دینار کاڵای لە ${settlement.nameKu} فرۆشت.`,
          messageEn: `${caravan.name} completed trade at ${settlement.name} worth ${totalSoldVal} dinars.`,
        },
        {} as any
      );
    }

    return { updatedCaravan, updatedSettlement };
  }
}
