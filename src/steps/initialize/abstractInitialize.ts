import type { Command, OptionValues } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import type { symlink } from "node:fs"
import os from "node:os"
import path from "node:path"

import type { Config } from "~/steps/util/config"
import { FSHelpers } from "~/steps/util/fs-helpers"


type InitializeParams = {
  desktopSymlink?: string
  force?: boolean
  config: Config
}

export abstract class AbstractInitialize {
  readonly config: Config
  readonly fsh: FSHelpers

  // options from command
  readonly force: boolean
  readonly desktopSymlink?: string

  // properties to override
  abstract readonly pcFolders: string[]

  constructor(
    readonly command: Command<[], OptionValues>,
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

  run() {
    this.preflight()

    this.config.save(this.force)
    this.createGameRoot()
    this.createGameTemplateFolders()
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

  private createGameTemplateFolders() {
    process.stdout.write(
      `Creating game root folder structure from KotOR ${this.config.kotor} template... `
    )

    let count = 0
    for (const steamFolder of this.pcFolders) {
      const pathComponents = steamFolder.split("/")
      fse.mkdirSync(
        path.join(this.config.absoluteGameRoot, ...pathComponents),
        {
          recursive: true,
        }
      )
      count++
    }

    console.log(chalk.green("done") + `, ${count} created.`)
  }

  private createSymlink() {
    if (this.desktopSymlink) {
      process.stdout.write(
        `Creating desktop symlink '${path.basename(this.desktopSymlink)}'... `
      )

      // force a junction type on Windows OS due to admin permission issues
      let type: symlink.Type | undefined = undefined
      if (os.platform() === "win32") type = "junction"

      this.fsh.tryFileSystemOperation(() => {
        // can safely cast since we confirmed the existence above
        fse.symlinkSync(
          this.config.absoluteGameRoot,
          this.desktopSymlink as string,
          type
        )
      })

      console.log(chalk.green("done") + ".")
    }
  }
}
