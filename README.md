![ci/cd](https://github.com/prisma-labs/dripip/workflows/ci/cd/badge.svg)

# dripip

Opinionated CLI for continuous delivery of npm packages.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Overview](#overview)
  - [Pull-Request Releases](#pull-request-releases)
  - [Canary Releases](#canary-releases)
  - [Stable Releases](#stable-releases)
  - [Package.json Version Field](#packagejson-version-field)
  - [Release Notes (aka. Changelogs)](#release-notes-aka-changelogs)
- [Recipes](#recipes)
  - [Usage inside GitHub Actions](#usage-inside-github-actions)
- [CLI](#cli)
- [`dripip get-current-commit-version`](#dripip-get-current-commit-version)
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

## Overview

![diagram](https://dsc.cloud/661643/dripip.png)

Dripip is a command line interface (CLI) for continuously releasing npm packages. It has support for three kinds of releases: pull-request releases, canary releases, stable releases. It builds on top of Git, Semver, Conventional Commit, and GitHub. Support for alternative version control systems (e.g. Darcs) and platforms (e.g. GitLab) are not currently supported but they probably could be. The concepts of dripip are relatively general.

Continuous delivery means that every single meaningful commit to your library will be released. The benefit of this approach is that when you ship value your users get access to it immeditely, and as an author you don't need to manage incoming queries like "when will this be released?". You get to to auto-reply: "It already it! :)".

### Pull-Request Releases

Pull-request releases occur on, surprise, pull-requests. You can have CI run them or do them ad-hoc from your machine, either workflow is fine (but choose one, as mixing will naturally lead to already-published errors). These kinds of releases are useful when link workflows are not good enough. For example your feature is a CLI that you want to make sure plays well with npx. Unlike other release types pull-request releases do not result in git tags. Instead, Dripip uses the npm registry to maintain its release state. The version pattern of a pull-request release is:

```bash
0.0.0-pr.${pr_num}.${pr_release_num}.${short_sha}
```

For example:

```
0.0.0-pr.45.4.9a3b2c1
```

The `0.0.0` version is used because there is no meaningful semantic version to put here. It cannot be the version you're branching from since this version syntax would indicate it is a pre-release for that version, which it isn't, it's the opposite, a release _after_ it; It cannot be the version you're going towards because it cannot be generally known if a PR will result in a patch minor or major semver change; Even if Dripip tried to apply conventional commit analysis to the PR commits it wouldn't account for concurrent PRs and the generally async nature that PRs live in with regard to one another. So ultimately `0.0.0` is the most sensible general choice.

The `pr_num` part is the pull-request number. The same one that you see on the GitHub UI, URL etc. of a pull-request.

The `pr_release_num` is a monotonically increasing 1-based (starts from 1, not 0) integer. It serves a few purposes. It provides orientation for humans at a glance, like how many releases has a PR had or where does a given release fall within the PR release set. Its functional purpose is to support correct lexical sorting. Without this little number it would be impossible to sort PR releases without some kind of additional metadata e.g. publish time. Thanks to this, when you run e.g. `npm versions`, you get an accurate ordering.

The `short_sha` is what you see next to commits in much of the GitHub UI, including PR pages. Its primary purpose is to make it easy for you to tie a release back to something in your Git history. For example when looking at a PR page you can copy-paste the sha into search to find the exact commit for that release. Whatever the particular, this is just a convenient piece of information for you. Ultimately we developers pratice many a crude workflow, habbits (console.log vs debugger anyone?).

When Dripip makes a pr release, it includes an upsert of a dist-tag of pattern `pr.${pr_num}`. This makes it very easy to install the latest published version for a given pull-request.

### Canary Releases

Canary releases occur on trunk branches. These releases should be automated by your CI. They give your users access to what your stable version will become. The version pattern of a canary release is:

```bash
${next_stable}-next.${series_release_num}
```

For example:

```
1.2.0-next.4
```

The `next_stable` is whatever your upcoming stable version will be. The `series_release_num` is a monotonically increasing 1-based (starts from 1, not 0) integer. The first canary release after a stable release starts at `1`, increasing by 1 at each canary release, until a stable is cut at which point the numbering is reset upon the next canary release.

When Dripip makes a canary release, it includes an upsert of a dist-tag called `next`. This makes it very easy to install the bleeding edge of your package. Additionally, a git tag called `next` is also maintained. Whatever commit the `next` tag is on is the same instance of your package that would be installed if a user did `npm install <your package>@next`.

### Stable Releases

Stable releases occur on trunk branches. The version pattern of a stable release
is just a regular version, whatever the next stable is:

```bash
${next_stable}
```

For example:

```
1.2.0
```

These releases should be managed however your team works, of course, but here are some general tips:

- Think very carefully before automating stable releases. You need to have very very high confidence in your/your team's git commit message practices to take this route. One wrong `BREAKING CHANGE` line can be all it takes to make an accidental major release that npm won't allow you to undo (unless you catch very quickly).
- Releases on a cadence, such as every week or two, either manually or by automation, is often a good way to go.
- Do not publish stables too often. It dillutes their meaningfulness and creates churn for users of tools like Renovate and Dependabot. Its probably better for your users to get one semi-exciting PR to update their dep on your package once every week or two than once a day! This approach also plays better with the GitHub releases UI where only a handful of releases are rendered for every page and even less visible without scrolling.

When Dripip makes a canary release, it includes an upsert of a dist-tag called `latest`. This is actually what npm already does by default. Dripip does not deviate here.

### Package.json Version Field

Typically when an npm package is released its package.json `version` field will be updated and committed into version control. This is a bad match for continuous delivery however, because it meanss that, more or less, half of the git history will become meta commits. To solve this, `dripip` takes a novel approach of keeping the version out of version control. It uses Git tags to store that state, and when publishing your package, will set the package.json `version` field right before publishing, and then unset it right after publishing completes. You notice nothing, your users notice nothing, and your git history looks ideal. This is unorthadox, but it works well.

Having a valid semver value in the `version` field is required by npm. Dripip puts the following value into your project's package.json to satisfy that constraint. This is what you should check into version control.

```
0.0.0-dripip
```

### Release Notes (aka. Changelogs)

Dripip generates release notes for canary and stable releases. Notes are published within GitHub releases. Canary release notes are published under the `next` tag. Stable release notes are published under its respective version tag. Stable release notes are stable, while Canary release notes are always changing. When a stable release is cut, the canary release notes are cleared since `next` becomes the same as stable, until the next Canary is published.

Because the canary release notes have a stable tag, it means you and your uses can _always_ check out what's coming in the next stable version by visiting:

```
https://github.com/<org>/<repo>/releases/tag/next
```

For example checkout what's coming up in dripip right now by visiting https://github.com/prisma-labs/dripip/releases/tag/next.

## Recipes

### Usage inside GitHub Actions

We are interseted in building a `dripip` GitHub Action. Until it ships, here are the things you need to do.

1. Have `dripip` installed as a dev dependency
1. Upload an `NPM_TOKEN` to your repo ([gh docs](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets))
1. Expose `GITHUB_TOKEN` to `dripip` ([gh docs](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token))
1. Expose `NPM_TOKEN` to `dripip`
1. Checkout all repo commits and tags

Example Workflow Configuration:

```yml
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Get all git commits and tags
        run: git fetch --prune --unshallow --tags
      - uses: actions/setup-node@v1
      - run: yarn --frozen-lockfile
      - run: yarn -s dripip preview-or-pr
        env:
          NPM_TOKEN: ${{secrets.NPM_TOKEN}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

Real World Usage:

- [`dripip`](https://github.com/prisma-labs/dripip/blob/master/.github/workflows/main.yml)
- [`nexus`](https://github.com/graphql-nexus/nexus/blob/master/.github/workflows/trunk.yml)

## CLI

<!-- commands -->
* [`dripip get-current-commit-version`](#dripip-get-current-commit-version)
* [`dripip get-current-pr-num`](#dripip-get-current-pr-num)
* [`dripip help [COMMAND]`](#dripip-help-command)
* [`dripip log`](#dripip-log)
* [`dripip pr`](#dripip-pr)
* [`dripip preview`](#dripip-preview)
* [`dripip preview-or-pr`](#dripip-preview-or-pr)
* [`dripip stable`](#dripip-stable)

## `dripip get-current-commit-version`

```
USAGE
  $ dripip get-current-commit-version

OPTIONS
  -r, --optional  Exit 0 if a version for the commit cannot be found
```

_See code: [dist/cli/commands/get-current-commit-version.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-dripip/dist/cli/commands/get-current-commit-version.ts)_

## `dripip get-current-pr-num`

```
USAGE
  $ dripip get-current-pr-num

OPTIONS
  -r, --optional  Exit 0 if a pr number cannot be found for whatever reason
```

_See code: [dist/cli/commands/get-current-pr-num.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-dripip/dist/cli/commands/get-current-pr-num.ts)_

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

_See code: [dist/cli/commands/log.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-dripip/dist/cli/commands/log.ts)_

## `dripip pr`

```
USAGE
  $ dripip pr

OPTIONS
  -d, --dry-run  output what the next version would be if released now
  -j, --json     format output as JSON
```

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

## `dripip preview-or-pr`

```
USAGE
  $ dripip preview-or-pr
```

_See code: [dist/cli/commands/preview-or-pr.ts](https://github.com/prisma-labs/dripip/blob/v0.0.0-dripip/dist/cli/commands/preview-or-pr.ts)_

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
<!-- commandsstop -->
