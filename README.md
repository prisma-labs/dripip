![ci/cd](https://github.com/prisma-labs/dripip/workflows/ci/cd/badge.svg)

# dripip

Opinionated CLI for continuous delivery of npm packages.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


  - [Installation](#installation)
  - [Introduction](#introduction)
- [Reference](#reference)
  - [`dripip get-current-pr-num`](#dripip-get-current-pr-num)
  - [`dripip help [COMMAND]`](#dripip-help-command)
  - [`dripip log`](#dripip-log)
  - [`dripip pr`](#dripip-pr)
  - [`dripip preview`](#dripip-preview)
  - [`dripip preview-or-pr`](#dripip-preview-or-pr)
  - [`dripip stable`](#dripip-stable)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

```
npm install --save-dev dripip
```

## Introduction

TODO

For now you can refer to the original issue that specified the overall vision for `dripip`: [prisma-labs/issues#2](https://github.com/prisma-labs/issues/issues/2).

![diagram](https://user-images.githubusercontent.com/284476/65810154-837d6580-e174-11e9-87e3-15ca31b66379.png)

# Reference

<!-- commands -->
* [`dripip get-current-pr-num`](#dripip-get-current-pr-num)
* [`dripip help [COMMAND]`](#dripip-help-command)
* [`dripip log`](#dripip-log)
* [`dripip pr`](#dripip-pr)
* [`dripip preview`](#dripip-preview)
* [`dripip preview-or-pr`](#dripip-preview-or-pr)
* [`dripip stable`](#dripip-stable)

## `dripip get-current-pr-num`

```
USAGE
  $ dripip get-current-pr-num
```

_See code: [dist/cli/commands/get-current-pr-num.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/get-current-pr-num.ts)_

## `dripip help [COMMAND]`

display help for dripip

```
USAGE
  $ dripip help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `dripip log`

```
USAGE
  $ dripip log

OPTIONS
  -j, --json      format output as JSON
  -m, --markdown  format output as Markdown
```

_See code: [dist/cli/commands/log.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/log.ts)_

## `dripip pr`

```
USAGE
  $ dripip pr

OPTIONS
  -d, --dry-run  output what the next version would be if released now
  -j, --json     format output as JSON
```

_See code: [dist/cli/commands/pr.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/pr.ts)_

## `dripip preview`

```
USAGE
  $ dripip preview

OPTIONS
  -d, --dry-run              output what the next version would be if released now
  -j, --json                 format output as JSON
  -n, --build-num=build-num  Force a build number. Should not be needed generally. For exceptional cases.
  --skip-npm                 skip the step of publishing the package to npm

  --trunk=trunk              State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub
                             repo settings.
```

_See code: [dist/cli/commands/preview.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/preview.ts)_

## `dripip preview-or-pr`

```
USAGE
  $ dripip preview-or-pr
```

_See code: [dist/cli/commands/preview-or-pr.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/preview-or-pr.ts)_

## `dripip stable`

```
USAGE
  $ dripip stable

OPTIONS
  -d, --dry-run  output what the next version would be if released now
  -j, --json     format output as JSON
  --skip-npm     skip the step of publishing the package to npm

  --trunk=trunk  State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub repo
                 settings.
```

_See code: [dist/cli/commands/stable.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-see-git-tags/dist/cli/commands/stable.ts)_
<!-- commandsstop -->
