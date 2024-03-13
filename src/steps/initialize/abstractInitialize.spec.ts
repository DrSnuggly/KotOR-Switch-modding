import fse from "fs-extra"
import crypto from "node:crypto"
import os from "node:os"
import path from "node:path"

import { relativeK1Config } from "!/test/constants"

export function generateSymlinkPath(name: string) {
  return path.join(
    os.homedir(),
    "Desktop",
    `${name}-${crypto.randomBytes(20).toString("hex")}`
  )
}

export function checkSuccessfulInit(tempDir: string, symlink?: string) {
  // core structure
  if (!fse.statSync(path.join(tempDir, "config.json")).isFile()) {
    throw new Error("config.json is not a file")
  }
  if (
    // K1 and K2 relative config gameRoots are the same
    !fse.statSync(path.join(tempDir, relativeK1Config.gameRoot)).isDirectory()
  ) {
    throw new Error("gameRoot is not a folder")
  }

  // desktop symlink
  if (symlink && !fse.lstatSync(symlink).isSymbolicLink()) {
    throw new Error("symlink path is not a symlink")
  }
}
