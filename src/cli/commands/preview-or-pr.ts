import Command from '@oclif/command'
import { Octokit } from '@octokit/rest'
import { createGit } from '../../lib/git'
import { getLocationContext } from '../../utils/context'
import { PR } from './pr'
import { Preview } from './preview'

export class PreviewOrPR extends Command {
  async run() {
    const context = await getLocationContext({
      git: createGit(),
      octokit: new Octokit({
        auth: process.env.GITHUB_TOKEN,
      }),
    })

    if (context.currentBranch.pr) {
      await PR.run(process.argv.slice(3))
    } else {
      await Preview.run(process.argv.slice(3))
    }
  }
}
