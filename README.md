# KotOR I & II Switch modding tools

![screenshot of TSLRCM working on the Nintendo Switch](./docs/switch-tslrcm-screenshot.jpg)

[![Node.js CI](https://github.com/DrSnuggly/KotOR-Switch-modding/actions/workflows/node.js.yml/badge.svg)](https://github.com/DrSnuggly/KotOR-Switch-modding/actions/workflows/node.js.yml)
![Branches](./badges/coverage-branches.svg)
![Functions](./badges/coverage-functions.svg)
![Lines](./badges/coverage-lines.svg)
![Statements](./badges/coverage-statements.svg)
![Jest coverage](./badges/coverage-jest%20coverage.svg)

## PLEASE NOTE, THIS IS STILL A WORK IN PROGRESS WITH SOME PARTS NOT FULLY FUNCTIONAL. DO NOT ASK FOR SUPPORT UNTIL AFTER THE FIRST RELEASE.

This project is a group of tools to make modding the Nintendo Switch version of
Star Wars: Knights of the Old Republic I & II easier, less confusing, and less
cumbersome.

**With these tools, we can now finally enjoy mods like The Sith Lords: Restored
Content Mod (and others) on Nintendo Switch!**

These scripts are by no means necessary, but they will help prevent common
issues that can occur, especially when dealing with Aspyr's odd file structure
in their ports, the ports' built-in `.tpc` override files, and the differing
localized folder structures on the Nintendo Switch.

Based on and inspired by
[jacqylfrost](https://deadlystream.com/profile/48469-jacqylfrost/)'s work!
Appreciate your insight as I worked through this.

**NOTE**: these modding tools will ONLY work for modded Nintendo Switches.

## Features

- Provide a folder structure that modding tools expect.
- Once modding is done, restructure the game folder to what the Nintendo Switch
  version of the game expects.
- Call out potential issues along with instructions on how to fix them.
- Easy backups and restores during the modding process, to better see where
  things went wrong.

## Usage instructions

**NOTE**: It's **highly** recommended to read this entire section before
starting.

### Prerequisites

- A computer to install mods with — mods cannot be installed directly on the
  Nintendo Switch).
- A modded Nintendo Switch with the
  [Atmosphère](https://github.com/Atmosphere-NX/Atmosphere) custom firmware
  installed.
  - **NOTE**: other custom firmwares will likely work but are unsupported.
- A copy of KotOR I or II already installed on the Nintendo Switch with all
  updates applied.
- [nxdumptool](https://github.com/DarkMatterCore/nxdumptool) installed on the
  Nintendo Switch to extract some game files needed for some mods.
- A way to interact with and transfer files to and from the Nintendo Switch.
  Examples:
  - [ftpd](https://github.com/mtheall/ftpd)
  - Hekate's tool to mount the SD Card to a PC, under **Tools | USB Tools
    | SD Card** (requires rebooting the Nintendo Switch into Hekate).
  - [NX-Shell](https://github.com/joel16/NX-Shell) (only for interacting with
    existing files)

### Pre-flight

1. On your computer, download and extract the most recent release from
   GitHub for your computer's operating system.
2. Open a terminal window and navigate to the extracted folder from step 1.
   - e.g. `cd "~/Downloads/kotor-switch-modding"`
3. Run the following command to initialize the folder structure:
   ```bash
   ./ksm init -k2
   ```
   - **Note**: use the following to get additional options for this command:
     ```bash
     ./ksm help init
     ```
4. On the Nintendo Switch, do the following in the **nxdumptool** app:
   - Navigate to **Dump installed SD card eMMC content** | the game you'd
     like to mod | **RomFS options**.
   - Change the **Use update/DLC** option to the installed game update.
   - Select **Browse RomFS section**.
   - Dump the following files, depending on the game you're modding:
     - KotOR I:
       - `dialog.tlk` (or equivalent for your language,
         e.g. `dialoges.tlk`)
     - KotOR II:
       - `swplayer.ini`
       - `Localized/<language>/dialog.tlk`
   - Transfer these files from `/atmosphere/contents/0100B2C016252000` on the
     Nintendo Switch to your computer using a file transfer option of your
     choice (common options listed above in the `Prerequisites` section).
   - Place both transferred files into the `game-root` folder.
     - Make sure to place the `dialog.tlk` directly in the above folder, not
       `Localized/<language>`.

### Mod installation

You can now start installing mods like usual. General notes:

- The `game-root` folder is linked to the desktop by default. This is very
  useful for TSLPatcher that some mods use, which always defaults to the
  desktop.
- When using mods that use TSLPatcher, make sure to pay attention to the
  installation logs — warnings are common and not usually anything to worry
  about, but errors can occur due to missing files that the mod installer
  expects (known mods listed below). If this occurs:
  1. In the TSLPatcher window, make a note of the filepath associated with
     the error (e.g. `lips/003EBO_loc.mod`.
  2. Dump the file from your Nintendo Switch.
     - For KotOR II, you may need to look under `Localized/<language>` due to
       how the Nintendo Switch version of the game implemented other
       languages).
  3. Transfer the dumped file to your computer and place it in the location
     that the mod installer expected in `game-root`.
  4. Re-run the TSLPatcher installer.

### Wrapping up

1. Once all desired mods have been installed, run the following command:
   ```bash
   ./ksm finalize
   ```
   - To undo finalization (e.g. for further adjustments), run the following
     command to restore a backup that was automatically created by the
     finalization script:
     ```bash
     ./ksm finalize --restore-backup
     ```
   - **Make sure to pay attention to any warnings that appear.**
     - The most common warning will be texture files that aren't in
       the `.tpc`
       format when the Nintendo Switch version of the game already has the
       same
       texture in that format. These pre-existing `.tpc` files on the
       Nintendo
       Switch will always override any `.tga` or `.dds` texture files — the
       solution is to convert these files to `.tpc` where possible (e.g.
       using
       [tga2tpc 4.0.0](https://deadlystream.com/files/file/1152-tga2tpc/)).
2. On the Nintendo Switch, delete the following folders, if applicable:
   - KotOR I: `/atmosphere/contents/0100854015868800`
   - KotOR II: `/atmosphere/contents/0100B2C016252000`
3. Copy the appropriate finalized folder from your computer to the
   `/atmosphere/contents` folder on your Nintendo Switch's SD card:
   - KotOR I: `0100854015868800`
   - KotOR II: `0100B2C016252000`
   - **NOTE**: network-based file transfers (e.g. FTP) will work with no
     issues, but for larger mod packs, you may want to use the Hekate option
     mentioned above for faster and more reliable transfers.

## Known issues

### Platform-specific known issues and fixes

#### KotOR II

- The Sith Lords Restored Content Mod (TSLRCM)
  - Button prompts are either missing or showing buttons for the incorrect
    platform
    - Fix: after installing this mod, use the `dialog.tlk` in the
      `Fixed dialog for TSLRCM on Nintendo Switch.zip` attached to the
      latest
      release — thanks,
      [seriouslyunderappreciated](https://github.com/seriouslyunderappreciated)!

There are likely more than what is listed here. Please don't hesitate to create
an issue or pull request with any of these platform-specific issues you find.

### Mods that require additional dumped files

#### KotOR II

Assumes The Sith Lords: Restored Content Mod (TSLRCM) is installed. If you find
any more of these, please feel free to create a GitHub issue or a pull request.

- Darth Sion and Male Exile Mod 1.2.3
  - `lips\702kor_loc.mod`
  - `lips\907mal_loc.mod`
- Extended Korriban arrival 1.2
  - `Lips\003EBO_loc.mod`
- Handmaiden and Female Exile - Disciple and Male Exile Romance
  - `lips\262TEL_loc.mod`
  - `lips\402DXN_loc.mod`
  - `lips\903MAL_loc.mod`
  - `lips\localization.mod`

## Contributing

Contributions are welcome via pull requests! Please follow the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
guidelines for commit messages.

## Usage in other mods

Feel free to reference or link this mod to any other projects. However, please
note that this project uses the GNU GPL v3 license. You can view a
[layman's terms breakdown](https://www.gnu.org/licenses/quick-guide-gplv3.en.html)
of the license, but the most important thing to note is that **any** projects
or distributions that modify or include code from this project must **also**
have their source code published and publicly available with the same license.

Please don't hesitate to contact me if this causes major issues for a mod
you're creating.
