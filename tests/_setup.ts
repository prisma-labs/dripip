// make system tests deterministic. Without this they would react to users'
// machines' ~/.npmrc file contents.
process.env.NPM_TOKEN = `foobar`
