import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import type { configData } from "~/util/config"

const unresolvableKeys: string[] = ["game", "languageCode"]
type resolver<T> = (tempDirPath: string) => T
type resolvable<T> = T | resolver<T>
type configDataResolvables = {
  [K in keyof Omit<configData, (typeof unresolvableKeys)[number]>]: resolvable<
    configData[K]
  >
}
export type resolvableConfigData = configData & configDataResolvables

export function writeConfigFile(config: resolvableConfigData) {
  const tempDirPath = temporaryDirectory()
  const configFile = path.join(tempDirPath, "config.json")

  // resolve config
  const clonedConfig = structuredClone(config)
  for (const key in config) {
    // skip unresolvable keys
    if (unresolvableKeys.includes(key)) continue
    const typedKey = key as keyof configDataResolvables

    // check if it's a resolver
    if (typeof config[typedKey] === "function") {
      // resolve it
      clonedConfig[typedKey] = (
        config[typedKey] as resolver<
          configDataResolvables[keyof configDataResolvables]
        >
      )(tempDirPath)
    }
  }

  fse.writeJSONSync(configFile, config)
  return { tempDirPath, configFile, resolvedConfig: clonedConfig as configData }
}

export function writeGameStructure(config: resolvableConfigData) {
  const { tempDirPath, configFile, resolvedConfig } = writeConfigFile(config)

  fse.writeJSONSync(configFile, resolvedConfig)
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.gameRoot))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.outputTo))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.backupTo))
  fse.mkdirSync(path.join(tempDirPath, resolvedConfig.manualProcessingOutput))

  return configFile
}
