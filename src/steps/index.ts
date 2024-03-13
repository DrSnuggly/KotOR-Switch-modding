import type { Command, OptionValues } from "@commander-js/extra-typings"

import type { GameStepsMap } from "~/games"

// sub-command builder
export type SubCommandBuilder<R extends Command<[], OptionValues>> = (
  gameMap: GameStepsMap
) => R
