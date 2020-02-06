import * as Release from '../utils/release'
import * as Changelog from './changelog'

describe('.render()', () => {
  describe('option markdown', () => {
    const render = (...logs: MockLogs) => {
      return Changelog.render(series(...logs), { type: 'markdown' })
    }
    it('renders breaking features fixes improvements chores unknowns', () => {
      expect(
        render(
          { message: 'chore: b' },
          { message: 'fix: b' },
          { message: 'feat: b' },
          { message: 'refactor: a' },
          { message: 'non conforming commit b' },
          { message: 'chore: a' },
          { message: 'feat: a\n\nBREAKING CHANGE:\ntoto' },
          { message: 'perf: a' },
          { message: 'fix: a' },
          { message: 'non conforming commit a' },
          { message: 'feat: blah', version: '0.1.0' }
        )
      ).toMatchSnapshot()
    })
  })
})

type MockLogs = { message: string; version?: string }[]

function series(...logs: MockLogs): Release.Series {
  return Release.fromLogs(
    logs.map(({ message, version }) => ({
      message,
      tags: version ? [version] : [],
      sha: 'shasha#',
    }))
  )
}
