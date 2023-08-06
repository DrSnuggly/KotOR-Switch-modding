#! /usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings"
import chalk from "chalk"

import type { FinalizeCommand} from "~/finalize/command";
import { finalizeCommand } from "~/finalize/command"
import type { InitializeCommand } from "~/initialize/command"
import { initializeCommand } from "~/initialize/command"

globalThis.wasWarned = false

export type CommandOptions = {
  configFile: string
}
export type MainCommand = Command<[], CommandOptions>
export type SubCommand = InitializeCommand | FinalizeCommand
export type AnyCommand = MainCommand | SubCommand

export const mainCommand: MainCommand = new Command()
  .name("ksm")
  .version("3.0.0")
  .description(
    "Tools to help make modding Star Wars: Knights of the Old Republic I & II easier on the Nintendo Switch."
  )
  .addOption(
    new Option(
      // language=RegExp
      "-i, --config-file <path>",
      "specify the target configuration file path"
    )
      .default("config.json")
      .env("KSM_CONFIG_FILE")
  )
  .enablePositionalOptions(true)
  .passThroughOptions(true)
  .addCommand(initializeCommand)
  .addCommand(finalizeCommand)
  .hook("postAction", () => {
    if (globalThis.wasWarned) {
      console.warn(
        chalk.yellow.bold(
          "\nFinished with warnings. Please review the output above."
        )
      )
    } else {
      console.log(chalk.green.bold("\nCompleted successfully!"))
    }
  })
  .action((_, command) => {
    command.help()
  })

if (require.main === module) {
  mainCommand.parseAsync(process.argv).catch(() => {})
}
