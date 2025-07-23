export const getIssueUrls = (message: string): string[] => {
  const urls: string[] = []
  const matches = message.match(new RegExp('#\\d+', 'g'))
  if (matches == null) {
    return urls
  }
  matches.forEach((match) => {
    const ghUrl = `https://github.com/ddnet/ddnet/issues/${match.substring(1)}`
    urls.push(ghUrl)
  })
  return urls
}
