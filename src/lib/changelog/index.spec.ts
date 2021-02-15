import stripAnsi from 'strip-ansi'
import * as Release from '../../utils/release'
import * as Changelog from './'

const mockCommits: Release.MockCommit[] = [
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

describe('.render() with markdown', () => {
  const render = (...commits: Release.MockCommit[]) => {
    // return Changelog.Renderers.Markdown.render(Changelog.fromSeries(Release.fromMockCommits(commits)))
    return Changelog.render(Changelog.fromSeries(Release.fromMockCommits(commits)), { as: 'markdown' })
  }
  it('renders release changelog for the current release series', () => {
    const changelog = render(...mockCommits)
    expect(changelog).toMatchSnapshot()
  })
  it('shows breaking commits twice, once in breaking section and once in its native section', () => {
    const changelog = render({ message: 'a: foo\n\nBREAKING CHANGE:\nbar' })
    expect(changelog).toMatch(/BREAKING CHANGES\n\n.*foo/)
    expect(changelog).toMatch(/Improvements\n\n.*foo/)
  })
  it('shows breaking label if commit breaking except within breaking section', () => {
    const changelog = render({ message: 'a: foo\n\nBREAKING CHANGE:\nbar' })
    expect(changelog).toMatch(/Improvements\n\n.*(breaking).*foo/)
  })
  it('hides unknown section if no unknown commits', () => {
    const changelog = render({ message: 'a: b' })
    expect(changelog).not.toMatch(Changelog.empty().unspecified.label)
  })
  it('improvements section prefixes commits with their type', () => {
    const changelog = render({ message: 'a: foo' })
    expect(changelog).toMatch(/a: foo/)
  })
})

describe('.render() with terminal', () => {
  const render = (...commits: Release.MockCommit[]) => {
    return Changelog.render(Changelog.fromSeries(Release.fromMockCommits(commits)), { as: 'plain' })
  }

  it('renders changelog for the current release series', () => {
    const changelog = stripAnsi(render(...mockCommits))
    expect(changelog).toMatchSnapshot()
  })
})
