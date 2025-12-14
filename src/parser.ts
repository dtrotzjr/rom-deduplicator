/**
 * ROM Filename Parser
 * Parses No-Intro naming convention to extract regions, languages, tags, and revisions
 */

import type { RomEntry, GameMetadata } from "./types.js";
import path from "path";

/** Known region identifiers */
const KNOWN_REGIONS = [
  "USA",
  "Europe",
  "Japan",
  "World",
  "Australia",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Brazil",
  "Korea",
  "China",
  "Taiwan",
  "Hong Kong",
  "Asia",
  "Russia",
  "Poland",
  "Greece",
  "Portugal",
  "Canada",
  "Mexico",
  "Argentina",
  "UK",
  // Short codes sometimes used
  "EU",
  "US",
  "JP",
  "J",
  "U",
  "E",
];

/** Known language codes */
const KNOWN_LANGUAGES = [
  "En",
  "Fr",
  "De",
  "Es",
  "It",
  "Nl",
  "Pt",
  "Sv",
  "No",
  "Da",
  "Fi",
  "Ja",
  "Ko",
  "Zh",
  "Ru",
  "Pl",
  "El",
  "Ca",
  "Cs",
  "Hu",
  "Tr",
  // Lowercase variants
  "en",
  "fr",
  "de",
  "es",
  "it",
  "nl",
  "pt",
  "sv",
  "no",
  "da",
  "fi",
  "ja",
  "ko",
  "zh",
  "ru",
  "pl",
];

/** Tags that indicate prototype/beta/demo */
const PROTOTYPE_TAGS = ["Proto", "Beta", "Demo", "Sample", "Kiosk", "Debug", "Preview"];

/** Tags that indicate special versions (not duplicates) */
const SPECIAL_TAGS = [
  "SGB Enhanced",
  "GB Compatible",
  "Rumble Version",
  "Virtual Console",
  "Unl",
  "Aftermarket",
  "Pirate",
  "Hack",
  "Alt",
  "NDSi Enhanced",
  "DSi Enhanced",
];

/** Common ROM file extensions */
const ROM_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".nes",
  ".snes",
  ".smc",
  ".sfc",
  ".gb",
  ".gbc",
  ".gba",
  ".nds",
  ".3ds",
  ".cia",
  ".iso",
  ".bin",
  ".cue",
  ".img",
  ".md",
  ".gen",
  ".sms",
  ".gg",
  ".pce",
  ".ngp",
  ".ngc",
  ".n64",
  ".v64",
  ".z64",
  ".chd",
  ".pbp",
  ".cso",
]);

/**
 * Check if a file is a ROM based on extension
 */
export function isRomFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ROM_EXTENSIONS.has(ext);
}

/**
 * Extract all parenthesized groups from a filename
 */
function extractParenGroups(filename: string): string[] {
  const groups: string[] = [];
  const regex = /\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(filename)) !== null) {
    groups.push(match[1]);
  }
  return groups;
}

/**
 * Extract all bracketed groups from a filename
 */
function extractBracketGroups(filename: string): string[] {
  const groups: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(filename)) !== null) {
    groups.push(match[1]);
  }
  return groups;
}

/**
 * Check if a string is a known region
 */
function isRegion(str: string): boolean {
  return KNOWN_REGIONS.some(
    (r) => r.toLowerCase() === str.toLowerCase() || str.toLowerCase().includes(r.toLowerCase())
  );
}

/**
 * Check if a string looks like a language code (2 letter codes separated by commas)
 */
function isLanguageGroup(str: string): boolean {
  const parts = str.split(",").map((s) => s.trim());
  return parts.every((p) => KNOWN_LANGUAGES.some((l) => l.toLowerCase() === p.toLowerCase()));
}

/**
 * Parse regions from a parenthesized group
 */
function parseRegions(group: string): string[] {
  const regions: string[] = [];
  const parts = group.split(",").map((s) => s.trim());

  for (const part of parts) {
    // Check for exact match first
    const exactMatch = KNOWN_REGIONS.find((r) => r.toLowerCase() === part.toLowerCase());
    if (exactMatch) {
      regions.push(exactMatch);
    }
  }

  return regions;
}

/**
 * Parse languages from a parenthesized group
 */
function parseLanguages(group: string): string[] {
  const languages: string[] = [];
  const parts = group.split(",").map((s) => s.trim());

  for (const part of parts) {
    const match = KNOWN_LANGUAGES.find((l) => l.toLowerCase() === part.toLowerCase());
    if (match) {
      languages.push(match);
    }
  }

  return languages;
}

/**
 * Extract revision number from tags
 */
function extractRevision(groups: string[]): number {
  for (const group of groups) {
    // Match "Rev 1", "Rev 2", "Rev A", etc.
    const revMatch = group.match(/^Rev\s*(\d+|[A-Z])$/i);
    if (revMatch) {
      const rev = revMatch[1];
      if (/^\d+$/.test(rev)) {
        return parseInt(rev, 10);
      } else {
        // Convert letter to number (A=1, B=2, etc.)
        return rev.toUpperCase().charCodeAt(0) - 64;
      }
    }
    // Match "v1.0", "v1.1", etc.
    const versionMatch = group.match(/^v(\d+)\.(\d+)$/i);
    if (versionMatch) {
      return parseInt(versionMatch[1], 10) * 10 + parseInt(versionMatch[2], 10);
    }
  }
  return 0;
}

/**
 * Check if any group indicates a prototype
 */
function checkPrototype(groups: string[]): boolean {
  return groups.some((g) =>
    PROTOTYPE_TAGS.some((t) => g.toLowerCase().includes(t.toLowerCase()))
  );
}

/**
 * Extract special tags from groups
 */
function extractTags(parenGroups: string[], bracketGroups: string[]): string[] {
  const tags: string[] = [];
  const allGroups = [...parenGroups, ...bracketGroups];

  for (const group of allGroups) {
    // Check for special tags
    for (const tag of SPECIAL_TAGS) {
      if (group.toLowerCase().includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }
    // Check for prototype tags
    for (const tag of PROTOTYPE_TAGS) {
      if (group.toLowerCase().includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }
    // Check for revision
    if (/^Rev\s*(\d+|[A-Z])$/i.test(group)) {
      tags.push(group);
    }
  }

  // Add bracket groups as tags (like [b], [!], etc.)
  for (const group of bracketGroups) {
    if (!tags.includes(group)) {
      tags.push(group);
    }
  }

  return [...new Set(tags)];
}

/**
 * Extract base name from filename (without region/language/tag info)
 */
function extractBaseName(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  // Remove all parenthesized and bracketed groups
  const baseName = withoutExt.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "");
  return baseName.trim();
}

/**
 * Normalize a name for comparison (lowercase, remove punctuation, etc.)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/&/g, "and") // Normalize ampersands
    .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Extract region and language info from a source string (filename or metadata name)
 */
function extractRegionsAndLanguages(source: string): { regions: string[]; languages: string[] } {
  const parenGroups = extractParenGroups(source);
  const regions: string[] = [];
  const languages: string[] = [];

  for (const group of parenGroups) {
    // Skip groups that look like dates (YYMMDD format common in MAME)
    if (/^\d{6}$/.test(group.trim())) {
      continue;
    }
    
    // Check if it's a pure language group (En,Fr,De)
    if (isLanguageGroup(group)) {
      languages.push(...parseLanguages(group));
    }
    // Check if it contains regions
    else if (isRegion(group)) {
      const parsedRegions = parseRegions(group);
      regions.push(...parsedRegions);
      // Also check for embedded languages
      const parts = group.split(",").map((s) => s.trim());
      for (const part of parts) {
        // Skip parts that look like dates
        if (/^\d{6}$/.test(part)) {
          continue;
        }
        if (!isRegion(part)) {
          const lang = KNOWN_LANGUAGES.find((l) => l.toLowerCase() === part.toLowerCase());
          if (lang) {
            languages.push(lang);
          }
        }
      }
    }
  }

  return {
    regions: [...new Set(regions)],
    languages: [...new Set(languages)],
  };
}

/**
 * Parse a ROM filename into a structured RomEntry
 */
export function parseRomFilename(
  filename: string,
  fullPath: string,
  relativePath: string,
  fileSize: number,
  metadata?: GameMetadata,
  collection?: string
): RomEntry {
  const parenGroups = extractParenGroups(filename);
  const bracketGroups = extractBracketGroups(filename);

  // Extract regions and languages from filename first
  let { regions, languages } = extractRegionsAndLanguages(filename);

  // If no regions found in filename, try the gamelist metadata name
  if (regions.length === 0 && metadata?.name) {
    const fromMetadata = extractRegionsAndLanguages(metadata.name);
    regions = fromMetadata.regions;
    // Also grab languages from metadata if we didn't find any
    if (languages.length === 0) {
      languages = fromMetadata.languages;
    }
  }

  const baseName = extractBaseName(filename);
  const normalizedName = normalizeName(baseName);
  
  // Also check metadata name for prototype/revision tags
  const allParenGroups = metadata?.name 
    ? [...parenGroups, ...extractParenGroups(metadata.name)]
    : parenGroups;
  const allBracketGroups = metadata?.name
    ? [...bracketGroups, ...extractBracketGroups(metadata.name)]
    : bracketGroups;
    
  const revision = extractRevision(allParenGroups);
  const isPrototype = checkPrototype(allParenGroups);
  const tags = extractTags(allParenGroups, allBracketGroups);

  return {
    filename,
    fullPath,
    relativePath,
    baseName,
    normalizedName,
    regions,
    languages,
    tags,
    revision,
    isPrototype,
    gamelistId: metadata?.id,
    metadata,
    collection,
    fileSize,
  };
}

/**
 * Get the primary region for a ROM (first region, used for folder organization)
 */
export function getPrimaryRegion(rom: RomEntry): string {
  if (rom.regions.length === 0) {
    return "Unknown";
  }
  // If there's only one region, return it
  if (rom.regions.length === 1) {
    return rom.regions[0];
  }
  // If multiple regions, check for mixed
  const preferredOrder = ["USA", "World", "Europe", "Australia", "Japan"];
  for (const region of preferredOrder) {
    if (rom.regions.includes(region)) {
      return region;
    }
  }
  // Return first region
  return rom.regions[0];
}

/**
 * Determine if a ROM should be placed in a "mixed" region folder
 * (when it has multiple regions that don't align with preferences)
 */
export function isMixedRegion(rom: RomEntry, preferredRegions: string[]): boolean {
  if (rom.regions.length <= 1) {
    return false;
  }
  // Check if any region is in preferred list
  const hasPreferred = rom.regions.some((r) =>
    preferredRegions.some((p) => p.toLowerCase() === r.toLowerCase())
  );
  // It's mixed if it has multiple regions but also non-preferred ones
  const hasNonPreferred = rom.regions.some(
    (r) => !preferredRegions.some((p) => p.toLowerCase() === r.toLowerCase())
  );
  return hasPreferred && hasNonPreferred;
}
