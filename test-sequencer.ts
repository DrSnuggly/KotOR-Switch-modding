import { BaseSequencer, type WorkspaceSpec } from "vitest/node"

export class CustomSequencer extends BaseSequencer {
  // suppress async warning, since we need to match the class that's being
  // extended
  // eslint-disable-next-line @typescript-eslint/require-await
  public async sort(files: WorkspaceSpec[]) {
    // not worried about performance since all tests are fast, so for
    // ease of testing, ensure the following WorkspaceSpecs are run first:
    // - util/config.spec.ts
    // - util/fs-helpers.spec.ts
    // - initialize/initialize.spec.ts
    // and ensure the following are run last:
    // - finalize/finalize.spec.ts
    // - main.spec.ts

    return files.sort((a, b) => {
      // a[1] and b[1] are the file paths
      if (a[1].includes("util/config.spec.ts")) return -1
      if (b[1].includes("util/config.spec.ts")) return 1
      if (a[1].includes("util/fs-helpers.spec.ts")) return -1
      if (b[1].includes("util/fs-helpers.spec.ts")) return 1
      if (a[1].includes("initialize/initialize.spec.ts")) return -1
      if (b[1].includes("initialize/initialize.spec.ts")) return 1
      if (a[1].includes("finalize/finalize.spec.ts")) return 1
      if (b[1].includes("finalize/finalize.spec.ts")) return -1
      if (a[1].includes("main.spec.ts")) return 1
      if (b[1].includes("main.spec.ts")) return -1
      return 0
    })
  }
}
