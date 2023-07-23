#! /usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings"
import chalk from "chalk"

import type { FinalizeCommandResult } from "./finalize"
import { finalizeCommand } from "./finalize"
import type { InitializeCommandResult } from "./initialize"
import { initializeCommand } from "./initialize"

export type SubCommandResults = InitializeCommandResult | FinalizeCommandResult

globalThis.wasWarned = false

const program = new Command()
  .name("ksm")
  .version("3.0.0")
  .description(
    "Tools to help make modding Star Wars: Knights of the Old Republic I & II easier on the Nintendo Switch."
  )
  .addOption(
    new Option(
      // language=JSRegexp
      "-i, --config-input <path>",
      "specify the target configuration file path"
    )
      .default("config.json")
      .env("KSM_CONFIG_FILE")
  )
  // .passThroughOptions()
  .addCommand(initializeCommand)
  .addCommand(finalizeCommand)
  .hook("preSubcommand", (thisCommand) => {
    const opts = thisCommand.optsWithGlobals()
    globalThis.configFile = opts.configInput as string
  })
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
  .action((options, command) => {
    command.help()
  })

if (require.main === module) {
  program.parseAsync(process.argv).catch(() => {})
}
