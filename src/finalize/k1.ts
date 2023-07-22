import { Command } from "@commander-js/extra-typings"
import fse from "fs-extra"
import path from "node:path"

import { k1AssetsDir } from "~/constants"
import {
  configData,
  getAbsoluteGameRoot,
  getAbsoluteOutputTo,
  getConfig,
} from "~/util/config"
import { tryFileSystemOperation } from "~/util/fs-helpers"

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

export async function finalizeK1(
  command: Command<any[], any>,
  { force, backup, forceBackup, restoreBackup }: finalizeParams
) {
  if (restoreBackup) {
    return restore(command)
  }
  // validation
  await preflight(command, { force })

  // initialization
  const gameRoot = getAbsoluteGameRoot()
  const outputTo = getAbsoluteOutputTo()
  const overrideFolder = path.join(gameRoot, "override")
  const gameFilesListPath = path.join(k1AssetsDir, "switch-files.txt")

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
  await moveExactROMFileMatches(command, { gameRoot, gameFilesListPath })
  await checkAndMoveTextures(command, {
    gameFilesListPath,
    overrideFolder,
    gameRoot,
  })
  await moveOverrideFileType(command, {
    overrideFolder,
    targetSubFolder: "2da",
    fileType: "2da",
  })
  await moveOverrideFileType(command, {
    overrideFolder,
    targetSubFolder: "dlg",
    fileType: "dlg",
  })
  await moveOverrideFileType(command, {
    overrideFolder,
    targetSubFolder: "xbox_gui",
    fileType: "gui",
  })
  await moveLocalizedFiles(command, { gameRoot })

  // clean up
  await cleanUpEmptyFolders(command, { gameRoot })
  await transformToAtmosphereFolderStructure(command, { gameRoot, outputTo })
}

type moveLocalizedDialogFileParams = {
  gameRoot: configData["gameRoot"]
}

export async function moveLocalizedFiles(
  command: Command<any[], any>,
  { gameRoot }: moveLocalizedDialogFileParams
) {
  process.stdout.write("Moving localized files...")
  let count = 0

  // determine language targets
  const languageCode = getConfig().languageCode
  const dialogFileName = "dialog.tlk"
  let targetDialogFileName = dialogFileName
  const parsedDialogFileName = path.parse(dialogFileName)
  // noinspection SpellCheckingInspection
  const streamWavesFolderName = "streamwaves"
  let targetStreamWavesFolderName = streamWavesFolderName
  // noinspection SpellCheckingInspection
  switch (languageCode) {
    case "en":
      // English is the default for this game, no action needed here
      break
    case "fr":
      targetStreamWavesFolderName += languageCode
      targetDialogFileName =
        parsedDialogFileName.name + languageCode + parsedDialogFileName.ext
      break
    case "de":
      targetStreamWavesFolderName += languageCode
      targetDialogFileName =
        parsedDialogFileName.name + languageCode + parsedDialogFileName.ext
      break
    default:
      // looks like only English, French, and German have voice acting, so no
      // need to move the streamwaves folder for other languages
      targetDialogFileName =
        parsedDialogFileName.name + languageCode + parsedDialogFileName.ext
  }

  // move files
  const dialogFilePath = path.join(gameRoot, dialogFileName)
  const streamWavesFolderPath = path.join(gameRoot, streamWavesFolderName)
  // noinspection SpellCheckingInspection
  await tryFileSystemOperation(() => {
    // rename the dialog file, if applicable
    if (
      fse.existsSync(dialogFilePath) &&
      // specifically a KotOR 1 check, since it doesn't have the Localized
      // folder
      targetDialogFileName !== dialogFileName
    ) {
      fse.moveSync(dialogFilePath, path.join(gameRoot, targetDialogFileName))
      count++
    }
    // rename the streamwaves folder, if applicable
    if (
      fse.existsSync(streamWavesFolderPath) &&
      // specifically a KotOR 1 check, since it doesn't have the Localized
      // folder
      targetStreamWavesFolderName !== streamWavesFolderName
    ) {
      count += fse.readdirSync(streamWavesFolderPath).length
      fse.moveSync(
        streamWavesFolderPath,
        path.join(gameRoot, targetStreamWavesFolderName)
      )
    }
  }, command)
}
