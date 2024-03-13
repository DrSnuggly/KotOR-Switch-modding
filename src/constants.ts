import type wrap from "word-wrap"

// console, ignore this section since we can't test it very well
/* c8 ignore start */
let consoleWidth = process.stdout.columns || 80
export const wrapOptions = {
  width: consoleWidth,
  indent: "",
} satisfies wrap.IOptions
// update consoleWidth when the terminal is resized
process.stdout.on("resize", () => {
  consoleWidth = process.stdout.columns || 80
})
/* c8 ignore end */

// files
export const finalizedCanaryFileName = ".finalized"

// exit codes
export const ALREADY_FINALIZED = 1
export const INVALID_INPUT = 2
export const FILE_SYSTEM_ERROR = 3
export const BACKUP_ALREADY_EXISTS = 4
