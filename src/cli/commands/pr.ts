import Command, { flags } from '@oclif/command'
import { runPullRequestRelease } from '../../sdk/pr'
import { output } from '../../utils/output'

export class PR extends Command {
  static flags = {
    'dry-run': flags.boolean({
      default: false,
      description: 'output what the next version would be if released now',
      char: 'd',
    }),
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
      char: 'j',
    }),
  }

  async run() {
    const { flags } = this.parse(PR)

    const message = await runPullRequestRelease({
      json: flags.json,
      progress: !flags.json,
      dryRun: flags['dry-run'],
    })

    output(message, { json: flags.json })
  }
}
