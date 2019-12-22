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
  it('fails semantically if there is a preview release', async () => {
    await ws.git.addTag('v1.2.3-next.1')
    const result = await ws.libre('preview')
    expect(result.stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because a preview 
       [31m›[39m   release was already made.
       [31m›[39m
       [31m›[39m        The commit is:           c14cc64
       [31m›[39m        The stable release is:   N/A
       [31m›[39m        The preview release is:  1.2.3-next.1
       [31m›[39m        Other tags present:      N/A
      "
    `)
  })

  it('fails semantically if there is a stable release', async () => {
    await ws.git.addTag('v1.2.3')
    const result = await ws.libre('preview')
    expect(result.stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because a stable 
       [31m›[39m   release was already made.
       [31m›[39m
       [31m›[39m        The commit is:           c14cc64
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
    expect(result.stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because stable 
       [31m›[39m   and preview releases were already made
       [31m›[39m
       [31m›[39m        The commit is:           c14cc64
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
    expect(result.stderr).toMatchInlineSnapshot(`
      " [31m›[39m   Error: You cannot make a preview release for this commit because stable 
       [31m›[39m   and preview releases were already made
       [31m›[39m
       [31m›[39m        The commit is:           c14cc64
       [31m›[39m        The stable release is:   1.2.3
       [31m›[39m        The preview release is:  1.2.3-next.1
       [31m›[39m        Other tags present:      bar, foo
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
