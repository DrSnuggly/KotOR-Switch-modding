import { BaseSequencer, type WorkspaceSpec } from "vitest/node"

export class CustomSequencer extends BaseSequencer {
  public async sort(files: WorkspaceSpec[]) {
    // not worried about performance since all tests are fast, so for
    // ease of testing, ensure the following WorkspaceSpecs are run first:
    // - util/config.spec.ts
    // - util/fs-helpers.spec.ts
    // - util/preflight.spec.ts
    // - util/preflight.conflicting1.spec.ts
    // - util/preflight.conflicting2.spec.ts
    // - util/preflight.conflicting3.spec.ts
    // - initialize.spec.ts
    // and ensure the following are run last:
    // - finalize/index.spec.ts
    // - main.spec.ts

    return files.sort((a, b) => {
      if (a[1].endsWith("util/config.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/config.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("util/fs-helpers.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/fs-helpers.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("util/preflight.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/preflight.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("util/preflight.conflicting1.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/preflight.conflicting1.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("util/preflight.conflicting2.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/preflight.conflicting2.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("util/preflight.conflicting3.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("util/preflight.conflicting3.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("initialize.spec.ts")) {
        return -1
      }
      if (b[1].endsWith("initialize.spec.ts")) {
        return 1
      }
      if (a[1].endsWith("finalize/index.spec.ts")) {
        return 1
      }
      if (b[1].endsWith("finalize/index.spec.ts")) {
        return -1
      }
      if (a[1].endsWith("main.spec.ts")) {
        return 1
      }
      if (b[1].endsWith("main.spec.ts")) {
        return -1
      }
      return 0
    })
  }
}
