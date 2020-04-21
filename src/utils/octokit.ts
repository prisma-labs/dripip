import { Octokit as OctokitClassLike } from '@octokit/rest'
import { PromiseValue } from 'type-fest'

export type ReleaseByTagRes = PromiseValue<ReturnType<typeof octokit.repos.getReleaseByTag>>

export const octokit = new OctokitClassLike({
  auth: process.env.GITHUB_TOKEN,
})

export type Octokit = typeof octokit
