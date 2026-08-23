const downloadClang = (message: string): string | null => {
  if (message.includes('clang') && message.includes('format') && message.includes('download') && !message.includes('https://github.com/muttleyxd/clang-tools-static-binaries/releases')) {
    return 'you can download clang-format-10 here https://github.com/muttleyxd/clang-tools-static-binaries/releases'
  }
  return null
}

const funding = (message: string): string | null => {
  if (!message.includes('https://ddnet.org/funding/')) {
    const where = message.includes('where') || message.includes('how') || message.includes('?')
    const donate = message.includes('donate') || message.includes('money') || message.includes('cash')
    if (where && donate) {
      return 'You can see donors and how to donate here https://ddnet.org/funding/'
    }
  }
  return null
}

const hoster = (message: string): string | null => {
  const which = message.includes('which') || message.includes('?') || message.includes('where') || message.includes('what')
  const hoster = message.includes('host ') || message.includes('hoster') || message.includes('hosting') || message.includes('provider')
  const has = message.includes('has') || message.includes('uses') || message.includes('run ') || message.includes('running') || message.includes('run?')
  const ddnet = message.includes('ddnet') || message.includes('official') || message.includes('network') || message.includes('ddrace')
  if (which && hoster && has && ddnet) {
    return 'you can see the hosting providers ddnet uses here: https://github.com/ddnet/ddnet-web/blob/master/www/_includes/funding.html'
  }
  return null
}

const disableTimeScore = (message: string): string | null => {
  const response = 'to show points instead of time in the scoreboard remove this line https://github.com/ddnet/ddnet/blob/a9c316055f5d2579f6166152ec20c4241e0da456/src/game/server/gamecontroller.cpp#L600'
  if (message === '!score') {
    return response
  }

  // special case for this statement which is not a question but clearly a question xd
  // he never asked "how" just said "i cant" so we focus on the modded server part
  //
  //  hello guy i can't change time to score on my mod server (i'm all file checking)
  const cant = message.includes("can't") || message.includes('help') || message.includes('cannot') || message.includes('cant') || message.includes('can not')
  const cantChangeModdedServer =
    cant && message.includes('change') && (message.includes('my mod') || message.includes('server') || message.includes('modded'))

  const isHow = message.startsWith('how ') || message.includes(' how ') || message.includes(' how?')
  const isQuestion = isHow || message.includes('help') || message.includes('i need')
  const scoreQuestion = message.includes('score') && (isQuestion || cantChangeModdedServer)
  if (!scoreQuestion) {
    return null
  }

  const isTimeScoreRelated =
    message.includes('board') ||
      message.includes('tab') ||
      message.includes('fng') ||
      message.includes('block') ||
      message.includes('ctf') ||
      message.includes('time') ||
      message.includes('00:')

  if (!isTimeScoreRelated) {
    return null
  }

  return response
}

const askToAsk = (message: string): string | null => {
  const response = 'Any coding or ddnet related questions are welcome here, just ask. See https://dontasktoask.com/ for more info'
  const question = message.includes('questio') || message.includes('frage')
  const have = message.includes('can i') || message.includes('have')

  // if actual questions are prefixed with "I have a question:"
  // that is fine.
  // Detecting questions is hard so we assume minimal length
  // means actual context
  if (message.length > 'i have an important question'.length) {
    return null
  }

  if (have && question) {
    return response
  }

  return null
}

export const answerToCommonQuestion = (message: string): string => {
  const questionFuncs = [
    downloadClang,
    funding,
    hoster,
    disableTimeScore,
    askToAsk,
  ]

  message = message.toLowerCase()

  for (const questionFunc of questionFuncs) {
    const answer = questionFunc(message)
    if (answer !== null) {
      return answer
    }
  }

  return ''
}
