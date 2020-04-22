import Command, { flags } from '@oclif/command'
import { inspect } from 'util'
import * as ChangeLog from '../../lib/changelog'
import { getContext } from '../../utils/context'

export class Log extends Command {
  static flags = {
    markdown: flags.boolean({
      default: false,
      description: 'format output as Markdown',
      char: 'm',
    }),
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
      char: 'j',
    }),
  }
  async run() {
    const { flags } = this.parse(Log)
    const ctx = await getContext({
      cwd: process.cwd(),
      readFromCIEnvironment: true,
    })

    if (flags.json) {
      this.log(inspect(ctx.series, { depth: 20 }))
      return
    }

    this.log(
      ChangeLog.renderChangelog(ctx.series, {
        as: flags.markdown ? 'markdown' : 'plain',
      })
    )
  }
}
