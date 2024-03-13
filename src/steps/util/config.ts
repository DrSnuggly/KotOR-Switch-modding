import type { Command, OptionValues } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"
import wrap from "word-wrap"
import { z } from "zod"

import { INVALID_INPUT, wrapOptions } from "~/constants"

import { FSHelpers } from "./fs-helpers"

export const languageCodes = ["en", "ja", "it", "fr", "de", "es"] as const
const supportedGames = ["1", "2"] as const

function pathIsChildOf(from: string, to: string) {
  const relativePath = path.relative(path.resolve(from), path.resolve(to))
  // if the looks relative or begins with a drive letter, it's not a child
  return relativePath.slice(0, 2) !== ".." && relativePath[1] !== ":"
}

function pathsAreNested(from: string, to: string, unidirectional = false) {
  // check if `from` is a child of `to`
  if (pathIsChildOf(from, to)) return true
  // check if `to` is a child of `from`
  if (unidirectional) return false
  return pathIsChildOf(to, from)
}

function generateSchema(configParent: string) {
  return (
    z
      .object({
        kotor: z.string({ required_error: "KotOR version is required" }).pipe(
          z.enum(supportedGames, {
            invalid_type_error: "KotOR version is invalid",
          })
        ),
        languageCode: z.enum(languageCodes, {
          invalid_type_error: "Language code is invalid",
          required_error: "Language code is required",
        }),
        gameRoot: z.string({ required_error: "Game root is required" }),
        backupTo: z.string({ required_error: "Backup folder is required" }),
        outputTo: z.string({ required_error: "Output folder is required" }),
        needsProcessingTo: z.string({
          required_error: "Needs processing folder is required",
        }),
      })
      // check if paths are nested
      .refine((data) => !pathsAreNested(data.outputTo, configParent, true), {
        message: "Config folder cannot be a child of the backup folder",
      })
      .refine((data) => !pathsAreNested(data.outputTo, data.backupTo), {
        message: "Output and backup folders cannot be nested",
      })
      .refine((data) => !pathsAreNested(data.outputTo, data.gameRoot), {
        message: "Output and game root folders cannot be nested",
      })
      .refine(
        (data) => !pathsAreNested(data.outputTo, data.needsProcessingTo),
        { message: "Output and needs processing folders cannot be nested" }
      )
      .refine((data) => !pathsAreNested(data.backupTo, configParent, true), {
        message: "Config folder cannot be a child of the backup folder",
      })
      .refine((data) => !pathsAreNested(data.backupTo, data.gameRoot), {
        message: "Backup and game root folders cannot be nested",
      })
      .refine(
        (data) => !pathsAreNested(data.backupTo, data.needsProcessingTo),
        { message: "Backup and needs processing folders cannot be nested" }
      )
      .refine((data) => !pathsAreNested(data.gameRoot, configParent, true), {
        message: "Config folder cannot be a child of the game root folder",
      })
      .refine(
        (data) => !pathsAreNested(data.gameRoot, data.needsProcessingTo),
        { message: "Game root and needs processing folders cannot be nested" }
      )
      .refine(
        (data) => !pathsAreNested(data.needsProcessingTo, configParent, true),
        {
          message:
            "Config folder cannot be a child of the needs processing folder",
        }
      )
  )
}

export type ConfigData = z.infer<ReturnType<typeof generateSchema>>

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

  private getAbsolutePath(inputPath: string) {
    // check if it's already absolute
    if (path.isAbsolute(inputPath)) return inputPath
    // otherwise, calculate the absolute path
    return path.join(this.configParent, inputPath)
  }

  private validateConfig(inputConfig: unknown): ConfigData {
    const parsedConfig = generateSchema(this.configParent).safeParse(
      inputConfig
    )
    if (!parsedConfig.success) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            "While parsing the config, the following errors were found:\n" +
              parsedConfig.error.errors
                .map(({ message }) => message)
                .join("\n") +
              "\n\nUse 'ksm help init' for assistance.",
            wrapOptions
          )
        ),
        { exitCode: INVALID_INPUT }
      )
    }

    return parsedConfig.data
  }
}
