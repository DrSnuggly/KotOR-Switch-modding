import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"

import { k1AssetsDir } from "~/constants"

import { Finalize } from "./finalize"

export class FinalizeK1 extends Finalize {
  readonly titleId = "0100854015868800"
  readonly switchFilesListPath = path.join(k1AssetsDir, "switch-files.txt")
  // noinspection SpellCheckingInspection
  readonly fileHashes = {
    "dialog.tlk": "c83b5b5f5ea8941a767b6364049b2108ef576928",
    "swplayer.ini": "507105bc491dec3edf7374052b87fdabe44b0636",
  }
  overrideFilesFilter = () => false

  async run() {
    if (this.restoreBackup) return this.restore()
    // validation
    this.preflight()

    // initialization
    if (this.backup) {
      this.backUp()
    }
    this.markAsFinalized()
    // spacer between preflight and main process
    console.log("")

    // delete files
    await this.removeKeyUnmodifiedFiles()
    await this.removeRedundantLooseTextures()

    // move files
    await this.moveExactROMFileMatches()
    await this.checkAndMoveTextures()
    this.moveOverrideFileType("2da")
    this.moveOverrideFileType("dlg")
    this.moveOverrideFileType("xbox_gui", "gui")
    this.moveLocalizedFiles()

    // clean up
    await this.cleanUpEmptyFolders()
    this.transformToAtmosphereFolderStructure()
  }

  moveLocalizedFiles() {
    process.stdout.write("Moving localized files...")
    let count = 0

    // determine language targets
    const dialogFileName = "dialog.tlk"
    let targetDialogFileName = dialogFileName
    const parsedDialogFileName = path.parse(dialogFileName)
    // noinspection SpellCheckingInspection
    const streamWavesFolderName = "streamwaves"
    let targetStreamWavesFolderName = streamWavesFolderName
    // noinspection SpellCheckingInspection
    switch (this.config.languageCode) {
      case "en":
        // English is the default for this game, no action needed here
        break
      case "fr":
        targetStreamWavesFolderName += this.config.languageCode
        targetDialogFileName =
          parsedDialogFileName.name +
          this.config.languageCode +
          parsedDialogFileName.ext
        break
      case "de":
        targetStreamWavesFolderName += this.config.languageCode
        targetDialogFileName =
          parsedDialogFileName.name +
          this.config.languageCode +
          parsedDialogFileName.ext
        break
      default:
        // looks like only English, French, and German have voice acting, so no
        // need to move the streamwaves folder for other languages
        targetDialogFileName =
          parsedDialogFileName.name +
          this.config.languageCode +
          parsedDialogFileName.ext
    }

    // move files
    const dialogFilePath = path.join(
      this.config.absoluteGameRoot,
      dialogFileName
    )
    const streamWavesFolderPath = path.join(
      this.config.absoluteGameRoot,
      streamWavesFolderName
    )
    // noinspection SpellCheckingInspection
    this.fsh.tryFileSystemOperation(() => {
      // rename the dialog file, if applicable
      if (
        fse.existsSync(dialogFilePath) &&
        // specifically a KotOR 1 check, since it doesn't have the Localized
        // folder
        targetDialogFileName !== dialogFileName
      ) {
        fse.moveSync(
          dialogFilePath,
          path.join(this.config.absoluteGameRoot, targetDialogFileName)
        )
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
          path.join(this.config.absoluteGameRoot, targetStreamWavesFolderName)
        )
      }
    })

    console.log(chalk.green("done") + `, ${count} moved.`)
  }
}
