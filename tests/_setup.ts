import * as Context from './__lib/helpers'
import * as WS from './__lib/workspace'

// make system tests deterministic. Without this they would react to users'
// machines' ~/.npmrc file contents.
process.env.NPM_TOKEN = 'foobar'

declare global {
  export const createContext: typeof Context.createContext
  export const createWorkspace: typeof WS.createWorkspace
  namespace NodeJS {
    interface Global {
      createContext: typeof Context.createContext
      createWorkspace: typeof WS.createWorkspace
    }
  }
}

//@ts-expect-error
global.createContext = Context.createContext
//@ts-expect-error
global.createWorkspace = WS.createWorkspace
