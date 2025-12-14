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
import { fetchGameData, getSystemId } from "./screenscraper.js";
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
        hacks: 0,
        duplicatesRemoved: 0,
        collections: 0,
        inputSize: emptySizeStats(),
        outputSize: emptySizeStats(),
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

  // Check if ScreenScraper is enabled and system is supported
  const ssConfig = config.screenScraper;
  const ssEnabled = ssConfig?.enabled && getSystemId(systemName) !== undefined;
  const missingMetadataRoms: { rom: typeof roms[0]; entry: RomEntry }[] = [];

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
    
    // Track ROMs without metadata for potential ScreenScraper lookup
    if (!metadata && ssEnabled) {
      missingMetadataRoms.push({ rom, entry });
    }
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
      
      // Track ROMs without metadata for potential ScreenScraper lookup
      if (!metadata && ssEnabled) {
        missingMetadataRoms.push({ rom, entry });
      }
    }
  }

  // Fetch metadata from ScreenScraper for ROMs missing from gamelist.xml
  if (ssEnabled && missingMetadataRoms.length > 0) {
    writer.writeLine(`  Looking up ${missingMetadataRoms.length} ROMs on ScreenScraper...`);
    
    let found = 0;
    let mediaDownloaded = 0;
    
    for (let i = 0; i < missingMetadataRoms.length; i++) {
      const { rom, entry } = missingMetadataRoms[i];
      
      // Progress update every 10 ROMs
      if ((i + 1) % 10 === 0 || i === missingMetadataRoms.length - 1) {
        process.stdout.write(`\r    Progress: ${i + 1}/${missingMetadataRoms.length}`);
      }
      
      try {
        const mediaOutputDir = path.join(inputSystemFolder, "media");
        const result = await fetchGameData(
          ssConfig!,
          systemName,
          rom.fullPath,
          rom.filename,
          mediaOutputDir
        );
        
        if (result.metadata) {
          // Update the ROM entry with fetched metadata
          entry.metadata = result.metadata;
          entry.gamelistId = result.metadata.id;
          found++;
          
          if (result.downloadedMedia.length > 0) {
            mediaDownloaded += result.downloadedMedia.length;
          }
        }
      } catch (error) {
        // Continue on error, just skip this ROM
      }
    }
    
    writer.writeLine(""); // New line after progress
    writer.writeLine(`  ScreenScraper: Found ${found}/${missingMetadataRoms.length} games, downloaded ${mediaDownloaded} media files`);
  }

  // Deduplicate
  const { destinations, stats } = deduplicateSystem(romEntries, config);

  // Calculate media sizes for all destinations
  writer.writeLine("  Calculating file sizes...");
  await calculateDestinationSizes(destinations, inputSystemFolder, config.mediaTypes);

  // Calculate input and output sizes
  const inputSize = calculateSizeStats(destinations, ["main", "regional", "prototype", "hack", "collection", "duplicate"]);
  const outputSize = calculateSizeStats(destinations, ["main", "regional", "prototype", "hack", "collection"]);

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
