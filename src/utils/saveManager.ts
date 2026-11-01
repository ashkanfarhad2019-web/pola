/**
 * LocalStorage Save and Load Manager
 * Supports auto-save, multiple manual slots, and JSON export/import
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
}

const STORAGE_PREFIX = 'steel_crown_save_';

export function saveGameToStorage(slotId: string, state: GameState, slotName?: string): boolean {
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
    };

    localStorage.setItem(`${STORAGE_PREFIX}${slotId}_meta`, JSON.stringify(meta));
    localStorage.setItem(`${STORAGE_PREFIX}${slotId}_data`, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save game to localStorage', err);
    return false;
  }
}

export function loadGameFromStorage(slotId: string): GameState | null {
  try {
    const rawData = localStorage.getItem(`${STORAGE_PREFIX}${slotId}_data`);
    if (!rawData) return null;
    const parsed = JSON.parse(rawData) as GameState;
    return parsed;
  } catch (err) {
    console.error('Failed to load game from localStorage', err);
    return null;
  }
}

export function getSaveSlots(): (SaveMetadata | null)[] {
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

export function exportSaveToFile(state: GameState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `steel_crown_save_day_${state.day}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSaveFromFile(file: File): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as GameState;
        if (parsed.player && parsed.settlements && parsed.factions) {
          resolve(parsed);
        } else {
          reject(new Error('Invalid save file structure'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
