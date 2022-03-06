#!/usr/bin/env node
import * as ChangeLog from '../lib/changelog'
import { rootDebug } from '../lib/debug'
import { runPullRequestRelease } from '../sdk/pr'
import { runPreviewRelease } from '../sdk/preview'
import { runStableRelease } from '../sdk/stable'
import { getContext, getLocationContext } from '../utils/context'
import { octokit } from '../utils/octokit'
import { output } from '../utils/output'
import { getPullRequestReleaseVersionForLocation } from '../utils/pr-release'
import { getCurrentCommit } from '../utils/release'
import { inspect } from 'util'
import yargs from 'yargs'

yargs(process.argv.slice(2))
  .help()
  .strict()
  .recommendCommands()
  .version(false)
  .options({
    json: {
      description: `format output as JSON`,
      boolean: true,
      default: false,
      alias: `j`,
    },
  })
  .command(
    `log`,
    `todo`,
    (yargs) =>
      yargs.options({
        markdown: {
          description: `format output as Markdown`,
          boolean: true,
          default: false,
          alias: `m`,
        },
      }),
    async (flags): Promise<void> => {
      const ctx = await getContext({
        cwd: process.cwd(),
        readFromCIEnvironment: true,
      })

      if (flags.json) {
        console.log(inspect(ctx.series, { depth: 20 }))
        return
      }

      console.log(
        ChangeLog.renderFromSeries(ctx.series, {
          as: flags.markdown ? `markdown` : `plain`,
        })
      )
    }
  )
  .command(
    `stable`,
    `todo`,
    (yargs) =>
      yargs.options({
        trunk: {
          string: true,
          default: ``,
          description: `State which branch is trunk. Defaults to honoring the "base" branch setting in the GitHub repo settings.`,
        },
        'dry-run': {
          boolean: true,
          default: false,
          description: `output what the next version would be if released now`,
          alias: `d`,
        },
        'skip-npm': {
          boolean: true,
          default: false,
          description: `skip the step of publishing the package to npm`,
        },
      }),
    async (flags) => {
      const message = await runStableRelease({
        cwd: process.cwd(),
        changelog: true,
        dryRun: flags[`dry-run`],
        json: flags.json,
        progress: !flags.json,
        overrides: {
          skipNpm: flags[`skip-npm`],
          trunk: flags.trunk,
        },
      })
      output(message, { json: flags.json })
    }
  )
  .command(
    `preview`,
    `todo`,
    (yargs) =>
      yargs.options({
        trunk: {
          string: true,
          default: ``,
          description: `State which branch is trunk. Defaults to honoring the "base" branch setting in the GitHub repo settings.`,
        },
        'build-num': {
          number: true,
          description: `Force a build number. Should not be needed generally. For exceptional cases.`,
          alias: `n`,
        },
        'dry-run': {
          boolean: true,
          default: false,
          description: `output what the next version would be if released now`,
          alias: `d`,
        },
        'skip-npm': {
          boolean: true,
          default: false,
          description: `skip the step of publishing the package to npm`,
        },
      }),
    async (flags) => {
      const message = await runPreviewRelease({
        cwd: process.cwd(),
        changelog: true,
        dryRun: flags[`dry-run`],
        json: flags.json,
        progress: !flags.json,
        overrides: {
          skipNpm: flags[`skip-npm`],
          buildNum: flags[`build-num`],
          trunk: flags.trunk,
        },
      })
      output(message, { json: flags.json })
    }
  )
  .command(
    `pr`,
    `todo`,
    (yargs) =>
      yargs.options({
        'dry-run': {
          boolean: true,
          default: false,
          description: `output what the next version would be if released now`,
          alias: `d`,
        },
        json: {
          boolean: true,
          default: false,
          description: `format output as JSON`,
          alias: `j`,
        },
      }),
    async (flags) => {
      const message = await runPullRequestRelease({
        json: flags.json,
        progress: !flags.json,
        dryRun: flags[`dry-run`],
      })
      output(message, { json: flags.json })
    }
  )
  .command(
    `preview-or-pr`,
    `todo`,
    (yargs) =>
      yargs.options({
        trunk: {
          string: true,
          default: ``,
          description: `State which branch is trunk. Defaults to honoring the "base" branch setting in the GitHub repo settings.`,
        },
        'dry-run': {
          boolean: true,
          default: false,
          description: `output what the next version would be if released now`,
          alias: `d`,
        },
        json: {
          boolean: true,
          default: false,
          description: `format output as JSON`,
          alias: `j`,
        },
        // preview
        'build-num': {
          number: true,
          description: `Force a build number. Should not be needed generally. For exceptional cases.`,
          alias: `n`,
        },
        'skip-npm': {
          boolean: true,
          default: false,
          description: `skip the step of publishing the package to npm`,
        },
      }),
    async (flags) => {
      const context = await getLocationContext({ octokit })

      if (context.currentBranch.pr) {
        const message = await runPullRequestRelease({
          json: flags.json,
          progress: !flags.json,
          dryRun: flags[`dry-run`],
        })
        output(message, { json: flags.json })
      } else {
        const message = await runPreviewRelease({
          cwd: process.cwd(),
          changelog: true,
          dryRun: flags[`dry-run`],
          json: flags.json,
          progress: !flags.json,
          overrides: {
            skipNpm: flags[`skip-npm`],
            buildNum: flags[`build-num`],
            trunk: flags.trunk,
          },
        })
        output(message, { json: flags.json })
      }
    }
  )
  .command(
    `get-current-pr-num`,
    `todo`,
    (yargs) =>
      yargs.options({
        optional: {
          boolean: true,
          default: false,
          description: `Exit 0 if a pr number cannot be found for whatever reason`,
          alias: `r`,
        },
      }),
    async (flags) => {
      const context = await getLocationContext({
        octokit,
      })

      const prNum = context.currentBranch.pr?.number ?? null

      if (prNum !== null) {
        console.log(String(prNum))
      }

      if (!flags[`optional`]) {
        process.exit(1)
      }
    }
  )
  .command(
    `get-current-commit-version`,
    `todo`,
    (yargs) =>
      yargs.options({
        optional: {
          boolean: true,
          description: `Exit 0 if a version for the commit cannot be found`,
          default: false,
          alias: `r`,
        },
      }),
    async (flags) => {
      const debug = rootDebug(__filename)
      // Try to get version from preview/stable release
      // stable release preferred over preview
      // preview release preferred over pr release
      //
      // Note:
      //
      // - PR release should not be possible on same commit as stable/preview
      // anyway
      //
      // - PR release is much more costly to calculate than others
      //

      const c = await getCurrentCommit()
      debug(`got current commit`, c)

      // todo these could have `v` prefix

      if (c.releases.stable) {
        debug(`counting stable release as version of this commit`)
        console.log(c.releases.stable.version)
        return
      }

      if (c.releases.preview) {
        debug(`counting preview release as version of this commit`)
        console.log(c.releases.preview.version)
        return
      }

      // Try to get version from pr release
      debug(`commit has no release information, checking for pr-releases`)

      const ctx = await getLocationContext({ octokit: octokit })

      debug(`got location context`, ctx)

      if (ctx.currentBranch.pr) {
        const version = getPullRequestReleaseVersionForLocation({
          packageName: ctx.package.name,
          prNum: ctx.currentBranch.pr.number,
          sha: c.sha,
        })

        debug(`pr release version for this location context?`, { version })

        if (version) {
          debug(`counting pr-release version as version of this commit`)
          console.log(version)
          return
        }
      }

      // Give up, with error if specified to
      const giveUpWithError = !flags[`optional`]

      debug(`giving up`, { giveUpWithError })

      if (giveUpWithError) {
        process.exit(1)
      }
    }
  ).argv
