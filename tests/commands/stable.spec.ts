// TODO we need the concept of a pre-flight diagnostics module...

describe('preflight diagnostics include', () => {
  it.todo('check that the branch is trunk')
  // TODO need a flag like --queued-releases which permits releasing on
  // potentially not the latest commit of trunk. Think of a CI situation with
  // race-condition PR merges.
  it.todo('check that remote does not have any unpulled commits')
  // TODO need a flag to give some flexibility here probably. However permitting
  // releases of not branch head requires then checking all the later commits
  // are unreleased. The invariant being: a released commit can never have a
  // subsequent release made before it. But, as long as we require releases be
  // made on branch  head and that branch is up to date with or ahead of remote
  // we get that invariant for free.
  it.todo('check that the commit is the latest one on trunk')
  it.todo(
    'check that the commit does not already have a stable release present'
  )
})
