import Command, { flags } from '@oclif/command'
import * as Context from '../../utils/context'

export class GetCurrentPRNum extends Command {
  static flags = {
    optional: flags.boolean({
      description:
        'Exit 0 if a pr number cannot be found for whatever reason (logical, error, ...)',
      default: false,
      char: 'r',
    }),
  }
  async run() {
    const { flags } = this.parse(GetCurrentPRNum)

    const context = await Context.scan()

    const prNum = context.currentBranch.pr?.number ?? null

    if (prNum !== null) {
      return process.stdout.write(String(prNum))
    }

    if (!flags['optional']) {
      return this.exit(1)
    }
  }
}
