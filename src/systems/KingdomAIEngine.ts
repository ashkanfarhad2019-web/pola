/**
 * Kingdom AI Engine
 * Autonomous realm strategy: military power calculation, strategic campaign targeting,
 * lord army mobilization, and border defense coordination.
 */
import { Faction, FactionId, GameState, Party, Settlement } from '../types/game';
import { GameEventBus, IEngineModule } from './interfaces';

export class KingdomAIEngine implements IEngineModule {
  public name = 'KingdomAIEngine';

  public onDailyTick(state: GameState, bus: GameEventBus): Partial<GameState> {
    const updatedFactions: Record<FactionId, Faction> = { ...state.factions };
    const updatedParties: Record<string, Party> = { ...state.parties };

    // 1. Recalculate military power and treasury balances for each faction
    const factionIds = (Object.keys(updatedFactions) as FactionId[]).filter((f) => f !== 'player_kingdom');

    factionIds.forEach((fId) => {
      const f = { ...updatedFactions[fId] };

      // Calculate total standing army of faction
      let totalArmyStrength = 0;
      Object.values(updatedParties).forEach((p) => {
        if (p.factionId === fId && (p.type === 'lord' || p.type === 'patrol')) {
          p.troops.forEach((st) => {
            totalArmyStrength += st.count;
          });
        }
      });

      // Add garrison strength
      Object.values(state.settlements).forEach((s) => {
        if (s.factionId === fId) {
          s.garrison.forEach((st) => {
            totalArmyStrength += Math.round(st.count * 0.7);
          });
        }
      });

      f.militaryPower = Math.max(50, totalArmyStrength);
      updatedFactions[fId] = f;
    });

    // 2. Autonomous strategic movement decisions for AI Lords
    Object.entries(updatedParties).forEach(([pId, party]) => {
      if (party.type !== 'lord' || !party.leaderLordId) return;

      const p = { ...party };
      const faction = updatedFactions[p.factionId];
      if (!faction) return;

      const totalTroops = p.troops.reduce((acc, st) => acc + st.count, 0);
      const factionSettlements = Object.values(state.settlements).filter((s) => s.factionId === p.factionId);
      const enemySettlements = Object.values(state.settlements).filter((s) =>
        faction.treaties.some((tr) => tr.type === 'war' && tr.targetFactionId === s.factionId)
      );

      // Strategy 0 (Highest Emergency): Relief Army for Besieged Home Fief
      const besiegedHomeFief = factionSettlements.find((s) => s.siegeCamp || s.underSiegeBy);
      if (besiegedHomeFief && totalTroops >= 40) {
        p.targetX = besiegedHomeFief.x + (Math.random() * 2 - 1);
        p.targetZ = besiegedHomeFief.z + (Math.random() * 2 - 1);
        p.targetSettlementId = besiegedHomeFief.id;
        p.targetPartyId = besiegedHomeFief.siegeCamp?.besiegerPartyId;
        p.statusTextKu = `بە هانای گەمارۆی ${besiegedHomeFief.nameKu} دەچێت (سوپای فریاگوزار)`;
        p.statusText = `Marching to relieve siege of ${besiegedHomeFief.name} (Relief Army)`;
      }
      // Strategy A: Low troops (< 40) -> Retreat to nearest friendly fief and recruit
      else if (totalTroops < 40 && factionSettlements.length > 0) {
        const nearestHome = this.findNearestSettlement(p.x, p.z, factionSettlements);
        if (nearestHome) {
          p.targetX = nearestHome.x + (Math.random() * 2 - 1);
          p.targetZ = nearestHome.z + (Math.random() * 2 - 1);
          p.targetSettlementId = nearestHome.id;
          p.statusTextKu = `بەرەو ${nearestHome.nameKu} دەگەڕێتەوە بۆ سەربازگرتن`;
          p.statusText = `Returning to ${nearestHome.name} to reinforce`;
          // Recruit local volunteers
          p.troops.push({ troopId: 'footman', count: 5 + Math.floor(Math.random() * 5), wounded: 0 });
        }
      }
      // Strategy B: High troops (> 70) and at war -> Muster campaign to attack enemy settlement
      else if (totalTroops >= 70 && enemySettlements.length > 0) {
        // Pick weakest enemy settlement
        const targetCastle = enemySettlements.reduce((weakest, current) => {
          const currentGar = current.garrison.reduce((acc, st) => acc + st.count, 0);
          const weakestGar = weakest.garrison.reduce((acc, st) => acc + st.count, 0);
          return currentGar < weakestGar ? current : weakest;
        }, enemySettlements[0]);

        p.targetX = targetCastle.x + (Math.random() * 3 - 1.5);
        p.targetZ = targetCastle.z + (Math.random() * 3 - 1.5);
        p.targetSettlementId = targetCastle.id;
        p.statusTextKu = `لەشکرکێشی بۆ سەر ${targetCastle.nameKu} دەکات`;
        p.statusText = `Marching to besiege ${targetCastle.name}`;
      }
      // Strategy C: Patrol friendly trade paths and borders
      else if (factionSettlements.length > 0 && (!p.targetX || Math.random() < 0.2)) {
        const patrolFief = factionSettlements[Math.floor(Math.random() * factionSettlements.length)];
        p.targetX = patrolFief.x + (Math.random() * 5 - 2.5);
        p.targetZ = patrolFief.z + (Math.random() * 5 - 2.5);
        p.targetSettlementId = patrolFief.id;
        p.statusTextKu = `پارێزگاری لە ڕێگاکانی ${patrolFief.nameKu} دەکات`;
        p.statusText = `Patrolling highways around ${patrolFief.name}`;
      }

      updatedParties[pId] = p;
    });

    return {
      factions: updatedFactions,
      parties: updatedParties,
    };
  }

  private findNearestSettlement(x: number, z: number, settlements: Settlement[]): Settlement | null {
    if (settlements.length === 0) return null;
    let nearest = settlements[0];
    let minDist = Math.hypot(nearest.x - x, nearest.z - z);
    for (let i = 1; i < settlements.length; i++) {
      const s = settlements[i];
      const dist = Math.hypot(s.x - x, s.z - z);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
    return nearest;
  }
}
