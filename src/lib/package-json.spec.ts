// todo tests for p validation on read and write
// todo return values
// todo not found cases
import * as PJ from './package-json'
import { createWorkspace } from '../../tests/__lib/workspace'

const ws = createWorkspace({
  name: 'package-json',
  git: false,
  cache: { on: false },
})

let pj: PJ.PJ
beforeEach(() => {
  pj = PJ.create(ws.dir.path)
})

describe('read', () => {
  it('reads a package json in cwd', async () => {
    ws.fs.write('package.json', { name: 'foo', version: '0.0.0' })
    expect(await pj.read()).toMatchInlineSnapshot(`
      Object {
        "name": "foo",
        "version": "0.0.0",
      }
    `)
  })
})

describe('readSync', () => {
  it('synchronously reads a package json in cwd', async () => {
    ws.fs.write('package.json', { name: 'foo', version: '0.0.0' })
    expect(pj.readSync()).toMatchInlineSnapshot(`
      Object {
        "name": "foo",
        "version": "0.0.0",
      }
    `)
  })
})

describe('write', () => {
  it('writes a package json in cwd', async () => {
    await pj.write({ name: 'foo', version: '0.0.0' })
    expect(ws.fs.read('package.json', 'json')).toMatchInlineSnapshot(`
      Object {
        "name": "foo",
        "version": "0.0.0",
      }
    `)
  })
})

describe('update', () => {
  it('reads, updates, then writes back', async () => {
    ws.fs.write('package.json', { name: 'foo', version: '0.0.0' })
    await pj.update((p) => Object.assign(p, { version: '1.0.0' }))
    expect(ws.fs.read('package.json', 'json')).toMatchInlineSnapshot(`
      Object {
        "name": "foo",
        "version": "1.0.0",
      }
    `)
  })
})
