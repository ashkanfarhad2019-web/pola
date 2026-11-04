/**
 * Road Network & A* Pathfinding Engine for the Illustrated Map
 * Connects all visible castles, towns, crossroads, and bridges
 */

export interface MapPoint {
  x: number;
  z: number;
}

export interface RoadNode {
  id: string;
  name?: string;
  x: number; // 0 to 100% of map width
  z: number; // 0 to 100% of map height
  isSettlement?: boolean;
}

export interface RoadEdge {
  from: string;
  to: string;
  distance: number;
}

// 1. All road nodes and crossroads matching visible roads in the artwork
export const ROAD_NODES: Record<string, RoadNode> = {
  // Major Settlements
  imperial_capital: { id: 'imperial_capital', name: 'Imperial Capital', x: 52.3, z: 66.5, isSettlement: true },
  water_citadel: { id: 'water_citadel', name: 'Water Fortress', x: 35.5, z: 27.8, isSettlement: true },
  white_forest_keep: { id: 'white_forest_keep', name: 'White Forest Keep', x: 62.0, z: 14.5, isSettlement: true },
  desert_citadel: { id: 'desert_citadel', name: 'Desert Mountain Fortress', x: 91.2, z: 14.8, isSettlement: true },
  desert_gate: { id: 'desert_gate', name: 'Desert Stone Gate', x: 76.5, z: 26.5, isSettlement: true },
  desert_oasis: { id: 'desert_oasis', name: 'Palm Oasis', x: 83.2, z: 41.5, isSettlement: true },
  desert_ruins_north: { id: 'desert_ruins_north', name: 'Sandstone Ruins', x: 91.5, z: 55.2, isSettlement: true },
  desert_ruins_south: { id: 'desert_ruins_south', name: 'Desert Ancient Pillars', x: 89.5, z: 82.5, isSettlement: true },
  wasit_river_keep: { id: 'wasit_river_keep', name: 'Wasit River Keep', x: 65.8, z: 68.2, isSettlement: true },
  southeast_river_farms: { id: 'southeast_river_farms', name: 'River Farms', x: 69.8, z: 82.0, isSettlement: true },
  north_river_wall: { id: 'north_river_wall', name: 'Northern River Wall', x: 48.5, z: 8.2, isSettlement: true },
  coastal_port: { id: 'coastal_port', name: 'Beirut Maritime Port', x: 9.2, z: 54.2, isSettlement: true },
  coastal_amphitheater: { id: 'coastal_amphitheater', name: 'Coastal Arena', x: 18.5, z: 61.5, isSettlement: true },
  coastal_tree_village: { id: 'coastal_tree_village', name: 'Great Sacred Tree Village', x: 30.5, z: 63.2, isSettlement: true },
  coastal_south_farms: { id: 'coastal_south_farms', name: 'Southern Coastal Farms', x: 28.5, z: 77.5, isSettlement: true },
  nw_volcano_fort: { id: 'nw_volcano_fort', name: 'Volcanic Ring Stronghold', x: 9.8, z: 24.2, isSettlement: true },
  nw_volcano_town: { id: 'nw_volcano_town', name: 'Volcano Foothill Town', x: 17.5, z: 23.5, isSettlement: true },
  nw_volcano_south_fort: { id: 'nw_volcano_south_fort', name: 'Lava Valley Redoubt', x: 10.5, z: 41.8, isSettlement: true },
  western_river_bastion: { id: 'western_river_bastion', name: 'Surdash River Bastion', x: 25.5, z: 35.8, isSettlement: true },
  western_earthwork: { id: 'western_earthwork', name: 'Circular Earthwork', x: 22.8, z: 47.5, isSettlement: true },
  central_fort: { id: 'central_fort', name: 'Central Crossroads Fort', x: 46.2, z: 42.5, isSettlement: true },
  capital_suburbs_south: { id: 'capital_suburbs_south', name: 'Capital South Suburbs', x: 48.2, z: 81.5, isSettlement: true },
  capital_farms_southeast: { id: 'capital_farms_southeast', name: 'Wheat Plains', x: 58.5, z: 84.5, isSettlement: true },
  capital_farms_northwest: { id: 'capital_farms_northwest', name: 'Northwest Mills', x: 38.5, z: 53.5, isSettlement: true },

  // Critical Crossroads & Bridges visible in the artwork
  bridge_capital_north: { id: 'bridge_capital_north', name: 'Imperial River Bridge', x: 49.2, z: 48.0 },
  bridge_capital_east: { id: 'bridge_capital_east', name: 'Eastern River Bridge', x: 68.2, z: 58.6 },
  bridge_capital_west: { id: 'bridge_capital_west', name: 'Western Delta Bridge', x: 31.2, z: 55.4 },
  central_crossroads: { id: 'central_crossroads', name: 'Heartland Crossroads', x: 48.5, z: 46.5 },
  water_bridge_south: { id: 'water_bridge_south', name: 'Water Castle South Bridge', x: 33.0, z: 46.0 },
  water_bridge_north: { id: 'water_bridge_north', name: 'Water Castle North Bridge', x: 39.0, z: 17.5 },
  forest_crossroads: { id: 'forest_crossroads', name: 'Great Forest Crossroads', x: 58.0, z: 36.0 },
  forest_north_pass: { id: 'forest_north_pass', name: 'White Keep Pass', x: 60.5, z: 22.0 },
  desert_caravan_fork: { id: 'desert_caravan_fork', name: 'Caravan Track Fork', x: 79.5, z: 34.0 },
};

// 2. Visible road connections (Adjacency list)
const ROAD_CONNECTIONS: [string, string][] = [
  // Imperial Capital Spokes
  ['imperial_capital', 'bridge_capital_north'],
  ['imperial_capital', 'bridge_capital_east'],
  ['imperial_capital', 'capital_suburbs_south'],
  ['imperial_capital', 'capital_farms_southeast'],
  ['imperial_capital', 'capital_farms_northwest'],
  ['capital_suburbs_south', 'capital_farms_southeast'],
  ['capital_farms_northwest', 'bridge_capital_west'],

  // Central River Crossing & Heartlands
  ['bridge_capital_north', 'central_crossroads'],
  ['central_crossroads', 'central_fort'],
  ['central_crossroads', 'water_bridge_south'],
  ['central_crossroads', 'forest_crossroads'],

  // Water Castle Axis
  ['water_bridge_south', 'water_citadel'],
  ['water_citadel', 'water_bridge_north'],
  ['water_bridge_north', 'north_river_wall'],
  ['water_bridge_south', 'western_river_bastion'],
  ['western_river_bastion', 'western_earthwork'],
  ['western_earthwork', 'bridge_capital_west'],

  // Great Forest Axis
  ['forest_crossroads', 'forest_north_pass'],
  ['forest_north_pass', 'white_forest_keep'],
  ['forest_crossroads', 'desert_gate'],
  ['white_forest_keep', 'desert_gate'],
  ['white_forest_keep', 'north_river_wall'],

  // Desert Region Axis
  ['desert_gate', 'desert_citadel'],
  ['desert_gate', 'desert_caravan_fork'],
  ['desert_caravan_fork', 'desert_oasis'],
  ['desert_oasis', 'desert_ruins_north'],
  ['desert_ruins_north', 'desert_ruins_south'],
  ['desert_citadel', 'desert_ruins_north'],

  // East & Southeast River Axis
  ['bridge_capital_east', 'wasit_river_keep'],
  ['wasit_river_keep', 'southeast_river_farms'],
  ['wasit_river_keep', 'desert_oasis'],
  ['wasit_river_keep', 'bridge_capital_north'],

  // West Coastal Region Axis
  ['bridge_capital_west', 'coastal_tree_village'],
  ['coastal_tree_village', 'coastal_port'],
  ['coastal_tree_village', 'coastal_amphitheater'],
  ['coastal_amphitheater', 'coastal_south_farms'],
  ['coastal_port', 'nw_volcano_south_fort'],
  ['nw_volcano_south_fort', 'nw_volcano_fort'],
  ['nw_volcano_fort', 'nw_volcano_town'],
  ['nw_volcano_town', 'water_bridge_south'],
];

// Precompute graph adjacency with Euclidean distances
const ADJACENCY: Record<string, { to: string; dist: number }[]> = {};

Object.keys(ROAD_NODES).forEach((k) => {
  ADJACENCY[k] = [];
});

ROAD_CONNECTIONS.forEach(([a, b]) => {
  const nodeA = ROAD_NODES[a];
  const nodeB = ROAD_NODES[b];
  if (nodeA && nodeB) {
    const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.z - nodeB.z);
    ADJACENCY[a].push({ to: b, dist });
    ADJACENCY[b].push({ to: a, dist });
  }
});

/**
 * Find closest road node to any world coordinate
 */
export function getNearestRoadNode(x: number, z: number): RoadNode {
  let closest: RoadNode = Object.values(ROAD_NODES)[0];
  let minD = Infinity;

  Object.values(ROAD_NODES).forEach((node) => {
    const d = Math.hypot(node.x - x, node.z - z);
    if (d < minD) {
      minD = d;
      closest = node;
    }
  });

  return closest;
}

/**
 * A* / Dijkstra pathfinding along visible roads and bridges
 */
export function findRoadPath(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number
): MapPoint[] {
  const startNode = getNearestRoadNode(startX, startZ);
  const endNode = getNearestRoadNode(targetX, targetZ);

  if (startNode.id === endNode.id) {
    return [
      { x: startX, z: startZ },
      { x: targetX, z: targetZ },
    ];
  }

  // Priority queue / distances
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  Object.keys(ROAD_NODES).forEach((id) => {
    distances[id] = Infinity;
    previous[id] = null;
    unvisited.add(id);
  });

  distances[startNode.id] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let smallestDist = Infinity;

    unvisited.forEach((id) => {
      if (distances[id] < smallestDist) {
        smallestDist = distances[id];
        currentId = id;
      }
    });

    if (!currentId || smallestDist === Infinity || currentId === endNode.id) {
      break;
    }

    unvisited.delete(currentId);

    const neighbors = ADJACENCY[currentId] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = distances[currentId] + neighbor.dist;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = currentId;
      }
    }
  }

  // Reconstruct path
  const pathNodes: RoadNode[] = [];
  let curr: string | null = endNode.id;

  while (curr) {
    pathNodes.unshift(ROAD_NODES[curr]);
    curr = previous[curr];
  }

  // Assemble waypoints: start -> road nodes -> destination
  const result: MapPoint[] = [{ x: startX, z: startZ }];

  for (const node of pathNodes) {
    result.push({ x: node.x, z: node.z });
  }

  result.push({ x: targetX, z: targetZ });
  return result;
}
