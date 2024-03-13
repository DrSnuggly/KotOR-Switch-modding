import { BaseSequencer, type WorkspaceSpec } from "vitest/node"

export class CustomSequencer extends BaseSequencer {
  // Suppress async warning, since we need to match the class that's being
  // extended.
  // eslint-disable-next-line @typescript-eslint/require-await
  public async sort(files: WorkspaceSpec[]) {
    // Execute helper tests first for easier debugging.
    return files.sort((a, b) => {
      // a[1] and b[1] are the file paths
      if (a[1].includes("util/config.spec.ts")) return -1
      if (b[1].includes("util/config.spec.ts")) return 1
      if (a[1].includes("util/fs-helpers.spec.ts")) return -1
      if (b[1].includes("util/fs-helpers.spec.ts")) return 1
      return 0
    })
  }
}
