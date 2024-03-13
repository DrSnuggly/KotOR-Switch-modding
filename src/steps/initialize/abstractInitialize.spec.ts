import fse from "fs-extra"
import crypto from "node:crypto"
import os from "node:os"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { relativeK1Config } from "!/test/constants"
import { FILE_SYSTEM_ERROR } from "~/constants"
import { mainCommand } from "~/main"
import { AbstractInitialize } from "~/steps/initialize/abstractInitialize"
import { Config } from "~/steps/util/config"

const pcFolders = [
  "test1",
  "test1/test1",
  "test1/test2",
  "test2",
  "test2/test1",
  "test2/test2",
]

class TestInitialize extends AbstractInitialize {
  pcFolders = pcFolders
}

export function mockExistingStructure(tempDir: string) {
  fse.mkdirSync(
    path.join(
      tempDir,
      relativeK1Config.gameRoot,
      ...pcFolders.filter((item) => item.includes("/"))[0].split("/")
    ),
    { recursive: true }
  )
}

export function generateSymlinkPath(name: string) {
  return path.join(
    os.homedir(),
    "Desktop",
    `${name}-${crypto.randomBytes(20).toString("hex")}`
  )
}

export type CheckSuccessfulInitParams = {
  tempDir: string
  symlink?: string
}

export function checkSuccessfulInit({
  tempDir,
  symlink,
}: CheckSuccessfulInitParams) {
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

describe("blank env", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    new TestInitialize(mainCommand, {
      ...configData,
      config,
    }).run()
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test.skipIf(os.platform() === "linux")("no force, with symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      desktopSymlink: generateSymlinkPath("kotor1"),
    }
    config.data = configData

    new TestInitialize(mainCommand, {
      ...configData,
      config,
    }).run()
    expect(() => {
      checkSuccessfulInit({ tempDir, symlink: configData.desktopSymlink })
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
    fse.rmSync(configData.desktopSymlink)
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    new TestInitialize(mainCommand, {
      ...configData,
      config,
      force: true,
    }).run()
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing config", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData
    config.save()

    expect(() =>
      new TestInitialize(mainCommand, {
        ...configData,
        config,
      }).run()
    ).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData
    config.save()

    new TestInitialize(mainCommand, {
      ...configData,
      config,
      force: true,
    }).run()
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing structure", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingStructure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    expect(() =>
      new TestInitialize(mainCommand, {
        ...configData,
        config,
      }).run()
    ).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingStructure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    new TestInitialize(mainCommand, {
      ...configData,
      config,
      force: true,
    }).run()
    expect(() => {
      checkSuccessfulInit({ tempDir })
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})
