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
