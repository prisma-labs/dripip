import Command from '@oclif/command'
import createGit from 'simple-git/promise'
import {
  indentBlock4,
  parseTag,
  groupByProp,
  ParsedTag,
  GroupBy,
} from '../lib/utils'
import { stripIndent, stripIndents } from 'common-tags'
import * as Git from '../lib/git'

export class Preview extends Command {
  async run() {
    const git = createGit()
    // TODO handle edge case: not a git repo
    // TODO handle edge case: a git repo with no commits
    // TODO nicer tag rendering:
    //    1. for annotated tags should the messge
    //    2. show the tag author name
    //    3. show the the date the tag was made

    /**
     * Before executing a release preview confirm that the commit to be released
     * has not already been released. It does not make sense to release
     * a preview of something that has already been released (be it just preview
     * or preview and stable).
     */
    const [currentCommitShortSha, tags] = await Promise.all([
      Git.gitGetSha(git, { short: true }),
      Git.gitGetTags(git).then(tags => {
        return groupByProp(tags.map(parseTag), 'type')
      }),
    ])

    const hasReleaseTags = tags.stable_release || tags.pre_release

    if (hasReleaseTags) {
      let message = ''

      message += `You cannot make a preview release for this commit because ${
        (tags.pre_release?.length ?? 0) > 0 &&
        (tags.stable_release?.length ?? 0) > 0
          ? 'stable and preview releases were already made'
          : (tags.pre_release?.length ?? 0) > 0
          ? 'a preview release was already made.'
          : 'a stable release was already made.'
      }\n`
      message += '\n'
      message += indentBlock4(stripIndents`
        The commit is:           ${currentCommitShortSha}
        ${renderTagsPresent(tags)}
      `)

      this.error(message, {
        // TODO what is code for? How shuold we use it?
        code: 'foo code',
        exit: 100,
      })
    }

    // Detect if commit is on a PR
    // 1. look for CI environment variables that tip off if is a PR
    // 2. if no, use whatever trick hub is doing to implement $ git pr show
    // 3. if no, accept no
    const prCheck = await checkIsThisCommitForAPullRequest()
    console.log('1')

    /**
     * Now that we've validated the environment, run our preview release
     *
     * Non-PR flow:
     *
     * 1. Find the last pre-release on the current branch. Take its build number. If none use 1.
     * 2. Calculate the semver bump type. Do this by analyizing the commits on the branch between HEAD and the last stable git tag. The highest change type found is used. If no previous stable git tag use 0.0.1.
     * 3. Bump last stable version by bump type, thus producing the next version.
     * 4. Construct new version {nextVer}-next.{buildNum}. Example: 1.2.3-next.1.
     */

    process.stdout.write('todo')
    //
  }
}

import Octokit from '@octokit/rest'
import parseGitConfig from 'parse-git-config'
import parseGitHubURL from 'parse-github-url'

async function checkIsThisCommitForAPullRequest(): Promise<{
  answer: boolean
  reason: 'ci_env_var' | 'git_branch_github_api' | 'nil'
}> {
  if (
    typeof process.env.CIRCLE_PULL_REQUEST === 'string' &&
    process.env.CIRCLE_PULL_REQUEST !== ''
  ) {
    return {
      answer: true,
      reason: 'ci_env_var',
    }
  }

  // Inspiration from how `$ hub pr show` works
  // https://github.com/github/hub/blob/a5fbf29be61a36b86c7f0ff9e9fd21090304c01f/commands/pr.go#L327

  const gitConfig = await parseGitConfig()
  if (gitConfig === null) {
    throw new Error('Could not parse your git config')
  }

  const gitOrigin = gitConfig['remote "origin"']
  if (gitOrigin === undefined) {
    throw new Error('Could not find a configured origin in your git config')
  }

  const gitOriginURL: string = gitOrigin['url']
  if (gitOriginURL === undefined) {
    throw new Error(
      'Could not find a URL in your remote origin config in your git config'
    )
  }

  const githubRepoURL = parseGitHubURL(gitOriginURL)
  if (githubRepoURL === null) {
    throw new Error(
      'Could not parse the URL in your remote origin config in your git config'
    )
  }
  if (githubRepoURL.owner === null) {
    throw new Error(
      'Could not parse out the GitHub owner from the URL in your remote origin config in your git config'
    )
  }
  if (githubRepoURL.name === null) {
    throw new Error(
      'Could not parse out the GitHub repo name from the URL in your remote origin config in your git config'
    )
  }

  const octokit = new Octokit()
  const pullsRes = await octokit.pulls.list({
    owner: githubRepoURL.owner,
    repo: githubRepoURL.name,
  })

  if (pullsRes.data.length > 0) {
    for (const pull of pullsRes.data) {
      // todo
      console.log(pull)
    }
  }

  return { answer: false, reason: 'nil' }
}

/**
 * Given groups of parsed tags, create a nice summary of the commit for the user
 * to read in their terminal.
 */
function renderTagsPresent(tags: GroupBy<ParsedTag, 'type'>): string {
  const NA = 'N/A'
  const [expectedMaybePreRelease, ...unexpectedOtherPreReleases] =
    tags.pre_release ?? []
  const [expectedMaybeStableRelease, ...unexpectedOtherStableReleases] =
    tags.stable_release ?? []

  let message = ''

  message += `The stable release is:   ${expectedMaybeStableRelease?.value.format() ??
    NA}\n`
  message += `The preview release is:  ${expectedMaybePreRelease?.value.format() ??
    NA}\n`
  message += `Other tags present:      ${
    !tags.unknown ? NA : tags.unknown.map(t => t.value).join(', ')
  }\n`
  if (
    unexpectedOtherPreReleases.length > 0 ||
    unexpectedOtherStableReleases.length > 0
  ) {
    message += '\nWARNING\n\n'
    if (unexpectedOtherStableReleases) {
      message +=
        '- Multiple stable releases appear to have been on this commit when there should only ever been 0 or 1\n'
    }
    if (unexpectedOtherPreReleases) {
      message +=
        '- Multiple preview releases appear to have been on this commit when there should only ever been 0 or 1\n'
    }
    message += '\n'
    message += 'This may have happened because:\n'
    message += '- A human manually fiddled with the git tags\n'
    message += '- Another tool than libre acted on the git tags\n'
    message += '- There is a bug in libre\n'
    message += '\n'
    message +=
      'If you think there is a bug in libre please open an issue: https://github.com/prisma-labs/libre/issues/new.\n'
    message +=
      'Otherwise consider manually cleaning up this commit to fix the above violated invariant(s).\n'
  }

  return message
}
