import fse from "fs-extra"
import fswin from "fswin"
import { exec as nodeExec } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"
import os from "os"
import { temporaryDirectory } from "tempy"
import { afterAll, beforeAll } from "vitest"

import { FILE_SYSTEM_ERROR } from "~/constants"
import { mainCommand } from "~/main"
import { FSHelpers } from "~/util/fs-helpers"

const fsh = new FSHelpers(mainCommand)
// promisify exec, so we can use await instead of messing with callbacks
const exec = promisify(nodeExec)

describe("file system error wrapper", () => {
  let tempDir: string
  beforeAll(() => {
    tempDir = temporaryDirectory()
  })
  afterAll(() => {
    fse.rmSync(tempDir, { recursive: true })
  })

  test("fail to assert fs op succeeds without error", () => {
    const badReference = path.join(tempDir, "bad-reference.json")

    expect(() => {
      fsh.tryFileSystemOperation(() => {
        fse.readJSONSync(badReference)
      })
    }).toThrowError(FILE_SYSTEM_ERROR.toString())
  })
  test("fs op succeeds without error", () => {
    const testFile = path.join(tempDir, "test-file.json")
    fse.writeFileSync(testFile, "test")

    fsh.tryFileSystemOperation(() => {
      fse.readFileSync(testFile)
    })
    expect(mockExit).not.toHaveBeenCalled()
  })
})

describe(
  "case-sensitive filesystem warning",
  () => {
    // OS checks are for platform-specific commands to create the requisite
    // environments. do not assume that specific OSes (or even file systems)
    // will always be case-sensitive or otherwise, always do it on a per-folder
    // basis
    describe.runIf(os.platform() === "linux")("Linux", () => {
      test.each([
        {
          fsType: "fat",
          mountOpts: "uid=$(id -u),gid=$(id -g)",
          skipChown: true,
          result: false,
        },
        {
          fsType: "ext3",
          mountOpts: undefined,
          skipChown: false,
          result: true,
        },
        {
          fsType: "ext4",
          mountOpts: undefined,
          skipChown: false,
          result: true,
        },
      ])(
        "$fsType: $result",
        async ({ fsType, mountOpts, skipChown, result }) => {
          const tempDir = temporaryDirectory()
          const imgPath = path.join(tempDir, "fs.img")
          const mntPath = path.join(tempDir, "mnt")

          // create a file filled with zeroes
          await exec(`dd if=/dev/zero of=${imgPath} bs=4k count=512`)
          // create the filesystem
          await exec(`mkfs.${fsType} ${imgPath}`)
          // mount the image
          await exec(`mkdir ${mntPath}`)
          // have to use sudo to mount the image, can't find a user-land way to
          // do it that doesn't ALSO require root or complex setup
          await exec(
            `sudo mount${
              mountOpts ? ` -o ${mountOpts}` : ""
            } ${imgPath} ${mntPath}`
          )
          // some file systems can't chown the mount folder after mounting
          if (!skipChown)
            await exec(`sudo chown $(id -u):$(id -g) -R ${mntPath}`)

          expect(fsh.warnIfCaseSensitiveFolder(mntPath)).toBe(result)

          await exec(`sudo umount ${mntPath}`)
          fse.rmSync(tempDir, { recursive: true })
        }
      )
    })
    describe.runIf(os.platform() === "darwin")("macOS", () => {
      test.each([
        {
          imgType: "MS-DOS",
          result: false,
        },
        {
          imgType: "ExFAT",
          result: false,
        },
        {
          imgType: "APFS",
          result: false,
        },
        {
          imgType: "Case-sensitive APFS",
          result: true,
        },
        {
          imgType: "Journaled HFS+",
          result: false,
        },
        {
          imgType: "Case-sensitive Journaled HFS+",
          result: true,
        },
      ])("$imgType: $result", async ({ imgType, result }) => {
        const tempDir = temporaryDirectory()
        const imgPath = path.join(tempDir, "temp.dmg")
        const mntPath = path.join(tempDir, "mnt")

        // create a case-insensitive disk image
        await exec(
          `hdiutil create -size 2m -fs '${imgType}' ${imgPath} -nospotlight`
        )
        // mount the image
        await exec(
          `hdiutil attach ${imgPath} -mountpoint ${mntPath} -nobrowse -noverify -noautofsck -noautoopen`
        )

        expect(fsh.warnIfCaseSensitiveFolder(mntPath)).toBe(result)

        await exec(`hdiutil detach ${mntPath} -force`)
        fse.rmSync(tempDir, { recursive: true })
      })
    })
    describe.runIf(os.platform() === "win32")("Windows", () => {
      test.each([
        {
          sensitivity: "disable",
          result: false,
        },
        {
          sensitivity: "enable",
          result: true,
        },
      ])(
        "sensitivity $sensitivity: $result",
        async ({ sensitivity, result }) => {
          const tempDir = temporaryDirectory()
          // disable case-sensitivity for tempDir using fsutil
          await exec(
            `fsutil.exe file setCaseSensitiveInfo ${tempDir} ${sensitivity}`
          )

          expect(fsh.warnIfCaseSensitiveFolder(tempDir)).toBe(result)
          fse.rmSync(tempDir, { recursive: true })
        }
      )
    })
  },
  { timeout: 30 * 1000 } // 30 seconds
)

describe("file read stream", () => {
  const lines = ["line1", "line2", "line3"]
  let tempDir: string
  beforeAll(() => {
    tempDir = temporaryDirectory()
  })
  afterAll(() => {
    fse.rmSync(tempDir, { recursive: true })
  })

  test("no ending newline", async () => {
    const tempFile = path.join(tempDir, "no-ending-newline.txt")
    fse.writeFileSync(tempFile, lines.join("\n"))

    const readLines: string[] = []
    await fsh.readFileLines(tempFile, (line: string) => {
      readLines.push(line)
      expect(lines).toContain(line)
    })
    expect(readLines).toEqual(lines)
  })
  test("with ending newline", async () => {
    const tempFile = path.join(tempDir, "with-ending-newline.txt")
    fse.writeFileSync(tempFile, lines.join("\n") + "\n")

    const readLines: string[] = []
    await fsh.readFileLines(tempFile, (line: string) => {
      readLines.push(line)
      expect(lines).toContain(line)
    })
    expect(readLines).toEqual(lines)
  })
  test("CRLF line endings", async () => {
    const tempFile = path.join(tempDir, "CRLF-line-endings.txt")
    fse.writeFileSync(tempFile, lines.join("\r\n"))

    const readLines: string[] = []
    await fsh.readFileLines(tempFile, (line: string) => {
      readLines.push(line)
      expect(lines).toContain(line)
    })
    expect(readLines).toEqual(lines)
  })
  test("read 2 lines then stop", async () => {
    const tempFile = path.join(tempDir, "2-lines-then-stop.txt")
    fse.writeFileSync(tempFile, lines.join("\n"))

    const readLines: string[] = []
    await fsh.readFileLines(tempFile, (line: string) => {
      readLines.push(line)
      if (readLines.length === 2) return true
    })
    expect(readLines).toEqual(lines.slice(0, 2))
  })
})

describe("checksum files", () => {
  let tempDir: string
  let tempFile: string
  beforeAll(() => {
    tempDir = temporaryDirectory()
    tempFile = path.join(tempDir, "test-file.txt")
    fse.writeFileSync(tempFile, "test\n")
  })
  afterAll(() => {
    fse.rmSync(tempDir, { recursive: true })
  })

  test("file checksum matches", async () => {
    // generated via 'openssl sha1'
    const originalChecksum = "4e1243bd22c66e76c2ba9eddc1f91394e57f9f83"
    const calculatedChecksum = await fsh.checksumFile(tempFile)
    expect(calculatedChecksum).toEqual(originalChecksum)
  })
  test("file checksum does not match", async () => {
    const fakeChecksum = "0000000000000000000000000000000000000000"
    const calculatedChecksum = await fsh.checksumFile(tempFile)
    expect(calculatedChecksum).not.toEqual(fakeChecksum)
  })
})

describe("folder status", () => {
  let tempDir: string
  beforeAll(() => {
    tempDir = temporaryDirectory()
  })
  afterAll(() => {
    fse.rmSync(tempDir, { recursive: true })
  })

  test("folder is empty", () => {
    const tempDir = temporaryDirectory()

    fsh.assertFolderIsEmpty(tempDir)
    expect(mockExit).not.toHaveBeenCalled()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("folder has folder", () => {
    const tempDir = temporaryDirectory()
    fse.mkdirSync(path.join(tempDir, "subfolder"))

    expect(() => fsh.assertFolderIsEmpty(tempDir)).toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )

    fse.rmSync(tempDir, { recursive: true })
  })
  test("folder has normal file", () => {
    const tempDir = temporaryDirectory()
    fse.writeFileSync(path.join(tempDir, "file"), "test")

    expect(() => fsh.assertFolderIsEmpty(tempDir)).toThrowError(
      FILE_SYSTEM_ERROR.toString()
    )

    fse.rmSync(tempDir, { recursive: true })
  })
  test("folder has hidden file", () => {
    const tempDir = temporaryDirectory()
    const hiddenFile = path.join(tempDir, ".file")
    fse.writeFileSync(hiddenFile, "test")
    // use fswin to set hidden attribute on Windows
    if (os.platform() === "win32") {
      fswin.setAttributesSync(hiddenFile, { IS_HIDDEN: true })
    }

    fsh.assertFolderIsEmpty(tempDir)
    expect(mockExit).not.toHaveBeenCalled()

    fse.rmSync(tempDir, { recursive: true })
  })
})
