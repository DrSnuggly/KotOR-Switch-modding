import { Command, Option } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"
import os from "os"
import wrap from "word-wrap"

import {
  INVALID_INPUT,
  k1AssetsDir,
  k2AssetsDir,
  languageCodes,
  wrapOptions,
} from "./constants"
import type { configData } from "./util/config"
import { readFileLines, tryFileSystemOperation } from "./util/fs-helpers"
import type { NestingCheckInput } from "./util/preflight"
import {
  assertFileDoesNotExist,
  assertFolderIsEmpty,
  assertIsNotNested,
  assertLanguageIsSupported,
} from "./util/preflight"

const gameRootSiblingPlaceholder = "(sibling of '-c, --config-file')"

export type InitializeCommandResult = Command<[], initializeParams>
export const initializeCommand: InitializeCommandResult = new Command()
  .name("init")
  .summary("initialize the game root structure that many mods expect")
  .description(
    "Initialize the game root structure that many mods expect.\n" +
      "This will also create a config.json in the provided folder to persist the configuration."
  )
  .configureHelp({ showGlobalOptions: true })
  // folder options
  .option(
    // language=JSRegexp
    "-g, --game-root <folder>",
    "specify an empty folder that will function as the game root folder",
    gameRootSiblingPlaceholder
  )
  .option(
    // language=JSRegexp
    "-b, --backup-to <folder>",
    // language=JSRegexp
    "specify the path to back up the game root folder to when finalizing",
    gameRootSiblingPlaceholder
  )
  .option(
    // language=JSRegexp
    "-o, --output-to <folder>",
    "specify the path to output the finalized game root folder to",
    gameRootSiblingPlaceholder
  )
  .option(
    // language=JSRegexp
    "-m, --manual-processing-output <folder>",
    "specify the path to place game textures that will need manual processing",
    gameRootSiblingPlaceholder
  )
  // game options
  .addOption(
    new Option(
      "-k1, --kotor1",
      "use Star Wars: Knights of the Old Republic I as the folder structure template"
    ).conflicts("kotor2")
  )
  .addOption(
    new Option(
      "-k2, --kotor2",
      "use Star Wars: Knights of the Old Republic II as the folder structure template"
    ).conflicts("kotor1")
  )
  .addOption(
    new Option(
      // language=JSRegexp
      "-l, --language <language code>",
      "specify the localization folder language name to use for the game;" +
        ` options: ${languageCodes.join(", ")}`
    ).default("en")
  )
  // symlink options
  .addOption(
    new Option(
      "-S, --no-symlink",
      "do not create a symlink to the game root folder on this user's desktop"
    ).conflicts("symlinkName")
  )
  .addOption(
    new Option(
      // language=JSRegexp
      "-s, --symlink-name <name>",
      "specify the name of the symlink to create on this user's desktop; if not provided, the game root folder name will be used"
    ).conflicts("symlink")
  )
  // overwrite options
  .addOption(
    new Option(
      "-f, --force",
      "remove any existing config file or game root contents before initializing; if not provided, no action will be taken they exist"
    ).implies({
      forceConfig: true,
      forceGameRoot: true,
      forceBackup: true,
      forceOutput: true,
      forceManualProcessingOutput: true,
      forceSymlink: true,
    })
  )
  .option(
    "-fc, --force-config",
    "remove any existing config file before initializing; if not set, no action will be taken if it exists"
  )
  .option(
    "-fg, --force-game-root",
    "remove all existing game root contents; if not set, no action will be taken if contents exist"
  )
  .option(
    "-fb, --force-backup",
    "remove all existing backup folder contents; if not set, no action will be taken if contents exist"
  )
  .option(
    "-fo, --force-output",
    "remove all existing output folder contents; if not set, no action will be taken if contents exist"
  )
  .option(
    "-fm, --force-manual-processing-output",
    "remove all existing manual processing folder contents; if not set, no action will be taken if contents exist"
  )
  .option(
    "-fs, --force-symlink",
    "remove any existing symlink to the game root folder on this user's desktop; if not set, no action will be taken if it exists"
  )
  .action(async (options) => {
    // parameter validation, do before preflight to give the illusion of it
    // being part of the commander.js parameter checks
    if (!options.kotor1 && !options.kotor2) {
      initializeCommand.error(
        wrap(
          "error: a game template option '-k1, --kotor1' or '-k2, --kotor2' must be specified; see 'kms init --help' for more information",
          wrapOptions
        ),
        { exitCode: INVALID_INPUT }
      )
    }

    // if outputs are the command option placeholder, calculate it to be in the
    // parent directory of the config file
    if (options.outputTo === gameRootSiblingPlaceholder)
      options.outputTo = path.join(
        path.dirname(globalThis.configFile),
        "output"
      )
    if (options.gameRoot === gameRootSiblingPlaceholder)
      options.gameRoot = path.join(
        path.dirname(globalThis.configFile),
        "game-root"
      )
    if (options.backupTo === gameRootSiblingPlaceholder)
      options.backupTo = path.join(
        path.dirname(globalThis.configFile),
        "backup"
      )
    if (options.manualProcessingOutput === gameRootSiblingPlaceholder) {
      options.manualProcessingOutput = path.join(
        path.dirname(globalThis.configFile),
        "_NEEDS_PROCESSING"
      )
    }

    // consolidate symlink options
    let symlinkPath: string | undefined
    if (options.symlink) {
      symlinkPath = path.join(
        os.homedir(),
        "Desktop",
        options.symlinkName ?? options.gameRoot
      )
    }

    await initialize({ ...options, symlinkPath })
  })

// main function
type initializeParams = {
  gameRoot: string
  backupTo: string
  outputTo: string
  manualProcessingOutput: string
  symlinkPath?: string
  forceConfig?: boolean
  forceGameRoot?: boolean
  forceBackup?: boolean
  forceOutput?: boolean
  forceManualProcessingOutput?: boolean
  forceSymlink?: boolean
  kotor1?: boolean
  kotor2?: boolean
  language: string
}

async function initialize(params: initializeParams) {
  await preflight(params)

  await createConfigFile(params)
  await createGameRoot(params)
  await createGameTemplateFolders(params)
  await createSymlink(params)
}

// preflight checks
async function preflight(params: initializeParams) {
  process.stdout.write("Running pre-flight checks... ")

  assertLanguageIsSupported(initializeCommand, params.language)
  preflightNesting(params)
  await preflightFolderStructure(params)

  console.log(chalk.green("done") + ".\n")
}

// check if the nesting of the folders is valid
export function preflightNesting({
  outputTo,
  gameRoot,
  backupTo,
  manualProcessingOutput,
}: initializeParams) {
  // ensure folders are not nested
  const configNesting: NestingCheckInput = {
    // use dirname to get the parent folder of the config file
    value: path.dirname(globalThis.configFile),
    descriptor: "config",
  }
  const outputNesting: NestingCheckInput = {
    value: outputTo,
    descriptor: "output",
  }
  const backupNesting: NestingCheckInput = {
    value: backupTo,
    descriptor: "backup",
  }
  const gameRootNesting: NestingCheckInput = {
    value: gameRoot,
    descriptor: "game root",
  }
  const manualProcessingNesting: NestingCheckInput = {
    value: manualProcessingOutput,
    descriptor: "manual processing",
  }

  // intentionally don't check if the config is a parent of the folders,
  // since it's a file that can be in a folder that's a parent of the other
  // folders
  assertIsNotNested(initializeCommand, outputNesting, configNesting, true)
  assertIsNotNested(initializeCommand, outputNesting, backupNesting)
  assertIsNotNested(initializeCommand, outputNesting, gameRootNesting)
  assertIsNotNested(initializeCommand, outputNesting, manualProcessingNesting)
  assertIsNotNested(initializeCommand, backupNesting, configNesting, true)
  assertIsNotNested(initializeCommand, backupNesting, gameRootNesting)
  assertIsNotNested(initializeCommand, backupNesting, manualProcessingNesting)
  assertIsNotNested(initializeCommand, gameRootNesting, configNesting, true)
  assertIsNotNested(initializeCommand, gameRootNesting, manualProcessingNesting)
  assertIsNotNested(
    initializeCommand,
    manualProcessingNesting,
    configNesting,
    true
  )
}

// check if the folder structure is valid
async function preflightFolderStructure({
  gameRoot,
  backupTo,
  outputTo,
  manualProcessingOutput,
  symlinkPath,
  forceConfig,
  forceGameRoot,
  forceBackup,
  forceOutput,
  forceManualProcessingOutput,
  forceSymlink,
}: initializeParams) {
  // ensure that the file system is in the correct state
  await tryFileSystemOperation(async () => {
    // files
    await assertFileDoesNotExist(
      initializeCommand,
      globalThis.configFile,
      forceConfig
    )
    // folders
    await assertFolderIsEmpty(initializeCommand, gameRoot, forceGameRoot)
    await assertFolderIsEmpty(initializeCommand, backupTo, forceBackup)
    await assertFolderIsEmpty(initializeCommand, outputTo, forceOutput)
    await assertFolderIsEmpty(
      initializeCommand,
      manualProcessingOutput,
      forceManualProcessingOutput
    )
    // symlink
    if (symlinkPath) {
      // use assert file since it works the same for symlinks
      await assertFileDoesNotExist(initializeCommand, symlinkPath, forceSymlink)
    }
  }, initializeCommand)
}

// create config file
async function createConfigFile({
  gameRoot,
  backupTo,
  outputTo,
  manualProcessingOutput,
  language,
  kotor1,
}: initializeParams) {
  process.stdout.write(`Creating config file at '${globalThis.configFile}'... `)
  // create config outside of try block, so it can be used later
  const config: configData = {
    // can just test kotor1 since we confirmed at least one was provided above
    game: kotor1 ? 1 : 2,
    // just use gameRoot (no directory) since they are relative to the
    // directory argument
    gameRoot,
    backupTo,
    outputTo,
    manualProcessingOutput,
    languageCode: language,
  }
  await tryFileSystemOperation(() => {
    fse.mkdirSync(path.dirname(globalThis.configFile), { recursive: true })
    // create config file
    fse.writeJSONSync(globalThis.configFile, config, {
      spaces: 2,
      encoding: "utf-8",
    })
  }, initializeCommand)
  // finish config file creation
  console.log(chalk.green("done") + ".")
}

// create game root
async function createGameRoot({ gameRoot }: initializeParams) {
  process.stdout.write(`Creating game root folder at '${gameRoot}'... `)
  let wasWarned = false

  // create game root folder
  await tryFileSystemOperation(() => {
    fse.mkdirSync(gameRoot, { recursive: true })
  }, initializeCommand)

  // test if the directory is case-sensitive and exit if it is, since the
  // modded Nintendo Switch SD card is not case-sensitive
  const testFileName = ".case-sensitivity-test"
  const testFilePath = path.join(gameRoot, testFileName)
  await tryFileSystemOperation(() => {
    try {
      fse.writeFileSync(testFilePath, testFileName)
      // try to remove the same file, but with a different case
      fse.rmSync(path.join(gameRoot, testFileName.toUpperCase()))
    } catch (e) {
      // re-raise non-ENOENT errors
      // @ts-ignore: `code` is definitely defined here, but we can't import
      // SystemError to properly type this
      if (e instanceof Error && e.code !== "ENOENT") throw e

      // remove the originally-named test file
      fse.rmSync(testFilePath)
      // don't exit, since there are circumstances where this is okay (e.g. only
      // installing one mod)
      console.warn(chalk.yellow("warning") + "!")
      console.warn(
        chalk.yellow(
          wrap(
            "The game root folder looks like it's part of a case-sensitive filesystem, which will likely cause issues since the modded Nintendo Switch SD card filesystem is case-insensitive.\n" +
              "  It's highly recommended to provide a different, case-insensitive folder (e.g. by creating an disk image with a case-insensitive file system and mounting it).",
            { width: 80, trim: true }
          )
        )
      )
      wasWarned = true
      // set canary global variable
      globalThis.wasWarned = true
    }
  }, initializeCommand)

  if (!wasWarned) {
    console.log(chalk.green("done") + ".")
  }
  // no else since it's handled above

  return wasWarned
}

// create game template folders
async function createGameTemplateFolders({
  kotor1,
  gameRoot,
}: initializeParams) {
  // start game-specific directory creation
  process.stdout.write(
    `Creating game root folder structure from KotOR ${
      kotor1 ? "I" : "II"
    } template... `
  )
  let count = 0
  await tryFileSystemOperation(async () => {
    // don't use path.join() here since these will be bundled with the
    // executable
    const gameDirsFile = kotor1
      ? path.join(k1AssetsDir, "steam-folders.txt")
      : path.join(k2AssetsDir, "steam-folders.txt")
    await readFileLines(gameDirsFile, (line) => {
      const splitLine = line.split("/")
      fse.mkdirSync(path.join(gameRoot, ...splitLine), {
        recursive: true,
      })
      count++
    })
  }, initializeCommand)
  // finish game-specific directory creation
  console.log(chalk.green("done") + `, ${count} created.`)
}

// create symlink
async function createSymlink({ symlinkPath, gameRoot }: initializeParams) {
  if (symlinkPath) {
    process.stdout.write(
      `Creating desktop symlink '${path.basename(symlinkPath)}'... `
    )

    await tryFileSystemOperation(() => {
      fse.symlinkSync(gameRoot, symlinkPath)
    }, initializeCommand)

    console.log(chalk.green("done") + ".")
  }
}
