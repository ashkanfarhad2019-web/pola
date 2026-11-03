/**
 * LocalStorage Save and Load Manager
 * Unified interface powered by SaveLoadEngine
 */
import { GameState } from '../types/game';
import { SaveLoadEngine, SaveMetadata } from '../systems/SaveLoadEngine';

export type { SaveMetadata };

export function saveGameToStorage(slotId: string, state: GameState, slotName?: string): boolean {
  return SaveLoadEngine.saveGame(slotId, state, slotName);
}

export function loadGameFromStorage(slotId: string): GameState | null {
  return SaveLoadEngine.loadGame(slotId);
}

export function getSaveSlots(): (SaveMetadata | null)[] {
  return SaveLoadEngine.getSaveSlots();
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
        const parsed = JSON.parse(text);
        const migrated = SaveLoadEngine.sanitizeAndMigrate(parsed);
        if (migrated) {
          resolve(migrated);
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
