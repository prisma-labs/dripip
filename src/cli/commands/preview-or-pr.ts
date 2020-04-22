import Command from '@oclif/command'
import { getLocationContext } from '../../utils/context'
import { octokit } from '../../utils/octokit'
import { PR } from './pr'
import { Preview } from './preview'

export class PreviewOrPR extends Command {
  async run() {
    const context = await getLocationContext({ octokit: octokit })

    if (context.currentBranch.pr) {
      await PR.run(process.argv.slice(3))
    } else {
      await Preview.run(process.argv.slice(3))
    }
  }
}
