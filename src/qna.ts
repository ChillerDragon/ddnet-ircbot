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

export const answerToCommonQuestion = (message: string): string => {
  const questionFuncs = [
    downloadClang,
    funding
  ]

  for(const questionFunc of questionFuncs) {
    const answer = questionFunc(message)
    if(answer !== null) {
      return answer
    }
  }

  return ''
}
