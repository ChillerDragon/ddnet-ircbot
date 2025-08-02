export const getIssueUrls = (message: string): string[] => {
  const urls: string[] = []
  const matches = message.match(new RegExp('[a-zA-Z0-9_-]*#\\d+', 'g'))
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
