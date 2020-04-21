import { Octokit as OctokitClassLike } from '@octokit/rest'

export const octokit = new OctokitClassLike({
  auth: process.env.GITHUB_TOKEN,
})

export type Octokit = typeof octokit
