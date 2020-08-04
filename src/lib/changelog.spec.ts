import stripAnsi from 'strip-ansi'
import * as Release from '../utils/release'
import * as Changelog from './changelog'

describe('.render()', () => {
  const mockChangeLog = [
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
    { message: 'feat: blah', version: '0.1.0' },
  ]
  describe('option markdown', () => {
    const render = (...logs: MockLogs) => {
      return Changelog.renderChangelog(series(...logs), { as: 'markdown' })
    }
    it('renders release notes for the current release series', () => {
      const notes = render(...mockChangeLog)
      expect(notes).toMatchSnapshot()
    })
    it('shows breaking commits twice, once in breaking section and once in its native section', () => {
      const notes = render({ message: 'a: foo\n\nBREAKING CHANGE:\nbar' })
      expect(notes).toMatch(/BREAKING CHANGES\n\n.*foo/)
      expect(notes).toMatch(/Improvements\n\n.*foo/)
    })
    it('shows breaking label if commit breaking except within breaking section', () => {
      const notes = render({ message: 'a: foo\n\nBREAKING CHANGE:\nbar' })
      expect(notes).toMatch(/Improvements\n\n.*(breaking).*foo/)
    })
    it('hides unknown section if no unknown commits', () => {
      const notes = render({ message: 'a: b' })
      expect(notes).not.toMatch(Changelog.empty().unspecified.label)
    })
    it('improvements section prefixes commits with their type', () => {
      const notes = render({ message: 'a: foo' })
      expect(notes).toMatch(/a: foo/)
    })
  })

  describe('plain', () => {
    const render = (...logs: MockLogs) => {
      return Changelog.renderChangelog(series(...logs), { as: 'plain' })
    }

    it('renders release notes for the current release series', () => {
      const notes = stripAnsi(render(...mockChangeLog))
      expect(notes).toMatchSnapshot()
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
