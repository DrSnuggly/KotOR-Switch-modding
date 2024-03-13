import fse from "fs-extra"
import os from "node:os"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { relativeK1Config, relativeK2Config } from "!/test/constants"
import { FILE_SYSTEM_ERROR } from "~/constants"
import { Initialize } from "~/games/k2/initialize"
import { mainCommand } from "~/main"
import {
  checkSuccessfulInit,
  generateSymlinkPath,
} from "~/steps/initialize/abstractInitialize.spec"
import { Config } from "~/steps/util/config"

export function mockExistingK2Structure(tempDir: string) {
  // nothing too special about this folder, just the last
  // deeply-nested folder in the ./assets/steam-folders.txt file
  // noinspection SpellCheckingInspection
  fse.mkdirSync(
    path.join(
      tempDir,
      relativeK2Config.gameRoot,
      "streamvoice",
      "gbl",
      "visasmarr"
    ),
    {
      recursive: true,
    }
  )
}

export function checkSuccessfulK2Init(gameDir: string) {
  // noinspection SpellCheckingInspection
  if (
    !fse
      // nothing too special about this folder, just the first
      // deeply-nested folder in the ./assets/steam-folders.txt file
      .statSync(path.join(gameDir, "streamvoice", "001", "3cfd"))
      .isDirectory()
  ) {
    // noinspection SpellCheckingInspection
    throw new Error("streamvoice/001/3cfd is not a folder")
  }
}

describe("blank K2 env", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK2Config,
      kotor: "2",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test.skipIf(os.platform() === "linux")("no force, with symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK2Config,
      kotor: "2",
      desktopSymlink: generateSymlinkPath("kotor2"),
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir, configData.desktopSymlink)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
    fse.rmSync(configData.desktopSymlink)
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK2Config,
      kotor: "2",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K2 config", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "2",
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    expect(() => initialize.run()).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "2",
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K2 structure", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingK2Structure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "2",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    expect(() => initialize.run()).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingK2Structure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "2",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})
