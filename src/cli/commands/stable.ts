import Command, { flags } from '@oclif/command'
import { runStableRelease } from '../../sdk/stable'
import { output } from '../../utils/output'

export class Stable extends Command {
  static flags = {
    trunk: flags.string({
      default: '',
      description:
        'State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub repo settings.',
    }),
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
    'skip-npm': flags.boolean({
      default: false,
      description: 'skip the step of publishing the package to npm',
    }),
  }
  async run() {
    const { flags } = this.parse(Stable)
    const message = await runStableRelease({
      cwd: process.cwd(),
      changelog: true,
      dryRun: flags['dry-run'],
      json: flags.json,
      progress: !flags.json,
      overrides: {
        skipNpm: flags['skip-npm'],
        trunk: flags.trunk,
      },
    })
    output(message, { json: flags.json })
  }
}
