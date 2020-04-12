import Command, { flags } from '@oclif/command'
import { Octokit } from '@octokit/rest'
import { createGit } from '../../lib/git'
import { getLocationContext } from '../../utils/context'

export class GetCurrentPRNum extends Command {
  static flags = {
    optional: flags.boolean({
      description: 'Exit 0 if a pr number cannot be found for whatever reason',
      default: false,
      char: 'r',
    }),
  }
  async run() {
    const { flags } = this.parse(GetCurrentPRNum)

    const context = await getLocationContext({
      git: createGit(),
      octokit: new Octokit({
        auth: process.env.GITHUB_TOKEN,
      }),
    })

    const prNum = context.currentBranch.pr?.number ?? null

    if (prNum !== null) {
      return process.stdout.write(String(prNum))
    }

    if (!flags['optional']) {
      return this.exit(1)
    }
  }
}
