import { AbstractInitialize } from "~/steps/initialize/abstractInitialize"

import pcFolders from "./assets/pc-folders.json"

export class Initialize extends AbstractInitialize {
  readonly pcFolders = pcFolders
}
