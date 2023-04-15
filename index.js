const irc = require('irc')
const { networkInterfaces } = require('os')
require('dotenv').config()

const client = new irc.Client('irc.ipv6.quakenet.org', 'chillerbot', {
	channels: ['#ddnet'],
})

const interfaces = networkInterfaces()
const eth0 = interfaces.eth0 ? interfaces.eth0.filter((a) => a.family === 'IPv4')[0].address : ''

console.log(`eth0=${eth0}`)

client.addListener('message#ddnet', (from, message) => {
	console.log(`<${from}> ${message}`)
	if (message[0] !== '!') {
		return
	}
	const cmd = message.substr(1)
	if (cmd === 'help' || cmd === 'where' || cmd === 'info') {
		client.say('#ddnet', `https://github.com/ChillerDragon/ddnet-bot-irc eth0=${eth0} commands: !mods`);
	} else if (cmd === 'mods' || cmd === 'mod' || cmd === 'moderator') {
		if (from !== 'ChillerDragon') {
			client.say('#ddnet', 'only papa chiler can pinger.');
			return
		}
		client.say('#ddnet', process.env.MOD_PING);
	}
})

client.addListener('error', (message) => {
	console.log('error: ', message)
})

