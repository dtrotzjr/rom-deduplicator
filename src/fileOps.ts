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
  includeTypes: ("main" | "regional" | "prototype" | "hack" | "collection" | "duplicate")[]
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
