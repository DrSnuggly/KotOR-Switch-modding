import chalk from "chalk"
import fse from "fs-extra"
import crypto from "node:crypto"
import readline from "readline"
import wrap from "word-wrap"

import { FILE_SYSTEM_ERROR, wrapOptions } from "~/constants"
import type { SubCommandResults } from "~/main"

export async function tryFileSystemOperation(
  fn: () => void | Promise<void>,
  command: SubCommandResults
) {
  try {
    await fn()
  } catch (e) {
    console.error(chalk.red("error") + "!\n")
    command.error(
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

export async function readFileLines(
  file: string,
  callback: (line: string) => void | Promise<void> | true | Promise<true>,
  stopIterationSignal = true
) {
  const fileStream = fse.createReadStream(file)

  const rl = readline.createInterface({
    input: fileStream,
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.
    crlfDelay: Infinity,
  })

  // this is pretty finicky — any async functions before this will cause the
  // readline to close before it's done
  for await (const line of rl) {
    // break early if the callback returns true
    if ((await callback(line)) === stopIterationSignal) break
  }

  rl.close()
}

export async function checksumFile(path: string, hashName = "sha1") {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(hashName)
    const stream = fse.createReadStream(path)
    stream.on("error", (err) => reject(err))
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
  })
}
