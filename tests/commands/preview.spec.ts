import { createWorkspace } from '../__lib/helpers'

const ws = createWorkspace('preview')

it('can be run', async () => {
  expect(await ws.libre('preview')).toMatchInlineSnapshot(`
    Object {
      "error": null,
      "exitCode": 0,
      "signal": null,
      "stderr": "",
      "stdout": "todo",
    }
  `)
})

describe('preflight assertion no-release-tags', () => {
  it('fails if there is already a release tag on the commit', async () => {
    await ws.git.addTag('v1.2.3')
    const result = await ws.libre('preview')
    expect(result.stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: Cannot release a preview for the current commit (__SHORT_SHA__) as it has 
       [31m›[39m   already been released.
       [31m›[39m
       [31m›[39m   The releases present are:
       [31m›[39m
       [31m›[39m        1.2.3
      "
    `)
  })

  it('does not include non-release tags', async () => {
    await ws.git.addTag('foobar')
    expect(await ws.libre('preview')).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "exitCode": 0,
        "signal": null,
        "stderr": "",
        "stdout": "todo",
      }
    `)
  })
})
