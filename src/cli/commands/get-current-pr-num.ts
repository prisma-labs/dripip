import Command from '@oclif/command'
import * as Context from '../../utils/context'

export class GetCurrentPRNum extends Command {
  async run() {
    const context = await Context.scan()
    this.log(context.currentBranch.pr?.number.toString() ?? '')
  }
}
