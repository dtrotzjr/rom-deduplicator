/**
 * TypeScript interfaces for ROM Deduplicator
 */

/** Media types that can be copied */
export type MediaType = "images" | "videos" | "manual";

/** ScreenScraper media types */
export type SSMediaType = "screenshot" | "box2d" | "box3d" | "wheel" | "video";

/** ScreenScraper API configuration */
export interface ScreenScraperConfig {
  /** Enable ScreenScraper API lookups for missing games */
  enabled: boolean;
  /** Developer ID for API access */
  devId: string;
  /** Developer password for API access */
  devPassword: string;
  /** User ID (ScreenScraper account) */
  userId?: string;
  /** User password (ScreenScraper account) */
  userPassword?: string;
  /** Download media files from ScreenScraper */
  downloadMedia?: boolean;
  /** Which media types to download */
  mediaTypes?: SSMediaType[];
}

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
  /** Optional ScreenScraper API configuration */
  screenScraper?: ScreenScraperConfig;
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
  /** Is this a hack/pirate/bootleg/fan translation? */
  isHack: boolean;
  /** Game ID from gamelist.xml */
  gamelistId?: string;
  /** Full metadata from gamelist.xml */
  metadata?: GameMetadata;
  /** Source collection/subfolder if from a special folder */
  collection?: string;
  /** File size in bytes */
  fileSize: number;
}

/** Result of deduplication for a single game group */
export interface DeduplicationResult {
  /** The winning ROM to keep in main folder */
  winner: RomEntry;
  /** ROMs grouped by region for regional subfolders */
  regional: Map<string, RomEntry[]>;
  /** Prototype/beta/demo ROMs */
  prototypes: RomEntry[];
  /** Hack/pirate/bootleg ROMs */
  hacks: RomEntry[];
  /** ROMs that are pure duplicates to be removed */
  duplicates: RomEntry[];
}

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
  /** Hacks/pirates/bootlegs */
  hacks: number;
  /** Pure duplicates removed */
  duplicatesRemoved: number;
  /** ROMs from collections */
  collections: number;
  /** Size of input files */
  inputSize: SizeStats;
  /** Size of output files (projected) */
  outputSize: SizeStats;
}

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
  type: "main" | "regional" | "prototype" | "hack" | "collection" | "duplicate";
  /** Relative output path from system folder */
  outputPath: string;
  /** Region folder name (for regional type) */
  regionFolder?: string;
  /** Collection name (for collection type) */
  collectionName?: string;
  /** Associated media files with sizes */
  mediaFiles?: Map<MediaType, MediaFileInfo>;
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

/** ScreenScraper usage statistics */
export interface ScreenScraperStats {
  /** Whether ScreenScraper was enabled */
  enabled: boolean;
  /** Total ROMs looked up */
  lookupsAttempted: number;
  /** Successful lookups (metadata found) */
  lookupsSuccessful: number;
  /** Total media files downloaded */
  mediaDownloaded: number;
  /** User level (0=guest, 1=member, etc.) */
  userLevel: number;
  /** Level name (Guest, Member, etc.) */
  userLevelName: string;
  /** Maximum requests allowed per day */
  maxRequestsPerDay: number;
  /** Requests used today */
  requestsUsed: number;
  /** Maximum concurrent threads allowed */
  maxThreads: number;
}
