import {
  createWorkspace,
  resetEnvironmentBeforeEachTest,
  RunLibreResult,
} from '../__lib/helpers'

const ws = createWorkspace('preview')
resetEnvironmentBeforeEachTest()

describe('pr preview releases', () => {
  it('treats release as a pr preview if circleci env vars signify there is a pr', async () => {
    process.env.CIRCLECI = 'true'
    process.env.CIRCLE_PULL_REQUEST = 'true'
    await ws.git.checkoutLocalBranch('feat/foo')
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

  it.todo('treats releaes as a pr preview if on branch with open pr')
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
    ws.git.addRemote('origin', 'https://github.com/foo-org/bar-repo.git')
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
