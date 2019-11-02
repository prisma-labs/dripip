import { run } from "../__helpers"

it("works", async () => {
  expect(run("yarn -s ts-node src/main hello")).toMatchInlineSnapshot(`
    Object {
      "status": 0,
      "stderr": "",
      "stdout": "Hello!
    ",
    }
  `)
})
