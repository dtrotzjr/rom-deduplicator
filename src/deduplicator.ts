/**
 * Core Deduplication Logic
 * Groups ROMs by game identity and selects winners based on region/language preferences
 */

import type { Config, RomEntry, DeduplicationResult, RomDestination } from "./types.js";
import { normalizeName, getPrimaryRegion } from "./parser.js";

/**
 * Calculate preference score for a ROM
 * Higher score = more preferred
 */
export function calculateScore(rom: RomEntry, config: Config): number {
  let score = 0;

  // Region scoring (based on position in preferredRegions)
  const preferredRegions = config.preferredRegions.map((r) => r.toLowerCase());
  for (const region of rom.regions) {
    const idx = preferredRegions.indexOf(region.toLowerCase());
    if (idx !== -1) {
      // Higher score for earlier position in preferred list
      score += (preferredRegions.length - idx) * 20;
    }
  }

  // Multi-region bonus (games that work in multiple regions)
  if (rom.regions.length > 1) {
    const hasPreferred = rom.regions.some((r) =>
      preferredRegions.includes(r.toLowerCase())
    );
    if (hasPreferred) {
      score += 5;
    }
  }

  // Language scoring
  const preferredLanguages = config.preferredLanguages.map((l) => l.toLowerCase());
  for (const lang of rom.languages) {
    const idx = preferredLanguages.indexOf(lang.toLowerCase());
    if (idx !== -1) {
      // Higher score for earlier position in preferred list
      score += (preferredLanguages.length - idx) * 10;
    }
  }

  // English implied by USA region
  if (rom.regions.some((r) => r.toLowerCase() === "usa") && rom.languages.length === 0) {
    score += 8; // Bonus for implicit English
  }

  // Revision scoring (higher revision = better)
  score += rom.revision * 5;

  // Penalize unwanted regions
  const ignoreRegions = config.ignoreRegions.map((r) => r.toLowerCase());
  for (const region of rom.regions) {
    if (ignoreRegions.includes(region.toLowerCase())) {
      score -= 100;
    }
  }

  // Penalize unwanted languages
  const ignoreLanguages = config.ignoreLanguages.map((l) => l.toLowerCase());
  for (const lang of rom.languages) {
    if (ignoreLanguages.includes(lang.toLowerCase())) {
      score -= 50;
    }
  }

  // Penalize bad dumps and other issues
  if (rom.tags.some((t) => t.toLowerCase() === "b" || t.toLowerCase() === "[b]")) {
    score -= 200;
  }

  return score;
}

/**
 * Group ROMs by their game identity
 * Uses game ID from gamelist.xml when available, falls back to normalized name
 */
export function groupByGame(roms: RomEntry[]): Map<string, RomEntry[]> {
  const groups = new Map<string, RomEntry[]>();

  // First pass: group by gamelist ID (most accurate)
  const byId = new Map<string, RomEntry[]>();
  const noId: RomEntry[] = [];

  for (const rom of roms) {
    // Skip if it's from a collection (handled separately)
    if (rom.collection) {
      continue;
    }

    if (rom.gamelistId && rom.gamelistId !== "0") {
      const id = rom.gamelistId;
      if (!byId.has(id)) {
        byId.set(id, []);
      }
      byId.get(id)!.push(rom);
    } else {
      noId.push(rom);
    }
  }

  // Add ID-based groups
  for (const [id, group] of byId) {
    // Use first ROM's normalized name as key, but include ID
    const key = `id:${id}`;
    groups.set(key, group);
  }

  // Second pass: group remaining ROMs by normalized name
  const byName = new Map<string, RomEntry[]>();
  for (const rom of noId) {
    const key = rom.normalizedName;
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key)!.push(rom);
  }

  // Merge name-based groups that might match ID-based groups
  for (const [name, nameGroup] of byName) {
    // Check if any ID-based group has ROMs with matching normalized names
    let merged = false;
    for (const [id, idGroup] of groups) {
      if (id.startsWith("id:")) {
        const matchingName = idGroup[0].normalizedName;
        if (matchingName === name) {
          // Merge into the ID-based group
          idGroup.push(...nameGroup);
          merged = true;
          break;
        }
      }
    }
    if (!merged) {
      groups.set(`name:${name}`, nameGroup);
    }
  }

  return groups;
}

/**
 * Check if a ROM should be completely ignored based on config
 */
export function shouldIgnore(rom: RomEntry, config: Config): boolean {
  const ignoreRegions = config.ignoreRegions.map((r) => r.toLowerCase());
  const ignoreLanguages = config.ignoreLanguages.map((l) => l.toLowerCase());

  // Check regions
  if (rom.regions.length > 0) {
    const allIgnored = rom.regions.every((r) => ignoreRegions.includes(r.toLowerCase()));
    if (allIgnored) {
      return true;
    }
  }

  // Check languages
  if (rom.languages.length > 0) {
    const allIgnored = rom.languages.every((l) => ignoreLanguages.includes(l.toLowerCase()));
    if (allIgnored && rom.regions.length === 0) {
      // Only ignore if no regions specified either
      return true;
    }
  }

  return false;
}

/**
 * Determine if a ROM has any preferred region
 */
function hasPreferredRegion(rom: RomEntry, config: Config): boolean {
  const preferredRegions = config.preferredRegions.map((r) => r.toLowerCase());
  return rom.regions.some((r) => preferredRegions.includes(r.toLowerCase()));
}

/**
 * Determine if a ROM has any preferred language
 */
function hasPreferredLanguage(rom: RomEntry, config: Config): boolean {
  const preferredLanguages = config.preferredLanguages.map((l) => l.toLowerCase());
  // If no languages specified but has USA region, assume English
  if (rom.languages.length === 0 && rom.regions.some((r) => r.toLowerCase() === "usa")) {
    return true;
  }
  return rom.languages.some((l) => preferredLanguages.includes(l.toLowerCase()));
}

/**
 * Select the winner from a group of duplicate ROMs
 */
export function selectWinner(
  duplicates: RomEntry[],
  config: Config
): DeduplicationResult {
  // Separate prototypes/betas and hacks/pirates
  const prototypes = duplicates.filter((r) => r.isPrototype && !r.isHack);
  const hacks = duplicates.filter((r) => r.isHack && !r.isPrototype);
  const prototypeHacks = duplicates.filter((r) => r.isPrototype && r.isHack); // Goes to hacks
  const allHacks = [...hacks, ...prototypeHacks];
  const regular = duplicates.filter((r) => !r.isPrototype && !r.isHack);

  // Filter out completely ignored ROMs
  const considered = regular.filter((r) => !shouldIgnore(r, config));
  const ignored = regular.filter((r) => shouldIgnore(r, config));

  if (considered.length === 0) {
    // All regular ROMs are ignored, but keep prototypes/hacks if any
    return {
      winner: regular[0] || prototypes[0] || allHacks[0], // Fallback to first available
      regional: new Map(),
      prototypes,
      hacks: allHacks,
      duplicates: ignored,
    };
  }

  // Score and sort considered entries
  const scored = considered
    .map((rom) => ({
      rom,
      score: calculateScore(rom, config),
    }))
    .sort((a, b) => b.score - a.score);

  // Winner is highest score
  const winner = scored[0].rom;

  // Group losers by their disposition
  const regional = new Map<string, RomEntry[]>();
  const duplicatesList: RomEntry[] = [...ignored];

  for (const { rom } of scored.slice(1)) {
    // Check if this ROM should go to regional folder
    // It goes to regional if it has a non-preferred region and doesn't have preferred region/language
    const hasPreferredReg = hasPreferredRegion(rom, config);
    const hasPreferredLang = hasPreferredLanguage(rom, config);

    if (!hasPreferredReg && !hasPreferredLang) {
      // Pure non-preferred region - goes to regional folder
      const region = getPrimaryRegion(rom);
      if (!regional.has(region)) {
        regional.set(region, []);
      }
      regional.get(region)!.push(rom);
    } else {
      // Has preferred region/language but is a duplicate of winner
      duplicatesList.push(rom);
    }
  }

  return {
    winner,
    regional,
    prototypes,
    hacks: allHacks,
    duplicates: duplicatesList,
  };
}

/**
 * Process ROMs from a special collection folder
 * These are kept as-is in their own collection folder
 */
export function processCollection(
  roms: RomEntry[],
  collectionName: string
): RomDestination[] {
  return roms.map((rom) => ({
    rom,
    type: "collection" as const,
    outputPath: `collections/${collectionName}/${rom.filename}`,
    collectionName,
  }));
}

/**
 * Convert deduplication result to ROM destinations
 */
export function resultToDestinations(
  result: DeduplicationResult,
  config: Config
): RomDestination[] {
  const destinations: RomDestination[] = [];

  // Winner goes to main folder
  destinations.push({
    rom: result.winner,
    type: "main",
    outputPath: result.winner.filename,
  });

  // Regional ROMs go to regional subfolders
  for (const [region, roms] of result.regional) {
    for (const rom of roms) {
      destinations.push({
        rom,
        type: "regional",
        outputPath: `regional/${region}/${rom.filename}`,
        regionFolder: region,
      });
    }
  }

  // Prototypes go to prototypes folder
  for (const rom of result.prototypes) {
    destinations.push({
      rom,
      type: "prototype",
      outputPath: `prototypes/${rom.filename}`,
    });
  }

  // Hacks go to hacks folder
  for (const rom of result.hacks) {
    destinations.push({
      rom,
      type: "hack",
      outputPath: `hacks/${rom.filename}`,
    });
  }

  // Duplicates are marked but not copied
  for (const rom of result.duplicates) {
    destinations.push({
      rom,
      type: "duplicate",
      outputPath: "", // Not copied
    });
  }

  return destinations;
}

/**
 * Main deduplication function for a system
 */
export function deduplicateSystem(
  roms: RomEntry[],
  config: Config
): {
  destinations: RomDestination[];
  stats: {
    totalRoms: number;
    uniqueTitles: number;
    kept: number;
    regional: number;
    prototypes: number;
    hacks: number;
    duplicatesRemoved: number;
    collections: number;
  };
} {
  const destinations: RomDestination[] = [];

  // Separate collection ROMs
  const collectionRoms = roms.filter((r) => r.collection);
  const regularRoms = roms.filter((r) => !r.collection);

  // Process collections - keep as-is
  const collectionsByName = new Map<string, RomEntry[]>();
  for (const rom of collectionRoms) {
    const name = rom.collection!;
    if (!collectionsByName.has(name)) {
      collectionsByName.set(name, []);
    }
    collectionsByName.get(name)!.push(rom);
  }

  for (const [name, roms] of collectionsByName) {
    destinations.push(...processCollection(roms, name));
  }

  // Group regular ROMs by game
  const groups = groupByGame(regularRoms);

  // Process each group
  let kept = 0;
  let regional = 0;
  let prototypes = 0;
  let hacks = 0;
  let duplicatesRemoved = 0;

  for (const [, group] of groups) {
    if (group.length === 0) continue;

    if (group.length === 1) {
      // Single ROM - check if it should be kept or goes to regional
      const rom = group[0];
      if (shouldIgnore(rom, config)) {
        destinations.push({
          rom,
          type: "duplicate",
          outputPath: "",
        });
        duplicatesRemoved++;
      } else if (rom.isHack) {
        // Hacks go to hacks folder
        destinations.push({
          rom,
          type: "hack",
          outputPath: `hacks/${rom.filename}`,
        });
        hacks++;
      } else if (rom.isPrototype) {
        destinations.push({
          rom,
          type: "prototype",
          outputPath: `prototypes/${rom.filename}`,
        });
        prototypes++;
      } else if (!hasPreferredRegion(rom, config) && !hasPreferredLanguage(rom, config)) {
        // Non-preferred single ROM goes to regional
        const region = getPrimaryRegion(rom);
        destinations.push({
          rom,
          type: "regional",
          outputPath: `regional/${region}/${rom.filename}`,
          regionFolder: region,
        });
        regional++;
      } else {
        // Preferred single ROM goes to main
        destinations.push({
          rom,
          type: "main",
          outputPath: rom.filename,
        });
        kept++;
      }
    } else {
      // Multiple ROMs - deduplicate
      const result = selectWinner(group, config);
      const groupDests = resultToDestinations(result, config);
      destinations.push(...groupDests);

      // Count by type
        for (const dest of groupDests) {
          switch (dest.type) {
            case "main":
              kept++;
              break;
            case "regional":
              regional++;
              break;
            case "prototype":
              prototypes++;
              break;
            case "hack":
              hacks++;
              break;
            case "duplicate":
              duplicatesRemoved++;
              break;
          }
        }
      }
    }

  return {
    destinations,
    stats: {
      totalRoms: roms.length,
      uniqueTitles: groups.size,
      kept,
      regional,
      prototypes,
      hacks,
      duplicatesRemoved,
      collections: collectionRoms.length,
    },
  };
}
