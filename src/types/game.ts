/**
 * Core Game Definitions and State Models
 * Steel and Flesh-inspired Grand Medieval Strategy RPG
 */

export type FactionId = 'valoria' | 'eisenreich' | 'saruq' | 'verdant' | 'maritia' | 'frostgard' | 'al_zahra' | 'strathcarron' | 'player_kingdom';

export interface Faction {
  id: FactionId;
  name: string;
  nameKu: string;
  ruler: string;
  rulerKu: string;
  color: string;
  bannerIcon: string;
  description: string;
  descriptionKu: string;
  militaryPower: number;
  treasury: number;
  relations: Record<string, number>; // -100 (blood war) to +100 (firm alliance)
  treaties: Treaty[];
  specialty: string;
  specialtyKu: string;
}

export interface Treaty {
  id: string;
  targetFactionId: FactionId;
  type: 'war' | 'truce' | 'trade' | 'defensive_pact' | 'tribute';
  tributeAmount?: number; // Daily tribute
  durationDays: number;
}

export type LordPersonality = 'martial' | 'merchant' | 'diplomat' | 'honorable' | 'schemer';

export interface Lord {
  id: string;
  name: string;
  nameKu: string;
  title: string;
  titleKu: string;
  factionId: FactionId;
  personality: LordPersonality;
  troops: TroopStack[];
  wealth: number;
  prestige: number;
  relationWithPlayer: number; // -100 to +100
  fiefIds: string[]; // Settlement IDs owned
  isImprisoned?: boolean;
  imprisonedBy?: string;
}

export interface TroopType {
  id: string;
  name: string;
  nameKu: string;
  tier: 1 | 2 | 3 | 4 | 5;
  type: 'infantry' | 'archer' | 'cavalry';
  factionId: FactionId;
  recruitCost: number;
  dailyWage: number;
  maxHp: number;
  meleeAttack: number;
  rangedAttack: number;
  armor: number;
  speed: number;
  upgradeTo?: string[];
  upgradeCost?: number;
}

export interface TroopStack {
  troopId: string;
  count: number;
  wounded: number;
}

export type GoodId = 
  | 'grain' 
  | 'meat' 
  | 'salt' 
  | 'iron' 
  | 'timber' 
  | 'wool' 
  | 'weapons' 
  | 'armor' 
  | 'spices' 
  | 'silk' 
  | 'wine' 
  | 'tools';

export interface TradeGood {
  id: GoodId;
  name: string;
  nameKu: string;
  basePrice: number;
  weight: number; // kg per unit
  category: 'food' | 'raw_material' | 'manufactured' | 'luxury';
  descriptionKu: string;
}

export interface SettlementMarketItem {
  goodId: GoodId;
  stock: number;
  buyPrice: number; // What player pays to buy
  sellPrice: number; // What player receives when selling
  productionRate: number; // Units produced per day
  consumptionRate: number; // Units consumed per day
}

export type SettlementType = 'town' | 'castle' | 'village';

export interface Workshop {
  id: string;
  name: string;
  nameKu: string;
  type: 'brewery' | 'iron_forge' | 'tannery' | 'weaver' | 'oil_press';
  ownerId: string; // 'player' or lordId
  dailyProfit: number;
  cost: number;
}

export type SiegeEngineType = 'ladders' | 'ram' | 'catapult';

export interface SiegeEngine {
  id: string;
  type: SiegeEngineType;
  name: string;
  nameKu: string;
  progressDays: number;
  totalDays: number;
  timberCost: number;
  isReady: boolean;
}

export interface SiegeCampState {
  settlementId: string;
  besiegerPartyId: string;
  startDay: number;
  daysBesieged: number;
  activeConstruction?: SiegeEngine;
  engines: SiegeEngine[];
  wallBreaches: number; // 0 to 2
  surrenderWillingness: number; // 0 to 100%
  blockadeIntegrity: number; // 0 to 100%
}

export interface Settlement {
  id: string;
  name: string;
  nameKu: string;
  type: SettlementType;
  factionId: FactionId;
  lordOwnerId: string;
  x: number;
  z: number;
  population: number;
  prosperity: number; // 0 to 100
  defenseLevel: number; // Walls 1-5
  garrison: TroopStack[];
  foodReservesDays: number;
  publicOrder: number; // 0 to 100
  taxRate: 'low' | 'normal' | 'high' | 'extortionate';
  market: Record<GoodId, SettlementMarketItem>;
  workshops: Workshop[];
  underSiegeBy?: string; // Party ID or Faction
  siegeDays?: number;
  siegeCamp?: SiegeCampState;
}

export interface Party {
  id: string;
  name: string;
  nameKu: string;
  type: 'player' | 'lord' | 'caravan' | 'bandit' | 'patrol';
  factionId: FactionId;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  targetSettlementId?: string;
  targetPartyId?: string;
  speed: number;
  troops: TroopStack[];
  cargo: Partial<Record<GoodId, number>>;
  dinars: number;
  leaderLordId?: string;
  bannerColor: string;
  statusText?: string;
  statusTextKu?: string;
  besiegingSettlementId?: string;
  pathWaypoints?: Array<{ x: number; z: number }>;
  waypointIndex?: number;
}

export interface RealmPolicy {
  id: string;
  name: string;
  nameKu: string;
  description: string;
  descriptionKu: string;
  taxBonusPercent: number;
  recruitmentCostDiscount: number;
  armySpeedBonus: number;
  orderBonus: number;
  isActive: boolean;
}

export type DignitaryOffice = 'chancellor' | 'marshal' | 'spymaster' | 'magistrate' | 'guildmaster';

export interface Dignitary {
  id: string;
  name: string;
  nameKu: string;
  titleKu: string;
  office: DignitaryOffice;
  factionId: FactionId;
  settlementId: string;
  personalityKu: string;
  influence: number; // 0 to 100
  bribeCost: number;
  relationWithPlayer: number; // -100 to 100
  dialogueGreetingKu: string;
  requirementsKu: string;
  perkDescriptionKu: string;
}

export interface SpyAgent {
  id: string;
  nameKu: string;
  targetSettlementId: string;
  infiltratedDays: number;
  coverIntegrity: number; // 0-100%
  dailyUpkeep: number;
  lastIntel?: {
    garrisonCount: number;
    foodDays: number;
    defenseLevel: number;
    prosperity: number;
    secretRumorKu: string;
    vulnerabilitiesKu: string[];
  };
}

export interface NewsDispatch {
  id: string;
  day: number;
  titleKu: string;
  contentKu: string;
  type: 'war' | 'peace' | 'siege' | 'assassination' | 'scandal' | 'market' | 'spy_report';
  importance: 'high' | 'critical';
  factionId?: FactionId;
  settlementId?: string;
}

export interface PlayerCharacter {
  name: string;
  title: string;
  titleKu?: string;
  dinars: number;
  renown: number;
  honor: number;
  morale?: number;
  factionId: FactionId | 'independent';
  troops: TroopStack[];
  inventory: Partial<Record<GoodId, number>>;
  maxCargoWeight: number;
  fiefIds: string[];
  workshops: Workshop[];
  activePolicies: string[];
  spies: SpyAgent[];
  appointedOffices: Array<{
    id: string;
    office: DignitaryOffice;
    settlementId: string;
    titleKu: string;
    dailySalary: number;
    perkKu: string;
  }>;
  chamberlainBribes: Record<string, boolean>;
  secretPacts: Array<{
    id: string;
    factionId: FactionId;
    titleKu: string;
    termsKu: string;
    active: boolean;
  }>;
  isBesiegingSettlementId?: string;
}

export interface CombatUnit {
  id: string;
  troopId: string;
  isPlayerSide: boolean;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  type: 'infantry' | 'archer' | 'cavalry';
  order: 'charge' | 'hold' | 'retreat' | 'advance';
  cooldown: number;
  kills: number;
  isDead: boolean;
}

export interface BattleState {
  isActive: boolean;
  enemyPartyId?: string;
  enemySettlementId?: string;
  isSiege: boolean;
  playerUnits: CombatUnit[];
  enemyUnits: CombatUnit[];
  initialPlayerCount: number;
  initialEnemyCount: number;
  playerCasualties: number;
  enemyCasualties: number;
  result?: 'victory' | 'defeat' | 'retreat';
  lootDinars: number;
  lootItems: Partial<Record<GoodId, number>>;
  capturedPrisoners: TroopStack[];
  siegeEngines?: SiegeEngine[];
  wallBreaches?: number;
}

export interface GameLogMessage {
  id: string;
  day: number;
  hour: number;
  textKu: string;
  textEn: string;
  type: 'trade' | 'battle' | 'politics' | 'fief' | 'alert';
}

export interface GameState {
  day: number;
  hour: number;
  timeSpeed: 0 | 1 | 2 | 5; // 0 = paused
  factions: Record<FactionId, Faction>;
  lords: Record<string, Lord>;
  settlements: Record<string, Settlement>;
  parties: Record<string, Party>;
  player: PlayerCharacter;
  policies: RealmPolicy[];
  logs: GameLogMessage[];
  dignitaries: Record<string, Dignitary>;
  news: NewsDispatch[];
  battle?: BattleState;
  arrivedAtSettlementId?: string;
  targetDestinationName?: string;
}
