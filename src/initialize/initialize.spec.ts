import fse from "fs-extra"
import crypto from "node:crypto"
import os from "node:os"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { relativeK1Config, relativeK2Config } from "!/test/constants"
import { FILE_SYSTEM_ERROR } from "~/constants"
import { initializeCommand } from "~/initialize/command"
import { Initialize } from "~/initialize/initialize"
import { Config } from "~/util/config"

function generateSymlinkPath(name: string) {
  return path.join(
    os.homedir(),
    "Desktop",
    `${name}-${crypto.randomBytes(20).toString("hex")}`
  )
}

function mockExistingK1Structure(tempDir: string) {
  // nothing too special about this folder, just the last
  // deeply-nested folder in the assets/k1/steam-folders.txt file
  // noinspection SpellCheckingInspection
  fse.mkdirSync(
    path.join(
      tempDir,
      relativeK1Config.gameRoot,
      "streamwaves",
      "stn57",
      "c01001"
    ),
    {
      recursive: true,
    }
  )
}

function mockExistingK2Structure(tempDir: string) {
  // nothing too special about this folder, just the last
  // deeply-nested folder in the assets/k2/steam-folders.txt file
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

function checkSuccessfulInit(tempDir: string, symlink?: string) {
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

function checkSuccessfulK1Init(gameDir: string) {
  // noinspection SpellCheckingInspection
  if (
    !fse
      // nothing too special about this folder, just the first
      // deeply-nested folder in the assets/k1/steam-folders.txt file
      .statSync(path.join(gameDir, "streamwaves", "globe", "band01"))
      .isDirectory()
  ) {
    // noinspection SpellCheckingInspection
    throw new Error("streamwaves/globe/band01 is not a folder")
  }
}

function checkSuccessfulK2Init(gameDir: string) {
  // noinspection SpellCheckingInspection
  if (
    !fse
      // nothing too special about this folder, just the first
      // deeply-nested folder in the assets/k2/steam-folders.txt file
      .statSync(path.join(gameDir, "streamvoice", "001", "3cfd"))
      .isDirectory()
  ) {
    // noinspection SpellCheckingInspection
    throw new Error("streamvoice/001/3cfd is not a folder")
  }
}

describe("blank K1 env", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("no force, with symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
      desktopSymlink: generateSymlinkPath("kotor1"),
    }

    config.data = configData
    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir, configData.desktopSymlink)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
    fse.rmSync(configData.desktopSymlink)
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("blank K2 env", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK2Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("no force, with symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK2Config,
      kotor: "2",
      k2: true,
      desktopSymlink: generateSymlinkPath("kotor2"),
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir, configData.desktopSymlink)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
    fse.rmSync(configData.desktopSymlink)
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK2Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K1 config", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await expect(initialize.run()).rejects.toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K2 config", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await expect(initialize.run()).rejects.toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K1 structure", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    mockExistingK1Structure(tempDir)

    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await expect(initialize.run()).rejects.toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    mockExistingK1Structure(tempDir)

    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      k1: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K2 structure", () => {
  test("no force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    mockExistingK2Structure(tempDir)

    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
    })
    await expect(initialize.run()).rejects.toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", async () => {
    const tempDir = temporaryDirectory()
    mockExistingK2Structure(tempDir)

    const config = new Config(
      initializeCommand,
      path.join(tempDir, "config.json")
    )
    const configData = {
      ...relativeK1Config,
      kotor: "2",
      k2: true,
    }
    config.data = configData

    const initialize = new Initialize(initializeCommand, {
      ...configData,
      config,
      force: true,
    })
    await initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK2Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})
