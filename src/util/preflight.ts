import { Command } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import globby from "globby"
import path from "node:path"
import wrap from "word-wrap"

import {
  ALREADY_FINALIZED,
  CONFIG_FILE_MISSING,
  FILE_SYSTEM_ERROR,
  INVALID_INPUT,
  UNSUPPORTED_LANGUAGE,
  finalizedCanaryFileName,
  languageCodes,
  wrapOptions,
} from "../constants"
import {
  configFileExists,
  getAbsoluteBackupTo,
  getAbsoluteGameRoot,
} from "./config"
import { tryFileSystemOperation } from "./fs-helpers"

export async function assertConfigFileExists(command: Command<any[], any>) {
  await tryFileSystemOperation(() => {
    if (!configFileExists()) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            "Cannot find the provided config file. Use 'ksm help init' for assistance with fixing this.",
            wrapOptions
          )
        ),
        { exitCode: CONFIG_FILE_MISSING }
      )
    }
  }, command)
}

export function assertLanguageIsSupported(
  command: Command<any[], any>,
  languageCode: string
) {
  if (!languageCodes.includes(languageCode)) {
    console.error(chalk.red("error") + "!\n")
    command.error(
      chalk.red.bold(
        wrap(
          `The language code '${languageCode}' is not supported. Use 'ksm help init' for assistance.`,
          wrapOptions
        )
      ),
      { exitCode: UNSUPPORTED_LANGUAGE }
    )
  }
}

// nesting checks
export type NestingCheckInput = {
  value: string
  descriptor: string
}
export function isChild(
  parent: NestingCheckInput["value"],
  child: NestingCheckInput["value"]
) {
  return (
    path.relative(path.resolve(parent), path.resolve(child)).slice(0, 2) !==
    ".."
  )
}
export function assertIsNotNested(
  command: Command<any[], any>,
  { value: first, descriptor: firstDescriptor }: NestingCheckInput,
  { value: second, descriptor: secondDescriptor }: NestingCheckInput,
  unidirectional = false
) {
  let errorMessage: string | null = null

  // check if the first is a child of the second
  if (isChild(first, second)) {
    errorMessage = `The specified ${secondDescriptor} folder, '${second}', is in the ${firstDescriptor} folder, '${first}'. Please specify a ${secondDescriptor} folder outside of the ${firstDescriptor} folder.`
  }
  // check if the second is a child of the first
  if (!unidirectional && isChild(second, first)) {
    errorMessage = `The specified ${firstDescriptor} folder, '${first}', is in the ${secondDescriptor} folder, '${second}'. Please specify a ${firstDescriptor} folder outside of the ${secondDescriptor} folder.`
  }

  if (errorMessage) {
    console.error(chalk.red("error") + "!\n")
    command.error(chalk.red.bold(wrap(errorMessage, wrapOptions)), {
      exitCode: INVALID_INPUT,
    })
  }
}

export function isFolderEmpty(folderPath: string) {
  return globby.sync(folderPath, { onlyFiles: false }).length === 0
}
export async function assertFolderIsEmpty(
  command: Command<any[], any>,
  folderPath: string,
  force = false
) {
  await tryFileSystemOperation(() => {
    // if folder is empty, return early
    if (isFolderEmpty(folderPath)) return
    // if it does, but we're not forcing it, throw an error
    if (!force) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            `The specified folder '${folderPath}' is not empty.`,
            wrapOptions
          )
        ),
        { exitCode: FILE_SYSTEM_ERROR }
      )
    }
    // otherwise, delete the contents
    fse.emptyDirSync(folderPath)
  }, command)
}

// file existence checks
export async function assertFileDoesNotExist(
  command: Command<any[], any>,
  filePath: string,
  force = false
) {
  await tryFileSystemOperation(() => {
    // if file doesn't exist, return early
    if (!fse.existsSync(filePath)) return
    // if it does, but we're not forcing it, throw an error
    if (!force) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(`The specified file '${filePath}' already exists.`, wrapOptions)
        ),
        { exitCode: INVALID_INPUT }
      )
    }
    // otherwise, delete it
    fse.rmSync(filePath, { force: true })
  }, command)
}

// game root directory checks
export async function assertGameRootExists(command: Command<any[], any>) {
  await assertConfigFileExists(command)
  await tryFileSystemOperation(() => {
    if (!fse.existsSync(getAbsoluteGameRoot())) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            "Cannot find the game root folder. Use 'ksm help init' for assistance with fixing this.",
            wrapOptions
          )
        ),
        { exitCode: FILE_SYSTEM_ERROR }
      )
    }
  }, command)
}

// backup directory checks
export async function assertBackupExists(command: Command<any[], any>) {
  // this assert can live outside the tryFileSystemOperation because it has
  // its own internally
  await assertConfigFileExists(command)
  await tryFileSystemOperation(() => {
    if (!fse.existsSync(getAbsoluteBackupTo())) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            "Cannot find the specified backup folder. Use 'ksm help init' for assistance with fixing this.",
            wrapOptions
          )
        ),
        { exitCode: FILE_SYSTEM_ERROR }
      )
    }
  }, command)
}

// finalized checks
export async function assertIsNotFinalized(command: Command<any[], any>) {
  await assertConfigFileExists(command)
  await assertGameRootExists(command)
  await tryFileSystemOperation(() => {
    if (
      fse.existsSync(path.join(getAbsoluteGameRoot(), finalizedCanaryFileName))
    ) {
      console.error(chalk.red("error") + "!\n")
      command.error(
        chalk.red.bold(
          wrap(
            "The current folder is already finalized. Restore the backed-up game folder before trying again.",
            wrapOptions
          )
        ),
        { exitCode: ALREADY_FINALIZED }
      )
    }
  }, command)
}
