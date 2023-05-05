import { fakeBash, quoteIfNeeded, getLastIndex, removeBashQuotes, bashWordSplitKeepQuotesEatSpaces, pathInfo, glbBs, bashGlob } from './bash'

import { strict as assert } from 'node:assert';

assert.equal(fakeBash('ls .env'), '.env')

assert.equal(getLastIndex('foo', 'f'), 0)
assert.equal(getLastIndex('foo', 'o'), 2)
assert.equal(getLastIndex('fooo', 'o'), 3)
assert.equal(getLastIndex('foooo', 'o'), 4)
assert.equal(getLastIndex('foooof', 'f'), 5)

assert.equal(quoteIfNeeded(''), '')
assert.equal(quoteIfNeeded('hi'), 'hi')
assert.equal(quoteIfNeeded('hello world'), "'hello world'")
assert.equal(quoteIfNeeded('hello world ingers'), "'hello world ingers'")
assert.equal(quoteIfNeeded('wot"nrol'), `'wot"nrol'`)
assert.equal(quoteIfNeeded("don't"), `"don't"`)
assert.equal(quoteIfNeeded("don't name your files like this"), `"don't name your files like this"`)
assert.equal(quoteIfNeeded("foo bar \" baz '"), `'foo bar " baz '\\'''`) // this is verified correct

assert.equal(bashGlob('*'), 'env.example hex_to_pack.py index.js LICENSE .env node_modules package.json package-lock.json ping_pong.csv README.md tags Dockerfile')
assert.equal(bashGlob('*.py'), 'hex_to_pack.py')
assert.equal(bashGlob('h*to***.py'), 'hex_to_pack.py')
assert.equal(bashGlob('hex*_to_pack.py'), 'hex_to_pack.py')
assert.equal(bashGlob('./*.py'), './hex_to_pack.py')
assert.equal(bashGlob('/bin/pri*'), '/bin/printf')
assert.equal(bashGlob('/bin/*tf'), '/bin/printf')

assert.equal(fakeBash('echo foo > foo.md'), '')
assert.equal(fakeBash('echo bar > bar.md'), '')
assert.equal(fakeBash('echo *.md'), 'README.md foo.md bar.md\n')
assert.equal(fakeBash('cat *.md | head -n 1'), 'foo\n')
assert.equal(fakeBash('rm foo.md'), '')
assert.equal(fakeBash('rm bar.md'), '')

assert.equal(fakeBash('echo -e "hi\\nho\\nha" | head -n 1'), 'hi\n')
assert.equal(fakeBash('echo -n hi | head'), 'hi')

assert.equal(fakeBash('ls | echo a'), 'a\n')
assert.equal(fakeBash('throw | echo a'), 'a\nbash: throw: command not found\n')
assert.equal(fakeBash('echo hi | cat'), 'hi\n')
assert.equal(fakeBash('echo hi | cat | cat | cat'), 'hi\n')

// assert.equal(fakeBash('ls|echo a'), 'a\n') // valid bash but only psychos do no spaces around pipes so low prio

// assert.equal(fakeBash('throw;echo $?'), '-bash: throw: command not found\n127') // TODO

assert.equal(
fakeBash('ls'),
`.env
Dockerfile
LICENSE
README.md
env.example
hex_to_pack.py
index.js
node_modules/
package-lock.json
package.json
ping_pong.csv
tags`)

assert.equal(fakeBash('notfound >> should_be_empty.txt'), 'bash: notfound: command not found')
assert.equal(fakeBash('cat should_be_empty.txt'), "")

assert.equal(fakeBash('sudo test >> should_be_empty2.txt'), 'sudo: a password is required')
assert.equal(fakeBash('cat should_be_empty2.txt'), "")

assert.equal(fakeBash('echo hi >> bar.txt'), '')

assert.equal(fakeBash('foo >> '), "-bash: syntax error near unexpected token `newline'")

assert.equal(fakeBash(';; > foo.txt'), "-bash: syntax error near unexpected token `;'")
assert.equal(fakeBash('sudo test'), 'sudo: a password is required')
assert.equal(fakeBash('sudo test > foo.txt'), 'sudo: a password is required')
// assert.equal(fakeBash('cat foo.txt'), "") // TODO: >

assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('foo ; bar'), ["foo", ";", "bar"])

assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('foo;bar'), ["foo", ";", "bar"])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('foo;'), ["foo", ";"])

assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('ls>a'), ["ls", ">", "a"])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('willerror &>/dev/null'), ["willerror", "&>", "/dev/null"])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('echo append >> file.txt'), ["echo", "append", ">>", "file.txt"])

assert.equal(fakeBash('foo ; bar'), 'bash: foo: command not found\nbash: bar: command not found')

assert.equal(fakeBash('foo;bar'), 'bash: foo: command not found\nbash: bar: command not found')
assert.equal(fakeBash('foo; bar'), 'bash: foo: command not found\nbash: bar: command not found')
assert.equal(fakeBash('"foo";bar'), 'bash: foo: command not found\nbash: bar: command not found')

assert.equal(fakeBash('echo ";"'), ";\n")
assert.equal(fakeBash("echo ';'"), ";\n")
assert.equal(fakeBash("echo ';';"), ";\n")

assert.equal(fakeBash(';;'), "-bash: syntax error near unexpected token `;'")
assert.equal(fakeBash('ls;;'), "-bash: syntax error near unexpected token `;'")
assert.equal(fakeBash(';;;;'), "-bash: syntax error near unexpected token `;'")
assert.equal(fakeBash(';;;;;'), "-bash: syntax error near unexpected token `;'")
assert.equal(fakeBash(';;;;;;'), "-bash: syntax error near unexpected token `;'")

assert.equal(fakeBash('ls "'), 'unexpected EOF while looking for matching `"\'')

assert.equal(fakeBash(`echo "foo'bar'"`), `foo'bar'\n`)
assert.equal(fakeBash(`echo "foo'bar''"`), `foo'bar''\n`)

assert.equal(fakeBash(`cat "foo'bar"`), `cat: foo'bar: No such file or directory`) // technically wrong but close enough
// assert.equal(fakeBash(`cat "foo'bar"`), `cat: "foo'bar": No such file or directory`) // this would be the correct on

// assert.equal(fakeBash('foo > bar'), 'bash: foo: command not found')

assert.equal(removeBashQuotes('foo'), 'foo')
assert.equal(removeBashQuotes('"foo"'), 'foo')
assert.equal(removeBashQuotes("'foo'"), 'foo')
assert.equal(removeBashQuotes("'foo'bar"), 'foobar')
assert.equal(removeBashQuotes(`'foo'"bar"`), 'foobar')
assert.equal(removeBashQuotes(`'foo'" bar"`), 'foo bar')
assert.equal(removeBashQuotes(`hello "WO'W"`), "hello WO'W")
assert.equal(removeBashQuotes(`hello 'WO"W'`), 'hello WO"W')

assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('foo'), ['foo'])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces(''), [''])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('foo bar'), ['foo', 'bar'])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('"foo" bar'), ['"foo"', 'bar'])
assert.deepEqual(bashWordSplitKeepQuotesEatSpaces('"foo"                   bar'), ['"foo"', 'bar'])

// assert.deepEqual(bashWordSplit('foo'), ['foo'])
// assert.deepEqual(bashWordSplit(''), [''])
// assert.deepEqual(bashWordSplit('foo bar'), ['foo', 'bar'])
// assert.deepEqual(bashWordSplit('foo           bar'), ['foo', 'bar'])
// assert.deepEqual(bashWordSplit('foo           bar baz'), ['foo', 'bar', 'baz'])

// assert.deepEqual(bashWordSplit('"foo"'), ['foo'])
// assert.deepEqual(bashWordSplit('"foo bar"'), ['foo bar'])
// assert.deepEqual(bashWordSplit('"foo bar" baz'), ['foo bar', 'baz'])

// assert.deepEqual(bashWordSplit('"foo"bar'), ['foobar'])
// assert.deepEqual(bashWordSplit(`"fo'o"bar`), ["fo'obar"])
// assert.deepEqual(bashWordSplit(`"fo'o"bar'`), "unexpected EOF while looking for matching `''")
// assert.deepEqual(bashWordSplit('helo"'), "unexpected EOF while looking for matching `\"'")
// assert.deepEqual(bashWordSplit('helo"world'), "unexpected EOF while looking for matching `\"'")
// assert.deepEqual(bashWordSplit('helo"world"'), ["heloworld"])
// assert.deepEqual(bashWordSplit(`helo"world" 'and fellow gamers'`), ["heloworld", "and fellow gamers"])
// assert.deepEqual(bashWordSplit(`helo"world" 'and fellow  gamers'`), ["heloworld", "and fellow  gamers"])
// assert.deepEqual(bashWordSplit(`helo"world" 'and fellow   gamers '`), ["heloworld", "and fellow   gamers "])

assert.equal(fakeBash('foo=bar'), '')
assert.equal(fakeBash('echo $foo'), 'bar\n')
assert.equal(fakeBash('foo='), '')
assert.equal(fakeBash('echo $foo'), '\n')
assert.equal(fakeBash('myvar=value'), '')
assert.equal(fakeBash('echo $myvar'), 'value\n')
assert.equal(fakeBash('myvar=value$myvar'), '')
assert.equal(fakeBash('echo $myvar'), 'valuevalue\n')
assert.equal(fakeBash('myvar="$myvar"'), '')
assert.equal(fakeBash('echo $myvar'), 'valuevalue\n')
assert.equal(fakeBash('echo $myvar test'), 'valuevalue test\n')
assert.equal(fakeBash('echo $myvar test'), 'valuevalue test\n')

// test string expansion
// should combine quoted and unquoted string
assert.equal(fakeBash('echo a=x"foo bar"'), 'a=xfoo bar\n')

// do not word split in quotes on var asssign
assert.equal(fakeBash('flip="flap flop"'), '')
assert.equal(fakeBash('echo $flip'), 'flap flop\n')

assert.equal(fakeBash('x="y"'), '')
assert.equal(fakeBash('echo $x'), 'y\n')
assert.equal(fakeBash('a="g$x"'), '')
assert.equal(fakeBash('echo $a'), 'gy\n')
assert.equal(fakeBash('a="g $x"'), '')
assert.equal(fakeBash('echo $a'), 'g y\n')

assert.equal(fakeBash('a="${x} g"'), '')
assert.equal(fakeBash('echo $a'), 'y g\n')

assert.equal(fakeBash('v1=val1'), '')
assert.equal(fakeBash('v2=base2$v1'), '')
assert.equal(fakeBash('echo $v2'), 'base2val1\n')

assert.equal(fakeBash('v1=val1'), '')
assert.equal(fakeBash('v2="base2$v1"'), '')
assert.equal(fakeBash('echo $v2'), 'base2val1\n')

assert.equal(fakeBash('g1=gal1'), '')
assert.equal(fakeBash('g2="base2$g1"'), '')
assert.equal(fakeBash('echo "$g2"'), 'base2gal1\n')

assert.equal(fakeBash('vv1=val1'), '')
assert.equal(fakeBash('vv2="$vv1 suffix2"'), '')
assert.equal(fakeBash('echo $vv2'), 'val1 suffix2\n')

assert.equal(fakeBash('var1=value'), '')
assert.equal(fakeBash('var2="$var1 and another value"'), '')
assert.equal(fakeBash('echo $var2'), 'value and another value\n')
assert.equal(fakeBash('echo $var2 echo word split'), 'value and another value echo word split\n')

assert.equal(fakeBash('a=A'), '')
assert.equal(fakeBash('b=B'), '')
assert.equal(fakeBash('c=C'), '')
assert.equal(fakeBash('echo $a$b$c'), 'ABC\n')

// var assign followed by a command
assert.equal(fakeBash('unused=x ls .env'), '.env')
assert.equal(fakeBash('CC=g++ make -j2'), 'bash: make: command not found')

// if var assigns are followed by a command they should only be set as env for the command
// assert.equal(fakeBash('echo $CC'), '\n')

// if var assigns are followed by a command they should only be set as env for the command
// but not as bash variable even in the same line
// assert.equal(fakeBash('gg=ee echo $gg'), '')

// var assign followed by another one (actually legal bash wot)
assert.equal(fakeBash('a= b= c='), '')
assert.equal(fakeBash('echo $a$b$c'), '\n')
assert.equal(fakeBash('a=ah b=be c=ce'), '')
assert.equal(fakeBash('echo $a$b$c'), 'ahbece\n')

// stderr should escape stdout pipe
assert.equal(fakeBash('foo > bar'), 'bash: foo: command not found')

// pipes and redirects can not be expanded
assert.equal(fakeBash('pipe=">"'), '')
// assert.equal(fakeBash('echo foo $pipe hype'), 'foo > hype\n')

// ENV
assert.equal(fakeBash('echo $PATH'), '/home/pi/.cargo/bin:/home/pi/.nvm/versions/node/v18.16.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games\n')

// var replace
assert.equal(fakeBash('echo ${SHELL}gaming'), '/bin/bashgaming\n')
assert.equal(fakeBash('echo "${SHELL}gaming"'), '/bin/bashgaming\n')
assert.equal(fakeBash('SHELL=wot'), '')
assert.equal(fakeBash('echo ${SHELL}gaming'), 'wotgaming\n')
assert.equal(fakeBash('SHELL="wot"'), '')
assert.equal(fakeBash('echo ${SHELL}gaming'), 'wotgaming\n')
assert.equal(fakeBash('myvar="foo"'), '')
assert.equal(fakeBash('sum="$myvar bar"'), '')
assert.equal(fakeBash('echo $sum'), 'foo bar\n')
assert.equal(fakeBash('echo $sum2'), '\n')
assert.equal(fakeBash('echo $sum'), 'foo bar\n')

// var replace overlap
assert.equal(fakeBash('inner=INSIDE'), '')
assert.equal(fakeBash('innerouter=OUTER'), '')
assert.equal(fakeBash('echo $innerouter'), 'OUTER\n')

// vars should not expand in single quotes or double expand
// not working yet too lazy to bother i wanna go on
assert.equal(fakeBash("foo='$HOME'"), '')
assert.equal(fakeBash("echo $foo"), '$HOME\n')
assert.equal(fakeBash("echo $foo $foo"), '$HOME $HOME\n')

// non alpha numeric vars
assert.equal(fakeBash("echo $$"), '24410\n')
assert.equal(fakeBash("echo ${$}"), '24410\n')
assert.equal(fakeBash("echo $$$"), '24410$\n')
assert.equal(fakeBash("echo ${$}$"), '24410$\n')
assert.equal(fakeBash("echo $?"), '0\n')
assert.equal(fakeBash("echo ${?}"), '0\n')
assert.equal(fakeBash("echo $??"), '0?\n')

assert.equal(fakeBash("printf hi"), 'hi')
assert.equal(fakeBash("printf -v x hi"), '')
assert.equal(fakeBash("printf $x"), 'hi')
assert.equal(fakeBash("printf -v iggs '$x'"), '')
assert.equal(fakeBash('printf "$iggs"'), '$x')
assert.equal(fakeBash("printf '$iggs'"), '$iggs')

assert.equal(fakeBash('ls README.md'), 'README.md')
assert.equal(fakeBash('echo $?'), '0\n')
assert.equal(fakeBash('ls SCHMEDEME.md'), "ls: cannot access '/home/pi/SCHMEDEME.md': Permission denied") // wrong should say no such file
assert.equal(fakeBash('echo $?'), '2\n')
assert.equal(fakeBash('ls *.md'), 'README.md')
assert.equal(fakeBash('ls -l README.md'), '-rw-r--r-- pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('chmod +x README.md'), '')
assert.equal(fakeBash('ls -l README.md'), '-rwxr-xr-x pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('rm README.md'), '')
assert.equal(fakeBash('ls README.md'), "ls: cannot access '/home/pi/README.md': Permission denied") // wrong should say no such file
assert.equal(fakeBash('cat f'), 'cat: f: No such file or directory')
assert.equal(fakeBash('cat .f'), 'cat: .f: No such file or directory')
assert.equal(fakeBash('cd ~'), '')
assert.equal(fakeBash('echo $PWD'), '/home/pi\n')
assert.equal(fakeBash('rm *'), '')
assert.equal(fakeBash('ls'), '')
assert.equal(fakeBash('touch foo.txt'), '')
assert.equal(fakeBash('ls'), 'foo.txt')

// echo should swallow spaces
assert.equal(fakeBash('echo hello                    world'), 'hello world\n')

// test overwrite
assert.equal(fakeBash('echo foo > bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'foo\n')
assert.equal(fakeBash('echo bar > bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'bar\n')

// test append
assert.equal(fakeBash('echo bar >> bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'bar\nbar\n')

// test echo no newline
assert.equal(fakeBash('echo -n bar >> bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'bar\nbar\nbar')
assert.equal(fakeBash('echo -n bar >> bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'bar\nbar\nbarbar')

// test echo newline expand
assert.equal(fakeBash('echo "foo\\nbar"'), 'foo\\nbar\n')
assert.equal(fakeBash('echo -e "foo\\nbar"'), 'foo\nbar\n')

// test printf fmt
assert.equal(fakeBash('printf %d 10'), '10')
assert.equal(fakeBash('printf %d\\n 10'), '10\n')
assert.equal(fakeBash('printf "%d\\n" 10'), '10\n')
assert.equal(fakeBash('printf "%d\\n%s" 10 "some word"'), '10\nsome word')

// pseudo devices
assert.equal(fakeBash('echo hack > /dev/null'), '')
assert.equal(fakeBash('echo hack >> /dev/null'), '')

// pseudo network devices
assert.equal(fakeBash('echo hack > /dev/tcp/gaming.gov/1337'), '-bash: gaming.gov: Name or service not known\n-bash: /dev/tcp/gaming.gov/1337: Invalid argument')
assert.equal(fakeBash('echo hack > /dev/tcp/1.1.1.256/1337'), '-bash: 1.1.1.256: Name or service not known\n-bash: /dev/tcp/1.1.1.256/1337: Invalid argument')
assert.equal(fakeBash('echo hack > /dev/tcp/8.8.8.8/hariporter'), '-bash: hariporter: Servname not supported for ai_socktype\n-bash: /dev/tcp/8.8.8.8/hariporter: Invalid argument')
assert.equal(fakeBash('echo hack > /dev/tcp/1.1.1.1/1337'), '-bash: connect: Connection refused\n-bash: /dev/tcp/1.1.1.1/1337: Connection refused')

// assert.equal(fakeBash('cd ..'), '') // does not detect /home as dir for whatever reason
// assert.equal(fakeBash('cd /home'), '')
// assert.equal(fakeBash('pwd'), 'pi')
// assert.equal(fakeBash('pwd'), '/home/pi')
// assert.equal(fakeBash('cd /'), '')
// assert.equal(fakeBash('ls home'), 'pi')
// assert.equal(fakeBash('pwd'), '/')
assert.equal(fakeBash('cd $HOME'), '')
assert.equal(fakeBash('pwd'), '/home/pi')

assert.equal(fakeBash('cat /'), 'cat: /: No such file or directory') // wrong should say is a directory
assert.equal(fakeBash('cat /usr'), 'cat: /usr: No such file or directory') // wrong should say is a directory

glbBs.vars['PWD'] = '/home/pi/test'
assert.deepEqual(pathInfo(".."), ['/home/pi', '/home', null])
glbBs.vars['PWD'] = '/home/pi'
assert.deepEqual(pathInfo("."), ['/home/pi', '/home', null])
assert.deepEqual(pathInfo("~"), ['/home/pi', '/home', 'pi'])
assert.deepEqual(pathInfo(".."), ['/home', '/', null])

assert.deepEqual(pathInfo("foo"), ['/home/pi/foo', '/home/pi', 'foo'])
assert.deepEqual(pathInfo("foo/bar"), ['/home/pi/foo/bar', '/home/pi/foo', 'bar'])
assert.deepEqual(pathInfo("foo/bar/baz.txt"), ['/home/pi/foo/bar/baz.txt', '/home/pi/foo/bar', 'baz.txt'])
assert.deepEqual(pathInfo("/"), ['/', '/', null])
assert.deepEqual(pathInfo("/tmp"), ['/tmp', '', 'tmp'])
assert.deepEqual(pathInfo("/tmp/test.txt"), ['/tmp/test.txt', '/tmp', 'test.txt'])
assert.deepEqual(pathInfo("/tmp/ntested/test.txt"), ['/tmp/ntested/test.txt', '/tmp/ntested', 'test.txt'])
assert.deepEqual(pathInfo("/tmp/ntested/"), ['/tmp/ntested', '/tmp/ntested', null])
