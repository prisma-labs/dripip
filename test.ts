import * as Git from "nodegit"

type TagWithCommits = {
  commit: Git.Object
  tags: Git.Reference[]
}

async function getTaggedCommits(
  repo: Git.Repository,
): Promise<TagWithCommits[]> {
  const refs: Git.Reference[] = await (repo.getReferences as any)()
  const commitsWithTags: Record<string, TagWithCommits> = {}

  for (const ref of refs) {
    if (!ref.isTag()) continue
    const commit = await ref.peel(Git.Object.TYPE.COMMIT)
    const id = commit.id().tostrS()
    let entry = commitsWithTags[id]
    if (!entry) {
      commitsWithTags[id] = entry = { tags: [], commit }
    }
    entry.tags.push(ref)
  }

  return Object.values(commitsWithTags)
}

async function getTagsOnCommit(c: Git.Commit): Promise<Git.Reference[]> {
  const repo = c.owner()
  const taggedCommits = await getTaggedCommits(repo)
  const taggedCommit = taggedCommits.filter(
    tc => tc.commit.id().tostrS() === c.id().tostrS(),
  )

  if (taggedCommit.length > 1) {
    throw new Error(
      "Found multiple tagged commit matches which should be impossible",
    )
  } else if (taggedCommit.length === 1) {
    return taggedCommit[0].tags
  } else {
    return []
  }
}

Git.Repository.open(".")
  .then(async repo => {
    const commit = await repo.getHeadCommit()
    const tagsOnCommit = await getTagsOnCommit(commit)

    if (tagsOnCommit.length) {
      console.log(
        "The current commit (%s) has tags: %s",
        commit,
        tagsOnCommit.map(r => r.shorthand()).join(", "),
      )
    } else {
      console.log("The current commit (%s) has no tags", commit)
    }
  })
  .catch(console.error)
