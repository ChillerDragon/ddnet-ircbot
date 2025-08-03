export const getMessageTextWithoutCodeSnippets = (message: string): string[] => {
  const texts: string[] = []

  let inBacktick: null | string = null
  let currentText = ''
  let currentCode = ''

  for (let i = 0; i < message.length; i++) {
    let matchBackTick = null
    if (message[i] === '`' && message[i + 1] === '`' && message[i + 2] === '`') {
      matchBackTick = '```'
    } else if (message[i] === '`' && message[i + 1] === '`') {
      matchBackTick = '``'
    } else if (message[i] === '`') {
      matchBackTick = '`'
    }

    // open snippet
    if (!inBacktick && matchBackTick) {
      i += matchBackTick.length - 1
      inBacktick = matchBackTick

      if (currentText.length > 0) {
        texts.push(currentText)
        currentText = ''
      }
      currentCode = ''
      continue
    }

    // close snippet
    if (inBacktick && matchBackTick) {
      if (inBacktick === matchBackTick) {
        inBacktick = null
        i += matchBackTick.length - 1
        currentCode = ''
      } else {
        // invalid code snippet? or nested backticks?
        // ignore for now to support nested backticks
      }
      continue
    }

    if (inBacktick === null) {
      currentText += message[i]
    } else {
      currentCode += message[i]
    }
  }

  if (currentText.length > 0) {
    texts.push(currentText)
  }

  // unterminated code snippet is not a code snippet
  if (currentCode.length > 0 && inBacktick) {
    texts.push(inBacktick + currentCode)
  }

  return texts
}

export const getIssueUrls = (message: string): string[] => {
  const urls: string[] = []
  const matches = getMessageTextWithoutCodeSnippets(message).join('').match(new RegExp('[a-zA-Z0-9_-]*#\\d+', 'g'))
  if (matches == null) {
    return urls
  }
  matches.forEach((match) => {
    const issueId = match.split('#')[1]
    let repoUrl = 'https://github.com/ddnet/ddnet'
    if (/(^|[^a-zA-Z0-9_-])(tater|tclient|t|tc)#/.test(match)) {
      repoUrl = 'https://github.com/sjrc6/TaterClient-ddnet'
    } else if (/(^|[^a-zA-Z0-9_-])(rs|rust|jup|jap|jop|pg)#/.test(match)) {
      repoUrl = 'https://github.com/ddnet/ddnet-rs'
    }
    const ghUrl = `${repoUrl}/issues/${issueId}`
    urls.push(ghUrl)
  })
  return urls
}
