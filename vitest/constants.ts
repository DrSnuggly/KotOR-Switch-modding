import { Command } from "@commander-js/extra-typings"

import { configData } from "../src/util/config"

export const relativeK1Config: configData = {
  game: 1,
  languageCode: "en",
  gameRoot: "game-root",
  backupTo: "backup",
  outputTo: "output",
  manualProcessingOutput: "_NEEDS_PROCESSING",
}
export const relativeK2Config: configData = {
  ...relativeK1Config,
  game: 2,
}
export const command = new Command()
