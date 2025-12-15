/**
 * ScreenScraper API Client
 * Fetches game metadata and media for ROMs not found in gamelist.xml
 */

import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import crypto from "crypto";
import type { ScreenScraperConfig, GameMetadata, SSMediaType } from "./types.js";

/** Base URL for ScreenScraper API */
const API_BASE = "https://api.screenscraper.fr/api2";

/** Quota and rate limiting state */
interface QuotaState {
  /** Maximum requests allowed per day */
  maxRequestsPerDay: number;
  /** Requests made today */
  requestsToday: number;
  /** Maximum concurrent threads allowed */
  maxThreads: number;
  /** Current active requests */
  activeRequests: number;
  /** Minimum delay between requests (ms) - based on user level */
  minDelay: number;
  /** Last API call timestamp */
  lastApiCall: number;
  /** User level (0=guest, 1=member, 2=contributor, etc.) */
  userLevel: number;
  /** Whether quota has been initialized from API response */
  initialized: boolean;
}

/** Default quota state (conservative for unregistered users) */
const quotaState: QuotaState = {
  maxRequestsPerDay: 50,      // Very conservative default
  requestsToday: 0,
  maxThreads: 1,              // Single thread for guests
  activeRequests: 0,
  minDelay: 1200,             // Conservative 1.2s for guests
  lastApiCall: 0,
  userLevel: 0,
  initialized: false,
};

/** Queue for pending requests when at thread limit */
const requestQueue: Array<() => void> = [];

/**
 * Get current quota state (for external monitoring)
 */
export function getQuotaState(): Readonly<QuotaState> {
  return { ...quotaState };
}

/**
 * Check if we're close to or at the daily limit
 */
export function isNearQuotaLimit(buffer: number = 10): boolean {
  return quotaState.requestsToday >= quotaState.maxRequestsPerDay - buffer;
}

/**
 * Get remaining requests for today
 */
export function getRemainingRequests(): number {
  return Math.max(0, quotaState.maxRequestsPerDay - quotaState.requestsToday);
}

/**
 * Get a human-readable quota status string
 */
export function getQuotaStatusString(): string {
  const remaining = getRemainingRequests();
  const threads = quotaState.maxThreads;
  const delay = quotaState.minDelay;
  const level = quotaState.userLevel;
  
  const levelNames = ["Guest", "Member", "Contributor", "Active Contributor", "Super Contributor", "VIP"];
  const levelName = levelNames[level] || `Level ${level}`;
  
  return `ScreenScraper: ${levelName} | ${remaining}/${quotaState.maxRequestsPerDay} requests remaining | ${threads} thread(s) | ${delay}ms delay`;
}

/**
 * Reset quota state (for testing or new session)
 */
export function resetQuotaState(): void {
  quotaState.initialized = false;
  quotaState.activeRequests = 0;
  quotaState.lastApiCall = 0;
  requestQueue.length = 0;
}

/** System name to ScreenScraper system ID mapping */
const SYSTEM_ID_MAP: Record<string, number> = {
  // Nintendo
  "nes": 3,
  "famicom": 3,
  "fds": 106,
  "snes": 4,
  "n64": 14,
  "gb": 9,
  "gbc": 10,
  "gba": 12,
  "nds": 15,
  "3ds": 17,
  "virtualboy": 11,
  "gamecube": 13,
  "wii": 16,
  "wiiu": 18,
  "switch": 225,
  // Sega
  "mastersystem": 2,
  "genesis": 1,
  "megadrive": 1,
  "gamegear": 21,
  "sega32x": 19,
  "segacd": 20,
  "saturn": 22,
  "dreamcast": 23,
  // Sony
  "psx": 57,
  "ps2": 58,
  "ps3": 59,
  "psp": 61,
  "psvita": 62,
  // Atari
  "atari2600": 26,
  "atari5200": 40,
  "atari7800": 41,
  "atarilynx": 28,
  "atarijaguar": 27,
  // Other
  "arcade": 75,
  "mame": 75,
  "fba": 75,
  "neogeo": 142,
  "pcengine": 31,
  "tg16": 31,
  "turbografx16": 31,
  "supergrafx": 105,
  "ngpc": 82,
  "ngp": 25,
  "wonderswan": 45,
  "wonderswancolor": 46,
  "colecovision": 48,
  "intellivision": 115,
  "msx": 113,
  "msx2": 116,
  "zxspectrum": 76,
  "amstradcpc": 65,
  "c64": 66,
  "amiga": 64,
  "scummvm": 123,
  "dos": 135,
};

/**
 * Get ScreenScraper system ID from system folder name
 */
export function getSystemId(systemName: string): number | undefined {
  const normalized = systemName.toLowerCase().replace(/[-_\s]/g, "");
  return SYSTEM_ID_MAP[normalized];
}

/**
 * Calculate MD5 and SHA1 hashes for a file
 */
export async function calculateHashes(filePath: string): Promise<{ md5: string; sha1: string; size: number }> {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash("md5");
    const sha1 = crypto.createHash("sha1");
    let size = 0;

    const stream = createReadStream(filePath);
    
    stream.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      md5.update(buffer);
      sha1.update(buffer);
      size += buffer.length;
    });

    stream.on("end", () => {
      resolve({
        md5: md5.digest("hex"),
        sha1: sha1.digest("hex"),
        size,
      });
    });

    stream.on("error", reject);
  });
}

/**
 * Update quota state from API response
 */
function updateQuotaFromResponse(data: any): void {
  // ScreenScraper returns user info in the response
  const ssuser = data?.response?.ssuser;
  if (!ssuser) return;

  // Update quota state from response
  if (ssuser.maxrequestsperday !== undefined) {
    quotaState.maxRequestsPerDay = parseInt(ssuser.maxrequestsperday, 10) || quotaState.maxRequestsPerDay;
  }
  if (ssuser.requeststoday !== undefined) {
    quotaState.requestsToday = parseInt(ssuser.requeststoday, 10) || 0;
  }
  if (ssuser.maxthreads !== undefined) {
    quotaState.maxThreads = parseInt(ssuser.maxthreads, 10) || 1;
  }
  if (ssuser.niveau !== undefined) {
    quotaState.userLevel = parseInt(ssuser.niveau, 10) || 0;
  }

  // Adjust rate limit based on user level and thread count
  // Higher level users can make faster requests
  if (quotaState.maxThreads >= 4) {
    quotaState.minDelay = 100;   // VIP/high donors - very fast
  } else if (quotaState.maxThreads >= 2) {
    quotaState.minDelay = 300;   // Donors - fast
  } else if (quotaState.userLevel >= 1) {
    quotaState.minDelay = 500;   // Registered members
  } else {
    quotaState.minDelay = 1200;  // Guests - conservative
  }

  quotaState.initialized = true;
}

/**
 * Wait for a request slot (respects thread limits)
 */
async function acquireRequestSlot(): Promise<void> {
  // If under thread limit, proceed
  if (quotaState.activeRequests < quotaState.maxThreads) {
    quotaState.activeRequests++;
    return;
  }

  // Wait for a slot to free up
  return new Promise((resolve) => {
    requestQueue.push(() => {
      quotaState.activeRequests++;
      resolve();
    });
  });
}

/**
 * Release a request slot
 */
function releaseRequestSlot(): void {
  quotaState.activeRequests--;
  
  // Process next queued request if any
  const next = requestQueue.shift();
  if (next) {
    next();
  }
}

/**
 * Enforce rate limiting between API calls
 */
async function rateLimit(): Promise<void> {
  // Check quota before making request
  if (isNearQuotaLimit(5)) {
    console.warn(`ScreenScraper: Near daily quota limit (${quotaState.requestsToday}/${quotaState.maxRequestsPerDay})`);
  }

  // Wait for request slot (thread limiting)
  await acquireRequestSlot();

  // Enforce minimum delay between requests
  const now = Date.now();
  const elapsed = now - quotaState.lastApiCall;
  if (elapsed < quotaState.minDelay) {
    await new Promise((resolve) => setTimeout(resolve, quotaState.minDelay - elapsed));
  }
  quotaState.lastApiCall = Date.now();
}

/**
 * Build API URL with authentication parameters
 */
function buildApiUrl(
  endpoint: string,
  config: ScreenScraperConfig,
  params: Record<string, string | number>
): string {
  const url = new URL(`${API_BASE}/${endpoint}`);
  
  // Add developer credentials
  url.searchParams.set("devid", config.devId);
  url.searchParams.set("devpassword", config.devPassword);
  url.searchParams.set("softname", "rom-deduplicator");
  
  // Add user credentials if provided
  if (config.userId && config.userPassword) {
    url.searchParams.set("ssid", config.userId);
    url.searchParams.set("sspassword", config.userPassword);
  }
  
  // Add output format
  url.searchParams.set("output", "json");
  
  // Add additional parameters
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  
  return url.toString();
}

/**
 * API response structure for game info
 */
interface SSGameResponse {
  response?: {
    jeu?: SSGame;
  };
  error?: string;
}

interface SSGame {
  id: string;
  noms?: Array<{ region?: string; text?: string }>;
  synopsis?: Array<{ langue?: string; text?: string }>;
  note?: { text?: string };
  dates?: Array<{ region?: string; text?: string }>;
  developpeur?: { text?: string };
  editeur?: { text?: string };
  genres?: Array<{ noms?: Array<{ langue?: string; text?: string }> }>;
  joueurs?: { text?: string };
  medias?: Array<{
    type?: string;
    region?: string;
    format?: string;
    url?: string;
  }>;
}

/**
 * Parse ScreenScraper game response into GameMetadata
 */
function parseGameResponse(game: SSGame, preferredRegion: string = "us"): GameMetadata {
  const metadata: GameMetadata = {
    id: game.id,
    source: "ScreenScraper.fr",
    path: "",
  };

  // Get name (prefer USA/World, then any)
  if (game.noms && game.noms.length > 0) {
    const usName = game.noms.find((n) => n.region?.toLowerCase() === "us" || n.region?.toLowerCase() === "wor");
    const euName = game.noms.find((n) => n.region?.toLowerCase() === "eu");
    const anyName = game.noms[0];
    metadata.name = usName?.text || euName?.text || anyName?.text;
  }

  // Get description (prefer English)
  if (game.synopsis && game.synopsis.length > 0) {
    const enDesc = game.synopsis.find((s) => s.langue?.toLowerCase() === "en");
    const anyDesc = game.synopsis[0];
    metadata.desc = enDesc?.text || anyDesc?.text;
  }

  // Get rating (convert from 0-20 to 0-1)
  if (game.note?.text) {
    const rating = parseFloat(game.note.text);
    if (!isNaN(rating)) {
      metadata.rating = (rating / 20).toFixed(2);
    }
  }

  // Get release date (prefer USA)
  if (game.dates && game.dates.length > 0) {
    const usDate = game.dates.find((d) => d.region?.toLowerCase() === "us" || d.region?.toLowerCase() === "wor");
    const anyDate = game.dates[0];
    const dateStr = usDate?.text || anyDate?.text;
    if (dateStr) {
      // Convert YYYY-MM-DD to YYYYMMDDTHHMMSS format
      metadata.releasedate = dateStr.replace(/-/g, "") + "T000000";
    }
  }

  // Get developer
  if (game.developpeur?.text) {
    metadata.developer = game.developpeur.text;
  }

  // Get publisher
  if (game.editeur?.text) {
    metadata.publisher = game.editeur.text;
  }

  // Get genre (prefer English)
  if (game.genres && game.genres.length > 0 && game.genres[0].noms) {
    const enGenre = game.genres[0].noms.find((g) => g.langue?.toLowerCase() === "en");
    const anyGenre = game.genres[0].noms[0];
    metadata.genre = enGenre?.text || anyGenre?.text;
  }

  // Get players
  if (game.joueurs?.text) {
    metadata.players = game.joueurs.text;
  }

  return metadata;
}

/**
 * Find media URL from game response
 */
function findMediaUrl(
  game: SSGame,
  mediaType: SSMediaType,
  preferredRegion: string = "us"
): string | undefined {
  if (!game.medias) return undefined;

  // Map our media types to ScreenScraper media types
  const ssTypeMap: Record<SSMediaType, string[]> = {
    screenshot: ["ss", "sstitle"],
    box2d: ["box-2D", "box-2D-front"],
    box3d: ["box-3D"],
    wheel: ["wheel", "wheel-hd"],
    video: ["video", "video-normalized"],
  };

  const ssTypes = ssTypeMap[mediaType] || [];
  
  // First try to find media matching preferred region
  for (const ssType of ssTypes) {
    const media = game.medias.find(
      (m) => m.type === ssType && (m.region?.toLowerCase() === preferredRegion || m.region?.toLowerCase() === "wor")
    );
    if (media?.url) return media.url;
  }

  // Fall back to any region
  for (const ssType of ssTypes) {
    const media = game.medias.find((m) => m.type === ssType && m.url);
    if (media?.url) return media.url;
  }

  return undefined;
}

/**
 * Lookup game by ROM hash
 */
export async function lookupByHash(
  config: ScreenScraperConfig,
  systemId: number,
  md5: string,
  sha1: string,
  romSize: number,
  romFileName: string
): Promise<{ metadata: GameMetadata; game: SSGame } | null> {
  // Check if we're at quota limit
  if (getRemainingRequests() <= 0) {
    console.warn("ScreenScraper: Daily quota exhausted, skipping lookup");
    return null;
  }

  await rateLimit();

  const url = buildApiUrl("jeuInfos.php", config, {
    systemeid: systemId,
    md5: md5,
    sha1: sha1,
    romtaille: romSize,
    romnom: romFileName,
  });

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      releaseRequestSlot();
      if (response.status === 404) {
        // Game not found
        return null;
      }
      if (response.status === 430 || response.status === 429) {
        // Too many requests - increase delay
        quotaState.minDelay = Math.min(quotaState.minDelay * 2, 5000);
        console.warn(`ScreenScraper: Rate limited, increasing delay to ${quotaState.minDelay}ms`);
        return null;
      }
      throw new Error(`ScreenScraper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as SSGameResponse;
    
    // Update quota state from response
    updateQuotaFromResponse(data);
    releaseRequestSlot();
    
    if (data.error || !data.response?.jeu) {
      return null;
    }

    const game = data.response.jeu;
    const metadata = parseGameResponse(game);
    
    return { metadata, game };
  } catch (error) {
    releaseRequestSlot();
    // Network error or parsing error - return null to allow fallback
    console.error(`ScreenScraper lookup error: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Search for game by name
 */
export async function lookupByName(
  config: ScreenScraperConfig,
  systemId: number,
  gameName: string
): Promise<{ metadata: GameMetadata; game: SSGame } | null> {
  // Check if we're at quota limit
  if (getRemainingRequests() <= 0) {
    return null;
  }

  await rateLimit();

  // Clean up game name for search
  const searchName = gameName
    .replace(/\([^)]*\)/g, "") // Remove parenthetical tags
    .replace(/\[[^\]]*\]/g, "") // Remove bracket tags
    .replace(/\s+/g, " ")
    .trim();

  const url = buildApiUrl("jeuRecherche.php", config, {
    systemeid: systemId,
    recherche: searchName,
  });

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      releaseRequestSlot();
      if (response.status === 404) {
        return null;
      }
      if (response.status === 430 || response.status === 429) {
        quotaState.minDelay = Math.min(quotaState.minDelay * 2, 5000);
        return null;
      }
      throw new Error(`ScreenScraper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { response?: { ssuser?: any; jeux?: Array<{ id: string }> } };
    
    // Update quota from response
    updateQuotaFromResponse(data);
    releaseRequestSlot();
    
    // Search returns a list, get the first match
    const games = data.response?.jeux;
    if (!games || games.length === 0) {
      return null;
    }

    // Get detailed info for the first match
    const gameId = games[0].id;
    return await lookupById(config, gameId);
  } catch (error) {
    releaseRequestSlot();
    console.error(`ScreenScraper search error: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Get game info by ID
 */
async function lookupById(
  config: ScreenScraperConfig,
  gameId: string
): Promise<{ metadata: GameMetadata; game: SSGame } | null> {
  // Check if we're at quota limit
  if (getRemainingRequests() <= 0) {
    return null;
  }

  await rateLimit();

  const url = buildApiUrl("jeuInfos.php", config, {
    gameid: gameId,
  });

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      releaseRequestSlot();
      if (response.status === 430 || response.status === 429) {
        quotaState.minDelay = Math.min(quotaState.minDelay * 2, 5000);
      }
      return null;
    }

    const data = await response.json() as SSGameResponse;
    
    // Update quota from response
    updateQuotaFromResponse(data);
    releaseRequestSlot();
    
    if (data.error || !data.response?.jeu) {
      return null;
    }

    const game = data.response.jeu;
    const metadata = parseGameResponse(game);
    
    return { metadata, game };
  } catch (error) {
    releaseRequestSlot();
    return null;
  }
}

/**
 * Download a media file
 */
export async function downloadMedia(
  url: string,
  outputPath: string
): Promise<boolean> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return false;
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write file
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    
    return true;
  } catch (error) {
    console.error(`Failed to download media: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Get media extension from URL or format
 */
function getMediaExtension(url: string, format?: string): string {
  if (format) {
    return `.${format.toLowerCase()}`;
  }
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? `.${match[1].toLowerCase()}` : ".png";
}

/**
 * Batch process multiple ROMs in parallel (respecting thread limits)
 */
export async function fetchGameDataBatch(
  config: ScreenScraperConfig,
  systemName: string,
  roms: Array<{ romPath: string; romFileName: string }>,
  mediaOutputDir: string,
  onProgress?: (completed: number, total: number, found: number) => void
): Promise<Map<string, { metadata: GameMetadata | null; downloadedMedia: { type: SSMediaType; path: string }[] }>> {
  const results = new Map<string, { metadata: GameMetadata | null; downloadedMedia: { type: SSMediaType; path: string }[] }>();
  
  let completed = 0;
  let found = 0;

  // Process ROMs in parallel batches based on thread limit
  const processBatch = async (batch: typeof roms) => {
    const promises = batch.map(async ({ romPath, romFileName }) => {
      const result = await fetchGameData(config, systemName, romPath, romFileName, mediaOutputDir);
      
      completed++;
      if (result.metadata) found++;
      
      if (onProgress) {
        onProgress(completed, roms.length, found);
      }
      
      results.set(romFileName, result);
      return result;
    });
    
    await Promise.all(promises);
  };

  // Process in batches of maxThreads size
  const batchSize = Math.max(1, quotaState.maxThreads);
  for (let i = 0; i < roms.length; i += batchSize) {
    // Check quota before each batch
    if (getRemainingRequests() <= 0) {
      console.warn(`ScreenScraper: Stopping batch - daily quota exhausted (${completed}/${roms.length} processed)`);
      break;
    }
    
    const batch = roms.slice(i, i + batchSize);
    await processBatch(batch);
  }

  return results;
}

/**
 * Fetch metadata and optionally download media for a ROM
 */
export async function fetchGameData(
  config: ScreenScraperConfig,
  systemName: string,
  romPath: string,
  romFileName: string,
  mediaOutputDir: string
): Promise<{
  metadata: GameMetadata | null;
  downloadedMedia: { type: SSMediaType; path: string }[];
}> {
  const result: {
    metadata: GameMetadata | null;
    downloadedMedia: { type: SSMediaType; path: string }[];
  } = {
    metadata: null,
    downloadedMedia: [],
  };

  // Get system ID
  const systemId = getSystemId(systemName);
  if (!systemId) {
    return result;
  }

  // Calculate hashes
  let hashes: { md5: string; sha1: string; size: number };
  try {
    hashes = await calculateHashes(romPath);
  } catch (error) {
    console.error(`Failed to calculate hash for ${romFileName}: ${(error as Error).message}`);
    return result;
  }

  // Try hash lookup first
  let gameResult = await lookupByHash(
    config,
    systemId,
    hashes.md5,
    hashes.sha1,
    hashes.size,
    romFileName
  );

  // Log quota status after first API call (when initialized)
  if (quotaState.initialized && quotaState.requestsToday === 1) {
    console.log(`  ${getQuotaStatusString()}`);
  }

  // Fall back to name search
  if (!gameResult) {
    const baseName = romFileName.replace(/\.[^.]+$/, "");
    gameResult = await lookupByName(config, systemId, baseName);
  }

  if (!gameResult) {
    return result;
  }

  result.metadata = gameResult.metadata;

  // Download media if enabled
  if (config.downloadMedia && config.mediaTypes && config.mediaTypes.length > 0) {
    const romBaseName = romFileName.replace(/\.[^.]+$/, "");

    for (const mediaType of config.mediaTypes) {
      const mediaUrl = findMediaUrl(gameResult.game, mediaType);
      if (!mediaUrl) continue;

      // Determine output subdirectory based on media type
      let subDir: string;
      let ext: string;
      
      if (mediaType === "video") {
        subDir = "videos";
        ext = ".mp4";
      } else {
        subDir = "images";
        ext = getMediaExtension(mediaUrl);
      }

      const outputPath = path.join(mediaOutputDir, subDir, `${romBaseName}${ext}`);
      
      const success = await downloadMedia(mediaUrl, outputPath);
      if (success) {
        result.downloadedMedia.push({ type: mediaType, path: outputPath });
        
        // Update metadata with media path
        const relativePath = `./${path.posix.join("media", subDir, `${romBaseName}${ext}`)}`;
        if (mediaType === "video") {
          result.metadata!.video = relativePath;
        } else {
          result.metadata!.image = relativePath;
        }
      }
    }
  }

  return result;
}

