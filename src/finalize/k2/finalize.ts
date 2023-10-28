import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"

import { INVALID_INPUT, k2AssetsDir } from "~/constants"

import { Finalize } from "./finalize"

export class FinalizeK2 extends Finalize {
  readonly titleId = "0100B2C016252000"
  readonly switchFilesListPath = path.join(k2AssetsDir, "switch-files.txt")
  nestedOverrideFileTypes = { "2da": "2DA" }

  moveLocalizedFiles() {
    const targetFolders = ["Docs", "StreamVoice", "lips"]
    for (const targetFolder of targetFolders) {
      this.moveLocalizedFolderFiles(targetFolder)
    }
  }

  moveLocalizedFolderFiles(targetFolder: string) {
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
