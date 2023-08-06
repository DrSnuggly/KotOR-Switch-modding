import chalk from "chalk"
import fse from "fs-extra"
import path from "node:path"
import os from "os"

import { k1AssetsDir, k2AssetsDir } from "~/constants"
import type { Config } from "~/util/config"
import { FSHelpers } from "~/util/fs-helpers"

import type { ActionParams, InitializeCommand } from "./command"

type InitializeParams = Omit<ActionParams, "desktopSymlink"> & {
  desktopSymlink?: string
  config: Config
}

export class Initialize {
  readonly force: boolean
  private readonly config: Config
  private readonly fsh: FSHelpers
  private readonly desktopSymlink?: string

  constructor(
    command: InitializeCommand,
    { config, force, desktopSymlink }: InitializeParams
  ) {
    this.config = config
    this.fsh = new FSHelpers(command)

    this.force = force as boolean
    if (desktopSymlink && !path.isAbsolute(desktopSymlink)) {
      this.desktopSymlink = path.join(os.homedir(), "Desktop", desktopSymlink)
    } else {
      this.desktopSymlink = desktopSymlink
    }
  }

  async run() {
    this.preflight()

    this.config.save(this.force)
    this.createGameRoot()
    await this.createGameTemplateFolders()
    this.createSymlink()
  }

  private preflight() {
    process.stdout.write("Running pre-flight checks... ")

    // ensure that the file system is in the correct state
    // config file check is handled in the config save method, no need to
    // duplicate it here
    this.fsh.assertFolderIsEmpty(this.config.absoluteGameRoot, this.force)
    // no need to check backupTo, outputTo, or needsProcessingTo since they
    // aren't needed for this step
    if (this.desktopSymlink) {
      // use assert file since it works the same for symlinks
      this.fsh.assertFileDoesNotExist(this.desktopSymlink, this.force)
    }

    console.log(chalk.green("done") + ".\n")
  }

  private createGameRoot() {
    process.stdout.write(
      `Creating game root folder at '${this.config.gameRoot}'... `
    )

    // create game root folder
    this.fsh.tryFileSystemOperation(() => {
      fse.mkdirSync(this.config.absoluteGameRoot, { recursive: true })
    })

    // warn if the game directory is part of a case-sensitive filesystem
    const wasWarned = this.fsh.warnIfCaseSensitiveFolder(
      this.config.absoluteGameRoot
    )
    if (wasWarned) {
      // set canary global variable
      globalThis.wasWarned = true
    } else {
      console.log(chalk.green("done") + ".")
    }
  }

  private async createGameTemplateFolders() {
    process.stdout.write(
      `Creating game root folder structure from KotOR ${this.config.kotor} template... `
    )

    let count = 0
    // don't use path.join() here since these will be bundled with the
    // executable
    const gameDirsFile =
      this.config.kotor === 1
        ? path.join(k1AssetsDir, "steam-folders.txt")
        : path.join(k2AssetsDir, "steam-folders.txt")
    await this.fsh.readFileLines(gameDirsFile, (line) => {
      const splitLine = line.split("/")
      fse.mkdirSync(path.join(this.config.absoluteGameRoot, ...splitLine), {
        recursive: true,
      })
      count++
    })

    console.log(chalk.green("done") + `, ${count} created.`)
  }

  private createSymlink() {
    if (this.desktopSymlink) {
      process.stdout.write(
        `Creating desktop symlink '${path.basename(this.desktopSymlink)}'... `
      )

      this.fsh.tryFileSystemOperation(() => {
        // can safely cast since we confirmed the existence above
        fse.symlinkSync(
          this.config.absoluteGameRoot,
          this.desktopSymlink as string
        )
      })

      console.log(chalk.green("done") + ".")
    }
  }
}
