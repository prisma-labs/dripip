import Command, { flags } from '@oclif/command'
import { runPreviewRelease } from '../../sdk/preview'
import { output } from '../../utils/output'

export class Preview extends Command {
  static flags = {
    trunk: flags.string({
      default: '',
      description:
        'State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub repo settings.',
    }),
    ['build-num']: flags.integer({
      description: 'Force a build number. Should not be needed generally. For exceptional cases.',
      char: 'n',
    }),
    'dry-run': flags.boolean({
      default: false,
      description: 'output what the next version would be if released now',
      char: 'd',
    }),
    'skip-npm': flags.boolean({
      default: false,
      description: 'skip the step of publishing the package to npm',
    }),
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
      char: 'j',
    }),
  }

  async run() {
    const { flags } = this.parse(Preview)
    const message = await runPreviewRelease({
      cwd: process.cwd(),
      changelog: true,
      dryRun: flags['dry-run'],
      json: flags.json,
      progress: !flags.json,
      overrides: {
        skipNpm: flags['skip-npm'],
        buildNum: flags['build-num'],
        trunk: flags.trunk,
      },
    })
    output(message, { json: flags.json })
  }
}
