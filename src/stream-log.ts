import * as CP from 'child_process'

function gitLog() {
  const stream = CP.spawn('git', [
    'log',
    '--format="%H" ___ %D ___ %B |||',
    '--no-merges',
  ])

  let done = false
  const datumns: string[] = []

  stream.stdout.on('data', datum => {
    datumns.push(String(datum))
    console.log(1)
  })
  stream.on('close', () => {
    done = true
  })

  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          const value = [...datumns]
          datumns.length = 0
          return Promise.resolve({ value, done })
          // return Promise.resolve({ value, done })
        },
      }
    },
  }
}

async function main() {
  // for await (const logBatch of gitLog()) {
  //   // process.stdout.write('==> ' + logBatch)
  // }

  for await (const log of CP.spawn('git', [
    'log',
    '--format=%H ___ %D ___ %B |||',
    '--no-merges',
  ]).stdout) {
    process.stdout.write('==>  ' + log)
  }
}

main()
