/**
 * World Simulation Engine (Master Subsystem Orchestrator)
 * Deterministic pipeline linking warfare, diplomacy, economy, kingdom AI,
 * espionage, and character dynasty subsystems into one authoritative simulation loop.
 */
import { GameState, Party, Settlement } from '../types/game';
import { GameEventBus } from './interfaces';
import { EconomyEngine } from './EconomyEngine';
import { CityManagementEngine } from './CityManagementEngine';
import { DiplomacyEngine } from './DiplomacyEngine';
import { KingdomAIEngine } from './KingdomAIEngine';
import { MilitaryEngine } from './MilitaryEngine';
import { EspionageEngine } from './EspionageEngine';
import { CharacterDynastyEngine } from './CharacterDynastyEngine';
import { WorldEventsEngine } from './WorldEventsEngine';

export class WorldSimulationEngine {
  private static instance: WorldSimulationEngine;

  private eventBus = GameEventBus.getInstance();
  private economy = new EconomyEngine();
  private cityManagement = new CityManagementEngine();
  private diplomacy = new DiplomacyEngine();
  private kingdomAI = new KingdomAIEngine();
  private military = new MilitaryEngine();
  private espionage = new EspionageEngine();
  private characterDynasty = new CharacterDynastyEngine();
  private worldEvents = new WorldEventsEngine();

  private constructor() {}

  public static getInstance(): WorldSimulationEngine {
    if (!WorldSimulationEngine.instance) {
      WorldSimulationEngine.instance = new WorldSimulationEngine();
    }
    return WorldSimulationEngine.instance;
  }

  /**
   * Deterministic master simulation step function
   */
  public step(state: GameState, dtSeconds: number): GameState {
    if (state.timeSpeed === 0 || state.battle?.isActive) {
      return state;
    }

    let next: GameState = { ...state };
    const speedMult = state.timeSpeed;
    const timeAdvanceHours = dtSeconds * 0.8 * speedMult;

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

    // 1. Move parties on the world map via MilitaryEngine
    next.parties = this.military.updatePartyPositions(
      next.parties,
      dtSeconds,
      speedMult,
      (settlementId: string) => {
        next.arrivedAtSettlementId = settlementId;
      }
    );

    // 2. Check for caravan arrivals and trade execution
    Object.values(next.parties).forEach((party) => {
      if (party.type === 'caravan' && party.targetSettlementId && next.settlements[party.targetSettlementId]) {
        const targetSettlement = next.settlements[party.targetSettlementId];
        const dist = Math.hypot(party.x - targetSettlement.x, party.z - targetSettlement.z);
        if (dist <= 2.0) {
          // Process trade transaction
          const { updatedCaravan, updatedSettlement } = this.economy.processCaravanArrival(
            party,
            targetSettlement,
            this.eventBus
          );

          // Select next distant destination
          const settlementList = Object.values(next.settlements);
          const validDestinations = settlementList.filter(
            (s) => Math.hypot(s.x - updatedCaravan.x, s.z - updatedCaravan.z) > 40
          );
          const nextTarget =
            validDestinations[Math.floor(Math.random() * validDestinations.length)] || settlementList[0];

          updatedCaravan.targetX = nextTarget.x + (Math.random() * 4 - 2);
          updatedCaravan.targetZ = nextTarget.z + (Math.random() * 4 - 2);
          updatedCaravan.targetSettlementId = nextTarget.id;

          next.parties = { ...next.parties, [party.id]: updatedCaravan };
          next.settlements = { ...next.settlements, [targetSettlement.id]: updatedSettlement };
        }
      }
    });

    // Sync player party data
    const playerParty = next.parties['player_party'];
    if (playerParty) {
      playerParty.troops = next.player.troops;
      playerParty.dinars = next.player.dinars;
    }

    // 3. Daily tick execution across all modular engines
    if (didDayChange) {
      // Economy Engine (markets, supply-demand)
      const ecoResult = this.economy.onDailyTick(next, this.eventBus);
      if (ecoResult.settlements) next.settlements = ecoResult.settlements;

      // City Management Engine (prosperity, public order, food reserves, rebellions)
      const cityResult = this.cityManagement.onDailyTick(next, this.eventBus);
      if (cityResult.settlements) next.settlements = cityResult.settlements;
      if (cityResult.logs) next.logs = cityResult.logs;

      // Military Engine (food rations, wages, desertion)
      const milResult = this.military.processDailyUpkeep(next, this.eventBus);
      next.player = milResult.player;
      if (milResult.logs.length > 0) {
        next.logs = [...milResult.logs, ...next.logs.slice(0, 45)];
      }

      // Advanced Multi-day Siege Camps Progression
      const siegeResult = this.military.processDailySieges(next, this.eventBus);
      next.settlements = siegeResult.settlements;
      next.parties = siegeResult.parties;
      next.player = siegeResult.player;
      if (siegeResult.logs.length > 0) {
        next.logs = [...siegeResult.logs, ...next.logs.slice(0, 45)];
      }

      // Workshop & fief taxes calculation
      let workshopTotal = 0;
      next.player.workshops.forEach((ws) => {
        workshopTotal += ws.dailyProfit;
      });

      let fiefTaxes = 0;
      next.player.fiefIds.forEach((fId) => {
        const settlement = next.settlements[fId];
        if (settlement) {
          let baseTax = settlement.population * 0.05 * (settlement.prosperity / 100);
          if (settlement.taxRate === 'low') baseTax *= 0.7;
          if (settlement.taxRate === 'high') baseTax *= 1.3;
          if (settlement.taxRate === 'extortionate') baseTax *= 1.6;
          fiefTaxes += Math.round(baseTax);
        }
      });

      let officeSalaries = 0;
      next.player.appointedOffices?.forEach((off) => {
        officeSalaries += off.dailySalary;
      });

      let spiesUpkeep = 0;
      next.player.spies?.forEach((sp) => {
        spiesUpkeep += sp.dailyUpkeep;
      });

      next.player.dinars = Math.max(0, next.player.dinars + workshopTotal + fiefTaxes + officeSalaries - spiesUpkeep);

      // Kingdom AI Engine (army mobilization, strategic campaigns, recruitment)
      const aiResult = this.kingdomAI.onDailyTick(next, this.eventBus);
      if (aiResult.factions) next.factions = aiResult.factions;
      if (aiResult.parties) next.parties = aiResult.parties;

      // Diplomacy Engine (treaties, wars, truces, relations drift)
      const diploResult = this.diplomacy.onDailyTick(next, this.eventBus);
      if (diploResult.factions) next.factions = diploResult.factions;
      if (diploResult.logs) next.logs = diploResult.logs;

      // Espionage Engine (intel updates, cover integrity, counter-espionage)
      const espResult = this.espionage.onDailyTick(next, this.eventBus);
      if (espResult.player) next.player = espResult.player;
      if (espResult.logs) next.logs = espResult.logs;

      // Character & Dynasty Engine (noble wealth, personality growth, ransom)
      const dynResult = this.characterDynasty.onDailyTick(next, this.eventBus);
      if (dynResult.lords) next.lords = dynResult.lords;
      if (dynResult.logs) next.logs = dynResult.logs;

      // World Events Engine (emergent historical dispatches and economic shocks)
      const eventResult = this.worldEvents.onDailyTick(next, this.eventBus);
      if (eventResult.settlements) next.settlements = eventResult.settlements;
      if (eventResult.news) next.news = eventResult.news;
      if (eventResult.logs) next.logs = eventResult.logs;
    }

    return next;
  }
}
