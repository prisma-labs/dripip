import { Octokit as OctokitClassLike } from '@octokit/rest'

export type ReleaseByTagRes = Awaited<ReturnType<typeof octokit.repos.getReleaseByTag>>

export const octokit = new OctokitClassLike({
  auth: process.env.GITHUB_TOKEN,
})

export type Octokit = typeof octokit
