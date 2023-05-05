interface UnixFile {
	name: string,
	type: string,
	perms: string,
	content?: string,
}

interface UnixFileSystem {
	[index: string]: UnixFile[]
}

enum StdIo {
	stdin,
	stdout,
	stderr
}

// i should probably do some research on how they actually look like xd
interface UnixFileDescriptor {
	stdIo: StdIo | null,
	append: boolean,
	id: number,
	outfile: string | null
}

interface BashState {
    fs: UnixFileSystem,
    vars: {[key: string]: string},
    tmpLineEnv: {[key: string]: string},
	stdoutFileDescriptior: UnixFileDescriptor
}

interface BashResult {
    stdout: string,
    stderr: string,
    exitCode: number
}

interface BashResultIoFlushed {
    stdout: string,
    stderr: string,
    exitCode: number,
	// fake field to get typescript yell at me
	// if i forgot to flush io before return
	// what a hack xd
	ioFlushed: true
}

interface BashParseResult {
	stdout: string,
    stderr: string
}

export const glbBs: BashState = {
    fs: {},
    vars: {},
    /*
        line scoped env variables
		vars set followed by a command
		will not be set as a regular bash variable ever
		but set as environment variable for the run program

		TODO:
		this is unused for now because building the env getter
		properly takes to much time

		echo $foo # => null
		foo=bar echo $foo # => null
		echo $foo # => null
		foo=bar node -e "console.log(process.env.foo)" # => bar
    */
    tmpLineEnv: {},
	stdoutFileDescriptior: {
		stdIo: StdIo.stdin,
		id: StdIo.stdin,
		append: false,
		outfile: ''
	}
}

// TODO:
// there should be
// envVars
// bashVars
// and they should not double expand
// but a programs getenv() is not the same as
// bashs $myvar

const getBashVar = (variable: string): string => {
	return glbBs.vars[variable] || ''
}

glbBs.vars['?'] = '0'
glbBs.vars['0'] = '-bash'
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

const isEnvVarTrue = (value: string) => {
	return value.match(new RegExp('^(yes|1|on|true)$', 'i'))
}

/*
	run this

	DEBUG_BASH_STR=yes npm run test

	or

	DEBUG_BASH_ALL=yes npm run test
*/
const dbgPrintStr = (message: string) => {
	if (!isEnvVarTrue(process.env.DEBUG_BASH_ALL || '0')) {
		if (!isEnvVarTrue(process.env.DEBUG_BASH_STR || '0')) {
			return
		}
	}
	console.log(message)
}

/*
	run this to see file system debug messages

	DEBUG_BASH_FS=yes npm run test

	or

	DEBUG_BASH_ALL=yes npm run test
*/
const dbgPrintFs = (message: string) => {
	if (!isEnvVarTrue(process.env.DEBUG_BASH_ALL || '0')) {
		if (!isEnvVarTrue(process.env.DEBUG_BASH_FS || '0')) {
			return
		}
	}
	console.log(message)
}

/*
	run this

	DEBUG_BASH_WARN=yes npm run test

	or

	DEBUG_BASH_ALL=yes npm run test
*/
const dbgPrintWarn = (message: string) => {
	if (!isEnvVarTrue(process.env.DEBUG_BASH_ALL || '0')) {
		if (!isEnvVarTrue(process.env.DEBUG_BASH_WARN || '0')) {
			return
		}
	}
	console.log(message)
}

const dbgPrint = (message: string) => {
	if (!isEnvVarTrue(process.env.DEBUG_BASH_ALL || '0')) {
		return
	}
	console.log(message)
}

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
	dbgPrintFs(`getFile path=${path} filename=${filename}`)
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
	{name: 'printf', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'env', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
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
	{name: 'printf', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
	{name: 'env', type: 'f', perms: '-rwxr-xr-x', content: '@m@@p#@pS@8'},
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
	dbgPrintFs(`[bash][fs] appendToFileContent(${path}, ${text})`)
	const [abspath, folder, filename] = pathInfo(path)
	if (['/dev/null', '/dev/random', '/dev/urandom'].includes(abspath)) {
		return null
	}
	let fileHandle = getFile(abspath)
	if (!fileHandle) {
		dbgPrintFs(`[bash][fs] warning file not found abspath=${abspath} folder=${folder} filename=${filename}`)
		const ioError = createOrOverwriteFileWithContent(path, text)
		if (ioError) {
			return ioError
		}
	}
	fileHandle = getFile(abspath)
	if (!fileHandle) {
		dbgPrintFs(`[bash][fs] file not found one abspath=${abspath} folder=${folder} filename=${filename}`)
		return 'kernel panic'
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
	createOrOverwriteFileWithContent

	returns null or disk error string
*/
const createOrOverwriteFileWithContent = (path: string, text: string): string | null => {
	const [abspath, folder, filename] = pathInfo(path)
	if (['/dev/null', '/dev/random', '/dev/urandom'].includes(abspath)) {
		return null
	}
    if(!filename) {
        console.log(`error failed to get filename path=${path}`)
        return null
    }
	const fileHandle = getFile(abspath)
	if (fileHandle) {
		fileHandle.content = text
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

// export const parseSubshell = (text: string): string[] | string => {
// 	// simple string no quotes
// 	// split on space and strip all surrounding
// 	// spaces around words
// 	if(!text.includes('"') && !text.includes("'")) {
// 		return text.split(/\s+/)
// 	}
// 	let word = ''
// 	const quotes: string[] = [] // fifo - index 0 is first
// 	text.split('').forEach((letter) => {
// 		if (letter === quotes[0]) { // close quote
// 			quotes.shift()
// 		} else {
// 			if (['"', "'"].includes(letter) && quotes[0]) {
// 				quotes.unshift(letter)
// 			} else {
// 				word += letter
// 			}
// 		}
// 	})
// 	if (quotes[0]) {
// 		return `unexpected EOF while looking for matching \`${quotes[0]}'`
// 	}
// 	return ['']
// }

export const removeBashQuotes = (text: string): string => {
	// simple string no quotes
	// split on space and strip all surrounding
	// spaces around words
	if(!text.includes('"') && !text.includes("'")) {
		return text
	}
	let stripped = ''
	let quote: string | null = null
	text.split('').forEach((letter) => {
		// console.log(`word=${word} words=${words} letter=${letter} quote=${quote}`)
		if (["'", '"'].includes(letter) && !quote) { // open quote
			quote = letter
		} else if (quote === letter) { // close quote
			quote = null
		} else {
			stripped += letter
		}
	})
	if (quote) {
		return `unexpected EOF while looking for matching \`${quote}'`
	}
	return stripped
}

export const bashWordSplitKeepQuotesEatSpaces = (text: string): string[] | string => {
	// simple string no quotes
	// split on space and strip all surrounding
	// spaces around words
	// if(!text.includes('"') && !text.includes("'")) {
	// 	return text.split(/\s+/)
	// }
	if (!text) {
		return ['']
	}
	let words: string[] = []
	let word = ''
	let quote: string | null = null
	let wordBeforeLastSemicolon = ''
	let parseError = ''
	let letterIndex = -1
	let skipLetter = false
	const letters = text.split('')
	letters.forEach((letter) => {
		if(parseError) {
			return
		}
		letterIndex += 1
		if (skipLetter) {
			skipLetter = false
			return
		}
		// console.log(`[bash][word] word=${word} words=${words} letter=${letter} quote=${quote}`)
		if (["'", '"'].includes(letter) && !quote) { // open quote
			quote = letter
			word += letter
		} else if (quote === letter) { // close quote
			quote = null
			word += letter
		} else if (letter === '>' && !quote) {
			const nextLetter = letters[letterIndex + 1]
			if (nextLetter === '>') {
				skipLetter = true
				if(word) {
					words.push(word)
				}
				words.push('>>')
			} else if(word === '&') {
				words.push('&>')
			} else {
				if(word) {
					words.push(word)
				}
				words.push('>')
			}
			word = ''
		} else if (letter === ';' && !quote) {
			if(wordBeforeLastSemicolon === '') {
				parseError = "-bash: syntax error near unexpected token `;'"
			}
			if(word) {
				words.push(word)
			}
			words.push(';') // put them in so later we can cmd split
			word = ''
			wordBeforeLastSemicolon = ''
		} else if (letter === ' ' && !quote) {
			// swallow spaces
			if(word === '') {
				return
			}
			// console.log(`[bash][word] SPLIT letter=${letter} quote=${quote}`)
			words.push(word)
			word = ''
		} else {
			wordBeforeLastSemicolon += letter
			word += letter
		}
	})
	if (word !== '') {
		words.push(word)
	}
	if (quote) {
		return `unexpected EOF while looking for matching \`${quote}'`
	}
	if (parseError) {
		return parseError
	}
	return words
}

// console.log(bashWordSplitKeepQuotesEatSpaces('"foo"'))

// const bashVarNamePattern = '[a-zA-Z_\\?\\$]+[a-zA-Z0-9_]*'

const bashStr = (string: string): BashParseResult => {
	if(!string) {
		return { stdout: '', stderr: '' }
	}
	/* broken because of overlapping vars */
	// Object.keys(glbBs.vars).forEach((key) => {
	// 	const val = glbBs.vars[key]
	// 	const variable = '$' + key
	// 	const variableCurly = '${' + key + '}'
	// 	string = string.replaceAll(variable, val)
	// 	string = string.replaceAll(variableCurly, val)
	// })
	// string = string.replaceAll(/\${?[a-zA-Z_]+[a-zA-Z_0-9]*}?/g, '')

	/* broken because of double expand and also expand in single quote */
	// // "foo $bara baz $flora ${fauna}".match(new RegExp('(\\$[a-zA-Z_]+[a-zA-Z_0-9]*|\\${[a-zA-Z_]+[a-zA-Z_0-9]*})', 'g'))
	// // [ '$bara', '$flora', '${fauna}' ]
	// // "foo $2bara baz $ _flora ${fauna".match(new RegExp('(\\$[a-zA-Z_]+[a-zA-Z_0-9]*|\\${[a-zA-Z_]+[a-zA-Z_0-9]*})', 'g'))
	// // null
	// const vars = string.match(new RegExp('(\\$[a-zA-Z_]+[a-zA-Z_0-9]*|\\${[a-zA-Z_]+[a-zA-Z_0-9]*})', 'g'))
	// if(vars) {
	// 	vars.forEach((varfull) => {
	// 		const varName = varfull.substring(1)
	// 		// TODO: strip curly braces from var name
	// 		const varVal = getBashVar(varName)
	// 		string = string.replace(varfull, varVal)
	// 	})
	// }

	// "unexpected EOF while looking for matching `}'"



	let currentVar = ''
	let scope: string | null = null
	let curly: string | null = null
	let isVar = false
	let finalString = ''
	let parseError = ''
	string.split('').forEach((letter) => {
		while (true) { // fake goto
			if (parseError) {
				return
			}
			dbgPrintStr(`[bash][var] currentVar=${currentVar} finalString=${finalString} isVar=${isVar} letter=${letter} scope=${scope} curly=${curly}`)
			// if (letter === '"' && scope !== "'") { // toggle double quote unless single quote
			// 	scope = (scope === '"') ? null : '"'
			if (letter === '"' && scope === '"') { // close double quote
				scope = null
			} else if (letter === '"' && scope === null) { // open double quote
				scope = '"'
			} else if (letter === "'") {
				if (scope === '}') { // single quote in ${var'} breaks
					parseError = 'unexpected EOF'
					return
					// unexpected EOF while looking for matching `''
				} else if (scope === null) { // open quote
					scope = "'"
				} else if (scope === "'") { // close quote
					scope = null
				} else if (scope === '"') {
					finalString += letter
				} else {
					parseError = 'invalid scope'
					return
				}
			} else if (letter === '$' && scope !== "'" && !isVar) { // we need !IsVar because of $$ pid var
				isVar = true
			} else if (letter === '{' && isVar && curly === null) { // open curly
				//                      check for curly === null
				//              because:
				//                 echo $a{a
				//              prints:
				//                 {a
				curly = "}"
			} else if (letter === '}' && curly) { // close curly
				curly = null
				dbgPrintStr(`[bash][var][match_curly] getBashVar(${currentVar}) => ${getBashVar(currentVar)}`)
				finalString += currentVar === '' ? '$' : getBashVar(currentVar)
				currentVar = ''
				isVar = false
			} else if (isVar) {
				// const bashVarPattern = '[a-zA-Z_0-9\\?\\$]+[a-zA-Z0-9_]*'
				// TODO $$ and $$$
				const bashVarLetter1Pattern = '[a-zA-Z_0-9\\?\\$]'
				const bashVarLetter2Pattern = '[a-zA-Z_0-9]'
				const pat = currentVar.length === 0 ? bashVarLetter1Pattern : bashVarLetter2Pattern
				if (new RegExp(`^${pat}$`).test(letter)) {
					currentVar += letter
				} else {
					dbgPrintStr(`[bash][var][match] getBashVar(${currentVar}) => ${getBashVar(currentVar)}`)
					finalString += currentVar === '' ? '$' : getBashVar(currentVar)
					currentVar = ''
					isVar = false
					dbgPrintStr(`[bash][var][recursion] warning using fake goto`)
					// finalString += letter
					continue // start from the top to check the letter
				}
			} else {
				finalString += letter
			}
			break // break out of fake goto loop
		}
	})
	if (parseError) {
		return { stdout: '', stderr: parseError }
	}
	if(isVar) {
		dbgPrintStr(`[bash][var][e] currentVar=${currentVar} finalString=${finalString} isVar=${isVar} letter=EOL scope=${scope}`)
		dbgPrintStr(`[bash][var][match] getBashVar(${currentVar}) => ${getBashVar(currentVar)}`)
		finalString += currentVar === '' ? '$' : getBashVar(currentVar)
		isVar = false
	}
	if (!scope) {
		scope = curly
	}
	if (scope) {
		return { stdout: '', stderr: `unexpected EOF while looking for matching \`${scope}'` }
	}
	string = finalString

	// TODO: globbing should not newline and replace ls
	//       it should space split
	//       and ls should accept space seperated n args for file paths
	//       but for that to work the word splitter has to run over this result
	//       because bash can word split even expanded vars:
	//
	//       glob=*.py
	//       echo $glob => hey_to_pack.py

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
			return { stdout: matches.join('\n'), stderr: '' }
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
			return { stdout: matches.join('\n'), stderr: '' }
		}
	}
	return { stdout: string, stderr: '' }
}

export const quoteIfNeeded = (word: string): string => {
	if (word.includes(' ')) {
		if (word.includes("'")) {
			if (word.includes('"')) {
				// TODO: we do not support unquoting them
				// since we do not support escaping quotes yet
				return `'${word.replaceAll("'", "'\\''")}'`
			}
			return `"${word}"`
		}
		return `'${word}'`
	} else if (word.includes('"')) {
		if (word.includes("'")) {
			return `'${word.replaceAll("'", "'\\''")}'`
		}
		return `'${word}'`
	} else if (word.includes("'")) {
		if (word.includes('"')) {
			return `'${word.replaceAll("'", "'\\''")}'`
		}
		return `"${word}"`
	}
	return word
}

export const bashGlob = (text: string): string => {
	if (!text.includes('*')) {
		return text
	}
	if (text === '*') {
		const files = glbBs.fs[glbBs.vars['PWD']] ? glbBs.fs[glbBs.vars['PWD']] : []
		if (files.length === 0) {
			return text
		}
		return files.map((file) => quoteIfNeeded(file.name)).join(' ')
	}
	const matches: string[] = []
	return ''
}

export const fakeBash = (userinput: string): string => {
	// const expandedBash = bashStr(userinput)
	// if(userinput !== expandedBash)
	// 	console.log(`[bash][expand] ${userinput} -> ${expandedBash}`)
	const emptyPrevResult: BashResult = { stdout: '', stderr: '', exitCode: 0}
    const { stdout, stderr, exitCode } = evalBash(userinput, emptyPrevResult)
    glbBs.vars['?'] = exitCode.toString()
    // TODO: can we do something better here
    //       to support mixed order stdout and stderr
    return stdout + stderr
}

// TODO: remove or heavily reduce
const hardcodetBashReply = (userinput: string): BashResult | null => {
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
		if (!glbBs.fs[glbBs.vars['PWD']]) {
			// guard against disk grow
			// when set PWD to random locations before rm
			// every empty folder is taking up space in the fs hash
			// as path key
			return { stdout: '', stderr: '', exitCode: 1 }
		}
		glbBs.fs[glbBs.vars['PWD']] = []
		return { stdout: '', stderr: '', exitCode: 0 }
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
	return null
}

const assignVariable = (validAlreadyExpandedVariableAssignment: string): void => {
	// foo=
	// is a valid assignment to set foo to an empty string
	const slices = validAlreadyExpandedVariableAssignment.split('=')
	const varKey = slices.shift()
	const varVal = slices.join('')
	// const variable = m[1]
	// const value = m[2]
	if (!varKey) {
		console.log(`Error got invalid variable assingment: ${validAlreadyExpandedVariableAssignment}`)
		return
	}
	const expandedVal = varVal // bashStr(varVal) // TODO: should we maybe not double expand here?
	dbgPrintStr(`[bash][assign_var] ${varKey}=${expandedVal}`)
	glbBs.vars[varKey] = expandedVal
}

const mergeStringNewline = (string1: string, string2: string): string => {
	let sum = string1
	if(sum) {
		sum += '\n'
	}
	return sum + string2
}

const flushBashIo = (bashRes: BashResult): BashResultIoFlushed => {
	const flushedRes: BashResultIoFlushed = {
		stdout: bashRes.stdout,
		stderr: bashRes.stderr,
		exitCode: bashRes.exitCode,
		ioFlushed: true
	}
	if (glbBs.stdoutFileDescriptior.stdIo === null && glbBs.stdoutFileDescriptior.outfile != '') {
		const ioOp = glbBs.stdoutFileDescriptior.append ? appendToFileContent : createOrOverwriteFileWithContent
		// can be null for example when piping to /dev/null
		if (glbBs.stdoutFileDescriptior.outfile) {
			const ioError = ioOp(glbBs.stdoutFileDescriptior.outfile, bashRes.stdout)
			if(ioError !== null) {
				flushedRes.stderr = mergeStringNewline(flushedRes.stderr, ioError)
			}
		}
		flushedRes.stdout = ''
	}

	glbBs.stdoutFileDescriptior.stdIo = StdIo.stdout
	glbBs.stdoutFileDescriptior.outfile = ''

	return flushedRes
}

const redirectToFile = (append: boolean, leftWords: string[], rightWords: string[], delSplitWordIndecies: number[], iteratedSplitWords: number): string | null => {
	dbgPrintFs(`[bash][redirect] redirect to file append=${append} left=${leftWords.join(' ')} right=${rightWords.join(' ')}`)
	if (rightWords.length === 0) {
		return "-bash: syntax error near unexpected token `newline'"
	}

	const outfile = rightWords[0]

	if (['/dev/null', '/dev/random', '/dev/urandom'].includes(outfile)) {
		glbBs.stdoutFileDescriptior.stdIo = null
		glbBs.stdoutFileDescriptior.append = append
		glbBs.stdoutFileDescriptior.outfile = null
		return null
	}

	// /dev/tcp and /dev/udp pseudo device
	const m = outfile.match(new RegExp("/dev/(tcp|udp)/([^/]+)/(.*)"))
	if (m) {
		const protocol = m[1]
		const host = m[2]
		const port = m[3]
		if (!host.match(new RegExp("^(?:(?:1?[1-9]?\\d|[12][0-4]\\d|25[0-5])(?:\\.(?!$)|$)){4}$"))) {
			return `-bash: ${host}: Name or service not known\n` +
				   `-bash: ${outfile}: Invalid argument`
		}
		if (!port.match(new RegExp("^[0-9]+$"))) {
			return `-bash: ${port}: Servname not supported for ai_socktype\n` +
				   `-bash: ${outfile}: Invalid argument`
		}
		return '-bash: connect: Connection refused\n' +
			   `-bash: ${outfile}: Connection refused`
	}
	// TODO: check outfile for magic names such as
	// 1,2,3 to redirect stdout to stderr etc

	const [abspath, folder, filename] = pathInfo(outfile)
	if(isDir(abspath)) {
		return `-bash: ${outfile}: Is a directory`
	} else if (!isDir(folder)) {
		return `-bash: ${outfile}: No such file or directory`
	}

	glbBs.stdoutFileDescriptior.stdIo = null
	glbBs.stdoutFileDescriptior.append = append
	glbBs.stdoutFileDescriptior.outfile = abspath

	delSplitWordIndecies.push(iteratedSplitWords - 1)
	delSplitWordIndecies.push(iteratedSplitWords)
	return null
}

const evalBash = (userinput: string, prevBashResult: BashResult): BashResultIoFlushed => {
	const hardcode = hardcodetBashReply(userinput)
	if(hardcode !== null) {
		return flushBashIo(hardcode)
	}
	dbgPrint('-----------------------------')
	dbgPrint(`eval: ${userinput}`)

	// leading spaces are never part of the syntax
	// or breaking the syntax
	// they just make parsing harder
	// so strip them
	userinput = userinput.replace(/^\s+/g, '')

	const bashVarAssignPattern = new RegExp('^[a-zA-Z_]+[a-zA-Z_0-9]*=')
	let isVarAssign = false
	// have to check before pre expand
	// because this is not a valid bash line
	// "foo"=bar
	if (userinput.match(bashVarAssignPattern)) {
		isVarAssign = true
	}

	const splitWords = bashWordSplitKeepQuotesEatSpaces(userinput)
	// console.log(`[bash][worldsplit] ${userinput} -> ${splitWords}`)
	if (typeof splitWords === 'string' || splitWords instanceof String) {
		// the toString() is just here to please typescript
		return flushBashIo({ stdout: '', stderr: splitWords.toString(), exitCode: 1 })
	}

	// TODO: glob after pipe split because of this
	//       cd foo;ls *.txt

	// pipes or redirects
	let iteratedSplitWords = 0
	let recurseSplit: BashResult | null = null
	const delSplitWordIndecies: number[] = []
	let pipeSyntaxError = ''
	splitWords.forEach((word) => {
		if (pipeSyntaxError) {
			return
		}
		iteratedSplitWords += 1
		// const unquotedWord = removeBashQuotes(word)
		// console.log(word)

		const leftWords = splitWords.slice(0, iteratedSplitWords - 1)
		const rightWords = splitWords.slice(iteratedSplitWords)
		if (word === '|') {
			// reset redirects on pipe
			glbBs.stdoutFileDescriptior.stdIo = StdIo.stdout
			glbBs.stdoutFileDescriptior.outfile = ''

			// console.log(leftWords)
			// console.log(rightWords)
			dbgPrint(`[bash][splitcmds] got pipe left=${leftWords.join(' ')} right=${rightWords.join(' ')}`)
			// dangling pipe at the end
			if (rightWords.length === 0) {
				pipeSyntaxError = '-bash: syntax error: unexpected end of file'
				return
			}
			const leftResult = evalBash(leftWords.join(' '), prevBashResult)
			const rightResult = evalBash(rightWords.join(' '), leftResult)
			// console.log(leftResult)
			// console.log(rightResult)
			recurseSplit = {
				stdout: rightResult.stdout, // stdout gets eaten by the pipe
				stderr: mergeStringNewline(leftResult.stderr, rightResult.stderr),
				exitCode: rightResult.exitCode // only last exit code counts
			}
		} else if (word === '>') {
			const append = false
			const redRes = redirectToFile(append, leftWords, rightWords, delSplitWordIndecies, iteratedSplitWords)
			if (redRes !== null) {
				pipeSyntaxError = redRes
			}
		} else if (word === '>>') {
			const append = true
			const redRes = redirectToFile(append, leftWords, rightWords, delSplitWordIndecies, iteratedSplitWords)
			if (redRes !== null) {
				pipeSyntaxError = redRes
			}
		} else if (word === ';') {
			// reset redirects on new command
			glbBs.stdoutFileDescriptior.stdIo = StdIo.stdout
			glbBs.stdoutFileDescriptior.outfile = ''

			// console.log(leftWords)
			// console.log(rightWords)
			dbgPrint(`[bash][splitcmds] got semicolon left=${leftWords.join(' ')} right=${rightWords.join(' ')}`)
			// do not evaluate empty if semicolon at the end
			if (rightWords.length === 0) {
				recurseSplit = evalBash(leftWords.join(' '), prevBashResult)
				return
			}
			const leftResult = evalBash(leftWords.join(' '), prevBashResult)
			const rightResult = evalBash(rightWords.join(' '), leftResult)
			// console.log(leftResult)
			// console.log(rightResult)
			recurseSplit = {
				stdout: mergeStringNewline(leftResult.stdout, rightResult.stdout),
				stderr: mergeStringNewline(leftResult.stderr, rightResult.stderr),
				exitCode: rightResult.exitCode // only last exit code counts
			}
		}
	})
	if (pipeSyntaxError) {
		return flushBashIo({ stdout: '', stderr: pipeSyntaxError, exitCode: 2 })
	}
	if (recurseSplit !== null) {
		return recurseSplit
	}
	// console.log("before del")
	// console.log(splitWords)
	let deletionOffset = 0
	delSplitWordIndecies.forEach((delIndex) => {
		splitWords.splice(delIndex - deletionOffset, 1)
		deletionOffset += 1
	})
	// console.log("after del")
	// console.log(splitWords)

	let stringError = ''
	const expandedWords = splitWords.map((word) => {
		if (stringError) {
			return stringError
		}
		const res = bashStr(word)
		if (res.stderr) {
			stringError = res.stderr
		}
		return res.stdout
	})
	if (stringError) {
		return flushBashIo({ stdout: '', stderr: stringError, exitCode: 1 })
	}
	const cmd = expandedWords.shift()
	if (!cmd) {
		return flushBashIo({ stdout: '', stderr: 'internal error 1812', exitCode: 1812 })
	}
	const args = expandedWords

	// console.log(`[bash][bashstr] cmd=${cmd} args=${args}`)

	if(isVarAssign) {
		if(!args || args.length === 0) {
			assignVariable(cmd)
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		} else {
			// TODO: assign temp env var
			// but its not a tmp var if no command follows but multiple vars are assigned

			// set temp env and then run command
			// like this
			// CC=g++ make -j2
			// ^    ^ ^  ^
			//  \ __/  \_/
			//     |    |
			//    var  new command
			dbgPrintWarn('[bash][eval] warning doing recursion to eval after var assign')
			// console.log(args)
			// return { stdout: '', stderr: '', exitCode: 0 }
			assignVariable(cmd)
			const emptyPrevResult: BashResult = { stdout: '', stderr: '', exitCode: 0}
			return evalBash(args.join(' '), emptyPrevResult)
		}
	}

	if (cmd === 'uname' && args[0] === '-a') {
		return flushBashIo({ stdout: 'Linux raspberrypi 5.10.103-v7l+ #1529 SMP Tue Mar 8 12:24:00 GMT 2022 armv7l GNU/Linux', stderr: '', exitCode: 0 })
	} else if (cmd === 'mkdir') {
		const path = args[0]
		const [abspath, folder, filename] = pathInfo(path)
		const realpath = `${folder}/${filename}`
		if(getPathType(realpath) !== null) {
			return flushBashIo({ stdout: '', stderr: `mkdir: cannot create directory ‘${path}’: File exists`, exitCode: 1 /* TODO made up */ })
		}
		const ioError = CreateFolder(abspath)
		if (ioError === null) {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		return flushBashIo({ stdout: '', stderr: `mkdir: cannot create file ‘${path}’: ${ioError}`, exitCode: 1 /* TODO made up */ })
	} else if (cmd === 'touch') {
		const path = args[0]
		const [abspath, folder, filename] = pathInfo(path)
		if(getPathType(abspath) !== null) {
			// touch just pokes the file
			// if we intoduce dates we should update last modified
			// here
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		if(!isDir(folder)) {
			return flushBashIo({ stdout: '', stderr: `touch: cannot touch '${path}': No such file or directory`, exitCode: 1 /* TODO made up */ })
		}
		const ioError = createOrOverwriteFileWithContent(abspath, '')
		if(ioError === null) {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		return flushBashIo({ stdout: '', stderr: ioError, exitCode: 1 })
	} else if (cmd === 'uname' && args[0] === '-r') {
		return flushBashIo({ stdout: '5.10.103-v7l+', stderr: '', exitCode: 0 })
	} else if (cmd === 'sudo' || cmd === '/usr/bin/sudo') {
		return flushBashIo({ stdout: '', stderr: 'sudo: a password is required', exitCode: 0 })
	} else if (cmd === 'apt' || cmd === '/usr/bin/apt') {
		return flushBashIo({
			stdout: [
				"E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)",
				"E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?"
			].join('\n'),
			stderr: '',
			exitCode: 100 // verified
		})
	} else if (cmd === 'cd') {
		if (args[0] === '.') {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		if (args.length === 0) {
			glbBs.vars['PWD'] = '/home/pi'
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		if (args[0][0] == '-') {
			return flushBashIo({ stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO made up */ })
		}
		let path = args[0]
		if(/\./.test(path) && path !== '..') {
			// TODO: support ../ and ./ and foo/../../bar paths
			console.log('rel path not supportede')
			return flushBashIo({ stdout: '', stderr: `-bash: cd: ${path}: Permission denied`, exitCode: 1 /* TODO made up */ })
		}
		const [abspath, folder, filename] = pathInfo(path)
		if (isDir(abspath)) {
			if (!abspath.startsWith('/tmp/') &&
				!abspath.startsWith('/home/pi/') &&
				!['/', '/tmp', '/home/pi', '/home'].includes(abspath)) {
				console.log(`illegal abs path '${abspath}'`)
				return flushBashIo({ stdout: '', stderr: `-bash: cd: ${path}: Permission denied`, exitCode: 1 /* TODO made up */ })
			}
			glbBs.vars['PWD'] = abspath
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		} else if (isFile(abspath)) {
			return flushBashIo({ stdout: '', stderr: `-bash: cd: ${path}: Not a directory`, exitCode: 1 /* TODO made up */ })
		} else if (isDir(folder)) {
			return flushBashIo({ stdout: '', stderr: `-bash: cd: ${path}: No such file or directory`, exitCode: 1 /* TODO made up */ })
		}
		console.log(`fallback because abspath=${abspath} dir=${isDir(abspath)}`)
		return flushBashIo({ stdout: '', stderr: `-bash: cd: ${args[0]}: Permission denied`, exitCode: 1 /* TODO made up */ })
	} else if (cmd === 'kill') {
		if (args.length === 0) {
			return flushBashIo({ stdout: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', stderr: '', exitCode: 0 })
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
			return flushBashIo({ stdout: 'bash error', stderr: '', exitCode: 0 })
		}
		const pid = args[0]
		if(pid === getCurrentPid() || pid === getParentPid()) {
			return flushBashIo({ stdout: 'bash error', stderr: '', exitCode: 0 })
		}
		const pidInt = parseInt(pid, 10)
		if(pidInt < 20000) {
			return flushBashIo({ stdout: '', stderr: `-bash: kill: (${pid}) - Operation not permitted`, exitCode: 1 /* TODO made up */ })
		}
		return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
	} else if (cmd === 'echo') {
		let newline = '\n'
		let expand = false
		if (args[0] === '-n') {
			args.shift()
			newline = ''
		}
		if (args[0] === '-e') {
			args.shift()
			expand = true
		}
		let msg = args.join(' ') + newline
		if (expand) {
			msg = msg.replaceAll('\\n', '\n')
		}
		return flushBashIo({ stdout: msg, stderr: '', exitCode: 0 })
	} else if (cmd === 'git') {
		const helptxt = [
			'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]',
			'	[--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]',
			'	[-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]',
			'	[--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]',
			'	<command> [<args>]'
		].join('\n')
		if(args.length === 0) {
			return flushBashIo({ stdout: helptxt, stderr: '', exitCode: 1 /* verified */ })
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
				return flushBashIo({ stdout: '', stderr: `error: unknown option \`${args[0]}'\n${helptxt}`, exitCode: 1 /* TODO made up */ })
			}
			const url = args[0]
			// https://github.com/foo/bar
			// git@github.com:foo/bar
			const urlRegex = new RegExp('(git@|https?://).*[:/](.*)/(.*)(.git)?')
			const m = url.match(urlRegex)
			if(m) {
				const folders = m[2].split('/')
				const basename = folders[folders.length - 1]
				const [abspath, folder, filename] = pathInfo(basename)
				if(isDirOrFile(abspath)) {
					return flushBashIo({ stdout: '', stderr: `fatal: destination path '${basename}' already exists and is not an empty directory.`, exitCode: 1 /* TODO made up */ })
				}
				let ioError = CreateFolder(basename)
				if(ioError === null) { ioError = createOrOverwriteFileWithContent(`${basename}/README.md`, 'this is the readme'); }
				if(ioError === null) { ioError = createOrOverwriteFileWithContent(`${basename}/LICENSE`, 'MIT License'); }
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
					return flushBashIo({ stdout: '', stderr: out, exitCode: 1 })
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
				return flushBashIo({ stdout: out, stderr: '', exitCode: 0 })
			} else {
				return flushBashIo({ stdout: '', stderr: `fatal: repository '${url}' does not exist`, exitCode: 1 /* TODO made up */ })
			}
		} else if(args[0] === 'status') {
			return flushBashIo({ stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git', exitCode: 128 /* verified */ })
		} else if(args[0] === '--help') {
			return flushBashIo({ stdout: helptxt, stderr: '', exitCode: 0 /* verified */ })
		} else {
			return flushBashIo({ stdout: '', stderr: `git: '${args[0]}' is not a git command. See 'git --help'.`, exitCode: 1 /* TODO made up */ })
		}
	} else if (cmd === 'shutdown') {
		if(args[0] === '-c') {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		if(args[0] === 'now') {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		return flushBashIo({ stdout: `Shutdown scheduled for ${Date().toString().split('(')[0].slice(0, -1)}, use 'shutdown -c' to cancel.`, stderr: '', exitCode: 0 })
	} else if (cmd === 'dmesg') {
		return flushBashIo({ stdout: '', stderr: 'dmesg: read kernel buffer failed: Operation not permitted', exitCode: 1 /* verified */ })
	} else if (cmd === 'reboot') {
		const out = [
			'Failed to set wall message, ignoring: Interactive authentication required.',
			'Failed to reboot system via logind: Interactive authentication required.',
			'Failed to open initctl fifo: Permission denied',
			'Failed to talk to init daemon.'
		].join('\n')
		return flushBashIo({ stdout: '', stderr: out, exitCode: 1 /* verified */ })
	} else if (cmd === 'ps') {
		const pid = !parseInt(getCurrentPid(), 10) ? 755767 : parseInt(getCurrentPid(), 10)
		const out = [
			`PID TTY          TIME CMD`,
			`${pid} pts/1    00:00:00 ${getCurrentShellShort()}`,
			`${pid + Math.floor(Math.random() * 500)} pts/1    00:00:00 ps`
		].join('\n')
		return flushBashIo({ stdout: out, stderr: '', exitCode: 0 })
	} else if (cmd === 'hostname') {
		// technically would reboot
		// to update actual hostname
		// instead of just reading the var
		return flushBashIo({ stdout: glbBs.vars['HOSTNAME'], stderr: '', exitCode: 0 })
	} else if (cmd === 'command') {
		if (args[0] === '-v') {
			args.shift()
		} else {
			// saying just command without -v basically runs the command
			// could be done with recursion
			return flushBashIo({ stdout: '', stderr: 'interal error', exitCode: 7812 })
		}
		const check = args[0]
		const match = cmdInUnixPath(check)
		if (!match) {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 1 /* verified */ })
		}
		return flushBashIo({ stdout: match, stderr: '', exitCode: 0 })
	} else if (cmd === 'type') {
		const check = args[0]
		const match = cmdInUnixPath(check)
		if (!match) {
			return flushBashIo({ stdout: '', stderr: `-bash: type: ${check}: not found`, exitCode: 1 /* TODO made up */ })
		}
		const [abspath, folder, filename] = pathInfo(match)
		return flushBashIo({ stdout: '', stderr: `${check} is hashed (${abspath})`, exitCode: 1 /* TODO made up */ })
	} else if (cmd === 'which') {
		const check = args[0]
		const match = cmdInUnixPath(check)
		if (!match) {
			return flushBashIo({ stdout: '', stderr: `which: no ${check} in (${glbBs.vars['PATH']})`, exitCode: 1 /* TODO made up */ })
		}
		const [abspath, folder, filename] = pathInfo(match)
		return flushBashIo({ stdout: abspath, stderr: '', exitCode: 0 /* TODO made up */ })
	} else if (cmd === 'whoami') {
		return flushBashIo({ stdout: getCurrentUnixUser(), stderr: '', exitCode: 0 /* TODO made up */ })
	} else if (cmd === 'chmod') {
		const expandedOptArg = args[0]
		args.shift()
		const expandedFileArg = args[0]
		if(!expandedFileArg) {
			return flushBashIo({ stdout: '', stderr: `chmod: missing operand after ‘${expandedOptArg}’`, exitCode: 1 /* TODO made up */ })
		}
		const [abspath, folder, filename] = pathInfo(expandedFileArg)
		const file = getFile(abspath)
		if (!file) {
			return flushBashIo({ stdout: '', stderr: `chmod: cannot access '${expandedFileArg}': No such file or directory`, exitCode: 1 /* TODO made up */ })
		}
		if (expandedOptArg === '777') {
			if(!file.perms) {
				file.perms = '-rw-r--r--'
			}
			file.perms = `${file.type === 'd' ? 'd' : '-'}rwxrwxrwx`
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		const m = expandedOptArg.match(new RegExp('(.*)?([\\+\\-])(.*)'))
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
			// console.log(`matched exec regex and set file perms to newperms=${newperms} file.perms=${file.perms} add=${isAdd}`)
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		console.log("warning fallback fileperms unkonwn opt" + expandedOptArg)
		// failed to parse perms set random default xd
		file.perms = '-rw-r--r--'
		file.perms = `${file.type === 'd' ? 'd' : '-'}rw-r--r--`
		return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
	} else if (cmd === 'head') {
		let path: string | null | undefined = null
		let lines: number = 10
		let endOfArgs = false
		while (args.length > 0) {
			const arg = args.shift()
			if (arg === undefined || arg === null) {
				break
			}
			if (arg === '--version') {
				const versiontxt = 'head (GNU coreutils) 9.3\n' +
					'Copyright (C) 2023 Free Software Foundation, Inc.\n' +
					'License GPLv3+: GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>.\n' +
					'This is free software: you are free to change and redistribute it.\n' +
					'There is NO WARRANTY, to the extent permitted by law.\n' +
					'\n' +
					'Written by David MacKenzie and Jim Meyering.\n'
				return flushBashIo({ stdout: versiontxt, stderr: '', exitCode: 0 /* verified */ })
			} else if (arg === '--help') {
				const helptxt = "Usage: head [OPTION]... [FILE]...\n" +
								"Print the first 10 lines of each FILE to standard output.\n" +
								"With more than one FILE, precede each with a header giving the file name.\n" +
								"\n" +
								"With no FILE, or when FILE is -, read standard input.\n" +
								"\n" +
								"Mandatory arguments to long options are mandatory for short options too.\n" +
								"  -c, --bytes=[-]NUM       print the first NUM bytes of each file;\n" +
								"                             with the leading '-', print all but the last\n" +
								"                             NUM bytes of each file\n" +
								"  -n, --lines=[-]NUM       print the first NUM lines instead of the first 10;\n" +
								"                             with the leading '-', print all but the last\n" +
								"                             NUM lines of each file\n" +
								"  -q, --quiet, --silent    never print headers giving file names\n" +
								"  -v, --verbose            always print headers giving file names\n" +
								"  -z, --zero-terminated    line delimiter is NUL, not newline\n" +
								"      --help        display this help and exit\n" +
								"      --version     output version information and exit\n" +
								"\n" +
								"NUM may have a multiplier suffix:\n" +
								"b 512, kB 1000, K 1024, MB 1000*1000, M 1024*1024,\n" +
								"GB 1000*1000*1000, G 1024*1024*1024, and so on for T, P, E, Z, Y, R, Q.\n" +
								"Binary prefixes can be used, too: KiB=K, MiB=M, and so on.\n" +
								"\n" +
								"GNU coreutils online help: <https://www.gnu.org/software/coreutils/>\n" +
								"Full documentation <https://www.gnu.org/software/coreutils/head>\n" +
								"or available locally via: info '(coreutils) head invocation'\n"
				return flushBashIo({ stdout: helptxt, stderr: '', exitCode: 0 /* verified */ })
			} else if (arg === '-n') {
				const lineInp = args.shift()
				if (lineInp) {
					lines = parseInt(lineInp, 10)
					if (!lines) { // NaN
						return flushBashIo({ stdout: '', stderr: `head: invalid number of lines: ‘${lineInp}’`, exitCode: 1 /* verified */ })
					}
				}
			} else if (arg === '--') {
				endOfArgs = true
			} else if (!endOfArgs && arg[0] === '-') {
				const errMsg = `head: unrecognized option '${arg}'\n` +
							   "Try 'head --help' for more information."
				return flushBashIo({ stdout: '', stderr: errMsg, exitCode: 1 /* verified */ })
			} else {
				path = arg
			}
		}
		let content = ''
		if (path === undefined || path === null || path === '-') {
			content = prevBashResult.stdout
		} else {
			const [abspath, folder, filename] = pathInfo(path)
			const file = getFile(abspath)
			if (!file) {
				const errMsg = `head: cannot open '${path}' for reading: No such file or directory`
				return flushBashIo({ stdout: '', stderr: errMsg, exitCode: 1 /* verified */ })
			}
			if(file.type === 'd') {
				return flushBashIo({ stdout: '', stderr: `head: error reading '${path}': Is a directory`, exitCode: 1 /* verified */ })
			}
			content = file.content ? file.content : ''
		}

		let headed = content.split('\n').slice(0, lines).join('\n')
		if (content.includes('\n')) {
			headed += '\n'
		}

		return flushBashIo({ stdout: headed, stderr: '', exitCode: 0 })
	} else if (cmd === 'cat') {
		// TODO: actually concatinate
		// console.log(args)
		const path = args[0]
		// these two bash lines are different
		// $ cat
		// $ cat ''
		if (path === undefined || path === null) {
			return flushBashIo({ stdout: prevBashResult.stdout, stderr: '', exitCode: 0 })
		}
		const [abspath, folder, filename] = pathInfo(path)
		// console.log(abspath)
		const file = getFile(abspath)
		if (!file) {
			return flushBashIo({ stdout: '', stderr: `cat: ${path}: No such file or directory`, exitCode: 1 /* verified */ })
		}
		if(file.type === 'd') {
			return flushBashIo({ stdout: '', stderr: `cat: ${path}: Is a directory`, exitCode: 1 /* verified */ })
		}
		const content = file.content ? file.content : ''
		return flushBashIo({ stdout: content, stderr: '', exitCode: 0 })
	} else if (cmd === 'printf') {
		if (args.length === 0) {
			return flushBashIo({ stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 })
		}
		let noArgs = false
		if (args[0] === '--') {
			args.shift()
			noArgs = true
		}
		if (!noArgs && args[0] === '-v') {
			args.shift()
			const variable = args.shift()
			if (!variable) {
				return flushBashIo({ stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 })
			}
			if(!/^[a-zA-Z_]+[a-zA-Z0-9_]*/.test(variable)) {
				return flushBashIo({ stdout: '', stderr: `-bash: printf: \`${variable}': not a valid identifier`, exitCode: 1 /* TODO */ })
			}
			if(args.length === 0) {
				return flushBashIo({ stdout: 'printf: usage: printf [-v var] format [arguments]', stderr: '', exitCode: 0 })
			}
			let msg = args[0]
			args.shift()
			args.forEach((arg) => {
				msg = msg.replace(/%[sibd]/, arg)
			})
			msg = msg.replaceAll('\\n', '\n')
			// console.log(`set var ${variable} to ${msg} using printf`)
			glbBs.vars[variable] = msg
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		}
		if(!args[0]) {
			return flushBashIo({ stdout: '', stderr: 'internal error 420', exitCode: 420 })
		}
		if (noArgs && args[0][0] == '-') {
			return flushBashIo({ stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO */ })
		}
		let msg = args[0]
		args.shift()
		args.forEach((arg) => {
			msg = msg.replace(/%[sibd]/, arg)
		})
		msg = msg.replaceAll('\\n', '\n')
		return flushBashIo({ stdout: msg, stderr: '', exitCode: 0 })
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
				argFolder = args[0]
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
			return flushBashIo({ stdout: out, stderr: '', exitCode: 0 })
		} else if (isFile(abspath)) {
			const file = getFile(abspath)
			if(!file) {
				console.log("wtf")
				return flushBashIo({ stdout: 'bash error', stderr: '', exitCode: 0 })
			}
			return flushBashIo({ stdout: printFile(file, flagList), stderr: '', exitCode: 0 })
		} else {
			return flushBashIo({ stdout: '', stderr: `ls: cannot access '${abspath}': Permission denied`, exitCode: 2 /* verified */ })
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
		return flushBashIo({ stdout: out, stderr: '', exitCode: 0 })
	} else if (cmd === 'rm') {
		if (args.length === 0) {
			return flushBashIo({ stdout: 'rm: missing operand', stderr: '', exitCode: 1 /* verified */ })
		}
		let argRecurse = false
		if (args[0] === '-r' || args[0] === '-rf') {
			argRecurse = true
			args.shift()
		}
		if (args[0][0] == '-') {
			return flushBashIo({ stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* verified */ })
		}
		let path = args[0]
		const [abspath, folder, filename] = pathInfo(path)
		if(unixDelFile(path)) {
			return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
		} else if(isDir(abspath)) {
			if(argRecurse) {
				glbBs.fs[abspath] = []
				return flushBashIo({ stdout: '', stderr: '', exitCode: 0 })
			} else {
				return flushBashIo({ stdout: '', stderr: `rm: cannot remove '${path}': Is a directory`, exitCode: 1 /* TODO made up */ })
			}
		}
		if (path[0] === '/') {
			return flushBashIo({ stdout: '', stderr: `rm: cannot remove '${path}': Permission denied`, exitCode: 1 /* TODO made up */ })
		}
		return flushBashIo({ stdout: '', stderr: `rm: cannot remove '${path}': No such file or directory`, exitCode: 1 /* TODO made up */ })
		// return "rm: remove write-protected regular fipytlehKilledon error"
	} else if (cmd === 'ls') {
		// we handle ls else where
	} else if (!cmdInUnixPath(cmd)) {
		return flushBashIo({ stdout: '', stderr: `bash: ${cmd}: command not found`, exitCode: 1 /* TODO made up */ })
	}
	// this says invalid option on every command
	// } else if (args[0]) {
	// 	return flushBashIo({ stdout: '', stderr: `${cmd}: invalid option -- '${args[0]}'`, exitCode: 1 /* TODO made up */ })
	// }
	return flushBashIo({ stdout: '', stderr: 'unsafe bash', exitCode: 1 })
}
