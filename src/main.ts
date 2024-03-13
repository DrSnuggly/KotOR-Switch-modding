#! /usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings"
import chalk from "chalk"

import { gameStepsMap } from "~/games"
import { buildFinalizeCommand } from "~/steps/finalize/command"
import { buildInitializeCommand } from "~/steps/initialize/command"

globalThis.wasWarned = false

export type MainCommand = Command<[], { configFile: string }>
export const mainCommand: MainCommand = new Command()
  .name("ksm")
  .version("3.0.0")
  .description(
    "Tools to help make modding easier for Star Wars: Knights of the Old" +
      " Republic I & II for Nintendo Switch."
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
  // steps
  .addCommand(buildInitializeCommand(gameStepsMap))
  .addCommand(buildFinalizeCommand(gameStepsMap))
  // post-run status check
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
  // default help command
  .action((_, command) => {
    command.help()
  })

// run command and handle unexpected errors
if (require.main === module) {
  mainCommand.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red.bold("\nUnexpected error!"))
    console.error(error)
    process.exit(-1)
  })
}
