import Command from '@oclif/command'
import { getContext } from '../../utils/context'
import { PR } from './pr'
import { Preview } from './preview'

export class PreviewOrPR extends Command {
  async run() {
    const context = await getContext()

    if (context.currentBranch.pr) {
      await PR.run(process.argv.slice(3))
    } else {
      await Preview.run(process.argv.slice(3))
    }
  }
}
