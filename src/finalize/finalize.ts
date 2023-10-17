import chalk from "chalk"
import fse from "fs-extra"
import globby from "globby"
import path from "node:path"
import wrap from "word-wrap"

import {
  ALREADY_FINALIZED,
  BACKUP_ALREADY_EXISTS,
  FILE_SYSTEM_ERROR,
  finalizedCanaryFileName,
  wrapOptions,
} from "~/constants"
import type { Config } from "~/util/config"
import { FSHelpers } from "~/util/fs-helpers"

import type { ActionParams, FinalizeCommand } from "./command"

export type FinalizeParams = ActionParams & {
  config: Config
}

export abstract class Finalize {
  readonly force: boolean
  readonly backup: boolean
  readonly forceBackup?: boolean
  readonly restoreBackup?: boolean
  abstract overrideFilesFilter: (item: string) => boolean
  abstract switchFilesListPath: string
  abstract titleId: string
  abstract readonly fileHashes: Record<string, string>
  readonly config: Config
  readonly command: FinalizeCommand
  readonly fsh: FSHelpers

  constructor(command: FinalizeCommand, params: FinalizeParams) {
    this.config = params.config
    this.command = command
    this.fsh = new FSHelpers(command)

    this.force = params.force
    this.backup = params.backup
    this.forceBackup = params.forceBackup
    this.restoreBackup = params.restoreBackup
  }

  abstract run(): void | Promise<void>

  abstract moveLocalizedFiles(targetFolder: string): void | Promise<void>

  preflight() {
    process.stdout.write("Running pre-flight checks... ")

    this.assertGameRootExists()
    if (!this.force) {
      // this method contains the above assertion, no need to repeat it
      this.fsh.tryFileSystemOperation(() => {
        if (
          fse.existsSync(
            path.join(this.config.absoluteGameRoot, finalizedCanaryFileName)
          )
        ) {
          console.error(chalk.red("error") + "!\n")
          this.command.error(
            chalk.red.bold(
              wrap(
                "The current folder is already finalized. Restore the backed-up game folder before trying again.",
                wrapOptions
              )
            ),
            { exitCode: ALREADY_FINALIZED }
          )
        }
      })
    }

    console.log(chalk.green("done") + ".")
  }

  restore() {
    // validation
    process.stdout.write("Running pre-flight checks... ")
    // this assert can live outside the tryFileSystemOperation because it has
    // its own internally
    this.fsh.tryFileSystemOperation(() => {
      if (!fse.existsSync(this.config.absoluteBackupTo)) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              "Cannot find the specified backup folder. Use 'ksm help init' for assistance with fixing this.",
              wrapOptions
            )
          ),
          { exitCode: FILE_SYSTEM_ERROR }
        )
      }
    })
    console.log(chalk.green("done") + ".")

    // start restoration
    process.stdout.write(
      wrap(
        `Restoring game root folder from '${this.config.absoluteBackupTo}' to '${this.config.absoluteGameRoot}'... `,
        wrapOptions
      )
    )

    this.fsh.tryFileSystemOperation(() => {
      // remove the game root folder
      fse.rmSync(this.config.absoluteGameRoot, { recursive: true })
      // copy the backup folder contents to the game root folder
      fse.moveSync(this.config.absoluteBackupTo, this.config.absoluteGameRoot)
    })

    console.log(chalk.green("done") + ".")
  }

  assertGameRootExists() {
    this.fsh.tryFileSystemOperation(() => {
      if (!fse.existsSync(this.config.absoluteGameRoot)) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              "Cannot find the game root folder. Use 'ksm help init' for assistance with fixing this.",
              wrapOptions
            )
          ),
          { exitCode: FILE_SYSTEM_ERROR }
        )
      }
    })
  }

  backUp() {
    // validation
    this.assertGameRootExists()
    this.fsh.assertFolderIsEmpty(this.config.absoluteBackupTo)

    // initialization
    process.stdout.write(
      `Backing up game root folder to '${this.config.absoluteBackupTo}'... `
    )

    this.fsh.tryFileSystemOperation(() => {
      const directoryHasContents =
        fse.existsSync(this.config.absoluteBackupTo) &&
        fse.readdirSync(this.config.absoluteBackupTo).length > 0
      // check if the backup directory already exists
      if (this.forceBackup && directoryHasContents) {
        // remove all directory contents
        fse.emptyDirSync(this.config.absoluteBackupTo)
      } else if (!this.forceBackup && directoryHasContents) {
        process.stdout.write(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              "Backup folder already exists. Use '-fb, --force-backup' to overwrite.",
              wrapOptions
            )
          ),
          { exitCode: BACKUP_ALREADY_EXISTS }
        )
      }

      // otherwise, continue with the backup
      fse.copySync(this.config.absoluteGameRoot, this.config.absoluteBackupTo)
    })

    // finish backup creation
    console.log(chalk.green("done") + ".")
  }

  markAsFinalized() {
    this.fsh.tryFileSystemOperation(() => {
      fse.writeFileSync(
        path.join(this.config.absoluteGameRoot, finalizedCanaryFileName),
        new Date().toISOString()
      )
    })
  }

  async removeKeyUnmodifiedFiles() {
    process.stdout.write("Removing any key unmodified files... ")

    // iterate through the target files and remove them if they exist and have
    // the original checksum
    let count = 0
    await this.fsh.tryFileSystemOperation(async () => {
      for (const fileName of Object.keys(this.fileHashes)) {
        const targetFilePath = path.join(this.config.absoluteGameRoot, fileName)
        if (
          fse.existsSync(targetFilePath) &&
          (await this.fsh.checksumFile(targetFilePath)) ===
            this.fileHashes[fileName]
        ) {
          fse.rmSync(targetFilePath)
          count++
        }
      }
    })

    console.log(chalk.green("done") + `, ${count} removed.`)
  }

  async removeRedundantLooseTextures() {
    process.stdout.write("Removing redundant loose textures... ")
    let count = 0

    await this.fsh.tryFileSystemOperation(async () => {
      // check override folder for .tpc files, which overrides everything else
      for await (const filePath of globby.stream(
        path
          .join(this.config.absoluteOverrideFolder, "*.tpc")
          .replace(/\\/g, "/"),
        {
          onlyFiles: true,
          unique: true,
          caseSensitiveMatch: false,
          expandDirectories: true,
        }
      )) {
        // check if any redundant texture extensions exist
        const parsedFilePath = path.parse(filePath as string)
        // combine dir and name, so we only deal with redundancies in the same
        // folder level
        const filePathWithoutExtension = path.join(
          parsedFilePath.dir,
          parsedFilePath.name
        )
        // no await since we'll read the stream below
        const redundantTextures = globby.stream(
          filePathWithoutExtension.replace(/\\/g, "/") + ".{tga,dds,txi}",
          {
            onlyFiles: true,
            unique: true,
            caseSensitiveMatch: false,
            expandDirectories: false,
          }
        )
        // remove any redundant textures, if any are found
        for await (const redundantTexture of redundantTextures) {
          fse.rmSync(redundantTexture as string)
          count++
        }
      }
    })

    console.log(chalk.green("done") + `, ${count} removed.`)
  }

  async moveExactROMFileMatches() {
    const statusBase = "Moving files that match existing game files"
    let found = 0
    let skipped = 0
    let count = 0
    process.stdout.write(
      statusBase +
        ` [ moved: ${chalk.green(count)}, ` +
        `skipped: ${chalk.yellow(skipped)}, ` +
        `found: ${found} ]... `
    )

    // read game root files by stream
    const gameFiles = globby.stream(
      this.config.absoluteGameRoot.replace(/\\/g, "/"),
      {
        onlyFiles: true,
        unique: true,
        caseSensitiveMatch: false,
        expandDirectories: true,
      }
    )

    const gameRootRegex = new RegExp(
      "^" + this.config.absoluteGameRoot + "/",
      "i"
    )
    // read game dirs file contents
    for await (const filePath of gameFiles) {
      found++
      const fileName = path.basename(filePath as string)
      const unRootedFilePath = (filePath as string).replace(gameRootRegex, "")

      this.fsh.tryFileSystemOperation(() => {
        // load switch files (new-line delimited) into memory
        const gameFilesList = fse
          .readFileSync(this.switchFilesListPath, "utf8")
          .split("\n")

        // iterate through the list and check if the file matches
        for (const line of gameFilesList) {
          // use RegExp to case-insensitively match the end of the line
          // use / as path separator to avoid matching filenames that are
          // substrings of other file names
          const lineRegex = new RegExp("/" + fileName + "$", "i")
          if (line.match(lineRegex)) {
            if (unRootedFilePath.toLowerCase() === line.toLowerCase()) {
              skipped++
            } else {
              // create target directory if it doesn't exist
              const targetFilePath = path.join(
                this.config.absoluteGameRoot,
                line
              )
              const targetFileDir = path.dirname(targetFilePath)
              if (!fse.existsSync(targetFileDir))
                fse.mkdirSync(targetFileDir, { recursive: true })
              // then move the file
              fse.moveSync(filePath as string, targetFilePath)
              count++
            }

            // stop iterating file
            break
          }
          // otherwise, keep going
        }
      })

      // return to start of line, use escape sequence for Windows support
      process.stdout.write("\x1B[0G")
      // write progress
      process.stdout.write(
        statusBase +
          ` [ moved: ${chalk.green(count)}, ` +
          `skipped: ${chalk.yellow(skipped)}, ` +
          `found: ${found} ]... `
      )
    }
    // finish moving of exact file matches
    console.log(chalk.green("done") + ".")
  }

  async checkAndMoveTextures() {
    const statusBase = "Moving non-matched texture overrides"
    let found = 0
    let needsProcessingCount = 0
    let count = 0
    process.stdout.write(
      statusBase +
        ` [ moved: ${chalk.green(count)}, ` +
        `skipped: ${chalk.yellow(needsProcessingCount)}, ` +
        `found: ${found} ]... `
    )
    const needsProcessing: string[] = []

    // read game root files by stream
    // with this, we end up iterating over all override files twice, which
    // isn't
    // ideal. however, I'm not sure if deleting files from the previous step
    // would impact the stream, so I'm just going to not deal with that for
    // now.
    const gameFiles = globby.stream(
      path
        .join(this.config.absoluteOverrideFolder, "*.{tga,dds,txi,tpc}")
        .replace(/\\/g, "/"),
      {
        onlyFiles: true,
        unique: true,
        caseSensitiveMatch: false,
        expandDirectories: false,
      }
    )
    // read game dirs file contents by stream
    const overrideTexturesDir = path.join(
      this.config.absoluteOverrideFolder,
      "textures"
    )
    await this.fsh.tryFileSystemOperation(async () => {
      // load switch files (new-line delimited) into memory
      const gameFilesList = fse
        .readFileSync(this.switchFilesListPath, "utf8")
        .split("\n")
      const overrideTextures = gameFilesList.filter((item) =>
        this.overrideFilesFilter(item)
      )

      for await (const filePath of gameFiles) {
        found++
        const fileName = path.basename(filePath as string)

        let foundFile = false
        let actionable = true
        for (const line of gameFilesList) {
          // use RegExp to case-insensitively match the end of the line
          // use / as path separator to avoid matching filenames that are
          // substrings of other file names
          const lineRegex = new RegExp("/" + fileName + "$", "i")
          if (line.match(lineRegex)) {
            // break early if the file is supposed to be in the root override
            // folder
            if (overrideTextures.includes(path.basename(line.toLowerCase())))
              actionable = false
            foundFile = true
            break
          }
        }

        // continue early if the found file isn't actionable
        if (foundFile && !actionable) {
          continue
        }

        // if the file isn't in the pre-existing ROM files and not a .tpc file,
        // check if the .tpc version of the same file exists in the ROM files
        if (
          !foundFile &&
          path.extname(filePath as string).toLowerCase() !== ".tpc"
        ) {
          let tpcFoundFile = false
          const fileStem = path.parse(filePath as string).name
          const tpcFileName = fileStem + ".tpc"

          for (const tpcLine of gameFilesList) {
            // use RegExp to case-insensitively match the end of the line
            // use / as path separator to avoid matching filenames that are
            // substrings of other file names
            const tpcLineRegex = new RegExp("/" + tpcFileName + "$", "i")
            if (tpcLine.match(tpcLineRegex)) {
              tpcFoundFile = true
              break
            }
          }

          // if the .tpc file exists, call it out then stop processing further
          if (tpcFoundFile) {
            needsProcessingCount++
            needsProcessing.push(
              path.relative(this.config.absoluteGameRoot, filePath as string)
            )

            // move file to manual-intervention folder
            fse.ensureDirSync(this.config.absoluteNeedsProcessingTo)
            fse.moveSync(
              filePath as string,
              path.join(this.config.absoluteNeedsProcessingTo, fileName),
              { overwrite: true }
            )

            continue
          }
        }

        // if the above checks succeed, move the file
        // create target directory if it doesn't exist
        fse.ensureDirSync(overrideTexturesDir)
        fse.moveSync(
          filePath as string,
          path.join(overrideTexturesDir, fileName)
        )
        count++

        // return to start of line
        process.stdout.write("\x1B[0G")
        // write progress
        process.stdout.write(
          statusBase +
            ` [ moved: ${chalk.green(count)}, ` +
            `skipped: ${chalk.yellow(needsProcessingCount)}, ` +
            `found: ${found} ]... `
        )
      }
    })

    // exit early if everything succeeded
    if (needsProcessing.length < 1) {
      console.log(chalk.green("done") + ".")
      return
    }

    // otherwise, print out the applicable warnings
    console.warn(chalk.yellow("warning") + "!\n")
    globalThis.wasWarned = true
    // calculate warning message components
    const consoleWidth = process.stdout.columns || 80
    // modify warning title, so we get an even number of padding characters
    const warningTitle = consoleWidth % 2 == 0 ? " WARNINGS " : " WARNING "
    // can safely divide by 2 since we modified the title above
    const warningTitlePadding = (consoleWidth - warningTitle.length) / 2

    // print warning
    console.warn(
      chalk.yellow(
        "=".repeat(warningTitlePadding) +
          warningTitle +
          "=".repeat(warningTitlePadding)
      )
    )
    console.warn(
      wrap(
        chalk.yellow(
          `The following texture(s) have been moved to '${this.config.absoluteNeedsProcessingTo}' due to how the game prioritizes .tpc files over all other formats. The Nintendo Switch port of the game already has a .tpc file with the same name as these file(s) in the override folder, so the below file(s) would have always been overridden:\n`
        ),
        wrapOptions
      )
    )
    for (const filePath of needsProcessing) {
      console.warn(chalk.yellow(filePath))
    }
    console.warn(
      chalk.yellow(
        `\nTo resolve this:
1. Convert the files in '${this.config.needsProcessingTo}' to .tpc format manually.
   - e.g. tga2tpc from https://deadlystream.com/files/file/1152-tga2tpc/
2. Restore the pre-finalized build using
   - e.g. running 'ksm finalize --restore-backup'.
3. Move the converted files to the override folder at '${this.config.overrideFolder}'.
4. Re-run the finalize command.`
      )
    )
    console.warn(chalk.yellow("=".repeat(consoleWidth)))
  }

  moveOverrideFileType(targetSubFolder: string, extension?: string) {
    if (!extension) extension = targetSubFolder

    process.stdout.write(`Moving '.${extension}' override files... `)

    this.fsh.tryFileSystemOperation(() => {
      const overrideFolderFiles = globby.sync(
        path
          .join(this.config.absoluteOverrideFolder, `*.${extension}`)
          .replace(/\\/g, "/"),
        {
          onlyFiles: true,
          caseSensitiveMatch: false,
        }
      )

      // create target directory if it doesn't exist
      fse.ensureDirSync(this.config.absoluteOverrideTexturesFolder)
      for (const filePath of overrideFolderFiles) {
        fse.moveSync(
          filePath,
          path.join(
            path.dirname(filePath),
            targetSubFolder,
            path.basename(filePath)
          )
        )
      }
    })

    console.log(chalk.green("done") + ".")
  }

  async cleanUpEmptyFolders(
    gameRoot = this.config.absoluteGameRoot,
    _firstIteration = true
  ) {
    let count = 0
    const gameFiles = globby.stream(
      path.join(gameRoot, "*").replace(/\\/g, "/"),
      {
        onlyDirectories: true,
        unique: true,
        caseSensitiveMatch: false,
        // manually expand below
        expandDirectories: false,
      }
    )

    await this.fsh.tryFileSystemOperation(async () => {
      for await (const dirPath of gameFiles) {
        let contents = globby.sync(
          path.join(dirPath as string, "*").replace(/\\/g, "/"),
          {
            onlyFiles: false,
          }
        )

        // recursively check empty folders
        if (contents.length > 0) {
          count += await this.cleanUpEmptyFolders(dirPath as string, false)
          // re-evaluate contents after recursive call
          contents = globby.sync(
            path.join(dirPath as string, "*").replace(/\\/g, "/"),
            {
              onlyFiles: false,
            }
          )
        }

        // if the directory is now empty, remove it
        if (contents.length === 0) {
          fse.rmSync(dirPath as string, { recursive: true })
          count++
        }
      }
    })

    if (_firstIteration) {
      console.log(chalk.green("done") + `, ${count} removed.`)
    }
    return count
  }

  transformToAtmosphereFolderStructure() {
    process.stdout.write("Transforming to Atmosphere folder structure... ")

    // ensure Atmosphere folder exists
    this.fsh.tryFileSystemOperation(() => {
      fse.ensureDirSync(path.join(this.config.absoluteOutputTo, this.titleId))
      // noinspection SpellCheckingInspection
      fse.moveSync(
        this.config.absoluteGameRoot,
        path.join(this.config.absoluteOutputTo, this.titleId, "romfs")
      )
    })

    console.log(chalk.green("done") + ".")
  }
}
