import type { Command, OptionValues } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"
import wrap from "word-wrap"

import {
  INVALID_INPUT,
  UNSUPPORTED_GAME,
  UNSUPPORTED_LANGUAGE,
  languageCodes,
  wrapOptions,
} from "~/constants"

import { FSHelpers } from "./fs-helpers"

const supportedGames = [1, 2] as const
export type ConfigData = {
  kotor: (typeof supportedGames)[number]
  languageCode: (typeof languageCodes)[number]
  gameRoot: string
  backupTo: string
  outputTo: string
  needsProcessingTo: string
export const languageCodes = ["en", "ja", "it", "fr", "de", "es"] as const
}

export class Config {
  readonly configParent: string
  private readonly fsh: FSHelpers

  constructor(
    private readonly command: Command<[], OptionValues>,
    readonly configFile: string
  ) {
    this.configParent = path.dirname(this.configFile)
    this.fsh = new FSHelpers(this.command)
  }

  private _data?: ConfigData
  get data(): ConfigData {
    // if no config is loaded, try getting it from the config file
    if (!this._data) this.load()
    return this.validateConfig(this._data)
  }

  set data(value: unknown) {
    this._data = this.validateConfig(value)
  }

  get kotor() {
    return this.data.kotor
  }

  get languageCode() {
    return this.data.languageCode
  }

  get gameRoot() {
    return this.data.gameRoot
  }

  get backupTo() {
    return this.data.backupTo
  }

  get outputTo() {
    return this.data.outputTo
  }

  get needsProcessingTo() {
    return this.data.needsProcessingTo
  }

  get overrideFolder() {
    return path.join(this.gameRoot, "override")
  }

  get texturesOverrideFolder() {
    return path.join(this.overrideFolder, "textures")
  }

  get absoluteGameRoot() {
    return this.getAbsolutePath(this.gameRoot)
  }

  get absoluteBackupTo() {
    return this.getAbsolutePath(this.backupTo)
  }

  get absoluteOutputTo() {
    return this.getAbsolutePath(this.outputTo)
  }

  get absoluteNeedsProcessingTo() {
    return this.getAbsolutePath(this.needsProcessingTo)
  }

  get absoluteOverrideFolder() {
    return this.getAbsolutePath(this.overrideFolder)
  }

  get absoluteOverrideTexturesFolder() {
    return this.getAbsolutePath(this.texturesOverrideFolder)
  }

  save(force = false) {
    process.stdout.write(`Creating config file at '${this.configFile}'... `)

    // preflight check
    this.fsh.assertFileDoesNotExist(this.configFile, force)

    this.fsh.tryFileSystemOperation(() => {
      fse.mkdirSync(this.configParent, { recursive: true })
      // create config file
      fse.writeJSONSync(this.configFile, this.validateConfig(this.data), {
        spaces: 2,
        encoding: "utf-8",
      })
    })

    console.log(chalk.green("done") + ".")

    // allow chaining
    return this
  }

  private load() {
    // do not load immediately, since the config file might not yet exist
    // (e.g. in the initializer subcommand)

    // preflight checks
    this.fsh.assertFileExists(this.configFile)

    // read config file, use unknown type since we're validating it below
    let config: unknown
    this.fsh.tryFileSystemOperation(() => {
      // disable linting here since we're validating it below
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      config = fse.readJSONSync(this.configFile, {
        encoding: "utf-8",
      })
    })
    this.data = config

    // allow chaining
    return this
  }

  private assertLanguageSupported(config: ConfigData) {
    if (!languageCodes.includes(config.languageCode)) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            `The language code '${config.languageCode}' is not supported. Use 'ksm help init' for assistance.`,
            wrapOptions
          )
        ),
        { exitCode: UNSUPPORTED_LANGUAGE }
      )
    }
  }

  private assertGameSupported(config: ConfigData) {
    if (!supportedGames.includes(config.kotor)) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            `The game KotOR '${config.kotor}' is not supported. Use 'ksm help init' for assistance.`,
            wrapOptions
          )
        ),
        { exitCode: UNSUPPORTED_GAME }
      )
    }
  }

  private pathIsChildOf(from: string, to: string) {
    const relativePath = path.relative(path.resolve(from), path.resolve(to))
    // if the looks relative or begins with a drive letter, it's not a child
    return relativePath.slice(0, 2) !== ".." && relativePath[1] !== ":"
  }

  private assertIsNotNested(from: string, to: string, unidirectional = false) {
    let nested = false

    // check if `from` is a child of `to`
    if (this.pathIsChildOf(from, to)) nested = true
    // check if `to` is a child of `from`
    if (!unidirectional && this.pathIsChildOf(to, from)) nested = true

    if (nested) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            "One or more of the config options has improper nesting.",
            wrapOptions
          )
        ),
        { exitCode: INVALID_INPUT }
      )
    }
  }

  private getAbsolutePath(inputPath: string) {
    // check if it's already absolute
    if (path.isAbsolute(inputPath)) return inputPath
    // otherwise, calculate the absolute path
    return path.join(this.configParent, inputPath)
  }

  private validateConfig(inputConfig: unknown) {
    // otherwise, check if it's missing any required properties
    if (
      !inputConfig ||
      // separate object checks to ensure this also isn't a primitive
      typeof inputConfig !== "object" ||
      inputConfig.constructor !== Object ||
      // ensure the input has the appropriate properties
      !("kotor" in inputConfig) ||
      !("languageCode" in inputConfig) ||
      !("gameRoot" in inputConfig) ||
      !("backupTo" in inputConfig) ||
      !("outputTo" in inputConfig) ||
      !("needsProcessingTo" in inputConfig) ||
      // number is a bit different since we'll allow for it to be a string
      (typeof inputConfig.kotor !== "number" &&
        typeof inputConfig.kotor !== "string") ||
      Number.isNaN(Number(inputConfig.kotor)) ||
      // process all other types as normal
      typeof inputConfig.languageCode !== "string" ||
      typeof inputConfig.gameRoot !== "string" ||
      typeof inputConfig.backupTo !== "string" ||
      typeof inputConfig.outputTo !== "string" ||
      typeof inputConfig.needsProcessingTo !== "string"
    ) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            "The provided config structure is invalid. Use 'ksm help init'" +
              " for assistance.",
            wrapOptions
          )
        ),
        { exitCode: INVALID_INPUT }
      )
    }

    // "cast" the kotor number as a number
    inputConfig.kotor = Number(inputConfig.kotor)
    // since all properties are confirmed to be present, we can safely cast it
    const config = inputConfig as ConfigData

    // ensure the config values are valid
    this.assertGameSupported(config)
    this.assertLanguageSupported(config)
    // intentionally don't check if the config is a parent of the folders,
    // since it's a file that can be in a folder that's a parent of the other
    // folders
    this.assertIsNotNested(config.outputTo, this.configParent, true)
    this.assertIsNotNested(config.outputTo, config.backupTo)
    this.assertIsNotNested(config.outputTo, config.gameRoot)
    this.assertIsNotNested(config.outputTo, config.needsProcessingTo)
    this.assertIsNotNested(config.backupTo, this.configParent, true)
    this.assertIsNotNested(config.backupTo, config.gameRoot)
    this.assertIsNotNested(config.backupTo, config.needsProcessingTo)
    this.assertIsNotNested(config.gameRoot, this.configParent, true)
    this.assertIsNotNested(config.gameRoot, config.needsProcessingTo)
    this.assertIsNotNested(config.needsProcessingTo, this.configParent, true)

    // finally, return the correctly-typed config
    return config
  }
}
