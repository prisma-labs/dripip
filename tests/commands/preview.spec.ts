import { run } from "../__helpers"

it("can be run", async () => {
  expect(run("yarn -s ts-node src/main preview")).toMatchInlineSnapshot(`
    Object {
      "status": 0,
      "stderr": "",
      "stdout": "todo"
    ",
    }
  `)
})
