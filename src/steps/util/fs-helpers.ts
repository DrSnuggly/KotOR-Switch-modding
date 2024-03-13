import type { Command, OptionValues } from "@commander-js/extra-typings"
import chalk from "chalk"
import fse from "fs-extra"
import globby from "globby"
import crypto from "node:crypto"
import { open } from "node:fs/promises"
import path from "node:path"
import wrap from "word-wrap"

import { FILE_SYSTEM_ERROR, INVALID_INPUT, wrapOptions } from "~/constants"

export class FSHelpers {
  constructor(private readonly command: Command<[], OptionValues>) {}

  tryFileSystemOperation<T = void | Promise<void>>(fn: () => T): T {
    try {
      return fn()
    } catch (e) {
      console.error(chalk.red("error") + "!\n")
      this.command.error(
        chalk.red.bold(
          wrap(
            "Encountered file system error: " + (e as Error).message,
            wrapOptions
          )
        ),
        { exitCode: FILE_SYSTEM_ERROR }
      )
    }
  }

  warnIfCaseSensitiveFolder(folderPath: string) {
    // test if the directory is case-sensitive and exit if it is, since the
    // modded Nintendo Switch SD card is not case-sensitive
    const testFileName = ".case-sensitivity-test"
    const testFilePath = path.join(folderPath, testFileName)
    return this.tryFileSystemOperation(() => {
      fse.writeFileSync(testFilePath, testFileName)

      // keep removal of the test file in a separate try-catch block for
      // proper handling
      try {
        // try to remove the same file, but with a different case
        fse.rmSync(path.join(folderPath, testFileName.toUpperCase()))
      } catch (e) {
        // re-raise non-ENOENT errors
        if (e instanceof Error && (!("code" in e) || e.code !== "ENOENT")) {
          throw e
        }

        // remove the originally-named test file
        fse.rmSync(testFilePath)
        // don't exit, since there are circumstances where this is okay (e.g.
        // only installing one mod)
        console.warn(chalk.yellow("warning") + "!")
        console.warn(
          chalk.yellow(
            wrap(
              "The game root folder looks like it's part of a case-sensitive filesystem, which will likely cause issues since the modded Nintendo Switch SD card filesystem is case-insensitive.\n" +
                "  It's highly recommended to provide a different, case-insensitive folder (e.g. by creating an disk image with a case-insensitive file system and mounting it).",
              wrapOptions
            )
          )
        )
        return true
      }
      return false
    })
  }

  async readFileLines(
    filePath: string,
    callback: (line: string) => void | Promise<void> | true | Promise<true>,
    stopIterationSignal = true
  ) {
    this.assertFileExists(filePath)

    return this.tryFileSystemOperation(async () => {
      const file = await open(filePath, "r")

      // this is pretty finicky — any async functions before this will cause the
      // readline to close before it's done
      for await (const line of file.readLines()) {
        // break early if the callback returns true
        if ((await callback(line)) === stopIterationSignal) break
      }

      await file.close()
    })
  }

  async checksumFile(path: string, hashName = "sha1") {
    this.assertFileExists(path)
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(hashName)
      const stream = fse.createReadStream(path)
      stream.on("error", (err) => reject(err))
      stream.on("data", (chunk) => hash.update(chunk))
      stream.on("end", () => resolve(hash.digest("hex")))
    })
  }

  assertFolderIsEmpty(folderPath: string, force = false) {
    this.tryFileSystemOperation(() => {
      // ensure the folder path really is a folder
      if (
        fse.existsSync(folderPath) &&
        !fse.statSync(folderPath).isDirectory()
      ) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              `The specified path '${folderPath}' is not a folder.`,
              wrapOptions
            )
          ),
          { exitCode: FILE_SYSTEM_ERROR }
        )
      }

      // if folder is empty, return early
      if (
        globby.sync(folderPath.replace(/\\/g, "/"), { onlyFiles: false })
          .length === 0
      ) {
        return
      }

      // if there are contents, but we're not forcing it, throw an error
      if (!force) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
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
    })
  }

  assertFileExists(filePath: string) {
    this.tryFileSystemOperation(() => {
      // ensure this is a file
      if (fse.existsSync(filePath) && !fse.statSync(filePath).isFile()) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              "Cannot find the provided config file. Use 'ksm help init' for assistance with fixing this.",
              wrapOptions
            )
          ),
          { exitCode: FILE_SYSTEM_ERROR }
        )
      }
    })
  }

  assertFileDoesNotExist(filePath: string, force = false) {
    this.tryFileSystemOperation(() => {
      // if file doesn't exist, return early
      if (!fse.existsSync(filePath)) return
      // if it does, but we're not forcing it, throw an error
      if (!force) {
        console.error(chalk.red("error") + "!\n")
        this.command.error(
          chalk.red.bold(
            wrap(
              `The specified file '${filePath}' already exists.`,
              wrapOptions
            )
          ),
          { exitCode: INVALID_INPUT }
        )
      }
      // otherwise, delete it
      fse.rmSync(filePath, { force: true })
    })
  }
}
