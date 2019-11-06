import Command from '@oclif/command'
import * as Git from 'simple-git/promise'
import { getReleaseTagsAtCommit, indentBlock4 } from '../utils'
import { stripIndent } from 'common-tags'

export class Preview extends Command {
  async run() {
    // TODO handle edge case: not a git repo
    // TODO handle edge case: a git repo with no commits

    /**
     * Before executing a release preview confirm that the commit to be released
     * has not already been released. It does not make sense to release
     * a preview of something that has already been released (be it just preview
     * or preview and stable).
     */
    const currentCommitShortSha = await Git().revparse(['--short', 'HEAD'])
    const releaseTags = await getReleaseTagsAtCommit('HEAD')
    if (releaseTags.length) {
      // TODO nicer tag rendering:
      //    1. for annotated tags should the messge
      //    2. show the tag author name
      //    3. show the the date the tag was made
      this.error(
        stripIndent`
          Cannot release a preview for the current commit (${currentCommitShortSha}) as it has already been released.

          The releases present are:

          ${indentBlock4(releaseTags.map(rt => rt.format()).join('\n'))}
        `,
        {
          // TODO what is code for? How shuold we use it?
          code: 'foo code',
          exit: 100,
        }
      )
    }

    process.stdout.write('todo')
  }
}
