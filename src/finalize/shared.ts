import chalk from "chalk"
import fse from "fs-extra"
import globby from "globby"
import path from "node:path"
import wrap from "word-wrap"

import {
  BACKUP_ALREADY_EXISTS,
  finalizedCanaryFileName,
  k1FileHashes,
  k1TitleId,
  k2AssetsDir,
  k2FileHashes,
  k2TitleId,
  wrapOptions,
} from "~/constants"
import type { FinalizeCommandResult } from "~/finalize/index"
import type { ConfigData } from "~/util/config"
import {
  getAbsoluteBackupTo,
  getAbsoluteGameRoot,
  getAbsoluteManualProcessingOutput,
  getConfig,
} from "~/util/config"
import { checksumFile, tryFileSystemOperation } from "~/util/fs-helpers"
import {
  assertBackupExists,
  assertConfigFileExists,
  assertFolderIsEmpty,
  assertGameRootExists,
  assertIsNotFinalized,
} from "~/util/preflight"

// shared
export type FinalizeParams = {
  force: boolean
  backup: boolean
  forceBackup?: boolean
  restoreBackup?: boolean
}

// preflight
type PreflightParams = {
  force: FinalizeParams["force"]
}

export async function preflight(
  command: FinalizeCommandResult,
  { force }: PreflightParams
) {
  process.stdout.write("Running pre-flight checks... ")

  if (force) {
    await assertConfigFileExists(command)
    await assertGameRootExists(command)
  } else {
    // this method contains the above assertions, no need to repeat them
    await assertIsNotFinalized(command)
  }

  console.log(chalk.green("done") + ".")
}

// restore
export async function restore(command: FinalizeCommandResult) {
  // validation
  process.stdout.write("Running pre-flight checks... ")
  await assertConfigFileExists(command)
  await assertBackupExists(command)
  console.log(chalk.green("done") + ".")

  // start restoration
  const backupTo = getAbsoluteBackupTo()
  const gameRoot = getAbsoluteGameRoot()
  process.stdout.write(
    wrap(
      `Restoring game root folder from '${backupTo}' to '${gameRoot}'... `,
      wrapOptions
    )
  )

  await tryFileSystemOperation(() => {
    // remove the game root folder
    fse.removeSync(gameRoot)
    // copy the backup folder contents to the game root folder
    fse.moveSync(backupTo, gameRoot)
  }, command)

  console.log(chalk.green("done") + ".")
}

// backup
type BackUpParams = {
  forceBackup?: FinalizeParams["forceBackup"]
}

export async function backUp(
  command: FinalizeCommandResult,
  { forceBackup }: BackUpParams
) {
  // validation
  await assertConfigFileExists(command)
  await assertGameRootExists(command)
  const backupTo = getAbsoluteBackupTo()
  await assertFolderIsEmpty(command, backupTo)

  // initialization
  const gameRoot = getAbsoluteGameRoot()
  process.stdout.write(`Backing up game root folder to '${backupTo}'... `)

  await tryFileSystemOperation(() => {
    const directoryHasContents =
      fse.existsSync(backupTo) && fse.readdirSync(backupTo).length > 0
    // check if the backup directory already exists
    if (forceBackup && directoryHasContents) {
      // remove all directory contents
      fse.emptyDirSync(backupTo)
    } else if (!forceBackup && directoryHasContents) {
      process.stdout.write(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            "Backup folder already exists. Use '-fb, --force-backup' to overwrite.",
            wrapOptions
          )
        ),
        { exitCode: BACKUP_ALREADY_EXISTS }
      )
    }
  }, command)

  // otherwise, continue with the backup
  await tryFileSystemOperation(() => {
    fse.copySync(gameRoot, backupTo)
  }, command)

  // finish backup creation
  console.log(chalk.green("done") + ".")
}

// finalize
type FinalizeGameRootParams = Pick<ConfigData, "gameRoot">

export async function markAsFinalized(
  command: FinalizeCommandResult,
  { gameRoot }: FinalizeGameRootParams
) {
  await tryFileSystemOperation(() => {
    fse.writeFileSync(
      path.join(gameRoot, finalizedCanaryFileName),
      new Date().toISOString()
    )
  }, command)
}

// remove key unmodified files
type RemoveKeyUnmodifiedFilesParams = Pick<ConfigData, "gameRoot">

export async function removeKeyUnmodifiedFiles(
  command: FinalizeCommandResult,
  { gameRoot }: RemoveKeyUnmodifiedFilesParams
) {
  process.stdout.write("Removing any key unmodified files... ")
  const game = getConfig().game
  const fileHashes = game === 1 ? k1FileHashes : k2FileHashes

  // iterate through the target files and remove them if they exist and have
  // the original checksum
  let count = 0
  await tryFileSystemOperation(async () => {
    for (const fileName of Object.keys(fileHashes)) {
      const targetFilePath = path.join(gameRoot, fileName)
      if (
        fse.existsSync(targetFilePath) &&
        (await checksumFile(targetFilePath)) === fileHashes[fileName]
      ) {
        fse.removeSync(targetFilePath)
        count++
      }
    }
  }, command)

  console.log(chalk.green("done") + `, ${count} removed.`)
}

// remove redundant loose textures
type RemoveRedundantLooseTexturesParams = {
  overrideFolder: string
}

export async function removeRedundantLooseTextures(
  command: FinalizeCommandResult,
  { overrideFolder }: RemoveRedundantLooseTexturesParams
) {
  process.stdout.write("Removing redundant loose textures... ")
  let count = 0

  await tryFileSystemOperation(async () => {
    // check override folder for .tpc files, which overrides everything else
    for await (const filePath of globby.stream(
      path.join(overrideFolder, "*.tpc").replace(/\\/g, "/"),
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
        fse.removeSync(redundantTexture as string)
        count++
      }
    }
  }, command)

  console.log(chalk.green("done") + `, ${count} removed.`)
}

// move exact ROM file matches
type MoveExactROMFileMatchesParams = Pick<ConfigData, "gameRoot"> & {
  gameFilesListPath: string
}

export async function moveExactROMFileMatches(
  command: FinalizeCommandResult,
  { gameRoot, gameFilesListPath }: MoveExactROMFileMatchesParams
) {
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
  const gameFiles = globby.stream(gameRoot.replace(/\\/g, "/"), {
    onlyFiles: true,
    unique: true,
    caseSensitiveMatch: false,
    expandDirectories: true,
  })

  const gameRootRegex = new RegExp("^" + gameRoot + "/", "i")
  // read game dirs file contents
  for await (const filePath of gameFiles) {
    found++
    const fileName = path.basename(filePath as string)
    const unRootedFilePath = (filePath as string).replace(gameRootRegex, "")

    await tryFileSystemOperation(() => {
      // load switch files (new-line delimited) into memory
      const gameFilesList = fse
        .readFileSync(gameFilesListPath, "utf8")
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
            const targetFilePath = path.join(gameRoot, line)
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
    }, command)

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

// move non-matched textures
type CheckAndMoveTexturesProps = Pick<ConfigData, "gameRoot"> & {
  gameFilesListPath: string
  overrideFolder: string
}

export async function checkAndMoveTextures(
  command: FinalizeCommandResult,
  { gameFilesListPath, overrideFolder, gameRoot }: CheckAndMoveTexturesProps
) {
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
  // with this, we end up iterating over all override files twice, which isn't
  // ideal. however, I'm not sure if deleting files from the previous step would
  // impact the stream, so I'm just going to not deal with that for now.
  const gameFiles = globby.stream(
    path.join(overrideFolder, "*.{tga,dds,txi,tpc}").replace(/\\/g, "/"),
    {
      onlyFiles: true,
      unique: true,
      caseSensitiveMatch: false,
      expandDirectories: false,
    }
  )
  // read game dirs file contents by stream
  const overrideTexturesDir = path.join(overrideFolder, "textures")
  const manualProcessingDir = getAbsoluteManualProcessingOutput()
  await tryFileSystemOperation(async () => {
    // load switch files (new-line delimited) into memory
    const gameFilesList = fse
      .readFileSync(gameFilesListPath, "utf8")
      .split("\n")
    const game = getConfig().game
    const overrideTextures =
      game === 1
        ? []
        : fse
            .readFileSync(
              path.join(k2AssetsDir, "switch-override-files.txt"),
              "utf8"
            )
            .split("\n")

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
          needsProcessing.push(path.relative(gameRoot, filePath as string))

          // move file to manual-intervention folder
          fse.ensureDirSync(manualProcessingDir)
          fse.moveSync(
            filePath as string,
            path.join(manualProcessingDir, fileName),
            { overwrite: true }
          )

          continue
        }
      }

      // if the above checks succeed, move the file
      // create target directory if it doesn't exist
      fse.ensureDirSync(overrideTexturesDir)
      fse.moveSync(filePath as string, path.join(overrideTexturesDir, fileName))
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
  }, command)

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
        `The following texture(s) have been moved to '${manualProcessingDir}' due to how the game prioritizes .tpc files over all other formats. The Nintendo Switch port of the game already has a .tpc file with the same name as these file(s) in the override folder, so the below file(s) would have always been overridden:\n`
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
1. Convert the files in '${manualProcessingDir}' to .tpc format manually.
   - e.g. tga2tpc from https://deadlystream.com/files/file/1152-tga2tpc/
2. Restore the pre-finalized build using
   - e.g. running 'ksm finalize --restore-backup'.
3. Move the converted files to the override folder at '${overrideFolder}'.
4. Re-run the finalize command.`
    )
  )
  console.warn(chalk.yellow("=".repeat(consoleWidth)))
}

// move file types to folder
type MoveOverrideFileTypeParams = {
  overrideFolder: string
  targetSubFolder: string
  fileType: string
}

export async function moveOverrideFileType(
  command: FinalizeCommandResult,
  { overrideFolder, targetSubFolder, fileType }: MoveOverrideFileTypeParams
) {
  process.stdout.write(`Moving '.${fileType}' override files... `)
  const overrideTexturesDir = path.join(overrideFolder, "textures")

  await tryFileSystemOperation(() => {
    const overrideFolderFiles = globby.sync(
      path.join(overrideFolder, `*.${fileType}`).replace(/\\/g, "/"),
      {
        onlyFiles: true,
        caseSensitiveMatch: false,
      }
    )

    // create target directory if it doesn't exist
    fse.ensureDirSync(overrideTexturesDir)
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
  }, command)

  console.log(chalk.green("done") + ".")
}

// clean up empty folders
type CleanUpEmptyFoldersParams = Pick<ConfigData, "gameRoot"> & {
  _firstIteration?: boolean
}

export async function cleanUpEmptyFolders(
  command: FinalizeCommandResult,
  { gameRoot, _firstIteration = true }: CleanUpEmptyFoldersParams
) {
  if (_firstIteration) process.stdout.write("Removing empty folders... ")

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

  await tryFileSystemOperation(async () => {
    for await (const dirPath of gameFiles) {
      let contents = globby.sync(
        path.join(dirPath as string, "*").replace(/\\/g, "/"),
        {
          onlyFiles: false,
        }
      )

      // recursively check empty folders
      if (contents.length > 0) {
        count += await cleanUpEmptyFolders(command, {
          gameRoot: dirPath as string,
          _firstIteration: false,
        })
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
        fse.removeSync(dirPath as string)
        count++
      }
    }
  }, command)

  if (_firstIteration) {
    console.log(chalk.green("done") + `, ${count} removed.`)
  }
  return count
}

// transform to Atmosphere folder structure
type TransformToAtmosphereFolderStructureParams = Pick<
  ConfigData,
  "gameRoot" | "outputTo"
>

export async function transformToAtmosphereFolderStructure(
  command: FinalizeCommandResult,
  { gameRoot, outputTo }: TransformToAtmosphereFolderStructureParams
) {
  process.stdout.write("Transforming to Atmosphere folder structure... ")

  // ensure Atmosphere folder exists
  const titleId = getConfig().game === 1 ? k1TitleId : k2TitleId
  await tryFileSystemOperation(() => {
    fse.ensureDirSync(path.join(outputTo, titleId))
    // noinspection SpellCheckingInspection
    fse.moveSync(gameRoot, path.join(outputTo, titleId, "romfs"))
  }, command)

  console.log(chalk.green("done") + ".")
}
