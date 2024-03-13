import { Command, Option } from "@commander-js/extra-typings"
import path from "node:path"

import type { SubCommandBuilder } from "~/steps"
import type { ConfigData } from "~/steps/util/config"
import { languageCodes } from "~/steps/util/config"
import { Config } from "~/steps/util/config"

const gameRootSiblingPlaceholder = "(sibling of '-c, --config-file')"

// omit const arrays from type
export type ActionParams = Omit<ConfigData, "kotor" | "languageCode"> & {
  kotor: string
  languageCode: string
  k1?: boolean
  k2?: boolean
  desktopSymlink: boolean
  desktopSymlinkName?: string
  force?: boolean
}
export type InitializeCommand = Command<[], ActionParams>

export const buildInitializeCommand: SubCommandBuilder<InitializeCommand> = (
  gameMap
) =>
  new Command()
    .name("init")
    .summary("initialize the game root structure that many mods expect")
    .description(
      "Initialize the game root structure that many mods expect.\n" +
        "This will also create a config.json in the provided folder to persist the configuration."
    )
    .configureHelp({ showGlobalOptions: true })
    // game options
    .addOption(
      new Option(
        // language=RegExp
        "-k, --kotor <game>",
        "specify which game's folder structure template should be used"
      )
        .choices(["1", "2"])
        .makeOptionMandatory()
    )
    .addOption(
      new Option(
        "-k1",
        "use Star Wars: Knights of the Old Republic I as the folder structure template"
      )
        .conflicts(["k2", "kotor"])
        .implies({ kotor: "1" })
    )
    .addOption(
      new Option(
        "-k2",
        "use Star Wars: Knights of the Old Republic II as the folder structure template"
      )
        .conflicts(["k1", "kotor"])
        .implies({ kotor: "2" })
    )
    .addOption(
      new Option(
        // language=RegExp
        "-l, --language-code <language code>",
        "specify the localization to use for the game"
      )
        .default("en")
        .choices(languageCodes)
    )
    // folder options
    .option(
      // language=RegExp
      "-g, --game-root <folder>",
      "specify an empty folder that will function as the game root folder",
      gameRootSiblingPlaceholder
    )
    .option(
      // language=RegExp
      "-b, --backup-to <folder>",
      "specify the path to back up the game root folder to when finalizing",
      gameRootSiblingPlaceholder
    )
    .option(
      // language=RegExp
      "-o, --output-to <folder>",
      "specify the path to output the finalized game root folder to",
      gameRootSiblingPlaceholder
    )
    .option(
      // language=RegExp
      "-m, --needs-processing-to <folder>",
      "specify the path to place game textures that will need manual processing",
      gameRootSiblingPlaceholder
    )
    // symlink options
    .addOption(
      new Option(
        "-S, --no-desktop-symlink",
        "do not create a symlink to the game root folder on this user's desktop"
      ).conflicts("desktopSymlinkName")
    )
    .addOption(
      new Option(
        // language=RegExp
        "-s, --desktop-symlink-name <name>",
        "specify the name of the symlink to create on this user's desktop; if" +
          " not provided, the game version name will be used"
      ).conflicts("desktopSymlink")
    )
    // overwrite options
    .option(
      "-f, --force",
      "remove any existing config file or game root contents before initializing; if not provided, no action will be taken they exist"
    )
    .action((options, command) => {
      // get configFile from parent command options
      const config = new Config(
        command,
        command.optsWithGlobals().configFile as string
      ) // no load from file since it (probably) doesn't exist yet

      // if outputs are the command option placeholder, calculate it to be in
      // the parent directory of the config file
      if (options.outputTo === gameRootSiblingPlaceholder)
        options.outputTo = path.join(config.configParent, "output")
      if (options.gameRoot === gameRootSiblingPlaceholder)
        options.gameRoot = path.join(config.configParent, "game-root")
      if (options.backupTo === gameRootSiblingPlaceholder)
        options.backupTo = path.join(config.configParent, "backup")
      if (options.needsProcessingTo === gameRootSiblingPlaceholder) {
        options.needsProcessingTo = path.join(
          config.configParent,
          "_NEEDS_PROCESSING"
        )
      }

      // set config and run
      config.data = options
      const desktopSymlink =
        options.desktopSymlinkName ?? `kotor${options.kotor}`

      // construct and run the initializer for the specified game
      new gameMap[config.kotor].Initialize(command, {
        ...options,
        config,
        desktopSymlink,
      }).run()
    })
