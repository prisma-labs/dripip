import Command from "@oclif/command"

export class Hello extends Command {
  async run() {
    console.log("Hello!")
  }
}
