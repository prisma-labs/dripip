import * as nodefs from 'fs'
import isogit from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

interface Input {
  cwd?: string
}

export type GitSyncStatus = 'synced' | 'not_synced' | 'remote_needs_branch'

class Git2 {
  private dir: string
  private fs: typeof nodefs
  private http: typeof http
  constructor(input?: Input) {
    this.dir = input?.cwd ?? process.cwd()
    this.fs = nodefs
    this.http = http
  }
  /**
   * Get the name of the currently checked out branch.
   */
  getCurrentBranchName() {
    return isogit.currentBranch({ fs: this.fs, dir: this.dir })
  }
  /**
   * Check how the local branch is not in sync or is with the remote.
   * Ref: https://stackoverflow.com/questions/3258243/check-if-pull-needed-in-git
   */
  async checkSyncStatus(): Promise<GitSyncStatus> {
    const gitConfigRemoteOriginUrl = await isogit.getConfig({
      fs: this.fs,
      dir: this.dir,
      path: 'remote.origin.url',
    })
    const remoteUrlPrefix = `https://github.com/`
    const remoteUrl = remoteUrlPrefix + gitConfigRemoteOriginUrl.replace('git@github.com:', '')
    console.log(remoteUrl)
    const remoteInfo = await isogit.getRemoteInfo({
      http: this.http,
      url: remoteUrl,
    })

    if (!remoteInfo.refs) {
      throw new Error('Could not fetch refs')
    }

    if (!remoteInfo.refs.heads) {
      throw new Error('Could not fetch ref heads')
    }

    const localBranchName = await this.getCurrentBranchName()

    if (!localBranchName) {
      throw new Error('Could not read own branch name')
    }

    if (
      !Object.keys(remoteInfo.refs.heads).find((remoteBranchName) => remoteBranchName === localBranchName)
    ) {
      return 'remote_needs_branch'
    }

    const localBranchHeadSha = await isogit.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' })
    const remoteBranchHeadSha = remoteInfo.refs.heads[localBranchName]

    if (localBranchHeadSha === remoteBranchHeadSha) {
      return 'synced'
    }

    return 'not_synced'

    // todo https://github.com/isomorphic-git/isomorphic-git/issues/1110
  }
}

export function createGit(input?: Input) {
  return new Git2(input)
}
