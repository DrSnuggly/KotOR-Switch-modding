import { Command, Option } from "@commander-js/extra-typings"

import type { SubCommandBuilder } from "~/steps"
import { Config } from "~/steps/util/config"

export type ActionParams = {
  force: boolean
  backup: boolean
  forceBackup?: boolean
  restoreBackup?: boolean
}
export type FinalizeCommand = Command<[], ActionParams>

export const buildFinalizeCommand: SubCommandBuilder<FinalizeCommand> = (
  gameMap
) =>
  new Command()
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
        // language=RegExp
        "delete the finalized game root folder and restore from the backup folder"
      )
    )
    .action(async (options, command) => {
      // get configFile from parent command options
      const config = new Config(
        command,
        command.optsWithGlobals().configFile as string
      )

      await new gameMap[config.kotor].Finalize(command, {
        ...options,
        config,
      }).run()
    })
