# Duplicate ROMs cleanup for EmulationStation
_Exported on 12/13/2025 at 15:02:19 PST from Cursor (2.2.20)_

---

**User**

I need a typescript nodejs script. 

This time I want to clean up duplicate roms. For each system at the top level, such as gb, gbc, snes, etc. I want to eliminiate games that are duplicates and prefer and marked as USA or english (en) or Europe in that order, It is fine if there are multiple regions or languages listed for a ROM for that system but USA or english should win when there are duplicates. If there are other labels like Hack, or Best, we can keep them as duplicates but only if they are not marked as a language or region we are not interested in. The idea is to try to keep titles english speakers would be most interested in and to eliminate titles that are duplicates.
Other languages or regions that are not duplicate can stay but should go in their own region / language folder, since we don't always know the region or language we can have an unknown for those. For example, "Duck Tails (Japan).rom would go to a japan subfolder since we can assume Japan is all japanese, but a "Duck Tails (Japan, Australia) might go to into a mixed folder. It might help to analyze the files to get a sense of what we want to do.
Anything that is considered a duplicate will be ignored.
The program should have a json configuration file to specify the input folder to scan, the systems to process or 'all' not specified, an ordered list of preferred regions, and preferred language codes. An option for anguage or region codes to ignore no matter the duplicate status. The output folder for the titles being kept. A dry run option showing the games being copied to the new folder and the games being left behind.
Use the gameslist.xml as a guide for region and language when duplicates are discovered. 
The output folder should be structured by system, (region, and language if not preferred) so that it can be used by emulationstation, and the gameslist.xml should be built to reflect the titles and media present for the system. The metadata in the original gameslist.xml should be preserved in the new gameslist file.
Thus in the end, I will have the original input folder untouched, and the output folder with roms, metadata, inages, and videos ready to be copied to an sd card for the R36S and emulationstation.
Spend some time reviewing the specification and ask clarifying questions, feel free to scan the folder, I plan to use to get a sense of what the input will look like. I am open to ideas to structure the output for better user experience finding roms.

---

**Cursor**

I'd like to understand your folder structure and ROM naming conventions better before creating a plan. Let me scan the input folder to get a sense of what we're working with.

I can see your existing gamelist generator script. Now I need to examine your actual ROMs folder to understand the naming conventions and folder structure. Could you tell me where the ROMs folder is located that you want me to scan?

---

**User**

E:\david\Emulation\Easyroms

---

**Cursor**

Let me scan that folder to understand the structure and naming conventions.

Let me look at some specific ROM files and gamelist.xml to understand the naming conventions and metadata structure.

Let me look at more examples to understand the naming patterns and potential duplicates.

Now let me look for specific examples of duplicates to understand the patterns better.

Let me check the media folder structure and look for more examples of naming patterns.

I now have a good understanding of your ROM collection. I can see:

**Naming Conventions (No-Intro style):**
- `Game Name (Region) [Tags].ext`
- Regions: `USA`, `Europe`, `Japan`, `France`, `Germany`, `Spain`, `Australia`, `World`
- Languages embedded: `(En,Fr,De)`, `(USA) (En,Fr,Es)`
- Tags: `SGB Enhanced`, `Proto`, `Rev 1`, `Unl`, `[b]`, `(Hack)`, `(T)` (translation)

**Examples of Duplicates:**
- `102 Dalmatians - Puppies to the Rescue (USA, Europe).zip` vs `102 Dalmatiner (Germany).zip`
- `Aladdin (USA).zip` vs `Aladdin (Europe) (SGB Enhanced).zip`

**Special Subfolders:** `# PT-BR #`, `# SUPER FAMICOM (JP) #`, `Featured Games`, `Classic Game`

I have a few clarifying questions before creating the plan:

One more question about special tags:

Now I have all the information needed. Let me create a comprehensive plan for this ROM deduplication tool.

---

**User**

let's add a list of media items to keep, such as ['images', 'videos'], or ['images'], etc. as an option as well

---

**Cursor**

Good idea! Let me update the plan to include a configurable list of media types to keep.

```markdown
```json
{
  "inputFolder": "E:\\david\\Emulation\\Easyroms",
  "outputFolder": "E:\\david\\Emulation\\CleanRoms",
  "systems": ["gb", "gbc", "snes"],  // or "all"
  "preferredRegions": ["USA", "World", "Europe", "Australia"],
  "preferredLanguages": ["En", "en"],
  "ignoreRegions": [],
  "ignoreLanguages": ["Zh", "Ko"],
  "mediaTypes": ["images", "videos"],  // options: "images", "videos", "manual"
  "dryRun": true
}
```

**mediaTypes options:**
- `"images"` - box art, screenshots (from `media/images/`)
- `"videos"` - gameplay videos (from `media/videos/`)
- `"manual"` - PDF manuals (from `media/manual/`)
- Empty array `[]` - copy ROMs only, no media
```

```markdown
```typescript
interface Config {
  inputFolder: string;
  outputFolder: string;
  systems: string[] | "all";
  preferredRegions: string[];
  preferredLanguages: string[];
  ignoreRegions: string[];
  ignoreLanguages: string[];
  mediaTypes: ("images" | "videos" | "manual")[];
  dryRun: boolean;
}

interface RomEntry {
  filename: string;
  baseName: string;
  regions: string[];
  languages: string[];
  tags: string[];
  revision: number;
  gamelistId?: string;
  metadata?: GameMetadata;
}
```

```markdown
### 3. Output Organization

```
CleanRoms/
  snes/
    gamelist.xml              # Single gamelist for system
    Aladdin (USA).zip         # Preferred version
    media/
      images/Aladdin (USA).png    # Only if "images" in mediaTypes
      videos/Aladdin (USA).mp4    # Only if "videos" in mediaTypes
      manual/Aladdin (USA).pdf    # Only if "manual" in mediaTypes
    regional/
      Japan/
        Aladdin (Japan).zip
        media/images/Aladdin (Japan).png
      Europe/
        Aladdin (Europe).zip
    prototypes/
      Batman (USA) (Proto).zip
      media/images/Batman (USA) (Proto).png
    collections/
      PT-BR/                  # Preserved subfolder collections
        ...
```

Media is copied based on `mediaTypes` config - only specified types are included.
```

I've updated the plan to include the `mediaTypes` configuration option. The updated configuration now includes:

```json
"mediaTypes": ["images", "videos"],  // options: "images", "videos", "manual"
```

**Available options:**
- `"images"` - box art, screenshots (from `media/images/`)
- `"videos"` - gameplay videos (from `media/videos/`)
- `"manual"` - PDF manuals (from `media/manual/`)
- Empty array `[]` - copy ROMs only, no media

This gives you flexibility to save space on the SD card by only including images, or to include everything. The gamelist.xml will only reference media that was actually copied.

Would you like to make any other changes to the plan, or shall I begin implementing it?

```json
"mediaTypes": ["images", "videos"],  // options: "images", "videos", "manual"
```

---

**User**

let's have the report go to an optional file provided as an option to our json configuration. If none is provided, output to the console.

---

**Cursor**

```markdown
```json
{
  "inputFolder": "E:\\david\\Emulation\\Easyroms",
  "outputFolder": "E:\\david\\Emulation\\CleanRoms",
  "systems": ["gb", "gbc", "snes"],  // or "all"
  "preferredRegions": ["USA", "World", "Europe", "Australia"],
  "preferredLanguages": ["En", "en"],
  "ignoreRegions": [],
  "ignoreLanguages": ["Zh", "Ko"],
  "mediaTypes": ["images", "videos"],  // options: "images", "videos", "manual"
  "reportFile": "./dedup-report.txt",  // optional: omit to output to console only
  "dryRun": true
}
```

**Configuration options:**

| Option | Description |
|--------|-------------|
| `mediaTypes` | `"images"`, `"videos"`, `"manual"`, or `[]` for ROMs only |
| `reportFile` | Optional path for detailed report output. If omitted, outputs to console only |
```

```markdown
```json
{
  "inputFolder": "E:\\david\\Emulation\\Easyroms",
  "outputFolder": "E:\\david\\Emulation\\CleanRoms",
  "systems": ["gb", "gbc", "snes"],  // or "all"
  "preferredRegions": ["USA", "World", "Europe", "Australia"],
  "preferredLanguages": ["En", "en"],
  "ignoreRegions": [],
  "ignoreLanguages": ["Zh", "Ko"],
  "mediaTypes": ["images", "videos"],  // options: "images", "videos", "manual"
  "reportFile": "./dedup-report.txt",  // optional: omit to output to console only
  "dryRun": true
}
```

**Configuration options:**

| Option | Description |
|--------|-------------|
| `mediaTypes` | `["images"]`, `["videos"]`, `["manual"]`, or `[]` for ROMs only |
| `reportFile` | Optional path for detailed report. If omitted, outputs to console only |
| `dryRun` | If `true`, simulates without copying files |
```

```markdown
interface Config {
  inputFolder: string;
  outputFolder: string;
  systems: string[] | "all";
  preferredRegions: string[];
  preferredLanguages: string[];
  ignoreRegions: string[];
  ignoreLanguages: string[];
  mediaTypes: ("images" | "videos" | "manual")[];
  reportFile?: string;  // optional: if provided, write report to this file
  dryRun: boolean;
}
```

```markdown
## Report Output Example

Report is written to `reportFile` if specified, otherwise to console.

```
=== ROM Deduplicator - DRY RUN ===
```

I've updated the plan to include the `reportFile` configuration option:

```json
"reportFile": "./dedup-report.txt",  // optional: omit to output to console only
```

**Behavior:**
- If `reportFile` is provided, the detailed report is written to that file
- If omitted or `null`, the report outputs to the console only
- The report includes all the details: kept ROMs, regional copies, prototypes, and duplicates removed

The Config interface now includes:
```typescript
reportFile?: string;  // optional: if provided, write report to this file
```

Any other changes you'd like to make, or shall I begin implementing?

```json
"reportFile": "./dedup-report.txt",  // optional: omit to output to console only
```

```typescript
reportFile?: string;  // optional: if provided, write report to this file
```

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the ROM Deduplication Tool as specified. Let me start with the project setup.

```json
{
  "name": "rom-deduplicator",
  "version": "1.0.0",
  "description": "A TypeScript Node.js CLI tool that identifies duplicate ROMs and organizes them by region/language preference",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "keywords": [
    "rom",
    "emulation",
    "deduplication",
    "emulationstation"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "fast-xml-parser": "^4.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.2"
  },
  "type": "module"
}

```

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

```

```json
{
  "inputFolder": "E:\\david\\Emulation\\Easyroms",
  "outputFolder": "E:\\david\\Emulation\\CleanRoms",
  "systems": "all",
  "preferredRegions": ["USA", "World", "Europe", "Australia"],
  "preferredLanguages": ["En", "en"],
  "ignoreRegions": [],
  "ignoreLanguages": ["Zh", "Ko"],
  "mediaTypes": ["images", "videos"],
  "reportFile": "./dedup-report.txt",
  "dryRun": true
}

```

```typescript
/**
 * TypeScript interfaces for ROM Deduplicator
 */

/** Media types that can be copied */
export type MediaType = "images" | "videos" | "manual";

/** Configuration for the deduplicator */
export interface Config {
  /** Input folder containing ROM systems */
  inputFolder: string;
  /** Output folder for deduplicated ROMs */
  outputFolder: string;
  /** Systems to process, or "all" for all systems */
  systems: string[] | "all";
  /** Ordered list of preferred regions (higher priority first) */
  preferredRegions: string[];
  /** Preferred language codes */
  preferredLanguages: string[];
  /** Regions to always ignore */
  ignoreRegions: string[];
  /** Languages to always ignore */
  ignoreLanguages: string[];
  /** Media types to copy */
  mediaTypes: MediaType[];
  /** Optional path for report output file */
  reportFile?: string;
  /** If true, simulate without copying files */
  dryRun: boolean;
}

/** Metadata from gamelist.xml */
export interface GameMetadata {
  /** Game ID from ScreenScraper or other source */
  id?: string;
  /** Source of the metadata (e.g., "ScreenScraper.fr") */
  source?: string;
  /** Original path in gamelist.xml */
  path: string;
  /** Display name */
  name?: string;
  /** Game description */
  desc?: string;
  /** Rating (0-1) */
  rating?: string;
  /** Release date in format YYYYMMDDTHHMMSS */
  releasedate?: string;
  /** Developer name */
  developer?: string;
  /** Publisher name */
  publisher?: string;
  /** Genre */
  genre?: string;
  /** Number of players */
  players?: string;
  /** ROM hash */
  hash?: string;
  /** Path to image */
  image?: string;
  /** Path to video */
  video?: string;
  /** Path to manual */
  manual?: string;
  /** Genre ID */
  genreid?: string;
}

/** Parsed ROM entry */
export interface RomEntry {
  /** Full filename including extension */
  filename: string;
  /** Full path to the ROM file */
  fullPath: string;
  /** Relative path from system folder */
  relativePath: string;
  /** Base name without region/language tags */
  baseName: string;
  /** Normalized base name for matching */
  normalizedName: string;
  /** Extracted regions */
  regions: string[];
  /** Extracted language codes */
  languages: string[];
  /** Other tags like SGB Enhanced, Unl, etc. */
  tags: string[];
  /** Revision number (0 = base, 1 = Rev 1, etc.) */
  revision: number;
  /** Is this a prototype/beta/demo? */
  isPrototype: boolean;
  /** Game ID from gamelist.xml */
  gamelistId?: string;
  /** Full metadata from gamelist.xml */
  metadata?: GameMetadata;
  /** Source collection/subfolder if from a special folder */
  collection?: string;
}

/** Result of deduplication for a single game group */
export interface DeduplicationResult {
  /** The winning ROM to keep in main folder */
  winner: RomEntry;
  /** ROMs grouped by region for regional subfolders */
  regional: Map<string, RomEntry[]>;
  /** Prototype/beta/demo ROMs */
  prototypes: RomEntry[];
  /** ROMs that are pure duplicates to be removed */
  duplicates: RomEntry[];
}

/** Statistics for a system */
export interface SystemStats {
  /** System name */
  system: string;
  /** Total ROMs found */
  totalRoms: number;
  /** Unique titles identified */
  uniqueTitles: number;
  /** ROMs kept in main folder */
  kept: number;
  /** ROMs placed in regional folders */
  regional: number;
  /** Prototypes/betas */
  prototypes: number;
  /** Pure duplicates removed */
  duplicatesRemoved: number;
  /** ROMs from collections */
  collections: number;
}

/** Output destination for a ROM */
export interface RomDestination {
  /** The ROM entry */
  rom: RomEntry;
  /** Destination type */
  type: "main" | "regional" | "prototype" | "collection" | "duplicate";
  /** Relative output path from system folder */
  outputPath: string;
  /** Region folder name (for regional type) */
  regionFolder?: string;
  /** Collection name (for collection type) */
  collectionName?: string;
}

/** Provider info from gamelist.xml */
export interface GamelistProvider {
  System?: string;
  software?: string;
  database?: string;
  web?: string;
}

/** Parsed gamelist.xml structure */
export interface Gamelist {
  provider?: GamelistProvider;
  games: GameMetadata[];
}

```

```typescript
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
 * Parse a ROM filename into a structured RomEntry
 */
export function parseRomFilename(
  filename: string,
  fullPath: string,
  relativePath: string,
  metadata?: GameMetadata,
  collection?: string
): RomEntry {
  const parenGroups = extractParenGroups(filename);
  const bracketGroups = extractBracketGroups(filename);

  // Extract regions and languages
  const regions: string[] = [];
  const languages: string[] = [];

  for (const group of parenGroups) {
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
        if (!isRegion(part)) {
          const lang = KNOWN_LANGUAGES.find((l) => l.toLowerCase() === part.toLowerCase());
          if (lang) {
            languages.push(lang);
          }
        }
      }
    }
  }

  const baseName = extractBaseName(filename);
  const normalizedName = normalizeName(baseName);
  const revision = extractRevision(parenGroups);
  const isPrototype = checkPrototype(parenGroups);
  const tags = extractTags(parenGroups, bracketGroups);

  return {
    filename,
    fullPath,
    relativePath,
    baseName,
    normalizedName,
    regions: [...new Set(regions)],
    languages: [...new Set(languages)],
    tags,
    revision,
    isPrototype,
    gamelistId: metadata?.id,
    metadata,
    collection,
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

```

```typescript
/**
 * Gamelist.xml Parser and Generator
 * Handles reading and writing EmulationStation gamelist.xml files
 */

import { XMLParser, XMLBuilder } from "fast-xml-parser";
import fs from "fs/promises";
import path from "path";
import type { GameMetadata, Gamelist, GamelistProvider, RomDestination, MediaType } from "./types.js";

/** XML Parser options */
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  trimValues: true,
  parseTagValue: false,
};

/** XML Builder options */
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
};

/**
 * Parse a gamelist.xml file and return structured data
 */
export async function parseGamelist(gamelistPath: string): Promise<Gamelist> {
  try {
    const content = await fs.readFile(gamelistPath, "utf-8");
    const parser = new XMLParser(parserOptions);
    const result = parser.parse(content);

    const gamelist: Gamelist = {
      games: [],
    };

    if (result.gameList) {
      // Parse provider info
      if (result.gameList.provider) {
        gamelist.provider = {
          System: result.gameList.provider.System,
          software: result.gameList.provider.software,
          database: result.gameList.provider.database,
          web: result.gameList.provider.web,
        };
      }

      // Parse games
      const games = result.gameList.game;
      if (games) {
        const gameArray = Array.isArray(games) ? games : [games];
        for (const game of gameArray) {
          const metadata: GameMetadata = {
            id: game["@_id"],
            source: game["@_source"],
            path: game.path || "",
            name: game.name,
            desc: game.desc,
            rating: game.rating,
            releasedate: game.releasedate,
            developer: game.developer,
            publisher: game.publisher,
            genre: game.genre,
            players: game.players,
            hash: game.hash,
            image: game.image,
            video: game.video,
            manual: game.manual,
            genreid: game.genreid,
          };
          gamelist.games.push(metadata);
        }
      }
    }

    return gamelist;
  } catch (error) {
    // File doesn't exist or can't be parsed
    return { games: [] };
  }
}

/**
 * Build a lookup map from gamelist entries by path
 */
export function buildGamelistLookup(gamelist: Gamelist): Map<string, GameMetadata> {
  const lookup = new Map<string, GameMetadata>();

  for (const game of gamelist.games) {
    if (game.path) {
      // Normalize path for lookup (handle ./ prefix and slashes)
      let normalizedPath = game.path;
      if (normalizedPath.startsWith("./")) {
        normalizedPath = normalizedPath.substring(2);
      }
      // Use forward slashes for consistency
      normalizedPath = normalizedPath.replace(/\\/g, "/");
      lookup.set(normalizedPath, game);

      // Also add just the filename for fallback matching
      const filename = path.basename(normalizedPath);
      if (!lookup.has(filename)) {
        lookup.set(filename, game);
      }
    }
  }

  return lookup;
}

/**
 * Find metadata for a ROM file from the gamelist lookup
 */
export function findMetadata(
  lookup: Map<string, GameMetadata>,
  relativePath: string,
  filename: string
): GameMetadata | undefined {
  // Try full relative path first
  let normalizedPath = relativePath.replace(/\\/g, "/");
  if (lookup.has(normalizedPath)) {
    return lookup.get(normalizedPath);
  }

  // Try without ./ prefix
  if (normalizedPath.startsWith("./")) {
    normalizedPath = normalizedPath.substring(2);
  }
  if (lookup.has(normalizedPath)) {
    return lookup.get(normalizedPath);
  }

  // Try just filename
  return lookup.get(filename);
}

/**
 * Update media paths in metadata for the new location
 */
function updateMediaPaths(
  metadata: GameMetadata,
  romOutputPath: string,
  mediaTypes: MediaType[]
): GameMetadata {
  const updated = { ...metadata };
  const romDir = path.dirname(romOutputPath);
  const romBasename = path.basename(romOutputPath).replace(/\.[^.]+$/, "");

  // Update image path
  if (updated.image && mediaTypes.includes("images")) {
    const ext = path.extname(updated.image);
    updated.image = `./${path.posix.join(romDir, "media", "images", romBasename + ext)}`.replace(/\\/g, "/");
  } else {
    delete updated.image;
  }

  // Update video path
  if (updated.video && mediaTypes.includes("videos")) {
    const ext = path.extname(updated.video);
    updated.video = `./${path.posix.join(romDir, "media", "videos", romBasename + ext)}`.replace(/\\/g, "/");
  } else {
    delete updated.video;
  }

  // Update manual path
  if (updated.manual && mediaTypes.includes("manual")) {
    const ext = path.extname(updated.manual);
    updated.manual = `./${path.posix.join(romDir, "media", "manual", romBasename + ext)}`.replace(/\\/g, "/");
  } else {
    delete updated.manual;
  }

  // Update the ROM path
  updated.path = `./${romOutputPath}`.replace(/\\/g, "/");

  return updated;
}

/**
 * Generate a gamelist.xml for a set of ROM destinations
 */
export async function generateGamelist(
  outputPath: string,
  destinations: RomDestination[],
  mediaTypes: MediaType[],
  provider?: GamelistProvider
): Promise<void> {
  const games: any[] = [];

  for (const dest of destinations) {
    if (dest.type === "duplicate") {
      continue; // Skip duplicates
    }

    const rom = dest.rom;
    let gameEntry: any = {};

    // Add attributes if we have metadata with ID
    if (rom.metadata?.id) {
      gameEntry["@_id"] = rom.metadata.id;
    }
    if (rom.metadata?.source) {
      gameEntry["@_source"] = rom.metadata.source;
    }

    // Build path relative to system folder
    gameEntry.path = `./${dest.outputPath}`.replace(/\\/g, "/");

    // Use metadata name or generate from base name
    gameEntry.name = rom.metadata?.name || rom.baseName;

    // Copy other metadata fields
    if (rom.metadata) {
      const updated = updateMediaPaths(rom.metadata, dest.outputPath, mediaTypes);
      if (updated.desc) gameEntry.desc = updated.desc;
      if (updated.rating) gameEntry.rating = updated.rating;
      if (updated.releasedate) gameEntry.releasedate = updated.releasedate;
      if (updated.developer) gameEntry.developer = updated.developer;
      if (updated.publisher) gameEntry.publisher = updated.publisher;
      if (updated.genre) gameEntry.genre = updated.genre;
      if (updated.players) gameEntry.players = updated.players;
      if (updated.hash) gameEntry.hash = updated.hash;
      if (updated.image) gameEntry.image = updated.image;
      if (updated.video) gameEntry.video = updated.video;
      if (updated.manual) gameEntry.manual = updated.manual;
      if (updated.genreid) gameEntry.genreid = updated.genreid;
    }

    games.push(gameEntry);
  }

  // Sort games alphabetically by name
  games.sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Build XML structure
  const xmlObj: any = {
    "?xml": {
      "@_version": "1.0",
      "@_encoding": "utf-8",
      "@_standalone": "yes",
    },
    gameList: {
      game: games,
    },
  };

  // Add provider if available
  if (provider) {
    xmlObj.gameList.provider = provider;
  }

  // Generate XML
  const builder = new XMLBuilder(builderOptions);
  const xml = builder.build(xmlObj);

  // Write to file
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, xml, "utf-8");
}

/**
 * Find original media file path from gamelist metadata
 */
export function getOriginalMediaPath(
  metadata: GameMetadata | undefined,
  mediaType: MediaType,
  systemFolder: string
): string | undefined {
  if (!metadata) return undefined;

  let mediaPath: string | undefined;
  switch (mediaType) {
    case "images":
      mediaPath = metadata.image;
      break;
    case "videos":
      mediaPath = metadata.video;
      break;
    case "manual":
      mediaPath = metadata.manual;
      break;
  }

  if (!mediaPath) return undefined;

  // Resolve relative path
  if (mediaPath.startsWith("./")) {
    mediaPath = mediaPath.substring(2);
  }

  return path.join(systemFolder, mediaPath);
}

/**
 * Generate new media path for output
 */
export function getOutputMediaPath(
  romOutputPath: string,
  mediaType: MediaType,
  originalExt: string
): string {
  const romBasename = path.basename(romOutputPath).replace(/\.[^.]+$/, "");
  const romDir = path.dirname(romOutputPath);
  return path.join(romDir, "media", mediaType, romBasename + originalExt);
}

```

```typescript
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
  // Separate prototypes/betas
  const prototypes = duplicates.filter((r) => r.isPrototype);
  const regular = duplicates.filter((r) => !r.isPrototype);

  // Filter out completely ignored ROMs
  const considered = regular.filter((r) => !shouldIgnore(r, config));
  const ignored = regular.filter((r) => shouldIgnore(r, config));

  if (considered.length === 0) {
    // All regular ROMs are ignored, but keep prototypes if any
    return {
      winner: regular[0] || prototypes[0], // Fallback to first available
      regional: new Map(),
      prototypes,
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
      duplicatesRemoved,
      collections: collectionRoms.length,
    },
  };
}

```

```typescript
/**
 * File Operations
 * Handles copying ROMs and media files to the output folder
 */

import fs from "fs/promises";
import path from "path";
import type { Config, RomDestination, MediaType, RomEntry } from "./types.js";
import { getOriginalMediaPath, getOutputMediaPath } from "./gamelist.js";

/** Common image extensions */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];

/** Common video extensions */
const VIDEO_EXTENSIONS = [".mp4", ".avi", ".mkv", ".webm", ".mov", ".m4v"];

/** Common manual extensions */
const MANUAL_EXTENSIONS = [".pdf"];

/**
 * Find media file for a ROM by searching common locations
 */
async function findMediaFile(
  romPath: string,
  systemFolder: string,
  mediaType: MediaType
): Promise<string | undefined> {
  const romBasename = path.basename(romPath).replace(/\.[^.]+$/, "");
  const romDir = path.dirname(romPath);

  // Determine extensions based on media type
  let extensions: string[];
  let searchFolders: string[];

  switch (mediaType) {
    case "images":
      extensions = IMAGE_EXTENSIONS;
      searchFolders = [
        "media/images",
        "images",
        "boxart",
        "miximages",
        "downloaded_images",
        "snap",
      ];
      break;
    case "videos":
      extensions = VIDEO_EXTENSIONS;
      searchFolders = ["media/videos", "videos", "mixvideos", "snap"];
      break;
    case "manual":
      extensions = MANUAL_EXTENSIONS;
      searchFolders = ["media/manual", "manual", "manuals"];
      break;
  }

  // If ROM is in a subfolder, also search relative to that
  const romSubdir = path.relative(systemFolder, path.dirname(path.join(systemFolder, romDir)));

  // Build search paths
  const searchPaths: string[] = [];
  for (const folder of searchFolders) {
    // Search in system root media folders
    searchPaths.push(path.join(systemFolder, folder));
    // Search in subfolder-relative media folders
    if (romSubdir && romSubdir !== ".") {
      searchPaths.push(path.join(systemFolder, folder, romSubdir));
    }
  }

  // Search for media file
  for (const searchPath of searchPaths) {
    for (const ext of extensions) {
      const mediaPath = path.join(searchPath, romBasename + ext);
      try {
        await fs.access(mediaPath);
        return mediaPath;
      } catch {
        // File doesn't exist, continue searching
      }
    }
  }

  return undefined;
}

/**
 * Get media file path (from metadata or by searching)
 */
export async function getMediaFilePath(
  rom: RomEntry,
  systemFolder: string,
  mediaType: MediaType
): Promise<string | undefined> {
  // First, try to get path from metadata
  const metadataPath = getOriginalMediaPath(rom.metadata, mediaType, systemFolder);
  if (metadataPath) {
    try {
      await fs.access(metadataPath);
      return metadataPath;
    } catch {
      // Path from metadata doesn't exist, search for it
    }
  }

  // Search for media file
  return findMediaFile(rom.relativePath, systemFolder, mediaType);
}

/**
 * Copy a single file with directory creation
 */
async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

/**
 * Copy ROM and its associated media files
 */
export async function copyRomWithMedia(
  destination: RomDestination,
  inputSystemFolder: string,
  outputSystemFolder: string,
  mediaTypes: MediaType[]
): Promise<{ rom: boolean; media: Map<MediaType, boolean> }> {
  const result = {
    rom: false,
    media: new Map<MediaType, boolean>(),
  };

  // Copy ROM file
  const srcRom = destination.rom.fullPath;
  const destRom = path.join(outputSystemFolder, destination.outputPath);

  try {
    await copyFile(srcRom, destRom);
    result.rom = true;
  } catch (error) {
    console.error(`Failed to copy ROM: ${srcRom} -> ${destRom}`, error);
    return result;
  }

  // Copy media files
  for (const mediaType of mediaTypes) {
    const srcMedia = await getMediaFilePath(
      destination.rom,
      inputSystemFolder,
      mediaType
    );

    if (srcMedia) {
      const ext = path.extname(srcMedia);
      const destMedia = path.join(
        outputSystemFolder,
        getOutputMediaPath(destination.outputPath, mediaType, ext)
      );

      try {
        await copyFile(srcMedia, destMedia);
        result.media.set(mediaType, true);
      } catch (error) {
        console.error(`Failed to copy media: ${srcMedia} -> ${destMedia}`, error);
        result.media.set(mediaType, false);
      }
    }
  }

  return result;
}

/**
 * Process all destinations for a system (copy files)
 */
export async function processSystemDestinations(
  destinations: RomDestination[],
  inputSystemFolder: string,
  outputSystemFolder: string,
  config: Config,
  onProgress?: (current: number, total: number, rom: string) => void
): Promise<{
  copied: number;
  failed: number;
  mediaCopied: Map<MediaType, number>;
}> {
  const result = {
    copied: 0,
    failed: 0,
    mediaCopied: new Map<MediaType, number>(),
  };

  // Initialize media counters
  for (const mediaType of config.mediaTypes) {
    result.mediaCopied.set(mediaType, 0);
  }

  // Filter out duplicates (they're not copied)
  const toCopy = destinations.filter((d) => d.type !== "duplicate");
  const total = toCopy.length;

  for (let i = 0; i < toCopy.length; i++) {
    const dest = toCopy[i];

    if (onProgress) {
      onProgress(i + 1, total, dest.rom.filename);
    }

    const copyResult = await copyRomWithMedia(
      dest,
      inputSystemFolder,
      outputSystemFolder,
      config.mediaTypes
    );

    if (copyResult.rom) {
      result.copied++;
      for (const [mediaType, success] of copyResult.media) {
        if (success) {
          result.mediaCopied.set(
            mediaType,
            (result.mediaCopied.get(mediaType) || 0) + 1
          );
        }
      }
    } else {
      result.failed++;
    }
  }

  return result;
}

/**
 * Scan a system folder for ROMs
 */
export async function scanSystemFolder(
  systemFolder: string,
  isRomFile: (filename: string) => boolean
): Promise<{
  roms: Array<{ filename: string; fullPath: string; relativePath: string }>;
  collections: Map<string, Array<{ filename: string; fullPath: string; relativePath: string }>>;
}> {
  const roms: Array<{ filename: string; fullPath: string; relativePath: string }> = [];
  const collections = new Map<string, Array<{ filename: string; fullPath: string; relativePath: string }>>();

  // Patterns for collection folders (to be preserved separately)
  const collectionPatterns = [
    /^#\s*.+\s*#$/, // # Collection Name #
    /^Featured Games$/i,
    /^Classic Game$/i,
    /^top\d+$/i, // top100, etc.
  ];

  const isCollectionFolder = (name: string): boolean => {
    return collectionPatterns.some((p) => p.test(name));
  };

  // Skip folders that contain nested ROMs organized by letter (like A, B, C...)
  const skipPatterns = [
    /^[A-Z]$/, // Single letter folders
    /^media$/i,
    /^images$/i,
    /^videos$/i,
    /^manual$/i,
    /^backup$/i,
    /^downloaded_images$/i,
    /^downloaded_videos$/i,
    /^snap$/i,
    /^boxart$/i,
  ];

  const shouldSkipFolder = (name: string): boolean => {
    return skipPatterns.some((p) => p.test(name));
  };

  async function scanDir(dir: string, relativePath: string, collection?: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipFolder(entry.name)) {
          continue;
        }

        if (isCollectionFolder(entry.name)) {
          // This is a collection folder - scan it separately
          await scanDir(fullPath, entry.name, entry.name);
        } else if (collection) {
          // Already in a collection, continue scanning
          await scanDir(fullPath, relPath, collection);
        } else {
          // Check if this looks like an alphabetical organization folder
          // (contains subfolders A-Z with ROMs)
          const subEntries = await fs.readdir(fullPath, { withFileTypes: true });
          const hasLetterFolders = subEntries.some(
            (e) => e.isDirectory() && /^[A-Z]$/.test(e.name)
          );

          if (hasLetterFolders) {
            // Scan inside letter folders
            for (const subEntry of subEntries) {
              if (subEntry.isDirectory() && /^[A-Z]$/.test(subEntry.name)) {
                const subPath = path.join(fullPath, subEntry.name);
                await scanDir(subPath, path.join(relPath, subEntry.name), undefined);
              }
            }
          }
        }
      } else if (entry.isFile() && isRomFile(entry.name)) {
        const romInfo = {
          filename: entry.name,
          fullPath,
          relativePath: relPath,
        };

        if (collection) {
          if (!collections.has(collection)) {
            collections.set(collection, []);
          }
          collections.get(collection)!.push(romInfo);
        } else {
          roms.push(romInfo);
        }
      }
    }
  }

  await scanDir(systemFolder, "", undefined);

  return { roms, collections };
}

/**
 * Get list of system folders from input folder
 */
export async function getSystemFolders(
  inputFolder: string,
  systems: string[] | "all"
): Promise<string[]> {
  const entries = await fs.readdir(inputFolder, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      // Skip non-system folders
      const skipFolders = [
        "bios",
        "themes",
        "tools",
        "launchimages",
        "bgmusic",
        "movies",
      ];
      return !skipFolders.includes(name.toLowerCase());
    });

  if (systems === "all") {
    return folders;
  }

  return folders.filter((f) => systems.includes(f));
}

```

```typescript
/**
 * Configuration Loading and Validation
 */

import fs from "fs/promises";
import path from "path";
import type { Config, MediaType } from "./types.js";

/** Default configuration values */
const DEFAULT_CONFIG: Partial<Config> = {
  systems: "all",
  preferredRegions: ["USA", "World", "Europe", "Australia"],
  preferredLanguages: ["En", "en"],
  ignoreRegions: [],
  ignoreLanguages: [],
  mediaTypes: ["images", "videos"],
  dryRun: true,
};

/**
 * Validate configuration
 */
function validateConfig(config: any): config is Config {
  const errors: string[] = [];

  if (!config.inputFolder || typeof config.inputFolder !== "string") {
    errors.push("inputFolder is required and must be a string");
  }

  if (!config.outputFolder || typeof config.outputFolder !== "string") {
    errors.push("outputFolder is required and must be a string");
  }

  if (
    config.systems !== "all" &&
    (!Array.isArray(config.systems) ||
      !config.systems.every((s: any) => typeof s === "string"))
  ) {
    errors.push('systems must be "all" or an array of strings');
  }

  if (
    !Array.isArray(config.preferredRegions) ||
    !config.preferredRegions.every((r: any) => typeof r === "string")
  ) {
    errors.push("preferredRegions must be an array of strings");
  }

  if (
    !Array.isArray(config.preferredLanguages) ||
    !config.preferredLanguages.every((l: any) => typeof l === "string")
  ) {
    errors.push("preferredLanguages must be an array of strings");
  }

  if (
    !Array.isArray(config.ignoreRegions) ||
    !config.ignoreRegions.every((r: any) => typeof r === "string")
  ) {
    errors.push("ignoreRegions must be an array of strings");
  }

  if (
    !Array.isArray(config.ignoreLanguages) ||
    !config.ignoreLanguages.every((l: any) => typeof l === "string")
  ) {
    errors.push("ignoreLanguages must be an array of strings");
  }

  const validMediaTypes: MediaType[] = ["images", "videos", "manual"];
  if (
    !Array.isArray(config.mediaTypes) ||
    !config.mediaTypes.every((m: any) => validMediaTypes.includes(m))
  ) {
    errors.push('mediaTypes must be an array containing "images", "videos", and/or "manual"');
  }

  if (config.reportFile !== undefined && typeof config.reportFile !== "string") {
    errors.push("reportFile must be a string if provided");
  }

  if (typeof config.dryRun !== "boolean") {
    errors.push("dryRun must be a boolean");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  return true;
}

/**
 * Load configuration from a JSON file
 */
export async function loadConfig(configPath: string): Promise<Config> {
  const absolutePath = path.resolve(configPath);

  try {
    const content = await fs.readFile(absolutePath, "utf-8");
    const parsed = JSON.parse(content);

    // Merge with defaults
    const config = {
      ...DEFAULT_CONFIG,
      ...parsed,
    };

    // Validate
    validateConfig(config);

    return config as Config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Configuration file not found: ${absolutePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Apply CLI overrides to configuration
 */
export function applyOverrides(
  config: Config,
  overrides: {
    dryRun?: boolean;
    systems?: string[];
    outputFolder?: string;
    reportFile?: string;
  }
): Config {
  const result = { ...config };

  if (overrides.dryRun !== undefined) {
    result.dryRun = overrides.dryRun;
  }

  if (overrides.systems) {
    result.systems = overrides.systems;
  }

  if (overrides.outputFolder) {
    result.outputFolder = overrides.outputFolder;
  }

  if (overrides.reportFile !== undefined) {
    result.reportFile = overrides.reportFile;
  }

  return result;
}

```

```typescript
/**
 * Report Generation
 * Handles outputting results to console or file
 */

import fs from "fs/promises";
import path from "path";
import type { Config, RomDestination, SystemStats } from "./types.js";

/** Report writer interface */
interface ReportWriter {
  write(text: string): void;
  writeLine(text: string): void;
  flush(): Promise<void>;
}

/** Console writer */
class ConsoleWriter implements ReportWriter {
  write(text: string): void {
    process.stdout.write(text);
  }

  writeLine(text: string): void {
    console.log(text);
  }

  async flush(): Promise<void> {
    // No-op for console
  }
}

/** File writer */
class FileWriter implements ReportWriter {
  private buffer: string[] = [];

  constructor(private filePath: string) {}

  write(text: string): void {
    this.buffer.push(text);
  }

  writeLine(text: string): void {
    this.buffer.push(text + "\n");
  }

  async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, this.buffer.join(""), "utf-8");
  }
}

/** Dual writer (console and file) */
class DualWriter implements ReportWriter {
  constructor(
    private console: ConsoleWriter,
    private file: FileWriter
  ) {}

  write(text: string): void {
    this.console.write(text);
    this.file.write(text);
  }

  writeLine(text: string): void {
    this.console.writeLine(text);
    this.file.writeLine(text);
  }

  async flush(): Promise<void> {
    await this.file.flush();
  }
}

/**
 * Create a report writer based on config
 */
export function createReportWriter(config: Config): ReportWriter {
  const consoleWriter = new ConsoleWriter();

  if (config.reportFile) {
    const fileWriter = new FileWriter(path.resolve(config.reportFile));
    return new DualWriter(consoleWriter, fileWriter);
  }

  return consoleWriter;
}

/**
 * Format a number with thousands separators
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Write the report header
 */
export function writeHeader(writer: ReportWriter, config: Config): void {
  const mode = config.dryRun ? "DRY RUN" : "LIVE";
  writer.writeLine("=".repeat(60));
  writer.writeLine(`ROM Deduplicator - ${mode}`);
  writer.writeLine("=".repeat(60));
  writer.writeLine("");
  writer.writeLine(`Input:  ${config.inputFolder}`);
  writer.writeLine(`Output: ${config.outputFolder}`);
  writer.writeLine(`Systems: ${config.systems === "all" ? "all" : config.systems.join(", ")}`);
  writer.writeLine(`Preferred regions: ${config.preferredRegions.join(", ")}`);
  writer.writeLine(`Preferred languages: ${config.preferredLanguages.join(", ")}`);
  writer.writeLine(`Media types: ${config.mediaTypes.join(", ") || "none"}`);
  writer.writeLine("");
}

/**
 * Write system processing start
 */
export function writeSystemStart(
  writer: ReportWriter,
  system: string,
  romCount: number
): void {
  writer.writeLine("-".repeat(60));
  writer.writeLine(`System: ${system}`);
  writer.writeLine("-".repeat(60));
  writer.writeLine(`  Found ${formatNumber(romCount)} ROM files`);
}

/**
 * Write destination details for a system
 */
export function writeDestinations(
  writer: ReportWriter,
  destinations: RomDestination[],
  verbose: boolean = false
): void {
  // Group by type
  const main = destinations.filter((d) => d.type === "main");
  const regional = destinations.filter((d) => d.type === "regional");
  const prototypes = destinations.filter((d) => d.type === "prototype");
  const collections = destinations.filter((d) => d.type === "collection");
  const duplicates = destinations.filter((d) => d.type === "duplicate");

  // Write KEEP section
  writer.writeLine("");
  writer.writeLine(`  KEEP (main folder): ${formatNumber(main.length)}`);
  if (verbose && main.length > 0) {
    for (const dest of main.slice(0, 10)) {
      writer.writeLine(`    - ${dest.rom.filename}`);
    }
    if (main.length > 10) {
      writer.writeLine(`    ... and ${main.length - 10} more`);
    }
  }

  // Write REGIONAL section
  if (regional.length > 0) {
    writer.writeLine("");
    writer.writeLine(`  REGIONAL (subfolders): ${formatNumber(regional.length)}`);

    // Group by region
    const byRegion = new Map<string, RomDestination[]>();
    for (const dest of regional) {
      const region = dest.regionFolder || "Unknown";
      if (!byRegion.has(region)) {
        byRegion.set(region, []);
      }
      byRegion.get(region)!.push(dest);
    }

    for (const [region, dests] of byRegion) {
      writer.writeLine(`    ${region}: ${dests.length}`);
      if (verbose) {
        for (const dest of dests.slice(0, 5)) {
          writer.writeLine(`      - ${dest.rom.filename}`);
        }
        if (dests.length > 5) {
          writer.writeLine(`      ... and ${dests.length - 5} more`);
        }
      }
    }
  }

  // Write PROTOTYPES section
  if (prototypes.length > 0) {
    writer.writeLine("");
    writer.writeLine(`  PROTOTYPES: ${formatNumber(prototypes.length)}`);
    if (verbose) {
      for (const dest of prototypes.slice(0, 10)) {
        writer.writeLine(`    - ${dest.rom.filename}`);
      }
      if (prototypes.length > 10) {
        writer.writeLine(`    ... and ${prototypes.length - 10} more`);
      }
    }
  }

  // Write COLLECTIONS section
  if (collections.length > 0) {
    writer.writeLine("");
    writer.writeLine(`  COLLECTIONS: ${formatNumber(collections.length)}`);

    // Group by collection
    const byCollection = new Map<string, RomDestination[]>();
    for (const dest of collections) {
      const name = dest.collectionName || "Unknown";
      if (!byCollection.has(name)) {
        byCollection.set(name, []);
      }
      byCollection.get(name)!.push(dest);
    }

    for (const [name, dests] of byCollection) {
      writer.writeLine(`    ${name}: ${dests.length}`);
    }
  }

  // Write DUPLICATES section
  if (duplicates.length > 0) {
    writer.writeLine("");
    writer.writeLine(`  DUPLICATES REMOVED: ${formatNumber(duplicates.length)}`);
    if (verbose) {
      for (const dest of duplicates.slice(0, 10)) {
        writer.writeLine(`    - ${dest.rom.filename}`);
      }
      if (duplicates.length > 10) {
        writer.writeLine(`    ... and ${duplicates.length - 10} more`);
      }
    }
  }
}

/**
 * Write system summary
 */
export function writeSystemSummary(
  writer: ReportWriter,
  stats: SystemStats
): void {
  writer.writeLine("");
  writer.writeLine(`  Summary for ${stats.system}:`);
  writer.writeLine(`    Total ROMs: ${formatNumber(stats.totalRoms)}`);
  writer.writeLine(`    Unique titles: ${formatNumber(stats.uniqueTitles)}`);
  writer.writeLine(`    Kept: ${formatNumber(stats.kept)}`);
  writer.writeLine(`    Regional: ${formatNumber(stats.regional)}`);
  writer.writeLine(`    Prototypes: ${formatNumber(stats.prototypes)}`);
  writer.writeLine(`    Collections: ${formatNumber(stats.collections)}`);
  writer.writeLine(`    Duplicates removed: ${formatNumber(stats.duplicatesRemoved)}`);
}

/**
 * Write final summary
 */
export function writeFinalSummary(
  writer: ReportWriter,
  allStats: SystemStats[],
  config: Config
): void {
  writer.writeLine("");
  writer.writeLine("=".repeat(60));
  writer.writeLine("FINAL SUMMARY");
  writer.writeLine("=".repeat(60));

  const totals = {
    systems: allStats.length,
    totalRoms: 0,
    uniqueTitles: 0,
    kept: 0,
    regional: 0,
    prototypes: 0,
    collections: 0,
    duplicatesRemoved: 0,
  };

  for (const stats of allStats) {
    totals.totalRoms += stats.totalRoms;
    totals.uniqueTitles += stats.uniqueTitles;
    totals.kept += stats.kept;
    totals.regional += stats.regional;
    totals.prototypes += stats.prototypes;
    totals.collections += stats.collections;
    totals.duplicatesRemoved += stats.duplicatesRemoved;
  }

  writer.writeLine("");
  writer.writeLine(`Systems processed: ${totals.systems}`);
  writer.writeLine(`Total ROMs scanned: ${formatNumber(totals.totalRoms)}`);
  writer.writeLine(`Unique titles: ${formatNumber(totals.uniqueTitles)}`);
  writer.writeLine("");
  writer.writeLine(`Kept (main): ${formatNumber(totals.kept)}`);
  writer.writeLine(`Regional: ${formatNumber(totals.regional)}`);
  writer.writeLine(`Prototypes: ${formatNumber(totals.prototypes)}`);
  writer.writeLine(`Collections: ${formatNumber(totals.collections)}`);
  writer.writeLine(`Duplicates removed: ${formatNumber(totals.duplicatesRemoved)}`);
  writer.writeLine("");

  const outputCount = totals.kept + totals.regional + totals.prototypes + totals.collections;
  const reduction = totals.totalRoms > 0
    ? ((totals.duplicatesRemoved / totals.totalRoms) * 100).toFixed(1)
    : "0";

  writer.writeLine(`Output ROMs: ${formatNumber(outputCount)} (${reduction}% reduction)`);

  if (config.dryRun) {
    writer.writeLine("");
    writer.writeLine("NOTE: This was a DRY RUN. No files were copied.");
    writer.writeLine("Run with dryRun: false to copy files.");
  }
}

/**
 * Write per-system breakdown table
 */
export function writeSystemBreakdown(
  writer: ReportWriter,
  allStats: SystemStats[]
): void {
  writer.writeLine("");
  writer.writeLine("Breakdown by system:");
  writer.writeLine("");

  // Sort by system name
  const sorted = [...allStats].sort((a, b) => a.system.localeCompare(b.system));

  for (const stats of sorted) {
    writer.writeLine(
      `  ${stats.system.padEnd(15)} ` +
        `Kept: ${stats.kept.toString().padStart(5)}, ` +
        `Regional: ${stats.regional.toString().padStart(5)}, ` +
        `Proto: ${stats.prototypes.toString().padStart(4)}, ` +
        `Removed: ${stats.duplicatesRemoved.toString().padStart(5)}`
    );
  }
}

```

```typescript
#!/usr/bin/env node
/**
 * ROM Deduplicator CLI
 * Main entry point for the ROM deduplication tool
 */

import { Command } from "commander";
import path from "path";
import { loadConfig, applyOverrides } from "./config.js";
import { parseRomFilename, isRomFile } from "./parser.js";
import { parseGamelist, buildGamelistLookup, findMetadata, generateGamelist } from "./gamelist.js";
import { deduplicateSystem } from "./deduplicator.js";
import { scanSystemFolder, getSystemFolders, processSystemDestinations } from "./fileOps.js";
import {
  createReportWriter,
  writeHeader,
  writeSystemStart,
  writeDestinations,
  writeSystemSummary,
  writeFinalSummary,
  writeSystemBreakdown,
} from "./report.js";
import type { Config, RomEntry, SystemStats, RomDestination } from "./types.js";

const VERSION = "1.0.0";

/**
 * Process a single system
 */
async function processSystem(
  systemName: string,
  inputFolder: string,
  outputFolder: string,
  config: Config,
  writer: ReturnType<typeof createReportWriter>
): Promise<{ stats: SystemStats; destinations: RomDestination[] }> {
  const inputSystemFolder = path.join(inputFolder, systemName);
  const outputSystemFolder = path.join(outputFolder, systemName);

  // Scan for ROMs
  const { roms, collections } = await scanSystemFolder(inputSystemFolder, isRomFile);

  const totalRomCount = roms.length + Array.from(collections.values()).reduce((sum, c) => sum + c.length, 0);

  writeSystemStart(writer, systemName, totalRomCount);

  if (totalRomCount === 0) {
    writer.writeLine("  No ROMs found, skipping.");
    return {
      stats: {
        system: systemName,
        totalRoms: 0,
        uniqueTitles: 0,
        kept: 0,
        regional: 0,
        prototypes: 0,
        duplicatesRemoved: 0,
        collections: 0,
      },
      destinations: [],
    };
  }

  // Load gamelist.xml
  const gamelistPath = path.join(inputSystemFolder, "gamelist.xml");
  const gamelist = await parseGamelist(gamelistPath);
  const lookup = buildGamelistLookup(gamelist);

  writer.writeLine(`  Loaded ${gamelist.games.length} entries from gamelist.xml`);

  // Parse all ROMs
  const romEntries: RomEntry[] = [];

  // Parse regular ROMs
  for (const rom of roms) {
    const metadata = findMetadata(lookup, rom.relativePath, rom.filename);
    const entry = parseRomFilename(
      rom.filename,
      rom.fullPath,
      rom.relativePath,
      metadata
    );
    romEntries.push(entry);
  }

  // Parse collection ROMs
  for (const [collectionName, collectionRoms] of collections) {
    for (const rom of collectionRoms) {
      const metadata = findMetadata(lookup, rom.relativePath, rom.filename);
      const entry = parseRomFilename(
        rom.filename,
        rom.fullPath,
        rom.relativePath,
        metadata,
        collectionName
      );
      romEntries.push(entry);
    }
  }

  // Deduplicate
  const { destinations, stats } = deduplicateSystem(romEntries, config);

  // Write destination details
  writeDestinations(writer, destinations, true);

  // Write system summary
  const systemStats: SystemStats = {
    system: systemName,
    ...stats,
  };
  writeSystemSummary(writer, systemStats);

  // If not dry run, copy files
  if (!config.dryRun) {
    writer.writeLine("");
    writer.writeLine("  Copying files...");

    const copyResult = await processSystemDestinations(
      destinations,
      inputSystemFolder,
      outputSystemFolder,
      config,
      (current, total, rom) => {
        if (current % 100 === 0 || current === total) {
          process.stdout.write(`\r  Progress: ${current}/${total}`);
        }
      }
    );

    writer.writeLine("");
    writer.writeLine(`  Copied: ${copyResult.copied} ROMs, ${copyResult.failed} failed`);

    for (const [mediaType, count] of copyResult.mediaCopied) {
      writer.writeLine(`    ${mediaType}: ${count} files`);
    }

    // Generate gamelist.xml
    const outputGamelistPath = path.join(outputSystemFolder, "gamelist.xml");
    await generateGamelist(
      outputGamelistPath,
      destinations,
      config.mediaTypes,
      gamelist.provider
    );
    writer.writeLine(`  Generated gamelist.xml`);
  }

  return { stats: systemStats, destinations };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name("rom-deduplicator")
    .description("Deduplicate ROM collections by region and language preference")
    .version(VERSION)
    .option("-c, --config <path>", "Path to configuration file", "config.json")
    .option("-d, --dry-run", "Simulate without copying files")
    .option("-n, --no-dry-run", "Actually copy files (override config)")
    .option("-s, --systems <systems>", "Comma-separated list of systems to process")
    .option("-o, --output <path>", "Output folder path")
    .option("-r, --report <path>", "Report output file path")
    .option("-v, --verbose", "Verbose output")
    .parse(process.argv);

  const options = program.opts();

  try {
    // Load configuration
    const configPath = path.resolve(options.config);
    let config = await loadConfig(configPath);

    // Apply CLI overrides
    const overrides: Parameters<typeof applyOverrides>[1] = {};

    if (options.dryRun !== undefined) {
      overrides.dryRun = options.dryRun;
    }

    if (options.systems) {
      overrides.systems = options.systems.split(",").map((s: string) => s.trim());
    }

    if (options.output) {
      overrides.outputFolder = options.output;
    }

    if (options.report) {
      overrides.reportFile = options.report;
    }

    config = applyOverrides(config, overrides);

    // Create report writer
    const writer = createReportWriter(config);

    // Write header
    writeHeader(writer, config);

    // Get list of systems to process
    const systems = await getSystemFolders(config.inputFolder, config.systems);

    if (systems.length === 0) {
      writer.writeLine("No systems found to process.");
      await writer.flush();
      return;
    }

    writer.writeLine(`Found ${systems.length} system(s) to process: ${systems.join(", ")}`);
    writer.writeLine("");

    // Process each system
    const allStats: SystemStats[] = [];

    for (const system of systems) {
      try {
        const { stats } = await processSystem(
          system,
          config.inputFolder,
          config.outputFolder,
          config,
          writer
        );
        allStats.push(stats);
      } catch (error) {
        writer.writeLine(`  ERROR processing ${system}: ${(error as Error).message}`);
      }

      writer.writeLine("");
    }

    // Write final summary
    writeFinalSummary(writer, allStats, config);
    writeSystemBreakdown(writer, allStats);

    // Flush report
    await writer.flush();

    if (config.reportFile) {
      console.log(`\nReport written to: ${path.resolve(config.reportFile)}`);
    }
  } catch (error) {
    console.error("Error:", (error as Error).message);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

```

The tool is working correctly. Let me run a quick test on a couple more systems to ensure everything is functioning properly.

Excellent! The tool is working correctly. Let me complete the todo and add a README for documentation.

```markdown
# ROM Deduplicator

A TypeScript Node.js CLI tool that identifies duplicate ROMs across systems, keeps preferred regional/language versions, organizes non-preferred versions into regional subfolders, and generates EmulationStation-compatible gamelist.xml files with preserved metadata.

## Features

- **Smart Deduplication**: Uses gamelist.xml game IDs when available, falls back to fuzzy name matching
- **Region/Language Preferences**: Configurable priority for USA, Europe, English, etc.
- **Organized Output**: 
  - Preferred versions in main folder
  - Non-preferred regions in `regional/[region]/` subfolders
  - Prototypes/betas in `prototypes/` subfolder
  - Collections preserved in `collections/` subfolder
- **Media Handling**: Copies images, videos, and manuals alongside ROMs
- **Metadata Preservation**: Generates new gamelist.xml with original metadata
- **Dry Run Mode**: Preview changes before copying files
- **Detailed Reports**: Output to console and/or file

## Installation

```bash
cd rom-deduplicator
npm install
npm run build
```

## Usage

### Basic Usage

```bash
# Run with config file (dry run by default)
node dist/index.js --config config.json

# Actually copy files
node dist/index.js --config config.json --no-dry-run

# Process specific systems
node dist/index.js --config config.json --systems gb,gbc,snes

# Override output folder
node dist/index.js --config config.json --output "D:\CleanRoms"
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Path to configuration file (default: config.json) |
| `-d, --dry-run` | Simulate without copying files |
| `-n, --no-dry-run` | Actually copy files (override config) |
| `-s, --systems <systems>` | Comma-separated list of systems to process |
| `-o, --output <path>` | Output folder path |
| `-r, --report <path>` | Report output file path |
| `-v, --verbose` | Verbose output |

## Configuration

Create a `config.json` file:

```json
{
  "inputFolder": "E:\\Emulation\\Roms",
  "outputFolder": "E:\\Emulation\\CleanRoms",
  "systems": "all",
  "preferredRegions": ["USA", "World", "Europe", "Australia"],
  "preferredLanguages": ["En", "en"],
  "ignoreRegions": [],
  "ignoreLanguages": ["Zh", "Ko"],
  "mediaTypes": ["images", "videos"],
  "reportFile": "./dedup-report.txt",
  "dryRun": true
}
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `inputFolder` | string | Path to input ROMs folder |
| `outputFolder` | string | Path for deduplicated output |
| `systems` | string[] \| "all" | Systems to process |
| `preferredRegions` | string[] | Ordered list of preferred regions |
| `preferredLanguages` | string[] | Preferred language codes |
| `ignoreRegions` | string[] | Regions to always exclude |
| `ignoreLanguages` | string[] | Languages to always exclude |
| `mediaTypes` | string[] | Media to copy: "images", "videos", "manual" |
| `reportFile` | string | Optional report output file |
| `dryRun` | boolean | If true, simulate without copying |

## Output Structure

```
CleanRoms/
  snes/
    gamelist.xml              # Single gamelist for system
    Aladdin (USA).zip         # Preferred version
    media/
      images/Aladdin (USA).png
      videos/Aladdin (USA).mp4
    regional/
      Japan/
        Aladdin (Japan).zip
        media/images/Aladdin (Japan).png
      Germany/
        Aladdin (Germany).zip
    prototypes/
      Batman (USA) (Proto).zip
    collections/
      PT-BR/
        Game (Brazil).zip
```

## How It Works

### Deduplication Algorithm

1. **Scan ROMs**: Find all ROM files in system folder
2. **Load Metadata**: Parse gamelist.xml for game IDs and metadata
3. **Group by Game**: 
   - Use game ID from gamelist.xml when available
   - Fall back to normalized name matching
4. **Score Each ROM**:
   - Region priority (USA=100, World=90, Europe=80, etc.)
   - Language priority (English=50)
   - Revision bonus (Rev 2 > Rev 1 > base)
   - Multi-region bonus
5. **Select Winner**: Highest scoring ROM goes to main folder
6. **Categorize Others**:
   - Non-preferred regions → regional subfolder
   - Prototypes/betas → prototypes subfolder
   - Pure duplicates → not copied

### Supported Naming Conventions

The tool parses No-Intro naming convention:
- `Game Name (USA).zip`
- `Game Name (Europe) (En,Fr,De).zip`
- `Game Name (Japan) (Rev 1).zip`
- `Game Name (USA) (Proto).zip`
- `Game Name (Europe) (SGB Enhanced).zip`

## Example Output

```
============================================================
ROM Deduplicator - DRY RUN
============================================================

System: gbc
  Found 2,099 ROM files
  Loaded 2,099 entries from gamelist.xml

  KEEP (main folder): 613
  REGIONAL (subfolders): 578
    Japan: 482
    Germany: 42
    France: 29
    ...
  PROTOTYPES: 65
  COLLECTIONS: 56
  DUPLICATES REMOVED: 791

Summary: 37.7% reduction
```

## License

MIT

```

All tasks are complete. Here's a summary of what was implemented:

## ROM Deduplicator - Implementation Complete

### Project Structure
```
d:\Projects\folder_cleanup\rom-deduplicator\
├── src/
│   ├── index.ts        # CLI entry point
│   ├── config.ts       # Config loading/validation
│   ├── parser.ts       # No-Intro filename parser
│   ├── gamelist.ts     # gamelist.xml parsing/generation
│   ├── deduplicator.ts # Core deduplication logic
│   ├── fileOps.ts      # File/media copy operations
│   ├── report.ts       # Report output to console/file
│   └── types.ts        # TypeScript interfaces
├── config.json         # Default configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features Implemented

1. **Smart Deduplication**: Uses gamelist.xml game IDs + fuzzy name matching
2. **Region/Language Preferences**: Configurable priority scoring
3. **Output Organization**:
   - Main folder: Preferred versions
   - `regional/[region]/`: Non-preferred regions (Japan, Germany, France, etc.)
   - `prototypes/`: Proto/Beta/Demo ROMs
   - `collections/`: Preserved special folders (Featured Games, etc.)
4. **Media Handling**: Configurable - images, videos, manual
5. **Report Output**: Console and/or file via `reportFile` config option
6. **Dry Run Mode**: Preview changes before copying

### Test Results (gbc system)
- **2,099 ROMs scanned**
- **1,001 unique titles identified**
- **613 kept** in main folder (preferred regions)
- **578 regional** (Japan: 482, Germany: 42, France: 29, etc.)
- **65 prototypes** separated
- **791 duplicates removed**
- **37.7% reduction** in total

### Usage
```bash
# Build
cd d:\Projects\folder_cleanup\rom-deduplicator
npm run build

# Dry run (preview)
node dist/index.js --config config.json --dry-run

# Actually copy files
node dist/index.js --config config.json --no-dry-run
```

```plaintext
d:\Projects\folder_cleanup\rom-deduplicator\
├── src/
│   ├── index.ts        # CLI entry point
│   ├── config.ts       # Config loading/validation
│   ├── parser.ts       # No-Intro filename parser
│   ├── gamelist.ts     # gamelist.xml parsing/generation
│   ├── deduplicator.ts # Core deduplication logic
│   ├── fileOps.ts      # File/media copy operations
│   ├── report.ts       # Report output to console/file
│   └── types.ts        # TypeScript interfaces
├── config.json         # Default configuration
├── package.json
├── tsconfig.json
└── README.md
```

```shellscript
# Build
cd d:\Projects\folder_cleanup\rom-deduplicator
npm run build

# Dry run (preview)
node dist/index.js --config config.json --dry-run

# Actually copy files
node dist/index.js --config config.json --no-dry-run
```

---

**User**

Can the report also include the size of the final output compared to the size of the original input, and do so by type, rom, image, video, manual etc. This will help determine if I have a set of games that can fit on an sd card.

---

**Cursor**

I'll add size tracking to the report. Let me update the relevant files to track and display file sizes.

Now I'll update the files to add size tracking. Let me start with the types:

```typescript
/** Size statistics by type */
export interface SizeStats {
  /** Size of ROM files in bytes */
  roms: number;
  /** Size of image files in bytes */
  images: number;
  /** Size of video files in bytes */
  videos: number;
  /** Size of manual files in bytes */
  manual: number;
  /** Total size in bytes */
  total: number;
}

/** Statistics for a system */
export interface SystemStats {
  /** System name */
  system: string;
  /** Total ROMs found */
  totalRoms: number;
  /** Unique titles identified */
  uniqueTitles: number;
  /** ROMs kept in main folder */
  kept: number;
  /** ROMs placed in regional folders */
  regional: number;
  /** Prototypes/betas */
  prototypes: number;
  /** Pure duplicates removed */
  duplicatesRemoved: number;
  /** ROMs from collections */
  collections: number;
  /** Size of input files */
  inputSize: SizeStats;
  /** Size of output files (projected) */
  outputSize: SizeStats;
}
```

```typescript
/** Parsed ROM entry */
export interface RomEntry {
  /** Full filename including extension */
  filename: string;
  /** Full path to the ROM file */
  fullPath: string;
  /** Relative path from system folder */
  relativePath: string;
  /** Base name without region/language tags */
  baseName: string;
  /** Normalized base name for matching */
  normalizedName: string;
  /** Extracted regions */
  regions: string[];
  /** Extracted language codes */
  languages: string[];
  /** Other tags like SGB Enhanced, Unl, etc. */
  tags: string[];
  /** Revision number (0 = base, 1 = Rev 1, etc.) */
  revision: number;
  /** Is this a prototype/beta/demo? */
  isPrototype: boolean;
  /** Game ID from gamelist.xml */
  gamelistId?: string;
  /** Full metadata from gamelist.xml */
  metadata?: GameMetadata;
  /** Source collection/subfolder if from a special folder */
  collection?: string;
  /** File size in bytes */
  fileSize: number;
}
```

```typescript
/** Media file info with size */
export interface MediaFileInfo {
  /** Path to the media file */
  path: string;
  /** File size in bytes */
  size: number;
}

/** Output destination for a ROM */
export interface RomDestination {
  /** The ROM entry */
  rom: RomEntry;
  /** Destination type */
  type: "main" | "regional" | "prototype" | "collection" | "duplicate";
  /** Relative output path from system folder */
  outputPath: string;
  /** Region folder name (for regional type) */
  regionFolder?: string;
  /** Collection name (for collection type) */
  collectionName?: string;
  /** Associated media files with sizes */
  mediaFiles?: Map<MediaType, MediaFileInfo>;
}
```

```typescript
/**
 * File Operations
 * Handles copying ROMs and media files to the output folder
 */

import fs from "fs/promises";
import path from "path";
import type { Config, RomDestination, MediaType, RomEntry, MediaFileInfo, SizeStats } from "./types.js";
import { getOriginalMediaPath, getOutputMediaPath } from "./gamelist.js";

/** Common image extensions */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];

/** Common video extensions */
const VIDEO_EXTENSIONS = [".mp4", ".avi", ".mkv", ".webm", ".mov", ".m4v"];

/** Common manual extensions */
const MANUAL_EXTENSIONS = [".pdf"];

/**
 * Get file size in bytes, returns 0 if file doesn't exist
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

/**
 * Create empty size stats
 */
export function emptySizeStats(): SizeStats {
  return { roms: 0, images: 0, videos: 0, manual: 0, total: 0 };
}

/**
 * Add two SizeStats together
 */
export function addSizeStats(a: SizeStats, b: SizeStats): SizeStats {
  return {
    roms: a.roms + b.roms,
    images: a.images + b.images,
    videos: a.videos + b.videos,
    manual: a.manual + b.manual,
    total: a.total + b.total,
  };
}
```

```typescript
/** ROM file info from scanning */
export interface ScannedRom {
  filename: string;
  fullPath: string;
  relativePath: string;
  fileSize: number;
}

/**
 * Scan a system folder for ROMs
 */
export async function scanSystemFolder(
  systemFolder: string,
  isRomFile: (filename: string) => boolean
): Promise<{
  roms: ScannedRom[];
  collections: Map<string, ScannedRom[]>;
}> {
  const roms: ScannedRom[] = [];
  const collections = new Map<string, ScannedRom[]>();
```

```typescript
      } else if (entry.isFile() && isRomFile(entry.name)) {
        const fileSize = await getFileSize(fullPath);
        const romInfo: ScannedRom = {
          filename: entry.name,
          fullPath,
          relativePath: relPath,
          fileSize,
        };

        if (collection) {
          if (!collections.has(collection)) {
            collections.set(collection, []);
          }
          collections.get(collection)!.push(romInfo);
        } else {
          roms.push(romInfo);
        }
      }
    }
  }

  await scanDir(systemFolder, "", undefined);

  return { roms, collections };
}

/**
 * Get media file info with size for a ROM
 */
export async function getMediaFileInfo(
  rom: RomEntry,
  systemFolder: string,
  mediaType: MediaType
): Promise<MediaFileInfo | undefined> {
  const mediaPath = await getMediaFilePath(rom, systemFolder, mediaType);
  if (!mediaPath) return undefined;

  const size = await getFileSize(mediaPath);
  return { path: mediaPath, size };
}

/**
 * Calculate sizes for destinations
 */
export async function calculateDestinationSizes(
  destinations: RomDestination[],
  systemFolder: string,
  mediaTypes: MediaType[]
): Promise<void> {
  for (const dest of destinations) {
    dest.mediaFiles = new Map();

    for (const mediaType of mediaTypes) {
      const info = await getMediaFileInfo(dest.rom, systemFolder, mediaType);
      if (info) {
        dest.mediaFiles.set(mediaType, info);
      }
    }
  }
}

/**
 * Calculate size stats from destinations
 */
export function calculateSizeStats(
  destinations: RomDestination[],
  includeTypes: ("main" | "regional" | "prototype" | "collection" | "duplicate")[]
): SizeStats {
  const stats = emptySizeStats();

  for (const dest of destinations) {
    if (!includeTypes.includes(dest.type)) continue;

    // Add ROM size
    stats.roms += dest.rom.fileSize;
    stats.total += dest.rom.fileSize;

    // Add media sizes
    if (dest.mediaFiles) {
      for (const [mediaType, info] of dest.mediaFiles) {
        switch (mediaType) {
          case "images":
            stats.images += info.size;
            break;
          case "videos":
            stats.videos += info.size;
            break;
          case "manual":
            stats.manual += info.size;
            break;
        }
        stats.total += info.size;
      }
    }
  }

  return stats;
}
```

```typescript
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
```

```typescript
  return {
    filename,
    fullPath,
    relativePath,
    baseName,
    normalizedName,
    regions: [...new Set(regions)],
    languages: [...new Set(languages)],
    tags,
    revision,
    isPrototype,
    gamelistId: metadata?.id,
    metadata,
    collection,
    fileSize,
  };
}
```

```typescript
import { 
  scanSystemFolder, 
  getSystemFolders, 
  processSystemDestinations,
  calculateDestinationSizes,
  calculateSizeStats,
  emptySizeStats,
  addSizeStats,
} from "./fileOps.js";
import {
  createReportWriter,
  writeHeader,
  writeSystemStart,
  writeDestinations,
  writeSystemSummary,
  writeFinalSummary,
  writeSystemBreakdown,
  writeSizeSummary,
} from "./report.js";
import type { Config, RomEntry, SystemStats, RomDestination } from "./types.js";
```

```typescript
  if (totalRomCount === 0) {
    writer.writeLine("  No ROMs found, skipping.");
    return {
      stats: {
        system: systemName,
        totalRoms: 0,
        uniqueTitles: 0,
        kept: 0,
        regional: 0,
        prototypes: 0,
        duplicatesRemoved: 0,
        collections: 0,
        inputSize: emptySizeStats(),
        outputSize: emptySizeStats(),
      },
      destinations: [],
    };
  }
```

```typescript
  // Parse all ROMs
  const romEntries: RomEntry[] = [];

  // Parse regular ROMs
  for (const rom of roms) {
    const metadata = findMetadata(lookup, rom.relativePath, rom.filename);
    const entry = parseRomFilename(
      rom.filename,
      rom.fullPath,
      rom.relativePath,
      rom.fileSize,
      metadata
    );
    romEntries.push(entry);
  }

  // Parse collection ROMs
  for (const [collectionName, collectionRoms] of collections) {
    for (const rom of collectionRoms) {
      const metadata = findMetadata(lookup, rom.relativePath, rom.filename);
      const entry = parseRomFilename(
        rom.filename,
        rom.fullPath,
        rom.relativePath,
        rom.fileSize,
        metadata,
        collectionName
      );
      romEntries.push(entry);
    }
  }
```

```typescript
  // Deduplicate
  const { destinations, stats } = deduplicateSystem(romEntries, config);

  // Calculate media sizes for all destinations
  writer.writeLine("  Calculating file sizes...");
  await calculateDestinationSizes(destinations, inputSystemFolder, config.mediaTypes);

  // Calculate input and output sizes
  const inputSize = calculateSizeStats(destinations, ["main", "regional", "prototype", "collection", "duplicate"]);
  const outputSize = calculateSizeStats(destinations, ["main", "regional", "prototype", "collection"]);

  // Write destination details
  writeDestinations(writer, destinations, true);

  // Write system summary
  const systemStats: SystemStats = {
    system: systemName,
    ...stats,
    inputSize,
    outputSize,
  };
  writeSystemSummary(writer, systemStats);
```

```typescript
import fs from "fs/promises";
import path from "path";
import type { Config, RomDestination, SystemStats, SizeStats } from "./types.js";
import { formatBytes } from "./fileOps.js";
```

```typescript
/**
 * Write system summary
 */
export function writeSystemSummary(
  writer: ReportWriter,
  stats: SystemStats
): void {
  writer.writeLine("");
  writer.writeLine(`  Summary for ${stats.system}:`);
  writer.writeLine(`    Total ROMs: ${formatNumber(stats.totalRoms)}`);
  writer.writeLine(`    Unique titles: ${formatNumber(stats.uniqueTitles)}`);
  writer.writeLine(`    Kept: ${formatNumber(stats.kept)}`);
  writer.writeLine(`    Regional: ${formatNumber(stats.regional)}`);
  writer.writeLine(`    Prototypes: ${formatNumber(stats.prototypes)}`);
  writer.writeLine(`    Collections: ${formatNumber(stats.collections)}`);
  writer.writeLine(`    Duplicates removed: ${formatNumber(stats.duplicatesRemoved)}`);

  // Write size info
  if (stats.inputSize && stats.outputSize) {
    writer.writeLine("");
    writer.writeLine(`  Size breakdown:`);
    writer.writeLine(`    Input total:  ${formatBytes(stats.inputSize.total)}`);
    writer.writeLine(`    Output total: ${formatBytes(stats.outputSize.total)}`);
    const savings = stats.inputSize.total - stats.outputSize.total;
    const savingsPercent = stats.inputSize.total > 0
      ? ((savings / stats.inputSize.total) * 100).toFixed(1)
      : "0";
    writer.writeLine(`    Savings:      ${formatBytes(savings)} (${savingsPercent}%)`);
  }
}
```

```typescript
/**
 * Write final summary
 */
export function writeFinalSummary(
  writer: ReportWriter,
  allStats: SystemStats[],
  config: Config
): void {
  writer.writeLine("");
  writer.writeLine("=".repeat(60));
  writer.writeLine("FINAL SUMMARY");
  writer.writeLine("=".repeat(60));

  const totals = {
    systems: allStats.length,
    totalRoms: 0,
    uniqueTitles: 0,
    kept: 0,
    regional: 0,
    prototypes: 0,
    collections: 0,
    duplicatesRemoved: 0,
  };

  // Aggregate size stats
  const inputSize: SizeStats = { roms: 0, images: 0, videos: 0, manual: 0, total: 0 };
  const outputSize: SizeStats = { roms: 0, images: 0, videos: 0, manual: 0, total: 0 };

  for (const stats of allStats) {
    totals.totalRoms += stats.totalRoms;
    totals.uniqueTitles += stats.uniqueTitles;
    totals.kept += stats.kept;
    totals.regional += stats.regional;
    totals.prototypes += stats.prototypes;
    totals.collections += stats.collections;
    totals.duplicatesRemoved += stats.duplicatesRemoved;

    // Aggregate sizes
    if (stats.inputSize) {
      inputSize.roms += stats.inputSize.roms;
      inputSize.images += stats.inputSize.images;
      inputSize.videos += stats.inputSize.videos;
      inputSize.manual += stats.inputSize.manual;
      inputSize.total += stats.inputSize.total;
    }
    if (stats.outputSize) {
      outputSize.roms += stats.outputSize.roms;
      outputSize.images += stats.outputSize.images;
      outputSize.videos += stats.outputSize.videos;
      outputSize.manual += stats.outputSize.manual;
      outputSize.total += stats.outputSize.total;
    }
  }

  writer.writeLine("");
  writer.writeLine(`Systems processed: ${totals.systems}`);
  writer.writeLine(`Total ROMs scanned: ${formatNumber(totals.totalRoms)}`);
  writer.writeLine(`Unique titles: ${formatNumber(totals.uniqueTitles)}`);
  writer.writeLine("");
  writer.writeLine(`Kept (main): ${formatNumber(totals.kept)}`);
  writer.writeLine(`Regional: ${formatNumber(totals.regional)}`);
  writer.writeLine(`Prototypes: ${formatNumber(totals.prototypes)}`);
  writer.writeLine(`Collections: ${formatNumber(totals.collections)}`);
  writer.writeLine(`Duplicates removed: ${formatNumber(totals.duplicatesRemoved)}`);
  writer.writeLine("");

  const outputCount = totals.kept + totals.regional + totals.prototypes + totals.collections;
  const reduction = totals.totalRoms > 0
    ? ((totals.duplicatesRemoved / totals.totalRoms) * 100).toFixed(1)
    : "0";

  writer.writeLine(`Output ROMs: ${formatNumber(outputCount)} (${reduction}% reduction)`);

  if (config.dryRun) {
    writer.writeLine("");
    writer.writeLine("NOTE: This was a DRY RUN. No files were copied.");
    writer.writeLine("Run with dryRun: false to copy files.");
  }

  // Write detailed size summary
  writeSizeSummary(writer, inputSize, outputSize);
}

/**
 * Write detailed size summary
 */
export function writeSizeSummary(
  writer: ReportWriter,
  inputSize: SizeStats,
  outputSize: SizeStats
): void {
  writer.writeLine("");
  writer.writeLine("=".repeat(60));
  writer.writeLine("SIZE SUMMARY");
  writer.writeLine("=".repeat(60));
  writer.writeLine("");

  // Calculate savings
  const savings = inputSize.total - outputSize.total;
  const savingsPercent = inputSize.total > 0
    ? ((savings / inputSize.total) * 100).toFixed(1)
    : "0";

  // Input breakdown
  writer.writeLine("Input Size (all scanned files):");
  writer.writeLine(`  ROMs:    ${formatBytes(inputSize.roms).padStart(12)}`);
  writer.writeLine(`  Images:  ${formatBytes(inputSize.images).padStart(12)}`);
  writer.writeLine(`  Videos:  ${formatBytes(inputSize.videos).padStart(12)}`);
  writer.writeLine(`  Manuals: ${formatBytes(inputSize.manual).padStart(12)}`);
  writer.writeLine(`  ─────────────────────`);
  writer.writeLine(`  Total:   ${formatBytes(inputSize.total).padStart(12)}`);

  writer.writeLine("");

  // Output breakdown
  writer.writeLine("Output Size (files to copy):");
  writer.writeLine(`  ROMs:    ${formatBytes(outputSize.roms).padStart(12)}`);
  writer.writeLine(`  Images:  ${formatBytes(outputSize.images).padStart(12)}`);
  writer.writeLine(`  Videos:  ${formatBytes(outputSize.videos).padStart(12)}`);
  writer.writeLine(`  Manuals: ${formatBytes(outputSize.manual).padStart(12)}`);
  writer.writeLine(`  ─────────────────────`);
  writer.writeLine(`  Total:   ${formatBytes(outputSize.total).padStart(12)}`);

  writer.writeLine("");
  writer.writeLine(`Space Savings: ${formatBytes(savings)} (${savingsPercent}% reduction)`);

  // SD card compatibility hints
  writer.writeLine("");
  writer.writeLine("SD Card Compatibility:");
  const outputGB = outputSize.total / (1024 * 1024 * 1024);
  if (outputGB <= 8) {
    writer.writeLine("  [✓] Fits on 8GB SD card");
  }
  if (outputGB <= 16) {
    writer.writeLine("  [✓] Fits on 16GB SD card");
  }
  if (outputGB <= 32) {
    writer.writeLine("  [✓] Fits on 32GB SD card");
  }
  if (outputGB <= 64) {
    writer.writeLine("  [✓] Fits on 64GB SD card");
  }
  if (outputGB <= 128) {
    writer.writeLine("  [✓] Fits on 128GB SD card");
  }
  if (outputGB > 128) {
    writer.writeLine(`  [!] Requires ${Math.ceil(outputGB)}GB+ storage`);
  }
}
```

The size tracking is now working. The report shows:

- **Input Size (all scanned files)**: 10.57 GB
  - ROMs: 1016.37 MB
  - Images: 642.45 MB
  - Videos: 8.95 GB
- **Output Size (files to copy)**: 5.94 GB
  - ROMs: 676.22 MB
  - Images: 394.68 MB
  - Videos: 4.89 GB
- **Space Savings**: 4.63 GB (43.8% reduction)
- **SD Card Compatibility**: Shows which SD card sizes it will fit on

Let me update the README to document this feature:

```markdown
## Example Output

```
============================================================
ROM Deduplicator - DRY RUN
============================================================

System: gbc
  Found 2,099 ROM files
  Loaded 2,099 entries from gamelist.xml

  KEEP (main folder): 613
  REGIONAL (subfolders): 578
    Japan: 482
    Germany: 42
    France: 29
    ...
  PROTOTYPES: 65
  COLLECTIONS: 56
  DUPLICATES REMOVED: 791

  Size breakdown:
    Input total:  10.57 GB
    Output total: 5.94 GB
    Savings:      4.63 GB (43.8%)

============================================================
SIZE SUMMARY
============================================================

Input Size (all scanned files):
  ROMs:      1016.37 MB
  Images:     642.45 MB
  Videos:       8.95 GB
  Manuals:          0 B
  Total:       10.57 GB

Output Size (files to copy):
  ROMs:       676.22 MB
  Images:     394.68 MB
  Videos:       4.89 GB
  Manuals:          0 B
  Total:        5.94 GB

Space Savings: 4.63 GB (43.8% reduction)

SD Card Compatibility:
  [✓] Fits on 8GB SD card
  [✓] Fits on 16GB SD card
  [✓] Fits on 32GB SD card
```

## License

MIT
```

The size tracking feature is now complete. Here's a summary of what was added:

## New Size Tracking Features

### Report Output Now Includes:

1. **Per-System Size Breakdown**:
   - Input total size
   - Output total size  
   - Savings (bytes and percentage)

2. **Final Size Summary**:
   - Detailed breakdown by file type:
     - ROMs
     - Images
     - Videos
     - Manuals
   - Input vs Output comparison
   - Total space savings

3. **SD Card Compatibility**:
   - Shows which SD card sizes (8GB, 16GB, 32GB, 64GB, 128GB) the output will fit on

### Example from GBC system:
```
Input Size: 10.57 GB
  - ROMs:    1016.37 MB
  - Images:   642.45 MB
  - Videos:    8.95 GB

Output Size: 5.94 GB
  - ROMs:    676.22 MB
  - Images:  394.68 MB  
  - Videos:   4.89 GB

Space Savings: 4.63 GB (43.8% reduction)
Fits on: 8GB, 16GB, 32GB, 64GB, 128GB SD cards
```

This will help you determine if your deduplicated ROM set will fit on a specific SD card size for your R36S.

```plaintext
Input Size: 10.57 GB
  - ROMs:    1016.37 MB
  - Images:   642.45 MB
  - Videos:    8.95 GB

Output Size: 5.94 GB
  - ROMs:    676.22 MB
  - Images:  394.68 MB  
  - Videos:   4.89 GB

Space Savings: 4.63 GB (43.8% reduction)
Fits on: 8GB, 16GB, 32GB, 64GB, 128GB SD cards
```

