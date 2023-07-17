import { Command } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"

import { UNSUPPORTED_LANGUAGE, k2AssetsDir } from "../constants"
import {
  configData,
  getAbsoluteGameRoot,
  getAbsoluteOutputTo,
  getConfig,
} from "../util/config"
import { tryFileSystemOperation } from "../util/fs-helpers"
import {
  backUp,
  checkAndMoveTextures,
  cleanUpEmptyFolders,
  finalizeParams,
  markAsFinalized,
  moveExactROMFileMatches,
  moveOverrideFileType,
  preflight,
  removeKeyUnmodifiedFiles,
  removeRedundantLooseTextures,
  restore,
  transformToAtmosphereFolderStructure,
} from "./shared"

export async function finalizeK2(
  command: Command<any[], any>,
  { force, backup, forceBackup, restoreBackup }: finalizeParams
) {
  // early exit if the user is trying to restore from a backup
  if (restoreBackup) {
    return restore(command)
  }
  // validation
  await preflight(command, { force })

  // initialization
  const gameRoot = getAbsoluteGameRoot()
  const outputTo = getAbsoluteOutputTo()
  const overrideFolder = path.join(gameRoot, "override")
  const gameFilesListPath = path.join(k2AssetsDir, "switch-files.txt")

  if (backup) {
    await backUp(command, { forceBackup })
  }
  await markAsFinalized(command, { gameRoot })
  // spacer between preflight and main process
  console.log("")

  // delete files
  await removeKeyUnmodifiedFiles(command, { gameRoot })
  await removeRedundantLooseTextures(command, { overrideFolder })

  // move files
  await moveLocalizedFiles(command, { gameRoot, targetFolder: "Docs" })
  await moveLocalizedFiles(command, { gameRoot, targetFolder: "StreamVoice" })
  await moveLocalizedFiles(command, { gameRoot, targetFolder: "lips" })
  await moveOverrideFileType(command, {
    overrideFolder,
    targetSubFolder: "2DA",
    fileType: "2da",
  })
  await checkAndMoveTextures(command, {
    gameFilesListPath,
    overrideFolder,
    gameRoot,
  })
  await moveExactROMFileMatches(command, { gameRoot, gameFilesListPath })

  // clean up
  await cleanUpEmptyFolders(command, { gameRoot })
  await transformToAtmosphereFolderStructure(command, { gameRoot, outputTo })
}

// move localized files
type moveLocalizedFilesParams = {
  gameRoot: configData["gameRoot"]
  targetFolder: string
}
async function moveLocalizedFiles(
  command: Command<any[], any>,
  { targetFolder, gameRoot }: moveLocalizedFilesParams
) {
  process.stdout.write(`Moving '${targetFolder}' localized contents... `)

  let count = 0
  const config = await getConfig()
  const baseLocalizedFolder = path.join(gameRoot, "Localized")
  let localizedSubFolder: string
  switch (config.languageCode) {
    case "en":
      localizedSubFolder = "English"
      break
    case "fr":
      localizedSubFolder = "French"
      break
    case "de":
      localizedSubFolder = "German"
      break
    case "it":
      localizedSubFolder = "Italian"
      break
    case "es":
      localizedSubFolder = "Spanish"
      break
    case "jp":
      localizedSubFolder = "Japanese"
      break
    default:
      command.error(
        chalk.red.bold("Unsupported language code found in config file."),
        { exitCode: UNSUPPORTED_LANGUAGE }
      )
  }
  const localizedFolder = path.join(baseLocalizedFolder, localizedSubFolder)

  await tryFileSystemOperation(() => {
    if (fse.existsSync(path.join(gameRoot, targetFolder))) {
      count = fse.readdirSync(path.join(gameRoot, targetFolder)).length
      fse.moveSync(
        path.join(gameRoot, targetFolder),
        path.join(localizedFolder, targetFolder)
      )
    }
  }, command)

  console.log(chalk.green("done") + `, ${count} moved.`)
}
