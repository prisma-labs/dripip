import baseConfig from './jest.config'

const config = {
  ...baseConfig,
  testRegex: `src/.*\\.spec\\.ts$`,
  displayName: {
    name: `Unit`,
    color: `blue`,
  },
}

export default config
