/**
 * Core Engine Interfaces and Event System
 * Inter-system communication contracts for modular medieval simulation
 */
import { FactionId, GameState, GoodId, Party, Settlement, TroopStack } from '../types/game';

export type GameEventType =
  | 'WAR_DECLARED'
  | 'PEACE_SIGNED'
  | 'SETTLEMENT_BESIEGED'
  | 'SETTLEMENT_CAPTURED'
  | 'REBELLION_OUTBREAK'
  | 'FAMINE_ALERT'
  | 'CARAVAN_TRADED'
  | 'LORD_DEFEATED'
  | 'SPY_INTEL_ACQUIRED'
  | 'WORLD_EVENT_TRIGGERED'
  | 'SIEGE_CAMP_ESTABLISHED'
  | 'SIEGE_ENGINE_COMPLETED'
  | 'WALL_BREACH_CREATED'
  | 'SIEGE_SURRENDER_ACCEPTED'
  | 'SIEGE_CAMP_ABANDONED';

export interface GameEvent {
  id: string;
  type: GameEventType;
  day: number;
  hour: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, any>;
  messageKu: string;
  messageEn: string;
}

export type EventListener = (event: GameEvent, state: Readonly<GameState>) => void;

export class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<GameEventType, EventListener[]> = new Map();
  private eventHistory: GameEvent[] = [];

  private constructor() {}

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  public subscribe(type: GameEventType, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
    return () => {
      const arr = this.listeners.get(type) || [];
      this.listeners.set(type, arr.filter((l) => l !== listener));
    };
  }

  public dispatch(event: GameEvent, state: Readonly<GameState>): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > 80) {
      this.eventHistory.shift();
    }
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => {
      try {
        h(event, state);
      } catch (err) {
        console.error(`Error in event listener for ${event.type}:`, err);
      }
    });
  }

  public getRecentEvents(): GameEvent[] {
    return [...this.eventHistory];
  }

  public clear(): void {
    this.eventHistory = [];
  }
}

export interface IEngineModule {
  name: string;
  init?: (state: GameState) => void;
  onDailyTick?: (state: GameState, bus: GameEventBus) => Partial<GameState>;
  onFrameTick?: (state: GameState, dtSeconds: number, speedMult: number, bus: GameEventBus) => Partial<GameState>;
}
