import { onChatMessage } from './commands'
import { messageQueue } from './queue'

const irc = require('matrix-org-irc')
require('dotenv').config()

if (!process.env.IRC_CHANNEL) {
  console.log('Error: IRC_CHANNEL is not set! check your .env file')
  process.exit(1)
}

const client = new irc.Client(process.env.IRC_SERVER, 'chillerbot', {
  channels: [`#${process.env.IRC_CHANNEL}`]
})

const say = (msg: string) => {
  if (!msg) {
    return
  }
  // since we have full echo/say control
  // one could do `echo /irccommand` or something like that
  // if(!/^\s*[a-zA-Z0-9`\-@]/.test(msg)) {
  // 	msg = `_${msg}`
  // }
  client.say(`#${process.env.IRC_CHANNEL}`, msg)
}

client.addListener(`message#${process.env.IRC_CHANNEL || 'ddnet_irc_test'}`, async (from: string, message: string) => {
  onChatMessage(from, message, say)
})

client.addListener('error', (message: string) => {
  console.log('error: ', message)
})

const printQueue = () => {
  if (messageQueue().length <= 0) {
    return
  }
  console.log(`print queue ${messageQueue().length} items left`)
  const msg = messageQueue().shift()
  if (msg) { say(msg) }
}

setInterval(printQueue, 2000)
