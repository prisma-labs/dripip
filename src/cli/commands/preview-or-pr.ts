import Command from '@oclif/command'
import * as Context from '../../utils/context'
import { PR } from './pr'
import { Preview } from './preview'

export class PreviewOrPR extends Command {
  async run() {
    const context = await Context.scan()

    if (context.currentBranch.pr) {
      await PR.run(process.argv.slice(3))
    } else {
      await Preview.run(process.argv.slice(3))
    }
  }
}
