import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import type { ConfigData } from "~/steps/util/config"

const staticKeys = ["kotor", "languageCode"] as const
type StaticKeys = keyof Pick<ConfigData, (typeof staticKeys)[number]>
type Resolver<T> = (tempDirPath: string) => T
type Resolvables = {
  [K in keyof Omit<ConfigData, StaticKeys>]:
    | ConfigData[K]
    | Resolver<ConfigData[K]>
}
export type ResolvableConfigData = Pick<ConfigData, StaticKeys> & Resolvables

export function writeConfigFile(config: ResolvableConfigData) {
  const tempDirPath = temporaryDirectory()
  const configFile = path.join(tempDirPath, "config.json")

  // resolve config
  const clonedConfig = structuredClone(config)
  for (const key in config) {
    // skip unresolvable keys
    if (staticKeys.includes(key as StaticKeys)) continue
    const typedKey = key as keyof Resolvables

    // check if it's a resolver
    if (typeof config[typedKey] === "function") {
      // resolve it
      clonedConfig[typedKey] = (
        config[typedKey] as Resolver<keyof Resolvables>
      )(tempDirPath)
    }
  }

  fse.writeJSONSync(configFile, config)
  return { tempDirPath, configFile, resolvedConfig: clonedConfig as ConfigData }
}

export function writeGameStructure(config: ResolvableConfigData) {
  const { tempDirPath, configFile, resolvedConfig } = writeConfigFile(config)

  fse.writeJSONSync(configFile, resolvedConfig)
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.gameRoot))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.outputTo))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.backupTo))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.needsProcessingTo))

  return configFile
}
