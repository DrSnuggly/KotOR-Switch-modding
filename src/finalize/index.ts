import { Command, Option } from "@commander-js/extra-typings"

import type { finalizeParams } from "~/finalize/shared"
import { getConfig } from "~/util/config"
import { assertConfigFileExists } from "~/util/preflight"

import { finalizeK1 } from "./k1"
import { finalizeK2 } from "./k2"

export type FinalizeCommandResult = Command<[], finalizeParams>
export const finalizeCommand: FinalizeCommandResult = new Command()
  .name("finalize")
  .summary(
    "restructure the game folder to what the Nintendo Switch game port expects"
  )
  .description(
    "Restructure the game folder to what the Nintendo Switch game port expects. By default, this will also create a backup of the current game folder contents before making changes."
  )
  .configureHelp({ showGlobalOptions: true })
  // hidden because this should really only ever be used during testing
  .addOption(
    new Option(
      "-f, --force",
      "force finalization even if the game root folder has already been finalized"
    )
      .default(false)
      .hideHelp()
  )
  // the --no- prefix uses the suffix as the variable with the default as true
  // so --no-backup is the same as backup = false
  .addOption(
    new Option(
      "-n, --no-backup",
      "do not back up the current game directory contents before finalizing"
    ).conflicts("forceBackup")
  )
  .addOption(
    new Option(
      "-fb, --force-backup",
      "force backing up the game root folder contents before finalizing, even if the backup folder already exists"
    ).conflicts("backup")
  )
  .addOption(
    new Option(
      "-r, --restore-backup",
      "delete the finalized game root folder and restore from the backup folder"
    )
  )
  .action(async (options, command) => {
    await assertConfigFileExists(command)
    const game = getConfig().game
    if (game === 1) {
      await finalizeK1(command, options)
    } else {
      await finalizeK2(command, options)
    }
  })
