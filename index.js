const irc = require('irc')
const { networkInterfaces } = require('os')
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

client.addListener(`message#${process.env.IRC_CHANNEL}`, async (from, message) => {
	if (from === 'bridge') {
		const slibbers = message.split('>')
		from = slibbers[0].substr(1)
		message = slibbers.slice(1).join('>')
	}
	console.log(`<${from}> ${message}`)
	if (message[0] !== '!') {
		return
	}
	const cmd = message.substr(1)
	if (cmd === 'help' || cmd === 'where' || cmd === 'info') {
		client.say(`#${process.env.IRC_CHANNEL}`, `https://github.com/ChillerDragon/ddnet-bot-irc eth0=${eth0} commands: !mods`);
	} else if (cmd === 'ping') {
		client.say(`#${process.env.IRC_CHANNEL}`, 'pong')
	} else if (cmd === 'mods' || cmd === 'mod' || cmd === 'moderator') {
		if (from !== 'ChillerDragon') {
			client.say(`#${process.env.IRC_CHANNEL}`, 'only papa chiler can pinger.');
			return
		}
		const helpTxt = await sendHelpToChiler()
		client.say(`#${process.env.IRC_CHANNEL}`, `${process.env.MOD_PING} ${helpTxt}`)
	}
})

client.addListener('error', (message) => {
	console.log('error: ', message)
})

