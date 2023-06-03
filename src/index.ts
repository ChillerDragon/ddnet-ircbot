const irc = require('irc')
const { networkInterfaces } = require('os')
const fs = require('fs')
const { Z_PARTIAL_FLUSH } = require('zlib')
const spawn = require('child_process').spawn
require('dotenv').config()

import { fakeBash } from './bash/bash'

// WTF typescript
// there has to be a proper fix in tsconfig.json but idk it
declare const fetch: Function

const interfaces = networkInterfaces()
const eth0 = interfaces.eth0 ? interfaces.eth0.filter((a: any) => a.family === 'IPv4')[0].address : ''

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}

console.log('***')
console.log('* ddnet irc bot - call !mods on ddnet dvlpr irc')
console.log('*')
console.log(`* eth0=${eth0}`)
console.log(`* irc channel=${process.env.IRC_CHANNEL}`)
console.log(`* mod ping=${process.env.MOD_PING}`)
console.log('***')

const QUIZ: {[key: string]: string} = {}
let currentQuiz: any = null
let currentQuizSolvers: string[] = []
let quizzesPlayed = 0

const messageQueue: string[] = []

const loadQuiz = () => {
	const quizCsv = fs.existsSync('quiz_secret.csv') ? 'quiz_secret.csv' : 'quiz.csv'
	const data = fs.readFileSync(quizCsv, 'utf8');
	const rows = data.split('\n')

	rows.forEach((row: string) => {
		if (row.startsWith('sep=')) { return }
		const cols = row.split(' ANSWER: ')
		const question = cols.shift()
		const answer: string = cols.join(' ANSWER: ')
		if(question) {
			QUIZ[question] = answer
		}
	})
}

const startQuiz = () => {
	const items = Object.keys(QUIZ)
	const item = items[Math.floor(Math.random()*items.length)];
	return item
}

loadQuiz()

console.log(QUIZ)

const getServerIpsByPlayerName = async (searchName: string) => {
	const res = await fetch('https://master1.ddnet.org/ddnet/15/servers.json')
	const data = await res.json()
	let matchedEntries: any[] = []
	data.servers.forEach((entry: any) => {
		const names = entry.info.clients.map((client: any) => client.name)
		if (names.includes(searchName)) {
			matchedEntries.push(entry)
		}
	})
	// console.log(matchedEntries)
	matchedEntries = matchedEntries.filter((e) => e.info.name.startsWith('DDNet '))

	// console.log(matchedEntries)
	const ips: string[] = []
	matchedEntries.forEach((entry) => {
		entry.addresses
			.filter((addr: string) => addr.startsWith('tw-0.7+udp://'))
			.forEach((addr: string) => ips.push(addr))
	})
	const ddnetLinks = ips.map((ip) => `ddnet://${ip.substring(13)}`)
	return ddnetLinks
}

const sendHelpToChiler = async () => {
	const links = await getServerIpsByPlayerName('ChillerDragon')
	// console.log(links)
	if (links.length === 0) {
		console.log('WARNOING chiler not foudn')
		return 'chiler is in danger on a unknown tw server'
	} else if (links.length === 1) {
		return `send help to chiler by clickin on this link ${links[0]}`
	}
	return `chiler is one one of those servers ${links.join(', ')} send help to this poor soul in danger`
}

const client = new irc.Client(process.env.IRC_SERVER, 'chillerbot', {
	channels: [`#${process.env.IRC_CHANNEL}`],
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
	client.say(`#${process.env.IRC_CHANNEL}`, msg);
}

const endQuiz = () => {
	quizzesPlayed += 1
	const answer = QUIZ[currentQuiz]
	currentQuiz = null
	if (currentQuizSolvers.length === 0){
		say("quiz over! u all nob nobodi solvinger it")
	} else {
		say(`quiz over! these pro quizzzers quizzled the quiz: ${currentQuizSolvers.join(',')}`)
	}
	say(`The quiz answer was: ${answer}`)
	currentQuizSolvers = []
}

const checkPingPongCmd = (cmd: string): string | null => {
	let res = null
	try {
		const data = fs.readFileSync('ping_pong.csv', 'utf8');
		const rows = data.split('\n')

		rows.forEach((row: string) => {
			const [ping, pong] = row.split(', ')
			if (cmd === ping) {
				res = pong
				return
			}
		})
	} catch (err) {
		console.error(err)
	}
	return res;
}

const isPapaChiler = (from: string, isBridge: boolean) => {
	if (from !== 'ChillerDragon') {
		say('only papa chiler can pinger.');
		return false
	}
	if (isBridge) {
		say('this command only works from irc');
		return false
	}
	return true
}

client.addListener(`message#${process.env.IRC_CHANNEL || 'ddnet_irc_test'}`, async (from: string, message: string) => {
	let isBridge = false
	if (['bridge', 'ws-client'].includes(from)) {
		const slibbers = message.split('>')
		from = slibbers[0].substring(1)
		message = slibbers.slice(1).join('>').substring(1)
		isBridge = true
	}
	console.log(`${isBridge ? '[bridge]' : ''}<${from}> ${message}`)
	if (!isBridge) {
		const matches = message.match(new RegExp('#(\\d+)', 'g')) || []
		matches.forEach((match) => {
			const ghUrl = `https://github.com/ddnet/ddnet/issues/${match[1]}`
			say(ghUrl);
		})
	}
	if (message[0] !== '!') {
		return
	}
	// delete doubled spaces
	// const words = message.substring(1).split(' ').filter((a) => a !== '') 
	const words = message.substring(1).split(' ') // keep double spaces
	const cmd = words[0] 
	const args = words.slice(1)
	if (cmd === 'help' || cmd === 'where' || cmd === 'info') {
		say(`https://github.com/ChillerDragon/ddnet-bot-irc eth0=${eth0} commands: !mods, !ping, !p (hex traffixc), !sh (bash)`);
	} else if (cmd === 'mods' || cmd === 'mod' || cmd === 'moderator') {
		if(!isPapaChiler(from, isBridge)) {
			return
		}
		const helpTxt = await sendHelpToChiler()
		say(`${process.env.MOD_PING} ${helpTxt}`)
	} else if (cmd === 'js' || cmd === 'node' || cmd === 'javascript' || cmd === 'deno') {
		const unsafeUnsanitizedUserinput = args.join(' ')
		if (process.env.ALLOW_JS != '1' ) {
			say('js is turned off because i got hacked')
			return
		}
		const denoProc = spawn('deno', ['eval', unsafeUnsanitizedUserinput])
		const delay = parseInt(process.env.JS_DELAY || '0', 10)
		denoProc.stderr.on('data', (_data: Buffer | string | any) => {
			say('js error')
		})
		denoProc.stdout.on('data', (data: Buffer | string | any) => {
			data.toString().split('\n').forEach((line: string) => {
				if (!delay) {
					say(line)
				} else {
					setTimeout(() => {
						messageQueue.push(line)
					}, delay)
				}
			})
		});
	} else if (cmd === 'bash' || cmd === 'sh' || cmd === 'shell') {
		if (process.env.ALLOW_BASH == '0' ) {
			say('bash broken because i got hacked')
			return
		}
		const userinput = args.join(' ')
		const fake = fakeBash(userinput)
		const maxStdout = parseInt(process.env.MAX_STDOUT || '3', 10)
		let numStdout = 0
		fake.toString().split('\n').forEach((line) => {
			numStdout += 1
			if (numStdout === maxStdout) { line = 'max output ...' }
			if (numStdout > maxStdout) { return }	

			messageQueue.push(line)
		})
		return
	} else if (cmd === 'pck' || cmd === 'p' || cmd === 'packet') {
		if (process.env.ALLOW_PACKET == '0' ) {
			say('packet command broken because i got hacked')
			return
		}
		const pythonProcess = spawn('python3', ["hex_to_pack.py", args.join(' ')])
		// nice to debug but can leak stuff on error
		// pythonProcess.stderr.on('data', (data: Buffer | string | any) => {
		// 	data.toString().split('\n').forEach((line: string) => {
		// 		messageQueue.push(line)
		// 	})
		// })
		pythonProcess.stdout.on('data', (data: Buffer | string | any) => {
			data.toString().split('\n').forEach((line: string) => {
				messageQueue.push(line)
			})
		})
	} else if (cmd === 'add_ping_pong') {
		if(!isPapaChiler(from, isBridge)) {
			return
		}
		if (args.length < 2) {
			say('usage: add_ping_ping <ping> <pong>')
			return
		}
		fs.appendFileSync('ping_pong.csv', `${args[0]}, ${args.slice(1).join(' ')}\n`);
	} else if (cmd === 'quiz') {
		if (process.env.ALLOW_QUIZ != '1' ) {
			// say('quiz off')
			say('quiz off because im too lazy to come out with more questions')
			return
		}
		if (args.length > 0) {
			if (args[0] === 'end' || args[0] === 'solve') {
				if (currentQuiz === null) {
					say("no quiz running try !quiz")
					return
				}
				endQuiz()
				return
			} else {
				say("Invalid quiz arg. Usage: !quiz [solve]")
				return
			}
		}
		if (currentQuiz !== null) {
			say(`quizzle running: ${currentQuiz}`)
			return
		}
		if (quizzesPlayed > 2) {
			say("woah there you people already played enough quizzle")
			return
		}
		currentQuiz = startQuiz()
		currentQuizSolvers = []
		say("Started quizzle answer with !a (your answer)")
		say("Q: " + currentQuiz)
	} else if (cmd === 'a') {
		if (currentQuiz === null) {
			say("no quiz running start one w !quiz")
			return
		}
		const attempt = args.join(' ')
		const answer = QUIZ[currentQuiz]

		console.log(currentQuiz)
		console.log(answer)

		const answerPattern = new RegExp(answer, 'i')
		if(answerPattern.test(attempt)) {
			// say(`wowowo pro ${from} solved the quiz!`)
			currentQuizSolvers.push(from)
			if(currentQuizSolvers.length >= 3) {
				endQuiz()
			}
		} else {
			// say("wrong")
		}
		say("do '!quiz solve' to check the answer")
	} else {
		const pong = checkPingPongCmd(cmd)
		if(pong !== null) {
			say(pong)
		}
	}
})

client.addListener('error', (message: string) => {
	console.log('error: ', message)
})

const printQueue = () => {
	if (messageQueue.length <= 0) {
		return
	}
	console.log(`print queue ${messageQueue.length} items left`)
	const msg = messageQueue.shift()
	if(msg)
		say(msg)
}

setInterval(printQueue, 2000)

