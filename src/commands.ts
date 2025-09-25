import { fakeBash } from './bash/bash'
import { getIssueUrls } from './msg_matchers'
import { getRndInteger } from './naming_things_util_is_bad'
import { answerToCommonQuestion } from './qna'
import { messageQueue } from './queue'
import { remindings, Reminding } from './remindings'

const { networkInterfaces } = require('os')
const fs = require('fs')
const spawn = require('child_process').spawn

// WTF typescript
// there has to be a proper fix in tsconfig.json but idk it
declare const fetch: Function

const interfaces = networkInterfaces()
const eth0 = interfaces.eth0 ? interfaces.eth0.filter((a: any) => a.family === 'IPv4')[0].address : ''

console.log('***')
console.log('* ddnet irc bot - call !mods on ddnet dvlpr irc')
console.log('*')
console.log(`* eth0=${eth0}`)
console.log(`* irc channel=${process.env.IRC_CHANNEL}`)
console.log(`* mod ping=${process.env.MOD_PING}`)
console.log('***')

const QUIZ: { [key: string]: string } = {}
let currentQuiz: any = null
let currentQuizSolvers: string[] = []
let quizzesPlayed = 0

const loadQuiz = () => {
  const quizCsv = fs.existsSync('quiz_secret.csv') ? 'quiz_secret.csv' : 'quiz.csv'
  const data = fs.readFileSync(quizCsv, 'utf8')
  const rows = data.split('\n')

  rows.forEach((row: string) => {
    if (row.startsWith('sep=')) { return }
    const cols = row.split(' ANSWER: ')
    const question = cols.shift()
    const answer: string = cols.join(' ANSWER: ')
    if (question) {
      QUIZ[question] = answer
    }
  })
}

const startQuiz = () => {
  const items = Object.keys(QUIZ)
  const item = items[Math.floor(Math.random() * items.length)]
  return item
}

loadQuiz()

console.log(QUIZ)

const cmdPrefix = () => {
  return '!'
}

const deprecatedCmdPrefix = () => {
  return '$'
}

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

const endQuiz = (say: (msg: string) => void) => {
  quizzesPlayed += 1
  const answer = QUIZ[currentQuiz]
  currentQuiz = null
  if (currentQuizSolvers.length === 0) {
    say('quiz over! u all nob nobodi solvinger it')
  } else {
    say(`quiz over! these pro quizzzers quizzled the quiz: ${currentQuizSolvers.join(',')}`)
  }
  say(`The quiz answer was: ${answer}`)
  currentQuizSolvers = []
}

const checkPingPongCmd = (cmd: string): string | null => {
  let res = null
  try {
    const data = fs.readFileSync('ping_pong.csv', 'utf8')
    const rows = data.split('\n')

    rows.forEach((row: string) => {
      const [ping, pong] = row.split(', ')
      if (cmd === ping) {
        res = pong
      }
    })
  } catch (err) {
    console.error(err)
  }
  return res
}

const isPapaChiler = (from: string, isBridge: boolean, say: (msg: string) => void) => {
  if (from !== 'ChillerDragon') {
    say('only papa chiler can pinger.')
    return false
  }
  if (isBridge) {
    say('this command only works from irc')
    return false
  }
  return true
}

export const onShellCommand = (userinput: string, say: (msg: string) => void): void => {
  if (process.env.ALLOW_BASH == '0') {
    say('bash moved to chat.zillyhuhn.com #off-topic')
    return
  }
  const fake = fakeBash(userinput)
  const maxStdout = parseInt(process.env.MAX_STDOUT || '3', 10)
  let numStdout = 0
  fake.toString().split('\n').forEach((line) => {
    numStdout += 1
    if (numStdout === maxStdout) { line = 'max output ...' }
    if (numStdout > maxStdout) { return }

    messageQueue().push(line)
  })
}

// type SayCallback = (msg: string) => void
export const onChatMessage = async (from: string, message: string, say: (msg: string) => void) => {
  const isDiscordBridge = ['bridge', 'bridge_'].includes(from)
  const isIrcBridge = ['ws-client', 'ws-client1'].includes(from)
  const isBridge = isDiscordBridge || isIrcBridge
  if (isBridge) {
    const slibbers = message.split('>')
    if (isIrcBridge) {
      from = slibbers[0].substring(3)
      message = slibbers.slice(1).join('>').substring(3)
    } else {
      from = slibbers[0].substring(1)
      message = slibbers.slice(1).join('>').substring(1)
    }
  }
  console.log(`${isBridge ? '[bridge]' : ''}<${from}> ${message}`)
  if (!isDiscordBridge && message[0] !== cmdPrefix()) {
    const ghUrls = getIssueUrls(message)
    ghUrls.forEach((ghUrl) => {
      say(ghUrl)
    })
    if (ghUrls.length !== 0) {
      return
    }
  }

  if (message === 'potat pls ping') {
    say('pong')
    return
  }

  if (message[0] !== cmdPrefix() && message[0] !== deprecatedCmdPrefix()) {
    const qna = answerToCommonQuestion(message)
    if (qna && qna !== '') {
      say(qna)
    }
    return
  }

  // delete doubled spaces
  // const words = message.substring(1).split(' ').filter((a) => a !== '')
  const words = message.substring(1).trim().split(' ') // keep double spaces
  const cmd = words[0]
  const args = words.slice(1)
  let didRespond = true
  if (cmd === 'help' || cmd === 'where' || cmd === 'info') {
    // const commands = [
    //   ['mods', ''],
    //   ['p', '[hex traffic]'],
    //   ['sh', '[bash]'],
    //   ['roll', '?[from|to] ?[to]'],
    //   ['remind', '[message]']
    // ]

    say(
			`https://github.com/ChillerDragon/ddnet-bot-irc eth0=${eth0} commands:` +
			`${cmdPrefix()}remind [message], ${cmdPrefix()}mods, ${cmdPrefix()}merge [pr id], ${cmdPrefix()}whoami, ${cmdPrefix()}ping, ${cmdPrefix()}p (hex traffixc), ${cmdPrefix()}sh (bash), ${cmdPrefix()}roll ?[from|to] ?[to]`
    )
  } else if (cmd === 'mods' || cmd === 'mod' || cmd === 'moderator') {
    if (!isPapaChiler(from, isBridge, say)) {
      return
    }
    const helpTxt = await sendHelpToChiler()
    say(`${process.env.MOD_PING} ${helpTxt}`)
  } else if (cmd === 'wiki') {
    say('dead, tldr is ryo upgraded debian 13, somehow the mediawiki instance inside docker says db is read only mode, ryo thought backups worked but they didnt for a year cuz a tool renamed from mysqldump to mariadb-dump')
    return
  } else if (cmd === 'js' || cmd === 'node' || cmd === 'javascript' || cmd === 'deno') {
    const unsafeUnsanitizedUserinput = args.join(' ')
    if (process.env.ALLOW_JS != '1') {
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
            messageQueue().push(line)
          }, delay)
        }
      })
    })
  } else if (cmd === 'bash' || cmd === 'sh' || cmd === 'shell') {
    onShellCommand(args.join(' '), say)
  } else if (cmd === 'pck' || cmd === 'p' || cmd === 'packet') {
    if (process.env.ALLOW_PACKET == '0') {
      say('packet command broken because i got hacked')
      return
    }
    console.log('spawning python3 process')
    const pythonProcess = spawn('python3', ['hex_to_pack.py', args.join(' ')])
    console.log('spawned python3 process')
    // nice to debug but can leak stuff on error
    pythonProcess.stderr.on('data', (data: Buffer | string | any) => {
      data.toString().split('\n').forEach((line: string) => {
        console.log(line)
        // messageQueue().push(line)
      })
    })
    pythonProcess.stdout.on('data', (data: Buffer | string | any) => {
      data.toString().split('\n').forEach((line: string) => {
        messageQueue().push(line)
      })
    })
  } else if (cmd === 'add_ping_pong') {
    if (!isPapaChiler(from, isBridge, say)) {
      return
    }
    if (args.length < 2) {
      say('usage: add_ping_ping <ping> <pong>')
      return
    }
    fs.appendFileSync('ping_pong.csv', `${args[0]}, ${args.slice(1).join(' ')}\n`)
  } else if (['roll', 'rand'].includes(cmd)) {
    let fromRand = 0
    let toRand = 100
    if (args.length === 2) {
      fromRand = parseInt(args[0], 10)
      toRand = parseInt(args[1], 10)
    } else if (args.length == 1) {
      toRand = parseInt(args[0], 10)
    } else if (args.length > 1) {
      say('usage: !roll ?[from|to] ?[to]')
      return
    }

    if (fromRand > toRand) {
      say('fatal internal error: javascript runtime buffer inter flow')
      return
    }

    let randVal = getRndInteger(fromRand, toRand)

    const rigRng = getRndInteger(0, 100)

    if (rigRng === 0) {
      randVal = 69
    } else if (rigRng === 1) {
      randVal = 666
    } else if (rigRng === 2) {
      const gigaRig = getRndInteger(0, 200)
      if (gigaRig == 0) {
        say('onbgy is the biggest troll')
        return
      } else if (gigaRig === 1) {
        say('yemDX is a known troll')
        return
      } else if (gigaRig === 2) {
        say('pink rat broke the roll command')
        return
      } else if (gigaRig === 3) {
        say('THIS BOT HAS BEEN HACKED BY SP SOMEONE')
        return
      } else if (gigaRig === 4) {
        say('NaN')
        return
      } else if (gigaRig === 5) {
        say('-Infinity')
        return
      } else if (gigaRig === 6) {
        say("if (process.env.ALLOW_QUIZ != '1') {")
        return
      } else if (gigaRig === 7) {
        say('There was an rng error. As compensation you receive ChillerDragons github password: ilovelaracroftgaming6969')
        return
      } else if (gigaRig === 8) {
        say('8')
        return
      } else if (gigaRig === 9) {
        say('9 (rigged)')
        return
      } else if (gigaRig === 10) {
        say('undefined')
        return
      } else if (gigaRig === 11) {
        say('dennis felsing')
        return
      } else if (gigaRig === 12) {
        say(' 2')
        return
      } else if (gigaRig === 13) {
        say('this command has been taken down because of excessive gambling')
        return
      } else if (gigaRig === 14) {
        say('the command !roll is deprecated in favor of !sushiroll')
        return
      } else if (gigaRig === 15) {
        say('sometimes i wonder how tsfreddie is doing')
        return
      } else if (gigaRig === 16) {
        say('Segmentaion fault')
        return
      } else if (gigaRig === 17) {
        say('@Learath2 have you tried fixing the ddos problem?')
        return
      } else if (gigaRig === 18) {
        say('sometimes i am thinking about capitalism')
        return
      } else if (gigaRig === 19) {
        say('snail did 9/11')
        return
      } else if (gigaRig === 20) {
        say('ddnet servers have an exploit. But I can not comment on it.')
        return
      } else if (gigaRig === 21) {
        say(`toons ah rng rolled ${getRndInteger(0, 239)}`)
        return
      } else if (gigaRig === 22) {
        say('roll deez')
        return
      } else if (gigaRig === 23) {
        say('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        return
      } else if (gigaRig === 24) {
        say('twat')
        return
      } else if (gigaRig === 25) {
        say('skibidi sigma')
        return
      } else if (gigaRig === 26) {
        say('sometimes i wonder why blocking is not allowed in ddnet')
        return
      } else if (gigaRig === 27) {
        // actually not rigged xd
        // but how would they know
        say(`${randVal.toString()} (rigged)`)
        return
      } else if (gigaRig === 28) {
        say("Request timed out: HTTPSConnectionPool(host='api.openai.com', port=443): Read timed out. (read timeout=600)")
        return
      } else if (gigaRig === 29) {
        say('The holy orcale is on vacation. Try again later')
        return
      } else if (gigaRig === 30) {
        say('No such command !roll did you mean !rickroll?')
        return
      } else if (gigaRig === 31) {
        say('Sigmatation fault')
        return
      } else if (gigaRig === 32) {
        say('@learath2 there are more than 100 open prs — go close some')
        return
      } else if (gigaRig === 33) {
        say('1                                                                  7')
        return
      } else if (gigaRig === 34) {
        say('Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunternehmenbeamtengesellschaft')
        return
      } else if (gigaRig === 35) {
        say('bWFkZSB5b3UgbG9vaywgZm9vbA==')
        return
      } else if (gigaRig === 36) {
        say('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8')
        return
      } else if (gigaRig === 37) {
        say('(646) 926-6614')
        return
      } else if (gigaRig === 38) {
        say('(248) 434-5508')
        return
      } else if (gigaRig === 39) {
        say('3.14')
        return
      } else if (gigaRig === 40) {
        say('42')
        return
      } else if (gigaRig === 41) {
        say('Cannot connect to the Docker daemon at unix:///var/run/docker.suck. Is the docker daemon running?')
        return
      } else if (gigaRig === 42) {
        say('104 101 108 112 32 99 104 105 108 108 101 114 32 105 115 32 104 111 108 100 105 110 103 32 109 101 32 104 111 115 116 97 103 101')
        return
      } else if (gigaRig === 43) {
        say('Are you a human? Please solve this captcha first https://captcha.zillyhuhn.com/')
        return
      } else if (gigaRig === 44) {
        say(Math.random().toString())
        return
      } else if (gigaRig === 44) {
        say(`${randVal.toString()}'`)
        return
      } else if (gigaRig === 45) {
        say(`${randVal.toString()} a`)
        return
      } else if (gigaRig === 46) {
        say(`skibidi rigma ${randVal.toString()}`)
        return
      } else if (gigaRig === 47) {
        say('sick')
        return
      } else if (gigaRig === 48) {
        say(`You are the 10000th user of the roll command! The number you rolled: ${randVal.toString()}`)
        return
      } else if (gigaRig === 49) {
        say('Bro this is the #developer channel. Go #off-topic with this bs')
        return
      } else if (gigaRig === 50) {
        say('Gorbatschow')
        return
      } else if (gigaRig === 51) {
        say('This message means I pressed f4')
        return
      } else if (gigaRig === 52) {
        say('bro, checkout this client: chillerbot.github.io')
        return
      } else if (gigaRig === 53) {
        say('the !roll command is currently deactivated for discord users')
        return
      } else if (gigaRig === 54) {
        say('No such command !roll did you mean !rice')
        return
      } else if (gigaRig === 55) {
        say('missing permissions try: sudo !roll')
        return
      } else if (gigaRig === 56) {
        say('https://ddnet.org/players/Mithrandir/')
        return
      } else if (gigaRig === 57) {
        say('Stronghold 2')
        return
      } else if (gigaRig === 58) {
        say('Genericore 5')
        return
      } else if (gigaRig === 59) {
        say('html is a programming language')
        return
      } else if (gigaRig === 60) {
        say('fng > gores')
        return
      } else if (gigaRig === 61) {
        say('python > rust')
        return
      } else if (gigaRig === 62) {
        say('bubble tea')
        return
      } else if (gigaRig === 63) {
        say('https://www.youtube.com/watch?v=Ywfk2z1yZf4&list=PLDtPxwYnsMY23yG3EktGRZ2bhsuoqEv6F')
        return
      } else if (gigaRig === 64) {
        say("Can't roll right now. I am currently playing zCatch")
        return
      } else if (gigaRig === 65) {
        say('Du kannst mir mal den Buckel runterlutschen')
        return
      } else if (gigaRig === 66) {
        say('Capitalism.')
        return
      } else if (gigaRig === 67) {
        say('Is today a good day to buy crypto?')
        return
      } else if (gigaRig === 68) {
        say('https://ddnet.org/maps/NiggoDrag/')
        return
      } else if (gigaRig === 69) {
        say('69')
        return
      } else if (gigaRig === 70) {
        say('https://ddnet.org/players/lola/')
        return
      } else if (gigaRig === 71) {
        say('https://ddnet.org/players/Jesus-32-Christ/')
        return
      } else if (gigaRig === 72) {
        say('https://github.com/ddnet-insta/antibot-insta/issues/2891')
        return
      } else if (gigaRig === 73) {
        say('first milk or cornskates?')
        return
      } else if (gigaRig === 74) {
        say('bash error')
        return
      } else if (gigaRig === 75) {
        say('unsafe bash')
        return
      } else if (gigaRig === 76) {
        say('free spsomeone')
        return
      } else if (gigaRig === 77) {
        say('rolling stone')
        return
      } else if (gigaRig === 78) {
        say('skibidi tripma')
        return
      } else if (gigaRig === 79) {
        say('есть русские?')
        return
      } else if (gigaRig === 80) {
        say('Twinbop')
        return
      } else if (gigaRig === 81) {
        say('Twinhop')
        return
      } else if (gigaRig === 82) {
        say('I think there is a merge conflict.')
        return
      } else if (gigaRig === 83) {
        say('@0xdeen i reset my pc. Please add this ssh key to all servers again: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICeZCrrTjDOlPd+mXkDBPH9ktO4wUA5V9IlUlrusznZA chiller@debian')
        return
      } else if (gigaRig === 84) {
        say('Souly')
        return
      } else if (gigaRig === 85) {
        say('Solly')
        return
      } else if (gigaRig === 86) {
        say('nouis')
        return
      } else if (gigaRig === 87) {
        say('bencie rules')
        return
      } else if (gigaRig === 88) {
        say('Hold on — I am currently downloading my wife ...')
        return
      } else if (gigaRig === 89) {
        say('recently i was rizzing up cleverbot')
        return
      } else if (gigaRig === 90) {
        say('where a deen')
        return
      } else if (gigaRig === 91) {
        say('i need a deen')
        return
      } else if (gigaRig === 92) {
        say('I am LIBAN')
        return
      } else if (gigaRig === 93) {
        say('I was a faithful friend...')
        return
      } else if (gigaRig === 94) {
        say('I was a faithful friend from the start. The best friend? No. But I was a faithful friend. From map to map, I helped jao get across hard barriers. We talked and talked, about the future, what teeworlds could hold. We had wonderful moments together, ...')
        return
      } else if (gigaRig === 95) {
        say("... memories that would last a lifetime. Whenever I would see him on a server, a new journey would spark up as we explored the wonders of each map. And now? he won't fucking transfer my points")
        return
      } else if (gigaRig === 96) {
        say('in trust me rust')
        return
      } else if (gigaRig === 97) {
        say('in rust we trust')
        return
      } else if (gigaRig === 98) {
        say('written in javascript BTW')
        return
      } else if (gigaRig === 99) {
        say('I use nano BTW')
        return
      } else if (gigaRig === 100) {
        say('undefined')
        return
      } else if (gigaRig === 101) {
        say('null')
        return
      } else if (gigaRig === 102) {
        say("Uncaught TypeError: Cannot read properties of undefined (reading 'split')")
        return
      } else if (gigaRig === 103) {
        say("/home/niklaswinkler/.rbenv/versions/3.4.2/lib/ruby/gems/3.4.0/gems/csv-3.3.2/lib/csv.rb:1668:in 'File#initialize': no implicit conversion of nil into String (TypeError)")
        return
      } else if (gigaRig === 104) {
        say('hot take: what if Meskalin ô.O (xush, ath), FruchtiHD (status.tw) and Mr Anderson (teecloud.eu, servercompass.com) are the same person?')
        return
      } else if (gigaRig === 105) {
        say('yes it works not')
        return
      }
    }

    say(randVal.toString())
  } else if (cmd === 'merge') {
    if (args.length !== 1) {
      say('usage: merge [pr id] - to merge ddnet pr using chiler maintainer credentials')
      return
    }
    const prMatch = args[0].match(new RegExp(/^#?(\d+)$/))
    if (prMatch == null) {
      say('invalid pr id')
      return
    }
    const prId = prMatch[1]
    say(`using chilors github maintainer credentials to automatically merge https://github.com/ddnet/ddnet/pull/${prId} ...`)
  } else if (cmd === 'whoami') {
    const rigRng = getRndInteger(0, 10)
    if (rigRng === 0) {
      say('uid=0(root) gid=0(root) groups=0(root)')
    } else {
      say(`you is: ${from}`)
    }
  } else if (cmd === 'reminder' || cmd === 'remindme' || cmd === 'remind') {
    if (args.length === 0) {
      say('usage !remind [time in minutes] [text]')
      return
    }
    if (remindings.length > 50) {
      say('There are already 50 remindingsbums pending. To unlock more consider buying chillerbot premium subscription.')
      return
    }

    let time = parseInt(args[0], 10)

    let remindDelay = 24 * 60 * 60 * 1000
    let about

    if (!Number.isNaN(time)) {
      if (time > 60 * 24 * 7) {
        time = 60 * 24 * 7
      }
      remindDelay = time * 60 * 1000
      about = args.slice(1).join(' ')
    } else {
      about = args.join(' ')
    }

    const remindDate = new Date(Date.now() + remindDelay)
    const reminding = new Reminding(about, from, remindDate)
    remindings.push(reminding)
    say(`Helo ${from} I will remind you at ${remindDate} about your matter again.`)
  } else if (cmd === 'quiz') {
    if (process.env.ALLOW_QUIZ != '1') {
      // say('quiz off')
      say('quiz off because im too lazy to come out with more questions')
      return
    }
    if (args.length > 0) {
      if (args[0] === 'end' || args[0] === 'solve') {
        if (currentQuiz === null) {
          say('no quiz running try !quiz')
          return
        }
        endQuiz(say)
        return
      } else {
        say('Invalid quiz arg. Usage: !quiz [solve]')
        return
      }
    }
    if (currentQuiz !== null) {
      say(`quizzle running: ${currentQuiz}`)
      return
    }
    if (quizzesPlayed > 2) {
      say('woah there you people already played enough quizzle')
      return
    }
    currentQuiz = startQuiz()
    currentQuizSolvers = []
    say('Started quizzle answer with !a (your answer)')
    say('Q: ' + currentQuiz)
  } else if (cmd === 'a') {
    if (currentQuiz === null) {
      say('no quiz running start one w !quiz')
      return
    }
    const attempt = args.join(' ')
    const answer = QUIZ[currentQuiz]

    console.log(currentQuiz)
    console.log(answer)

    const answerPattern = new RegExp(answer, 'i')
    if (answerPattern.test(attempt)) {
      // say(`wowowo pro ${from} solved the quiz!`)
      currentQuizSolvers.push(from)
      if (currentQuizSolvers.length >= 3) {
        endQuiz(say)
      }
    } else {
      // say("wrong")
    }
    say(`do '${cmdPrefix()}quiz solve' to check the answer`)
  } else {
    const pong = checkPingPongCmd(cmd)
    if (pong !== null) {
      say(pong)
    } else {
      didRespond = false
    }
  }
  if (didRespond && message[0] === deprecatedCmdPrefix() && message.length > 1) {
    say(`${deprecatedCmdPrefix()} is reprecated reverse moved back to ${cmdPrefix()}`)
  }
}
