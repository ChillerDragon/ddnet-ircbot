interface UnixFile {
	name: string,
	type: string,
	perms: string,
	content?: string,
}

interface UnixFileSystem {
	[index: string]: UnixFile[]
}

interface BashState {
    fs: UnixFileSystem,
    vars: {[key: string]: string},
    tmpVars: {[key: string]: string}
}

interface BashResult {
    stdout: string,
    stderr: string,
    exitCode: number
}

export const glbBs: BashState = {
    fs: {},
    vars: {},
    /*
        scoped variables
        in subshells, files or functions
    */
    tmpVars: {}
}

glbBs.vars['?'] = '0'
glbBs.vars['$'] = '24410'
glbBs.vars['BASHPID'] = glbBs.vars['$']
glbBs.vars['PPID'] = '24411'
glbBs.vars['BASH_VERSION'] = '5.1.4(1)-release'
glbBs.vars['HOSTNAME'] = 'ONBGY-FNG-MACHINE'
glbBs.vars['PWD'] = '/home/pi'
glbBs.vars['HOME'] = '/home/pi'
glbBs.vars['SHELL'] = '/bin/bash'
glbBs.vars['USER'] = 'pi'
glbBs.vars['PATH'] = '/home/pi/.cargo/bin:/home/pi/.nvm/versions/node/v18.16.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games'

const getDiskUsage = () => {
	return JSON.stringify(glbBs.fs).length
}
const getPathType = (fullpath: string): string | null => {
	const split = fullpath.split('/')
	const filename = split.pop()
	let path = split.join('/')
	let type = null
	if (!glbBs.fs[path]) {
		return null
	}
	glbBs.fs[path].forEach((file) => {
		if(file.name === filename) {
			type = file.type
			return type
		}
	})
	return type
}

const getFile = (fullpath: string): UnixFile | null => {
	const split = fullpath.split('/')
	const filename = split.pop()
	let path = split.join('/')
	console.log(`getFile path=${path} filename=${filename}`)
	let foundFile = null
	if (!glbBs.fs[path]) {
		return null
	}
	glbBs.fs[path].forEach((file) => {
		if(file.name === filename) {
			foundFile = file
			return foundFile
		}
	})
	return foundFile
}

export const pathInfo = (fullpath: string): [string, string, string | null] => {
	if(fullpath.startsWith('~')) {
		fullpath = glbBs.vars['HOME'] + fullpath.substring(1)
	}
	if (fullpath === '.') {
		const split =  glbBs.vars['PWD'].split('/')
		const abspath = split.join('/')
		split.pop()
		const basepath = split.join('/') === '' ? '/' : split.join('/')
		return [abspath, basepath, null]
	} else if (fullpath === '..') {
		const split =  glbBs.vars['PWD'].split('/')
		split.pop()
		const abspath = split.join('/')
		split.pop()
		const basepath = split.join('/') === '' ? '/' : split.join('/')
		return [abspath, basepath, null]
	}
	if (fullpath === '/') {
		return ['/', '/', null]
	}
	if (fullpath.startsWith('./')) {
		fullpath = fullpath.substring(2)
	}
	if (fullpath[0] !== '/') {
		fullpath = glbBs.vars['PWD'] + '/' + fullpath
	}
	const split = fullpath.split('/')
	let filename = null
	if (split.length > 0) {
		filename = split.pop()
        if(!filename) {
            filename = null
        }
	}
	const basepath = split.join('/')
	let abspath = basepath
	if(filename) {
		abspath = `${basepath}/${filename}`
	}
	return [abspath, basepath, filename]
}

const isDir = (fullpath: string): boolean => {
	if (fullpath === '/') {
		return true
	}
	return getPathType(fullpath) === 'd'
}
const isFile = (fullpath: string): boolean => {
	return getPathType(fullpath) === 'f'
}
const isDirOrFile = (fullpath: string): boolean => {
    let path = getPathType(fullpath)
	return ['f', 'd'].includes(path ? path : '')
}
// KNOWN_COMMANDS = [
// 	"cat", "/usr/bin/cat", "/bin/cat",
// 	"head", "/usr/bin/head", "/bin/head",
// 	"tail", "/usr/bin/tail", "/bin/tail",
// 	"grep", "/usr/bin/grep", "/bin/grep",
// 	"ls", "/usr/bin/ls", "/bin/ls",
// 	"rm", "/usr/bin/rm", "/bin/rm",
// 	"mkdir", "/usr/bin/mkdir", "/bin/mkdir",
// 	"touch", "/usr/bin/touch", "/bin/touch",
// 	"df", "/usr/bin/df", "/bin/df",
// 	"kill", "/usr/bin/kill", "/bin/kill",
// 	"echo", "/usr/bin/echo", "/bin/echo",
// 	"ps", "/usr/bin/ps", "/bin/ps",
// ]
const isFileHandleExecutable = (fileHandle: UnixFile): boolean => {
	if(!fileHandle) {
		return false
	}
	if(!fileHandle.perms) {
		return false
	}
	return fileHandle.perms[9] === 'x'
}
const cmdInUnixPath = (cmd: string): null | string => {
	// const executablesInPath = []
	let match: null | string = null
	glbBs.vars['PATH'].split(':').forEach((path) => {
		const files = glbBs.fs[path] ? glbBs.fs[path] : []
		files.forEach((file) => {
			if (isFileHandleExecutable(file)) {
				if(file.name === cmd && !match) {
					match = `${path}/${file.name}`
				}
			}
		})
	})
	return match
	// return executablesInPath.map((filehandle) => filehandle.name).includes(cmd)
}
glbBs.fs['/home'] = [
	{name: 'pi', type: 'd', perms: 'drwxr-xr-x'},
]
glbBs.fs['/tmp'] = [
	{name: 'systemd-private-76c28618eb3e4a41b13344eb135fa6d1-ModemManager.service-EuLjZi', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'systemd-private-76c28618eb3e4a41b13344eb135fa6d1-systemd-logind.service-3YBxBi', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'systemd-private-76c28618eb3e4a41b13344eb135fa6d1-systemd-timesyncd.service-NzZJYh', type: 'd', perms: 'drwxr-xr-x'},
]
glbBs.fs['/'] = [
	{name: 'bin', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'boot', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'dev', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'etc', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'home', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'lib', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'lib64', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'lost+found', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'mnt', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'opt', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'proc', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'root', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'run', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'sbin', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'srv', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'sys', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'tmp', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'usr', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'var', type: 'd', perms: 'drwxr-xr-x'},
]
glbBs.fs['/usr'] = [
	{name: 'bin', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'games', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'include', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'lib', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'libexec', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'local', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'sbin', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'share', type: 'd', perms: 'drwxr-xr-x'},
	{name: 'src', type: 'd', perms: 'drwxr-xr-x'},
]
glbBs.fs['/usr/bin'] = [
	{name: 'sudo', type: 'f', perms: '-rwxr-xr-x', content: 'ELF(tj44        (pt444  TTT.00pppDDQtdRtdtt/lib/ld-linux-armhf.so.3GNUMOWSlR@h0SGNU&<`:HV-'},
	{name: 'apt', type: 'f', perms: '-rwxr-xr-x', content: 'ELF(414         (p   ((444  TTT@ @ .....((pppDDQtdRtd.../lib/ld-linux-armhf.so.3GNUHK`-ӬGNU%    @ $h@DG PPV P1$?!'},
	{name: 'rm', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'touch', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'mkdir', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'df', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'head', type: 'f', perms: '-rwxr-xr-x', content: '@@@   aLaLpppXXЊКК@@888PDDStd888PPtdQtdRtdЊКК00/lib64/ld-linux-x86-64.so.2@GNU  GNU'},
	{name: 'tail', type: 'f', perms: '-rwxr-xr-x', content: '_/TukM/bq& 7'},
	{name: 'grep', type: 'f', perms: '-rwxr-xr-x', content: '@@@x5x5@@@!!YY?OOY888PDDStd888PPtd'},
	{name: 'ls', type: 'f', perms: '-rwxr-xr-x', content: '@@@55@@@Q3Q3ww%'},
	{name: 'bash', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'cat', type: 'f', perms: '-rwxr-xr-x', content: '@@@88   q:q:```zx@|@888PDDStd888PPtdmmmQtdRtdz/lib64/ld-linux-x86-64.so.2@GNU   GNU}#V8G<^wuGNU9a9a ELQ+/'},
	{name: 'zsh', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'sh', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'kill', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'echo', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'ps', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'which', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'whoami', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'chmod', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'shutdown', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'reboot', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'dmesg', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
]
glbBs.fs['/usr/lib'] = [
	{name: 'ld-linux-armhf.so.3', type: 'f', perms: '-rw-r--r--'},
	{name: 'ld-linux.so.3', type: 'f', perms: '-rw-r--r--'},
	{name: 'libpigpiod_if2.so', type: 'f', perms: '-rw-r--r--'},
	{name: 'libpigpiod_if2.so.1', type: 'f', perms: '-rw-r--r--'},
	{name: 'libopusfile.a', type: 'f', perms: '-rw-r--r--'},
	{name: 'libwiringPi.so', type: 'f', perms: '-rw-r--r--'},
	{name: 'libwiringPi.so.2.50', type: 'f', perms: '-rw-r--r--'},
	{name: 'libsupp.a', type: 'f', perms: '-rw-r--r--'},
]
glbBs.fs['/bin'] = [
	{name: 'head', type: 'f', perms: '-rwxr-xr-x', content: '@@@   aLaLpppXXЊКК@@888PDDStd888PPtdQtdRtdЊКК00/lib64/ld-linux-x86-64.so.2@GNU  GNU'},
	{name: 'tail', type: 'f', perms: '-rwxr-xr-x', content: '_/TukM/bq& 7'},
	{name: 'grep', type: 'f', perms: '-rwxr-xr-x', content: '@@@x5x5@@@!!YY?OOY888PDDStd888PPtd'},
	{name: 'ls', type: 'f', perms: '-rwxr-xr-x', content: '@@@55@@@Q3Q3ww%'},
	{name: 'bash', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'cat', type: 'f', perms: '-rwxr-xr-x', content: '@@@88   q:q:```zx@|@888PDDStd888PPtdmmmQtdRtdz/lib64/ld-linux-x86-64.so.2@GNU   GNU}#V8G<^wuGNU9a9a ELQ+/'},
	{name: 'zsh', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'sh', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'kill', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'echo', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'which', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'whoami', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'chmod', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'shutdown', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'reboot', type: 'f', perms: '-rwxr-xr-x'},
	{name: 'dmesg', type: 'f', perms: '-rwxr-xr-x'},
]
glbBs.fs[glbBs.vars['PWD']] = [
	{name: "env.example", type: 'f', perms: '-rw-r--r--'},
	{name: "hex_to_pack.py", type: 'f', perms: '-rw-r--r--'},
	{name: "index.js", type: 'f', perms: '-rw-r--r--'},
	{name: "LICENSE", type: 'f', perms: '-rw-r--r--', content: 'MIT'},
	{name: ".env", type: 'f', perms: '-rw-r--r--', content:
		'# pls no hack me thank\n' +
		'# this should be hidden\n' +
		'# EAT max stdout u hacker hahaha\n' +
		"MOD_PING='<@&251553225810893153>'\n" +
		"IRC_PASSWORD='ilikehentai69'\n" +
		"ALLOW_BASH=1\n"
	},
	{name: "node_modules", type: 'd', perms: 'drwxr-xr-x'},
	{name: "package.json", type: 'f', perms: '-rw-r--r--'},
	{name: "package-lock.json", type: 'f', perms: '-rw-r--r--'},
	{name: "ping_pong.csv", type: 'f', perms: '-rw-r--r--'},
	{name: "README.md", type: 'f', perms: '-rw-r--r--'},
	{name: "tags", type: 'f', perms: '-rw-r--r--'},
	{name: "Dockerfile", type: 'f', perms: '-rw-r--r--'}
]
glbBs.fs[`${glbBs.vars['PWD']}/node_modules`] = [
	{name: "dotenv", type: 'd', perms: 'drwxr-xr-x'},
	{name: "irc", type: 'd', perms: 'drwxr-xr-x'},
	{name: "irc-colors", type: 'd', perms: 'drwxr-xr-x'},
	{name: "nan", type: 'd', perms: 'drwxr-xr-x'}
]
glbBs.fs[`${glbBs.vars['PWD']}/node_modules/dotenv`] = [
	{name: "lib", type: 'd', perms: 'drwxr-xr-x'},
	{name: "LICENSE", type: 'f', perms: '-rw-r--r--'},
	{name: "package.json", type: 'f', perms: '-rw-r--r--'}
]
glbBs.fs[`${glbBs.vars['PWD']}/node_modules/irc`] = [
	{name:"lib", type: 'd', perms: 'drwxr-xr-x'},
	{name: "LICENSE", type: 'f', perms: '-rw-r--r--'},
	{name: "package.json", type: 'f', perms: '-rw-r--r--'}
]
glbBs.fs[`${glbBs.vars['PWD']}/node_modules/irc-colors`] = [
	{name: "lib", type: 'd', perms: 'drwxr-xr-x'},
	{name: "LICENSE", type: 'f', perms: '-rw-r--r--'},
	{name: "package.json", type: 'f', perms: '-rw-r--r--'}
]
glbBs.fs[`${glbBs.vars['PWD']}/node_modules/nan`] = [
	{name: "lib", type: 'd', perms: 'drwxr-xr-x'},
	{name: "LICENSE", type: 'f', perms: '-rw-r--r--'},
	{name: "package.json", type: 'f', perms: '-rw-r--r--'}
]
/*
 * measured in file system represented as string? wot
 * so on the host needs a similar amount of bytes to store it
 * for sure a bit more if not twice as much
 */
const MAX_DISK_SPACE = getDiskUsage() + 500
const getMaxDiskSpace = (partition: string): number => {
	if (partition === '/') {
		return MAX_DISK_SPACE
	}
	return 0
}
const getDiskError = (): string | null => {
	const usage = getDiskUsage()
	if (usage >= MAX_DISK_SPACE) {
		return 'No Space Left on Device'
	}
	return null
}
const unixDelFile = (path: string): boolean => {
	const [abspath, folder, filename] = pathInfo(path)
    if(!filename) {
        return false
    }
	if(isFile(abspath) && glbBs.fs[folder]) {
		if (glbBs.fs[folder].map((file) => file.name).includes(filename)) {
			const i = glbBs.fs[folder].map((file) => file.name).indexOf(filename)
			glbBs.fs[folder].splice(i, 1)
			return true
		}
	}
	return false
}
const getCurrentUnixUser = () => {
	return 'pi'
	// return glbBs.vars['USER']
}
const getCurrentPid = () => {
	return glbBs.vars['BASHPID']
}
const getParentPid = () => {
	return glbBs.vars['PPID']
}
const getCurrentShellShort = () => {
	const dirs = glbBs.vars['SHELL'].split('/')
	return dirs[dirs.length - 1]
}

/*
	appendToFileContent

	returns null or disk error string
*/
const appendToFileContent = (path: string, text: string) => {
	const [abspath, folder, filename] = pathInfo(path)
	const fileHandle = getFile(abspath)
	if (!fileHandle) {
		return null
	}
	if (!fileHandle.content) {
		fileHandle.content = ''
	}
	if(!text) {
		text = ''
	}
	fileHandle.content += text
	const diskError = getDiskError()
	if (diskError) {
		fileHandle.content = ''
	}
	return diskError
}

/*
	createFileWithContent

	returns null or disk error string
*/
const createFileWithContent = (path: string, text: string): string | null => {
	const [abspath, folder, filename] = pathInfo(path)
    if(!filename) {
        console.log(`error failed to get filename path=${path}`)
        return null
    }
	const fileHandle = getFile(abspath)
	if (fileHandle) {
		return null
	}
	if(!text) {
		text = ''
	}
	let createdFolder = false
	if(!glbBs.fs[folder]) {
		createdFolder = true
		glbBs.fs[folder] = []
	}
	glbBs.fs[folder].push({name: filename, type: 'f', perms: '-rw-r--r--', content: text})
	const diskError = getDiskError()
	if (diskError) {
		const fullpath = `${folder}/${filename}`
		unixDelFile(fullpath)
		if(createdFolder) {
			delete glbBs.fs[folder]
		}
	}
	return diskError
}

/*
	CreateFolder

	returns null or disk error string
*/
const CreateFolder = (path: string): string | null => {
	const [abspath, folder, filename] = pathInfo(path)
    if(!filename) {
        console.log(`error failed to get filename path=${path}`)
        return null
    }
	const fileHandle = getFile(abspath)
	if (fileHandle) {
		console.log(`warning folder already exists=${abspath}`)
		return null
	}
	let createdParentFolder = false
	if(!glbBs.fs[folder]) {
		createdParentFolder = true
		glbBs.fs[folder] = []
	}
	if(!glbBs.fs[abspath]) {
		glbBs.fs[abspath] = []
	}
	glbBs.fs[folder].push({name: filename, type: 'd', perms: 'drwxr-xr-x'})
	const diskError = getDiskError()
	if (diskError) {
		delete glbBs.fs[abspath]
		const fullpath = `${folder}/${filename}`
		unixDelFile(fullpath) // yes everything is a file in unix xd
		if(createdParentFolder) {
			delete glbBs.fs[folder]
		}
	}
	return diskError
}

const bashStr = (string: string): string => {
	if(!string) {
		return ''
	}
	Object.keys(glbBs.vars).forEach((key) => {
		const val = glbBs.vars[key]
		const variable = '$' + key
		const variableCurly = '${' + key + '}'
		string = string.replaceAll(variable, val)
		string = string.replaceAll(variableCurly, val)
	})
	string = string.replaceAll(/\${?[a-zA-Z_]+[a-zA-Z_0-9]*}?/g, '')
	// simple globbing only 1 star and only in the begging
	if(string.startsWith('*')) {
		const files = glbBs.fs[glbBs.vars['PWD']] ? glbBs.fs[glbBs.vars['PWD']] : []
		const matches: string[] = []
		files.forEach((file) => {
			if (file.name.endsWith(string.substring(1))) {
				matches.push(file.name)
			}
		})
		if (matches.length !== 0) {
			return matches.join('\n')
		}
	} else if (string.endsWith('*')) {
		const files = glbBs.fs[glbBs.vars['PWD']] ? glbBs.fs[glbBs.vars['PWD']] : []
		const matches: string[] = []
		files.forEach((file) => {
			if (file.name.startsWith(string.substring(0,string.length - 1))) {
				matches.push(file.name)
			}
		})
		if (matches.length !== 0) {
			return matches.join('\n')
		}
	}
	return string
}

export const fakeBash = (userinput: string): string => {
    const { stdout, stderr, exitCode } = evalBash(userinput)
    glbBs.vars['?'] = exitCode.toString()
    // TODO: can we do something better here
    //       to support mixed order stdout and stderr
    return stdout + stderr
}

const evalBash = (userinput: string): BashResult => {
	if (userinput === ':(){ :|:& };:' || userinput === ':(){:|:&};:') {
		return { stdout: 'bash error\nbash error\nbash error', stderr: '', exitCode: 0 }
	}
	if (["bash", "bash;", "bash -c bash", "/bin/bash", "/bin/sh"].includes(userinput)) {
		glbBs.vars['PWD'] = '/home/pi'
		glbBs.vars['SHELL'] = '/bin/bash'
		return { stdout: '', stderr: '', exitCode: 0 }
	} else if (["zsh", "zsh;", "bash -c zsh", "/bin/zsh"].includes(userinput)) {
		glbBs.vars['PWD'] = '/home/pi'
		glbBs.vars['SHELL'] = '/bin/zsh'
		return { stdout: '', stderr: '', exitCode: 0 }
	} else if (["rm -rf .;", "rm -rf .", "rm *;", "rm *"].includes(userinput)) {
		glbBs.fs[glbBs.vars['PWD']] = []
		return { stdout: '', stderr: '', exitCode: 0 }
	// } else if (["ls", "ls .", "ls;", "ls .;", "ls *", "ls *;"].includes(userinput)) {
	// 	// let files = [
	// 	// 	"env.example",
	// 	// 	"hex_to_pack.py",
	// 	// 	"index.js",
	// 	// 	"LICENSE",
	// 	// 	"node_modules",
	// 	// 	"package.json",
	// 	// 	"package-lock.json",
	// 	// 	"ping_pong.csv",
	// 	// 	"README.md",
	// 	// 	"tags",
	// 	// 	"Dockerfile"
	// 	// ]
	// 	// if(glbBs.fs['.']) {
	// 	// 	files = files.concat(glbBs.fs['.']).sort()
	// 	// }
	// 	const files = glbBs.fs[glbBs.vars['PWD']]
	// 	if (files) {
	// 		return files.map((file) => file.name).sort().join('\n')
	// 	} else {
	// 		console.log(glbBs.fs)
	// 		return `ls: Permission denied`
	// 	}
	} else if (["pwd", "pwd;"].includes(userinput)) {
		return { stdout: glbBs.vars['PWD'], stderr: '', exitCode: 0 }
	} else if (["env", "env;"].includes(userinput)) {
		const env = [
				`SHELL=${glbBs.vars['SHELL']}`,
				'NVM_INC=/home/pi/.nvm/versions/node/v18.16.0/include/node',
				'LANGUAGE=en_US',
				`PWD=${glbBs.vars['PWD']}`,
				'LOGNAME=pi',
				'XDG_SESSION_TYPE=tty',
				'MOTD_SHOWN=pam',
				`HOME=${glbBs.vars['HOME']}`,
				'LANG=en_US',
				'LS_COLORS=rs=0:di=01;34:ln=01;36:mh=00:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:mi=00:su=37;41:sg=30;43:ca=30;41:tw=30;42:ow=34;42:st=37;44:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arc=01;31:*.arj=01;31:*.taz=01;31:*.lha=01;31:*.lz4=01;31:*.lzh=01;31:*.lzma=01;31:*.tlz=01;31:*.txz=01;31:*.tzo=01;31:*.t7z=01;31:*.zip=01;31:*.z=01;31:*.dz=01;31:*.gz=01;31:*.lrz=01;31:*.lz=01;31:*.lzo=01;31:*.xz=01;31:*.zst=01;31:*.tzst=01;31:*.bz2=01;31:*.bz=01;31:*.tbz=01;31:*.tbz2=01;31:*.tz=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.war=01;31:*.ear=01;31:*.sar=01;31:*.rar=01;31:*.alz=01;31:*.ace=01;31:*.zoo=01;31:*.cpio=01;31:*.7z=01;31:*.rz=01;31:*.cab=01;31:*.wim=01;31:*.swm=01;31:*.dwm=01;31:*.esd=01;31:*.jpg=01;35:*.jpeg=01;35:*.mjpg=01;35:*.mjpeg=01;35:*.gif=01;35:*.bmp=01;35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.svg=01;35:*.svgz=01;35:*.mng=01;35:*.pcx=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*.m2v=01;35:*.mkv=01;35:*.webm=01;35:*.webp=01;35:*.ogm=01;35:*.mp4=01;35:*.m4v=01;35:*.mp4v=01;35:*.vob=01;35:*.qt=01;35:*.nuv=01;35:*.wmv=01;35:*.asf=01;35:*.rm=01;35:*.rmvb=01;35:*.flc=01;35:*.avi=01;35:*.fli=01;35:*.flv=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.yuv=01;35:*.cgm=01;35:*.emf=01;35:*.ogv=01;35:*.ogx=01;35:*.aac=00;36:*.au=00;36:*.flac=00;36:*.m4a=00;36:*.mid=00;36:*.midi=00;36:*.mka=00;36:*.mp3=00;36:*.mpc=00;36:*.ogg=00;36:*.ra=00;36:*.wav=00;36:*.oga=00;36:*.opus=00;36:*.spx=00;36:*.xspf=00;36:',
				'NVM_DIR=/home/pi/.nvm',
				'XDG_SESSION_CLASS=user',
				'TERM=screen-256color',
				`USER=${glbBs.vars['USER']}`,
				'SHLVL=1',
				'NVM_CD_FLAGS=',
				'XDG_SESSION_ID=18',
				'XDG_RUNTIME_DIR=/run/user/1000',
				'SSH_CLIENT=::1 58934 22',
				'LC_ALL=en_US',
				`PATH=${glbBs.vars['PATH']}`,
				'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus',
				'NVM_BIN=/home/pi/.nvm/versions/node/v18.16.0/bin',
				'SSH_TTY=/dev/pts/2',
				'TEXTDOMAIN=Linux-PAM',
				'_=/usr/bin/env'
		]
		const out = env.join('\n')
        return { stdout: out, stderr: '', exitCode: 0 }
	}
	let m = userinput.match(/touch\s+([a-zA-Z0-9/\.]+)/)
	if(m) {
		const path = bashStr(m[1])
		const [abspath, folder, filename] = pathInfo(path)
		if(getPathType(abspath) !== null) {
			// touch just pokes the file
			// if we intoduce dates we should update last modified
			// here
			return { stdout: '', stderr: '', exitCode: 0 }
		}
		if(!isDir(folder)) {
			return { stdout: '', stderr: `touch: cannot touch '${path}': No such file or directory`, exitCode: 1 /* TODO made up */ }
		}
		const ioError = createFileWithContent(abspath, '')
		if(ioError === null) {
			return { stdout: '', stderr: '', exitCode: 0 }
		}
		return { stdout: '', stderr: ioError, exitCode: 1 }
	}
	m = userinput.match(/mkdir\s+([a-zA-Z0-9/\.]+)/)
	if(m) {
		const path = bashStr(m[1])
		const [abspath, folder, filename] = pathInfo(path)
		const realpath = `${folder}/${filename}`
		if(getPathType(realpath) !== null) {
			return { stdout: '', stderr: `mkdir: cannot create directory ‘${path}’: File exists`, exitCode: 1 /* TODO made up */ }
		}
		const ioError = CreateFolder(abspath)
		if (ioError === null) {
			return { stdout: '', stderr: '', exitCode: 0 }
		}
		return { stdout: '', stderr: `mkdir: cannot create file ‘${path}’: ${ioError}`, exitCode: 1 /* TODO made up */ }
	}
	// prefer quoted
	m = userinput.match(/^([a-zA-Z0-9_\-]+)=["']([a-zA-Z0-9\s\/\.\_\-\s\$]+)["']/)
	if(!m) {
		// fallback non quoted
		m = userinput.match(/^([a-zA-Z0-9_\-]+)=([a-zA-Z0-9\s\/\.\_\-\$]+)/)
	}
	if(m) {
		const variable = m[1]
		const value = m[2]
		glbBs.vars[variable] = bashStr(value)
		return { stdout: '', stderr: '', exitCode: 0 }
	}
	m = userinput.match(/^([a-zA-Z0-9_\-]+)\s+(.*)/)
	if(!m) {
		m = userinput.match(/^([a-zA-Z0-9_\-]+)/)
	}
	if (m) {
		const cmd = m[1]
		let args = m[2] ? m[2].split(' ') : []
		if (cmd === 'uname' && args[0] === '-a') {
			return { stdout: 'Linux raspberrypi 5.10.103-v7l+ #1529 SMP Tue Mar 8 12:24:00 GMT 2022 armv7l GNU/Linux', stderr: '', exitCode: 0 }
		} else if (cmd === 'uname' && args[0] === '-r') {
			return { stdout: '5.10.103-v7l+', stderr: '', exitCode: 0 }
		} else if (cmd === 'sudo' || cmd === '/usr/bin/sudo') {
			return { stdout: 'sudo: a password is required', stderr: '', exitCode: 0 }
		} else if (cmd === 'apt' || cmd === '/usr/bin/apt') {
            return {
                stdout: [
                    "E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)",
                    "E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?"
                ].join('\n'),
                stderr: '',
                exitCode: 100 // verified
            }
		} else if (cmd === 'cd') {
			if (args[0] === '.') {
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			if (args.length === 0) {
				glbBs.vars['PWD'] = '/home/pi'
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			if (args[0][0] == '-') {
				return { stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO made up */ }
			}
			let path = bashStr(args[0])
			if(/\./.test(path) && path !== '..') {
				// TODO: support ../ and ./ and foo/../../bar paths
				console.log('rel path not supportede')
				return { stdout: '', stderr: `-bash: cd: ${path}: Permission denied`, exitCode: 1 /* TODO made up */ }
			}
			const [abspath, folder, filename] = pathInfo(path)
			if (isDir(abspath)) {
				if (!abspath.startsWith('/tmp/') &&
					!abspath.startsWith('/home/pi/') &&
					!['/', '/tmp', '/home/pi', '/home'].includes(abspath)) {
					console.log(`illegal abs path '${abspath}'`)
					return { stdout: '', stderr: `-bash: cd: ${path}: Permission denied`, exitCode: 1 /* TODO made up */ }
				}
				glbBs.vars['PWD'] = abspath
				return { stdout: '', stderr: '', exitCode: 0 }
			} else if (isFile(abspath)) {
				return { stdout: '', stderr: `-bash: cd: ${path}: Not a directory`, exitCode: 1 /* TODO made up */ }
			} else if (isDir(folder)) {
				return { stdout: '', stderr: `-bash: cd: ${path}: No such file or directory`, exitCode: 1 /* TODO made up */ }
			}
			// console.log(`fallback because abspath=${abspath} dir=${isDir(abspath)}`)
			return { stdout: '', stderr: `-bash: cd: ${args[0]}: Permission denied`, exitCode: 1 /* TODO made up */ }
		} else if (cmd === 'kill') {
			if (args.length === 0) {
				return { stdout: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', stderr: '', exitCode: 0 }
			}
			if (args[0] === '-9') {
				args.shift()
			}
			let killAll = false
			if (args[0] === '-1') {
				args.shift()
				killAll = true
			}
			if(killAll) {
				return { stdout: 'bash error', stderr: '', exitCode: 0 }
			}
			const pid = bashStr(args[0])
			if(pid === getCurrentPid() || pid === getParentPid()) {
				return { stdout: 'bash error', stderr: '', exitCode: 0 }
			}
			const pidInt = parseInt(pid, 10)
			if(pidInt < 20000) {
				return { stdout: '', stderr: `-bash: kill: (${pid}) - Operation not permitted`, exitCode: 1 /* TODO made up */ }
			}
			return { stdout: '', stderr: '', exitCode: 0 }
		} else if (cmd === 'echo') {
			if (args[0] === '-n' || args[0] === '-e') {
				args.shift()
			}
			const msg = args.join(' ')
			const expandedArgs = bashStr(msg)
			const redirectRegex = new RegExp('(.*)\\s*(>+)\\s*(.*)')
			m = expandedArgs.match(redirectRegex)
			if(m) {
				const text = m[1]
				const isAppend = m[2] !== '>'
				const outfile = m[3]
				// null random urandom zero etc
				if(outfile.startsWith('/dev/')) {
					return { stdout: '', stderr: '', exitCode: 0 }
				}
				const [abspath, _folder, _filename] = pathInfo(outfile)
				const outfileHandle = getFile(abspath)
				if(!outfileHandle) {
					const ioError = createFileWithContent(abspath, text)
					if(ioError === null) {
						return { stdout: '', stderr: '', exitCode: 0 }
					}
					return { stdout: '', stderr: ioError, exitCode: 1 }
				}
				if(outfileHandle.type === 'd') {
					return { stdout: '', stderr: `-bash: ${outfile}: Is a directory`, exitCode: 1 /* TODO made up */ }
				}
				const ioError = appendToFileContent(abspath, text)
				if(ioError === null) {
					return { stdout: '', stderr: '', exitCode: 0 }
				}
				return { stdout: '', stderr: ioError, exitCode: 1 }
			} else {
				console.log(`redirect regex did not match inout=${msg}`)
				console.log(`expanded=${expandedArgs} regex=${redirectRegex.source}`)
			}
			return { stdout: expandedArgs, stderr: '', exitCode: 0 }
		} else if (cmd === 'git') {
			const helptxt = [
				'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]',
				'	[--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]',
				'	[-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]',
				'	[--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]',
				'	<command> [<args>]'
			].join('\n')
			if(args.length === 0) {
			    return { stdout: helptxt, stderr: '', exitCode: 1 /* verified */ }
			}
			if(['--recursive', '-v', '--verbose', '--force', '-f', '--no-pager', '--bare', '--paginate'].includes(args[0])) {
				args.shift()
			}
			if(args[0] === 'clone') {
				args.shift()
				if(['--recursive', '-v', '--verbose', '--force', '-f', '--no-pager', '--bare', '--paginate'].includes(args[0])) {
					args.shift()
				}
				if(args[0][0] === '-') {
					return { stdout: '', stderr: `error: unknown option \`${args[0]}'\n${helptxt}`, exitCode: 1 /* TODO made up */ }
				}
				const url = args[0]
				// https://github.com/foo/bar
				// git@github.com:foo/bar
				const urlRegex = new RegExp('(git@|https?://).*[:/](.*)/(.*)(.git)?')
				m = url.match(urlRegex)
				if(m) {
					const folders = m[2].split('/')
					const basename = folders[folders.length - 1]
					const [abspath, folder, filename] = pathInfo(basename)
					if(isDirOrFile(abspath)) {
						return { stdout: '', stderr: `fatal: destination path '${basename}' already exists and is not an empty directory.`, exitCode: 1 /* TODO made up */ }
					}
					let ioError = CreateFolder(basename)
					if(ioError === null) { ioError = createFileWithContent(`${basename}/README.md`, 'this is the readme'); }
					if(ioError === null) { ioError = createFileWithContent(`${basename}/LICENSE`, 'MIT License'); }
					if(ioError === null) { ioError = CreateFolder(`${basename}/src`); }
					if(ioError === null) { ioError = CreateFolder(`${basename}/.git`); }
					if(ioError === null) { ioError = CreateFolder(`${basename}/.gitignore`); }
					if (ioError !== null) {
						const out = [
							`Cloning into '${basename}'...`,
							'remote: Enumerating objects: 2483, done.',
							'remote: Total 6 (delta 0), reused 0 (delta 0) error: unable to create temporary sha1 filename : No space left on device',
							'fatal: failed to write object fatal: unpack-objects failed',
							'filename : No space left on device',
							'fatal: failed to write object fatal: unpack-objects failed'
						].join('\n')
                        return { stdout: '', stderr: out, exitCode: 1 }
					}
					const out = [
						`Cloning into '${basename}'...`,
						'remote: Enumerating objects: 2483, done.',
						'remote: Counting objects: 100% (157/157), done.',
						'remote: Compressing objects: 100% (106/106), done.',
						'remote: Total 2483 (delta 103), reused 100 (delta 50), pack-reused 2326',
						'Receiving objects: 100% (2483/2483), 347.08 KiB | 1.14 MiB/s, done.',
						'Resolving deltas: 100% (1775/1775), done.'
					].join('\n')
                    return { stdout: out, stderr: '', exitCode: 0 }
				} else {
					return { stdout: '', stderr: `fatal: repository '${url}' does not exist`, exitCode: 1 /* TODO made up */ }
				}
			} else if(args[0] === 'status') {
				return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git', exitCode: 128 /* verified */ }
			} else if(args[0] === '--help') {
				return { stdout: helptxt, stderr: '', exitCode: 0 /* verified */ }
			} else {
				return { stdout: '', stderr: `git: '${args[0]}' is not a git command. See 'git --help'.`, exitCode: 1 /* TODO made up */ }
			}
		} else if (cmd === 'shutdown') {
			if(args[0] === '-c') {
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			if(args[0] === 'now') {
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			return { stdout: `Shutdown scheduled for ${Date().toString().split('(')[0].slice(0, -1)}, use 'shutdown -c' to cancel.`, stderr: '', exitCode: 0 }
		} else if (cmd === 'dmesg') {
            return { stdout: '', stderr: 'dmesg: read kernel buffer failed: Operation not permitted', exitCode: 1 /* verified */ }
		} else if (cmd === 'reboot') {
			const out = [
				'Failed to set wall message, ignoring: Interactive authentication required.',
				'Failed to reboot system via logind: Interactive authentication required.',
				'Failed to open initctl fifo: Permission denied',
				'Failed to talk to init daemon.'
			].join('\n')
            return { stdout: '', stderr: out, exitCode: 1 /* verified */ }
		} else if (cmd === 'ps') {
			const pid = !parseInt(getCurrentPid(), 10) ? 755767 : parseInt(getCurrentPid(), 10)
			const out = [
				`PID TTY          TIME CMD`,
				`${pid} pts/1    00:00:00 ${getCurrentShellShort()}`,
				`${pid + Math.floor(Math.random() * 500)} pts/1    00:00:00 ps`
			].join('\n')
            return { stdout: out, stderr: '', exitCode: 0 }
		} else if (cmd === 'hostname') {
            // technically would reboot
            // to update actual hostname
            // instead of just reading the var
			return { stdout: glbBs.vars['HOSTNAME'], stderr: '', exitCode: 0 }
		} else if (cmd === 'command') {
			if (args[0] === '-v') {
				args.shift()
			} else {
				// saying just command without -v basically runs the command
				// could be done with recursion
                return { stdout: '', stderr: 'interal error', exitCode: 7812 }
			}
			const check = bashStr(args[0])
			const match = cmdInUnixPath(check)
			if (!match) {
				return { stdout: '', stderr: '', exitCode: 1 /* verified */ }
			}
			return { stdout: match, stderr: '', exitCode: 0 }
		} else if (cmd === 'type') {
			const check = bashStr(args[0])
			const match = cmdInUnixPath(check)
			if (!match) {
				return { stdout: '', stderr: `-bash: type: ${check}: not found`, exitCode: 1 /* TODO made up */ }
			}
			const [abspath, folder, filename] = pathInfo(match)
			return { stdout: '', stderr: `${check} is hashed (${abspath})`, exitCode: 1 /* TODO made up */ }
		} else if (cmd === 'which') {
			const check = bashStr(args[0])
			const match = cmdInUnixPath(check)
			if (!match) {
				return { stdout: '', stderr: `which: no ${check} in (${glbBs.vars['PATH']})`, exitCode: 1 /* TODO made up */ }
			}
			const [abspath, folder, filename] = pathInfo(match)
            return { stdout: abspath, stderr: '', exitCode: 0 /* TODO made up */ }
		} else if (cmd === 'whoami') {
            return { stdout: getCurrentUnixUser(), stderr: '', exitCode: 0 /* TODO made up */ }
		} else if (cmd === 'chmod') {
			const expandedOptArg = bashStr(args[0])
			args.shift()
			const expandedFileArg = bashStr(args[0])
			if(!expandedFileArg) {
				return { stdout: '', stderr: `chmod: missing operand after ‘${expandedOptArg}’`, exitCode: 1 /* TODO made up */ }
			}
			const [abspath, folder, filename] = pathInfo(expandedFileArg)
			const file = getFile(abspath)
			if (!file) {
				return { stdout: '', stderr: `chmod: cannot access '${expandedFileArg}': No such file or directory`, exitCode: 1 /* TODO made up */ }
			}
			if (expandedOptArg === '777') {
				if(!file.perms) {
					file.perms = '-rw-r--r--'
				}
				file.perms = `${file.type === 'd' ? 'd' : '-'}rwxrwxrwx`
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			m = expandedOptArg.match(new RegExp('(.*)?([\\+\\-])(.*)'))
			if(m) {
				const who = m[1] // go with a for now always WARNING CAN BE UNDEFINED
				const isAdd = m[2] == '+'
				const what = m[3] // go with X for now always
				// console.log(`who=${who} isAdd=${isAdd} what=${what}`)
				if(file.perms) {
					file.perms = '-rw-r--r--'
				}
				const newperms = file.perms[0] +
					file.perms[1] +
					file.perms[2] +
					(isAdd ? 'x' : '-') +
					file.perms[4] +
					file.perms[5] +
					(isAdd ? 'x' : '-') +
					file.perms[7] +
					file.perms[8] +
					(isAdd ? 'x' : '-')
				file.perms = newperms
				console.log(`matched exec regex and set file perms to newperms=${newperms} file.perms=${file.perms} add=${isAdd}`)
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			console.log("warning fallback fileperms unkonwn opt" + expandedOptArg)
			// failed to parse perms set random default xd
			file.perms = '-rw-r--r--'
			file.perms = `${file.type === 'd' ? 'd' : '-'}rw-r--r--`
			return { stdout: '', stderr: '', exitCode: 0 }
		} else if (cmd === 'cat') {
			const path = bashStr(args[0])
			// good ol bash word split
			const [abspath, folder, filename] = pathInfo(path)
			const file = getFile(abspath)
			if (!file) {
				return { stdout: '', stderr: `cat: ${path}: No such file or directory`, exitCode: 1 /* verified */ }
			}
			if(file.type === 'd') {
				return { stdout: '', stderr: `cat: ${path}: Is a directory`, exitCode: 1 /* verified */ }
			}
			if(file.content) {
				return { stdout: file.content, stderr: '', exitCode: 0 }
			}
		} else if (cmd === 'printf') {
			if (args.length === 0) {
				return { stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 }
			}
			let noArgs = false
			if (args[0] === '--') {
				args.shift()
				noArgs = true
			}
			if (noArgs && args[0] == '-v') {
				args.shift()
				const variable = args.shift()
                if (!variable) {
                    return { stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 }
                }
				if(!/^[a-zA-Z_]+[a-zA-Z0-9_]*/.test(variable)) {
				    return { stdout: '', stderr: `-bash: printf: \`${variable}': not a valid identifier`, exitCode: 1 /* TODO */ }
				}
				if(args.length === 0) {
					return { stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 }
				}
				const fmt = args[0]
				let msg = bashStr(fmt)
				args.shift()
				args.forEach((arg) => {
					arg = bashStr(arg)
					msg = fmt.replace(/%[sib]/, arg)
				})
				// console.log(`set var ${variable} to ${msg} using printf`)
				glbBs.vars[variable] = msg
				return { stdout: '', stderr: '', exitCode: 0 }
			}
			if(!args[0]) {
                return { stdout: '', stderr: 'internal error', exitCode: 420 }
			}
			if (noArgs && args[0][0] == '-') {
				return { stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO */ }
			}
			const fmt = args[0]
			let msg = bashStr(fmt)
			args.shift()
			args.forEach((arg) => {
				arg = bashStr(arg)
				msg = fmt.replace(/%[sib]/, arg)
			})
            return { stdout: msg, stderr: '', exitCode: 0 }
		} else if (cmd === 'ls') {
			let argFolder = null
			if(!args[0]) {
				argFolder = '.'
			}
			let flagList = false
			while (args[0]) {
				if(args[0][0] === '-') {
					args[0].split("").forEach((flag) => {
						if(flag === 'l') {
							flagList = true
						}
					})
				} else if (!argFolder) {
					argFolder = bashStr(args[0])
				}
				args.shift()
			}
			const [abspath, folder, filename] = pathInfo(argFolder ? argFolder : '.')
			const files = glbBs.fs[abspath]
			const printFile = (file: UnixFile, flagList: boolean): string => {
				let perms = '-rw-r--r--'
				if(file.perms) {
					perms = file.perms
				}
				const dSuffix = file.type === 'd' ? '/' : ''
				if(flagList) {
					return `${perms} pi pi Apr 30 10:10 ${file.name}${dSuffix}`
				} else {
					return file.name + dSuffix
				}
			}
			if (files) {
				const out = files.map((file) => {
					return printFile(file, flagList)
				}).sort().join('\n')
                return { stdout: out, stderr: '', exitCode: 0 }
			} else if (isFile(abspath)) {
				const file = getFile(abspath)
				if(!file) {
					console.log("wtf")
					return { stdout: 'bash error', stderr: '', exitCode: 0 }
				}
                return { stdout: printFile(file, flagList), stderr: '', exitCode: 0 }
			} else {
                return { stdout: '', stderr: `ls: cannot access '${abspath}': Permission denied`, exitCode: 2 /* verified */ }
			}
		} else if (cmd === 'df') {
			const used = getDiskUsage()
			const usedPad = used.toString().padStart(8, ' ')
			const avail = getMaxDiskSpace('/')
			const availPad = avail.toString().padStart(9, ' ')
			const percent = Math.ceil((100 * used) / avail).toString()
			const perPad = percent.padStart(3, ' ')
			const out = [
				`Filesystem     1K-blocks     Used Available Use% Mounted on`,
				`/dev/root          26679 ${usedPad} ${availPad} ${perPad}% /`,
				`devtmpfs            9288        0     79288   0% /dev`,
				`tmpfs                152        0     44152   0% /dev/shm`,
				`tmpfs               5664     1152     16512   1% /run`,
				`tmpfs               5120        4      5116   1% /run/lock`,
				`/dev/mmcblk0p6    258094    49323    208772  20% /boot`,
				`tmpfs             808828       24    808804   1% /run/user/1001`
			].join('\n')
            return { stdout: out, stderr: '', exitCode: 0 }
		} else if (cmd === 'rm') {
			if (args.length === 0) {
				return { stdout: 'rm: missing operand', stderr: '', exitCode: 1 /* verified */ }
			}
			let argRecurse = false
			if (args[0] === '-r' || args[0] === '-rf') {
				argRecurse = true
				args.shift()
			}
			if (args[0][0] == '-') {
				return { stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* verified */ }
			}
			let path = bashStr(args[0])
			const [abspath, folder, filename] = pathInfo(path)
			if(unixDelFile(path)) {
				return { stdout: '', stderr: '', exitCode: 0 }
			} else if(isDir(abspath)) {
				if(argRecurse) {
					glbBs.fs[abspath] = []
					return { stdout: '', stderr: '', exitCode: 0 }
				} else {
					return { stdout: '', stderr: `rm: cannot remove '${path}': Is a directory`, exitCode: 1 /* TODO made up */ }
				}
			}
			if (path[0] === '/') {
				return { stdout: '', stderr: `rm: cannot remove '${path}': Permission denied`, exitCode: 1 /* TODO made up */ }
			}
			return { stdout: '', stderr: `rm: cannot remove '${path}': No such file or directory`, exitCode: 1 /* TODO made up */ }
			// return "rm: remove write-protected regular fipytlehKilledon error"
		} else if (cmd === 'ls') {
			// we handle ls else where
		} else if (!cmdInUnixPath(cmd)) {
			return { stdout: '', stderr: `bash: ${cmd}: command not found`, exitCode: 1 /* TODO made up */ }
		}
		// this says invalid option on every command
		// } else if (args[0]) {
		// 	return { stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO made up */ }
		// }
	}
	return { stdout: '', stderr: 'unsafe bash', exitCode: 1 }
}
