import { onChatMessage } from "./commands"
import { messageQueue } from "./queue"

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

console.log('************************************************')
console.log(`
     _                                  _
  __| | _____   __  _ __ ___   ___   __| | ___
 / _\` |/ _ \\ \\ / / | '_ \` _ \\ / _ \\ / _\` |/ _ \\
| (_| |  __/\\ V /  | | | | | | (_) | (_| |  __/
 \\__,_|\\___| \\_/   |_| |_| |_|\\___/ \\__,_|\\___|

`)
console.log('************************************************')
console.log('there is no irc on')
console.log('just chat with the bot')
console.log('************************************************')

const say = (msg: string) => {
	if (!msg) {
		return
	}
	console.log('<chillerbot>', msg)
}

rl.on('line', (line: string) => {
    onChatMessage("testuser", line, say)
})

rl.once('close', () => {
    // end of input
})

const printQueue = () => {
	if (messageQueue().length <= 0) {
		return
	}
	const msg = messageQueue().shift()
	if(msg)
		say(msg)
}

setInterval(printQueue, 200)
