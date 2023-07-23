import fse from "fs-extra"
import path from "node:path"

import type { languageCodes } from "~/constants"

export type ConfigData = {
  game: 1 | 2
  languageCode: (typeof languageCodes)[number]
  gameRoot: string
  backupTo: string
  outputTo: string
  manualProcessingOutput: string
}

// config file checks
export function configFileExists(configFile = globalThis.configFile) {
  return fse.existsSync(configFile)
}

// cache the results of reading the config file
let config: ConfigData
export type GetConfigParams = {
  configFile: string
  force: boolean
}

function defaultConfigParams(): GetConfigParams {
  return {
    configFile: globalThis.configFile,
    force: false,
  }
}

export function getConfig(
  { configFile, force }: GetConfigParams = defaultConfigParams()
): ConfigData {
  const getConfig = () =>
    fse.readJSONSync(configFile, { encoding: "utf-8" }) as ConfigData

  // do not set config data if forced
  if (force) {
    return getConfig()
  }
  // otherwise, store it
  if (!config) {
    config = getConfig()
  }
  return config
}

export function getAbsoluteGameRoot(configParams = defaultConfigParams()) {
  const gameRoot = getConfig(configParams).gameRoot
  // check if it's already absolute
  if (path.isAbsolute(gameRoot)) return gameRoot
  // otherwise, calculate the absolute path
  const configParent = path.dirname(configParams.configFile)
  return path.join(configParent, gameRoot)
}

export function getAbsoluteBackupTo(configParams = defaultConfigParams()) {
  const backupTo = getConfig(configParams).backupTo
  // check if it's already absolute
  if (path.isAbsolute(backupTo)) return backupTo
  // otherwise, calculate the absolute path
  const configParent = path.dirname(configParams.configFile)
  return path.join(configParent, backupTo)
}

export function getAbsoluteOutputTo(configParams = defaultConfigParams()) {
  const outputTo = getConfig(configParams).outputTo
  // check if it's already absolute
  if (path.isAbsolute(outputTo)) return outputTo
  // otherwise, calculate the absolute path
  const configParent = path.dirname(configParams.configFile)
  return path.join(configParent, outputTo)
}

export function getAbsoluteManualProcessingOutput(
  configParams = defaultConfigParams()
) {
  const manualInterventionOutput =
    getConfig(configParams).manualProcessingOutput
  // check if it's already absolute
  if (path.isAbsolute(manualInterventionOutput)) return manualInterventionOutput
  // otherwise, calculate the absolute path
  const configParent = path.dirname(configParams.configFile)
  return path.join(configParent, manualInterventionOutput)
}
