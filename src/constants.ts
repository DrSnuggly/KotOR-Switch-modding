// Nintendo Switch title ID for game port
// directories to bundled into executable
import path from "node:path"

// console, ignore this section since we can't test it very well
/* c8 ignore start */
let consoleWidth = process.stdout.columns || 80
export const wrapOptions = { width: consoleWidth, indent: "" }
// update consoleWidth when the terminal is resized
process.stdout.on("resize", () => {
  consoleWidth = process.stdout.columns || 80
})
/* c8 ignore end */

// file hashes
// noinspection SpellCheckingInspection
export const k1FileHashes: { [key: string]: string } = {
  "dialog.tlk": "c83b5b5f5ea8941a767b6364049b2108ef576928",
  "swplayer.ini": "507105bc491dec3edf7374052b87fdabe44b0636",
}
// noinspection SpellCheckingInspection
export const k2FileHashes: { [key: string]: string } = {
  "dialog.tlk": "c83b5b5f5ea8941a767b6364049b2108ef576928",
  "swplayer.ini": "507105bc491dec3edf7374052b87fdabe44b0636",
}

// game-specific items
// this stupid relative path is needed to be able to read the assets directory
// in the executable and/or the built package
export const assetsDir = path.join(__dirname, "..", "..", "assets")
export const k1TitleId = "0100854015868800"
export const k2TitleId = "0100B2C016252000"
export const k1AssetsDir = `${assetsDir}/k1`
export const k2AssetsDir = `${assetsDir}/k2`

// files
export const finalizedCanaryFileName = ".finalized"

// other
export const languageCodes = ["en", "ja", "it", "fr", "de", "es"]

// exit codes
export const CONFIG_FILE_MISSING = 1
export const ALREADY_FINALIZED = 2
export const INVALID_INPUT = 3
export const FILE_SYSTEM_ERROR = 4
export const BACKUP_ALREADY_EXISTS = 5
export const UNSUPPORTED_LANGUAGE = 6
