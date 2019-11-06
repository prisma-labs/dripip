import { createLibreRunner } from "../__helpers"
import { dirSync, DirResult } from "tmp"
import { basename } from "path"
import * as Git from "simple-git/promise"
import * as path from "path"
import { unlinkSync } from "fs"
import { tmpdir } from "os"

let git: Git.SimpleGit
let libre: ReturnType<typeof createLibreRunner>
let tmpDir: DirResult

beforeAll(async () => {
  tmpDir = dirSync({
    postfix: `libre_test__${basename(__filename)}_`,
  })
  git = Git(tmpDir.name)
  libre = createLibreRunner({ cwd: tmpDir.name })
  // console.log(tmpDir.name)
})

beforeEach(async () => {
  try {
    unlinkSync(path.join(tmpdir.name, ".git"))
  } catch (e) {
    /*ignore if git folder was not present for some reason */
  }
  await git.init()
  await git.raw(["commit", "--allow-empty", "--message", "initial commit"])
})

it("can be run", async () => {
  expect(libre("preview")).toMatchInlineSnapshot(`
    Object {
      "status": 0,
      "stderr": "",
      "stdout": "todo",
    }
  `)
})

describe("preflight assertion no-release-tags", () => {
  it("fails if there is already a release tag on the commit", async () => {
    await git.addTag("v1.2.3")
    const result = libre("preview")
    result.stderr = result.stderr.replace(/\(.{7}\)/g, "(__SHORT_SHA__)")
    expect(result).toMatchInlineSnapshot(`
          Object {
            "status": 100,
            "stderr": " [31m›[39m   Error: Cannot release a preview for the current commit (__SHORT_SHA__) as it has 
           [31m›[39m   already been released.
           [31m›[39m
           [31m›[39m   The releases present are:
           [31m›[39m
           [31m›[39m        1.2.3
          ",
            "stdout": "",
          }
      `)
  })

  it("does not include non-release tags", async () => {
    await git.addTag("foobar")
    expect(libre("preview")).toMatchInlineSnapshot(`
      Object {
        "status": 0,
        "stderr": "",
        "stdout": "todo",
      }
    `)
  })
})
