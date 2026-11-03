/**
 * Save and Load Engine
 * Robust save file validation, schema migration, corruption resilience,
 * and slot persistence for web and mobile.
 */
import { GameState } from '../types/game';

export interface SaveMetadata {
  slotId: string;
  saveName: string;
  savedAt: string;
  day: number;
  dinars: number;
  troopCount: number;
  factionsCount: number;
  playerTitle: string;
  version: number;
}

const STORAGE_PREFIX = 'steel_crown_save_';
const CURRENT_SAVE_VERSION = 2;

export class SaveLoadEngine {
  /**
   * Validate and migrate loaded GameState to current schema safely
   */
  public static sanitizeAndMigrate(raw: any): GameState | null {
    if (!raw || typeof raw !== 'object') return null;

    try {
      if (!raw.player || !raw.settlements || !raw.factions) {
        return null;
      }

      const migrated: GameState = {
        day: typeof raw.day === 'number' ? raw.day : 1,
        hour: typeof raw.hour === 'number' ? raw.hour : 8,
        timeSpeed: [0, 1, 2, 5].includes(raw.timeSpeed) ? raw.timeSpeed : 1,
        factions: raw.factions || {},
        lords: raw.lords || {},
        settlements: raw.settlements || {},
        parties: raw.parties || {},
        player: {
          name: raw.player.name || 'Commander',
          title: raw.player.title || 'Free Wanderer',
          titleKu: raw.player.titleKu || 'گەڕۆکی بێلەشکر',
          dinars: typeof raw.player.dinars === 'number' ? raw.player.dinars : 150,
          renown: typeof raw.player.renown === 'number' ? raw.player.renown : 5,
          honor: typeof raw.player.honor === 'number' ? raw.player.honor : 5,
          factionId: raw.player.factionId || 'independent',
          troops: Array.isArray(raw.player.troops) ? raw.player.troops : [],
          inventory: raw.player.inventory || { grain: 4, meat: 2 },
          maxCargoWeight: raw.player.maxCargoWeight || 350,
          fiefIds: Array.isArray(raw.player.fiefIds) ? raw.player.fiefIds : [],
          workshops: Array.isArray(raw.player.workshops) ? raw.player.workshops : [],
          activePolicies: Array.isArray(raw.player.activePolicies) ? raw.player.activePolicies : [],
          spies: Array.isArray(raw.player.spies) ? raw.player.spies : [],
          appointedOffices: Array.isArray(raw.player.appointedOffices) ? raw.player.appointedOffices : [],
          chamberlainBribes: raw.player.chamberlainBribes || {},
          secretPacts: Array.isArray(raw.player.secretPacts) ? raw.player.secretPacts : [],
          isBesiegingSettlementId: raw.player.isBesiegingSettlementId || undefined,
        },
        policies: Array.isArray(raw.policies) ? raw.policies : [],
        logs: Array.isArray(raw.logs) ? raw.logs : [],
        dignitaries: raw.dignitaries || {},
        news: Array.isArray(raw.news) ? raw.news : [],
        battle: raw.battle,
        arrivedAtSettlementId: raw.arrivedAtSettlementId,
        targetDestinationName: raw.targetDestinationName,
      };

      return migrated;
    } catch (err) {
      console.error('Failed to sanitize game state:', err);
      return null;
    }
  }

  public static saveGame(slotId: string, state: GameState, slotName?: string): boolean {
    try {
      const totalTroops = state.player.troops.reduce((acc, t) => acc + t.count, 0);
      const meta: SaveMetadata = {
        slotId,
        saveName: slotName || `Save ${slotId}`,
        savedAt: new Date().toISOString(),
        day: state.day,
        dinars: state.player.dinars,
        troopCount: totalTroops,
        factionsCount: Object.keys(state.factions).length,
        playerTitle: state.player.title,
        version: CURRENT_SAVE_VERSION,
      };

      localStorage.setItem(`${STORAGE_PREFIX}${slotId}_meta`, JSON.stringify(meta));
      localStorage.setItem(`${STORAGE_PREFIX}${slotId}_data`, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error(`Failed to save slot ${slotId}:`, err);
      return false;
    }
  }

  public static loadGame(slotId: string): GameState | null {
    try {
      const rawData = localStorage.getItem(`${STORAGE_PREFIX}${slotId}_data`);
      if (!rawData) return null;
      const parsed = JSON.parse(rawData);
      return this.sanitizeAndMigrate(parsed);
    } catch (err) {
      console.error(`Failed to load slot ${slotId}:`, err);
      return null;
    }
  }

  public static getSaveSlots(): (SaveMetadata | null)[] {
    const slots = ['auto', 'slot1', 'slot2', 'slot3'];
    return slots.map((s) => {
      try {
        const rawMeta = localStorage.getItem(`${STORAGE_PREFIX}${s}_meta`);
        if (rawMeta) {
          return JSON.parse(rawMeta) as SaveMetadata;
        }
      } catch {
        return null;
      }
      return null;
    });
  }
}
