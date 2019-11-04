import * as Git from "nodegit"

async function getTags(repo: Git.Repository): Promise<Git.Reference[]> {
  const refs: Git.Reference[] = await (repo.getReferences as any)()
  const tags = refs.filter(ref => ref.isTag())
  return tags
}

async function getTaggedCommits(repo: Git.Repository): Promise<Git.Object[]> {
  const tags = await getTags(repo)
  const taggedCommits = await Promise.all(
    tags.map(t => t.peel(Git.Object.TYPE.COMMIT)),
  )
  return taggedCommits
}

async function getTagsOnCommit(c: Git.Commit): Promise<Git.Object[]> {
  const repo = c.owner()
  const taggedCommits = await getTaggedCommits(repo)
  const tagsOnCommit = taggedCommits.filter(
    c => c.id().tostrS() === c.id().tostrS(),
  )
  return tagsOnCommit
}

Git.Repository.open(".")
  .then(async repo => {
    const tagsOnCommit = await getTagsOnCommit(await repo.getHeadCommit())
    console.log(tagsOnCommit)
  })
  .catch(console.error)
