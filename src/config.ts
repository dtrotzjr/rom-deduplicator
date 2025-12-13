/**
 * Configuration Loading and Validation
 */

import fs from "fs/promises";
import path from "path";
import type { Config, MediaType, SSMediaType } from "./types.js";

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

  // Validate screenScraper config if provided
  if (config.screenScraper !== undefined) {
    const ss = config.screenScraper;
    if (typeof ss !== "object" || ss === null) {
      errors.push("screenScraper must be an object");
    } else {
      if (typeof ss.enabled !== "boolean") {
        errors.push("screenScraper.enabled must be a boolean");
      }
      if (ss.enabled) {
        if (!ss.devId || typeof ss.devId !== "string") {
          errors.push("screenScraper.devId is required when enabled");
        }
        if (!ss.devPassword || typeof ss.devPassword !== "string") {
          errors.push("screenScraper.devPassword is required when enabled");
        }
      }
      if (ss.userId !== undefined && typeof ss.userId !== "string") {
        errors.push("screenScraper.userId must be a string if provided");
      }
      if (ss.userPassword !== undefined && typeof ss.userPassword !== "string") {
        errors.push("screenScraper.userPassword must be a string if provided");
      }
      if (ss.downloadMedia !== undefined && typeof ss.downloadMedia !== "boolean") {
        errors.push("screenScraper.downloadMedia must be a boolean if provided");
      }
      const validSSMediaTypes: SSMediaType[] = ["screenshot", "box2d", "box3d", "wheel", "video"];
      if (ss.mediaTypes !== undefined) {
        if (!Array.isArray(ss.mediaTypes) || !ss.mediaTypes.every((m: any) => validSSMediaTypes.includes(m))) {
          errors.push('screenScraper.mediaTypes must be an array containing "screenshot", "box2d", "box3d", "wheel", and/or "video"');
        }
      }
    }
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
