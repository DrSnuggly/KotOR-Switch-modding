import type { ConfigData } from "~/steps/util/config"

export const relativeK1Config: ConfigData = {
  kotor: 1,
  languageCode: "en",
  gameRoot: "game-root",
  backupTo: "backup",
  outputTo: "output",
  needsProcessingTo: "_NEEDS_PROCESSING",
}
export const relativeK2Config: ConfigData = {
  ...relativeK1Config,
  kotor: 2,
}
