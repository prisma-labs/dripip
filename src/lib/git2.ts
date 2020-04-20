import isogit from 'isomorphic-git'
import { BasicGithubRepoInfo } from './git'

export async function parseGithubRepoInfoFromGitConfig(): BasicGithubRepoInfo {
  isogit.getConfig()
}
