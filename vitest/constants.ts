import { Command } from "@commander-js/extra-typings"

import type { ConfigData } from "~/util/config"

export const relativeK1Config: ConfigData = {
  game: 1,
  languageCode: "en",
  gameRoot: "game-root",
  backupTo: "backup",
  outputTo: "output",
  manualProcessingOutput: "_NEEDS_PROCESSING",
}
export const relativeK2Config: ConfigData = {
  ...relativeK1Config,
  game: 2,
}
export const command = new Command()
