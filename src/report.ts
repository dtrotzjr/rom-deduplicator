/**
 * Report Generation
 * Handles outputting results to console or file
 */

import fs from "fs/promises";
import path from "path";
import type { Config, RomDestination, SystemStats, SizeStats, ScreenScraperStats } from "./types.js";
import { formatBytes } from "./fileOps.js";

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
  const hacks = destinations.filter((d) => d.type === "hack");
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

  // Write HACKS section
  if (hacks.length > 0) {
    writer.writeLine("");
    writer.writeLine(`  HACKS/PIRATES: ${formatNumber(hacks.length)}`);
    if (verbose) {
      for (const dest of hacks.slice(0, 10)) {
        writer.writeLine(`    - ${dest.rom.filename}`);
      }
      if (hacks.length > 10) {
        writer.writeLine(`    ... and ${hacks.length - 10} more`);
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
  writer.writeLine(`    Hacks/Pirates: ${formatNumber(stats.hacks)}`);
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
    hacks: 0,
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
    totals.hacks += stats.hacks;
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
  writer.writeLine(`Hacks/Pirates: ${formatNumber(totals.hacks)}`);
  writer.writeLine(`Collections: ${formatNumber(totals.collections)}`);
  writer.writeLine(`Duplicates removed: ${formatNumber(totals.duplicatesRemoved)}`);
  writer.writeLine("");

  const outputCount = totals.kept + totals.regional + totals.prototypes + totals.hacks + totals.collections;
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
        `Hacks: ${stats.hacks.toString().padStart(4)}, ` +
        `Removed: ${stats.duplicatesRemoved.toString().padStart(5)}`
    );
  }
}

/**
 * Write ScreenScraper statistics
 */
export function writeScreenScraperStats(
  writer: ReportWriter,
  stats: ScreenScraperStats
): void {
  writer.writeLine("");
  writer.writeLine("=".repeat(60));
  writer.writeLine("SCREENSCRAPER STATISTICS");
  writer.writeLine("=".repeat(60));
  writer.writeLine("");

  if (!stats.enabled) {
    writer.writeLine("ScreenScraper: Disabled");
    return;
  }

  // User level and account info
  writer.writeLine(`Account Level: ${stats.userLevelName}`);
  writer.writeLine(`Max Threads: ${stats.maxThreads}`);
  writer.writeLine("");

  // Lookup statistics
  writer.writeLine("API Usage:");
  writer.writeLine(`  Lookups attempted: ${formatNumber(stats.lookupsAttempted)}`);
  writer.writeLine(`  Lookups successful: ${formatNumber(stats.lookupsSuccessful)}`);
  
  const successRate = stats.lookupsAttempted > 0
    ? ((stats.lookupsSuccessful / stats.lookupsAttempted) * 100).toFixed(1)
    : "0";
  writer.writeLine(`  Success rate: ${successRate}%`);
  writer.writeLine("");

  // Media downloads
  writer.writeLine(`  Media files downloaded: ${formatNumber(stats.mediaDownloaded)}`);
  writer.writeLine("");

  // Quota information
  writer.writeLine("Daily Quota:");
  const remaining = Math.max(0, stats.maxRequestsPerDay - stats.requestsUsed);
  const usedPercent = stats.maxRequestsPerDay > 0
    ? ((stats.requestsUsed / stats.maxRequestsPerDay) * 100).toFixed(1)
    : "0";
  writer.writeLine(`  Requests used: ${formatNumber(stats.requestsUsed)} / ${formatNumber(stats.maxRequestsPerDay)} (${usedPercent}%)`);
  writer.writeLine(`  Requests remaining: ${formatNumber(remaining)}`);
}
