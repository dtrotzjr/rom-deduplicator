# ROM Deduplicator
Cursor Request ID: ca95f139-0c02-4583-bd77-8d2460141104

A TypeScript Node.js CLI tool that identifies duplicate ROMs across systems, keeps preferred regional/language versions, organizes non-preferred versions into regional subfolders, and generates EmulationStation-compatible gamelist.xml files with preserved metadata.

## Features

- **Smart Deduplication**: Uses gamelist.xml game IDs when available, falls back to fuzzy name matching
- **ScreenScraper Integration**: Optionally fetch metadata for games missing from gamelist.xml
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
| `screenScraper` | object | Optional ScreenScraper API configuration |

### ScreenScraper Configuration (Optional)

If ROMs are missing from your gamelist.xml, you can enable ScreenScraper API integration to fetch metadata automatically. This requires a [ScreenScraper](https://www.screenscraper.fr/) account and developer credentials.

```json
{
  "screenScraper": {
    "enabled": true,
    "devId": "your_dev_id",
    "devPassword": "your_dev_password",
    "userId": "your_screenscraper_username",
    "userPassword": "your_screenscraper_password",
    "downloadMedia": false,
    "mediaTypes": ["screenshot", "video"]
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable ScreenScraper API lookups (default: false) |
| `devId` | string | Developer ID for API access (required when enabled) |
| `devPassword` | string | Developer password for API access (required when enabled) |
| `userId` | string | Your ScreenScraper username (optional, improves rate limits) |
| `userPassword` | string | Your ScreenScraper password (optional) |
| `downloadMedia` | boolean | Download media files from ScreenScraper (default: false) |
| `mediaTypes` | string[] | Media types to download: "screenshot", "box2d", "box3d", "wheel", "video" |

**How it works:**
1. ROMs without gamelist.xml entries are identified
2. Each ROM is looked up by file hash (MD5/SHA1) for exact matching
3. If no hash match, falls back to game name search
4. Fetched metadata is used for deduplication and included in output gamelist.xml
5. If `downloadMedia` is enabled, images/videos are downloaded to the media folder

**Note:** ScreenScraper has rate limits. The tool automatically enforces delays between API calls. Large collections may take significant time to process.

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
