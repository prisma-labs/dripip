import {
  createWorkspace,
  resetEnvironmentBeforeEachTest,
  RunLibreResult,
} from '../__lib/helpers'
import Octokit = require('@octokit/rest')
import { gitCreateEmptyCommit } from '../../src/lib/git'

const ws = createWorkspace('preview')

resetEnvironmentBeforeEachTest()

describe('pr preview releases', () => {
  let instanceId: string
  let branchName: string

  beforeEach(async () => {
    instanceId = String(Math.random()).replace('0.', '')
    branchName = 'feat/foo-' + instanceId
    // https://github.com/steveukx/git-js/issues/14#issuecomment-45430322
    await ws.git.checkout(['-b', branchName])
    await gitCreateEmptyCommit(ws.git, 'some work on new branch')
    // await ws.git.addRemote(
    //   'origin',
    //   'https://github.com/prisma-labs/system-tests-repo.git'
    // )
    await ws.git.push('origin', branchName)
  })

  it('treats release as a pr preview if circleci env vars signify there is a pr', async () => {
    process.env.CIRCLECI = 'true'
    process.env.CIRCLE_PULL_REQUEST = 'true'
    const result = await ws.libre('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "exitCode": 0,
        "signal": null,
        "stderr": "",
        "stdout": "{\\"type\\":\\"pr\\",\\"reason\\":\\"ci_env_var\\"}
      ",
      }
    `)
  })

  it('treats releases as a pr preview if on branch with open pr', async () => {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
    try {
      await octokit.pulls.create({
        head: branchName,
        base: 'master',
        owner: 'prisma-labs',
        repo: 'system-tests-repo',
        title: `${instanceId} treats releases as a pr preview if on branch with open pr`,
      })
    } catch (e) {
      console.log(e)
    }
    const result = await ws.libre('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "exitCode": 0,
        "signal": null,
        "stderr": "",
        "stdout": "{\\"type\\":\\"pr\\",\\"reason\\":\\"git_branch_github_api\\"}
      ",
      }
    `)
  })
})

describe('stable preview releases', () => {
  it('treats release as stable preview if on trunk', async () => {
    const result = await ws.libre('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "exitCode": 0,
        "signal": null,
        "stderr": "",
        "stdout": "{\\"type\\":\\"stable\\",\\"reason\\":\\"is_trunk\\"}
      ",
      }
    `)
  })
})

describe('preflight assertions', () => {
  function replaceSHA(result: RunLibreResult): RunLibreResult {
    result.stderr = result.stderr.replace(
      /(commit is:\s*)[\w\d]+/g,
      '$1__sha__'
    )
    return result
  }

  it.todo(
    'fails semantically if trunk and pr detected becuase that demands conflicting reactions'
  )

  it.todo('fails semantically if not on trunk and branch has no open pr')

  it('fails semantically if there is a preview release', async () => {
    await ws.git.addTag('v1.2.3-next.1')
    const result = await ws.libre('preview')
    expect(replaceSHA(result).stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because a preview 
       [31m›[39m   release was already made.
       [31m›[39m
       [31m›[39m        The commit is:           __sha__
       [31m›[39m        The stable release is:   N/A
       [31m›[39m        The preview release is:  1.2.3-next.1
       [31m›[39m        Other tags present:      N/A
      "
    `)
  })

  it('fails semantically if there is a stable release', async () => {
    await ws.git.addTag('v1.2.3')
    const result = await ws.libre('preview')
    expect(replaceSHA(result).stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because a stable 
       [31m›[39m   release was already made.
       [31m›[39m
       [31m›[39m        The commit is:           __sha__
       [31m›[39m        The stable release is:   1.2.3
       [31m›[39m        The preview release is:  N/A
       [31m›[39m        Other tags present:      N/A
      "
    `)
  })

  it('fails semantically if there is a stable AND preview release', async () => {
    await ws.git.addTag('v1.2.3')
    await ws.git.addTag('v1.2.3-next.1')
    const result = await ws.libre('preview')
    expect(replaceSHA(result).stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because stable 
       [31m›[39m   and preview releases were already made
       [31m›[39m
       [31m›[39m        The commit is:           __sha__
       [31m›[39m        The stable release is:   1.2.3
       [31m›[39m        The preview release is:  1.2.3-next.1
       [31m›[39m        Other tags present:      N/A
      "
    `)
  })

  it('renders other tags found if any', async () => {
    await ws.git.addTag('v1.2.3')
    await ws.git.addTag('v1.2.3-next.1')
    await ws.git.addTag('foo')
    await ws.git.addTag('bar')
    const result = await ws.libre('preview')
    expect(replaceSHA(result).stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because stable 
       [31m›[39m   and preview releases were already made
       [31m›[39m
       [31m›[39m        The commit is:           __sha__
       [31m›[39m        The stable release is:   1.2.3
       [31m›[39m        The preview release is:  1.2.3-next.1
       [31m›[39m        Other tags present:      bar, foo
      "
    `)
  })

  it('does not include non-release tags', async () => {
    await ws.git.addTag('foobar')
    const result = await ws.libre('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "exitCode": 0,
        "signal": null,
        "stderr": "",
        "stdout": "{\\"type\\":\\"stable\\",\\"reason\\":\\"is_trunk\\"}
      ",
      }
    `)
  })
})
