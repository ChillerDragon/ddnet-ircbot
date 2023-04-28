const irc = require('irc')
const { networkInterfaces } = require('os')
const fs = require('fs')
const spawn = require('child_process').spawn
require('dotenv').config()

const interfaces = networkInterfaces()
const eth0 = interfaces.eth0 ? interfaces.eth0.filter((a) => a.family === 'IPv4')[0].address : ''

console.log('***')
console.log('* ddnet irc bot - call !mods on ddnet dvlpr irc')
console.log('*')
console.log(`* eth0=${eth0}`)
console.log(`* irc channel=${process.env.IRC_CHANNEL}`)
console.log(`* mod ping=${process.env.MOD_PING}`)
console.log('***')

const getServerIpsByPlayerName = async (searchName) => {
	const res = await fetch('https://master1.ddnet.org/ddnet/15/servers.json')
	const data = await res.json()
	let matchedEntries = []
	data.servers.forEach((entry) => {
		const names = entry.info.clients.map((client) => client.name)
		if (names.includes(searchName)) {
			matchedEntries.push(entry)
		}
	})
	// console.log(matchedEntries)
	matchedEntries = matchedEntries.filter((e) => e.info.name.startsWith('DDNet '))

	// console.log(matchedEntries)
	const ips = []
	matchedEntries.forEach((entry) => {
		entry.addresses
			.filter((addr) => addr.startsWith('tw-0.7+udp://'))
			.forEach((addr) => ips.push(addr))
	})
	const ddnetLinks = ips.map((ip) => `ddnet://${ip.substr(13)}`)
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

const client = new irc.Client('irc.ipv6.quakenet.org', 'chillerbot', {
	channels: [`#${process.env.IRC_CHANNEL}`],
})

const checkPingPongCmd = (cmd) => {
	let res = false
	try {
		const data = fs.readFileSync('ping_pong.csv', 'utf8');
		const rows = data.split('\n')

		rows.forEach((row) => {
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

const isPapaChiler = (from, isBridge, client) => {
	if (from !== 'ChillerDragon') {
		client.say(`#${process.env.IRC_CHANNEL}`, 'only papa chiler can pinger.');
		return false
	}
	if (isBridge) {
		client.say(`#${process.env.IRC_CHANNEL}`, 'this command only works from irc');
		return false
	}
	return true
}

const messageQueue = []

client.addListener(`message#${process.env.IRC_CHANNEL}`, async (from, message) => {
	let isBridge = false
	if (from === 'bridge') {
		const slibbers = message.split('>')
		from = slibbers[0].substr(1)
		message = slibbers.slice(1).join('>').substr(1)
		isBridge = true
	}
	console.log(`${isBridge ? '[bridge]' : ''}<${from}> ${message}`)
	if (!isBridge) {
		const ghIssueRegex = /#(\d+)/
		const match = ghIssueRegex.exec(message)
		if (match) {
			const ghUrl = `https://github.com/ddnet/ddnet/issues/${match[1]}`
			client.say(`#${process.env.IRC_CHANNEL}`, ghUrl);
		}
	}
	if (message[0] !== '!') {
		return
	}
	// delete doubled spaces
	// const words = message.substr(1).split(' ').filter((a) => a !== '') 
	const words = message.substr(1).split(' ') // keep double spaces
	const cmd = words[0] 
	const args = words.slice(1)
	if (cmd === 'help' || cmd === 'where' || cmd === 'info') {
		client.say(`#${process.env.IRC_CHANNEL}`, `https://github.com/ChillerDragon/ddnet-bot-irc eth0=${eth0} commands: !mods, !ping`);
	} else if (cmd === 'mods' || cmd === 'mod' || cmd === 'moderator') {
		if(!isPapaChiler(from, isBridge, client)) {
			return
		}
		const helpTxt = await sendHelpToChiler()
		client.say(`#${process.env.IRC_CHANNEL}`, `${process.env.MOD_PING} ${helpTxt}`)
	} else if (cmd === 'pck' || cmd === 'p' || cmd === 'packet') {
		const pythonProcess = spawn('python3', ["hex_to_pack.py", args.join(' ')])
		pythonProcess.stdout.on('data', (data) => {
			data.toString().split('\n').forEach((line) => {
				messageQueue.push(line)
			})
		});
	} else if (cmd === 'add_ping_pong') {
		if(!isPapaChiler(from, isBridge, client)) {
			return
		}
		if (args.length < 2) {
			client.say(`#${process.env.IRC_CHANNEL}`, 'usage: add_ping_ping <ping> <pong>')
			return
		}
		fs.appendFileSync('ping_pong.csv', `${args[0]}, ${args.slice(1).join(' ')}\n`);
	} else {
		const pong = checkPingPongCmd(cmd)
		if(pong) {
			client.say(`#${process.env.IRC_CHANNEL}`, pong)
		}
	}
})

client.addListener('error', (message) => {
	console.log('error: ', message)
})

const printQueue = () => {
	if (messageQueue.length <= 0) {
		return
	}
	console.log(`print queue ${messageQueue.length} items left`)
	client.say(`#${process.env.IRC_CHANNEL}`, messageQueue.shift())
}

setInterval(printQueue, 2000)

