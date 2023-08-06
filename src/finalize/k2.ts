import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"

import { INVALID_INPUT, k2AssetsDir } from "~/constants"

import { Finalize } from "./finalize"

export class FinalizeK2 extends Finalize {
  readonly titleId = "0100B2C016252000"
  readonly switchFilesListPath = path.join(k2AssetsDir, "switch-files.txt")
  // noinspection SpellCheckingInspection
  readonly fileHashes = {
    "dialog.tlk": "c83b5b5f5ea8941a767b6364049b2108ef576928",
    "swplayer.ini": "507105bc491dec3edf7374052b87fdabe44b0636",
  }
  overrideFilesFilter = (item: string) => item === `override/${item}`

  async run() {
    // early exit if the user is trying to restore from a backup
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
    this.moveLocalizedFiles("Docs")
    this.moveLocalizedFiles("StreamVoice")
    this.moveLocalizedFiles("lips")
    this.moveOverrideFileType("2DA")
    await this.checkAndMoveTextures()
    await this.moveExactROMFileMatches()

    // clean up
    await this.cleanUpEmptyFolders()
    this.transformToAtmosphereFolderStructure()
  }

  moveLocalizedFiles(targetFolder: string) {
    process.stdout.write(`Moving '${targetFolder}' localized contents... `)

    let count = 0
    const baseLocalizedFolder = path.join(
      this.config.absoluteGameRoot,
      "Localized"
    )
    let localizedSubFolder: string
    switch (this.config.languageCode) {
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
        this.command.error(
          chalk.red.bold("Unsupported language code found in config file."),
          { exitCode: INVALID_INPUT }
        )
    }

    this.fsh.tryFileSystemOperation(() => {
      if (
        fse.existsSync(path.join(this.config.absoluteGameRoot, targetFolder))
      ) {
        count = fse.readdirSync(
          path.join(this.config.absoluteGameRoot, targetFolder)
        ).length
        fse.moveSync(
          path.join(this.config.absoluteGameRoot, targetFolder),
          path.join(
            path.join(baseLocalizedFolder, localizedSubFolder),
            targetFolder
          )
        )
      }
    })

    console.log(chalk.green("done") + `, ${count} moved.`)
  }
}
