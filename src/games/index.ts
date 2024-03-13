import type { Class } from "type-fest"

import k1steps from "~/games/k1/steps"
import k2steps from "~/games/k2/steps"
import type { AbstractFinalize } from "~/steps/finalize"
import type { AbstractInitialize } from "~/steps/initialize"
import type { ConfigData } from "~/steps/util/config"

export type Steps = {
  Initialize: Class<
    AbstractInitialize,
    ConstructorParameters<typeof AbstractInitialize>
  >
  Finalize: Class<
    AbstractFinalize,
    ConstructorParameters<typeof AbstractFinalize>
  >
}
export type GameStepsMap = Record<ConfigData["kotor"], Steps>
export const gameStepsMap: GameStepsMap = {
  1: k1steps,
  2: k2steps,
}
