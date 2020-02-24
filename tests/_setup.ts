import * as Context from './__lib/helpers'
import * as WS from './__lib/workspace'

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

global.createContext = Context.createContext
global.createWorkspace = WS.createWorkspace
