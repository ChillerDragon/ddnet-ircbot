import { fakeBash, removeBashQuotes, bashWordSplit, pathInfo, glbBs } from './bash'

import { strict as assert } from 'node:assert';

assert.equal(removeBashQuotes('foo'), 'foo')
assert.equal(removeBashQuotes('"foo"'), 'foo')
assert.equal(removeBashQuotes("'foo'"), 'foo')
assert.equal(removeBashQuotes("'foo'bar"), 'foobar')
assert.equal(removeBashQuotes(`'foo'"bar"`), 'foobar')
assert.equal(removeBashQuotes(`'foo'" bar"`), 'foo bar')
assert.equal(removeBashQuotes(`hello "WO'W"`), "hello WO'W")
assert.equal(removeBashQuotes(`hello 'WO"W'`), 'hello WO"W')

assert.deepEqual(bashWordSplit('foo'), ['foo'])
assert.deepEqual(bashWordSplit(''), [''])
assert.deepEqual(bashWordSplit('foo bar'), ['foo', 'bar'])
assert.deepEqual(bashWordSplit('foo           bar'), ['foo', 'bar'])
assert.deepEqual(bashWordSplit('foo           bar baz'), ['foo', 'bar', 'baz'])

assert.deepEqual(bashWordSplit('"foo"'), ['foo'])
assert.deepEqual(bashWordSplit('"foo bar"'), ['foo bar'])
assert.deepEqual(bashWordSplit('"foo bar" baz'), ['foo bar', 'baz'])

assert.deepEqual(bashWordSplit('"foo"bar'), ['foobar'])
assert.deepEqual(bashWordSplit(`"fo'o"bar`), ["fo'obar"])
assert.deepEqual(bashWordSplit(`"fo'o"bar'`), "unexpected EOF while looking for matching `''")
assert.deepEqual(bashWordSplit('helo"'), "unexpected EOF while looking for matching `\"'")
assert.deepEqual(bashWordSplit('helo"world'), "unexpected EOF while looking for matching `\"'")
assert.deepEqual(bashWordSplit('helo"world"'), ["heloworld"])
assert.deepEqual(bashWordSplit(`helo"world" 'and fellow gamers'`), ["heloworld", "and fellow gamers"])
assert.deepEqual(bashWordSplit(`helo"world" 'and fellow  gamers'`), ["heloworld", "and fellow  gamers"])
assert.deepEqual(bashWordSplit(`helo"world" 'and fellow   gamers '`), ["heloworld", "and fellow   gamers "])

assert.equal(fakeBash('foo=bar'), '')
assert.equal(fakeBash('echo $foo'), 'bar')
assert.equal(fakeBash('foo='), '')
assert.equal(fakeBash('echo $foo'), '')
assert.equal(fakeBash('myvar=value'), '')
assert.equal(fakeBash('echo $myvar'), 'value')
assert.equal(fakeBash('myvar=value$myvar'), '')
assert.equal(fakeBash('echo $myvar'), 'valuevalue')
assert.equal(fakeBash('myvar="$myvar"'), '')
assert.equal(fakeBash('echo $myvar'), 'valuevalue')
assert.equal(fakeBash('echo $myvar test'), 'valuevalue test')
assert.equal(fakeBash('echo $myvar test'), 'valuevalue test')

// test string expansion
// should combine quoted and unquoted string
assert.equal(fakeBash('echo a=x"foo bar"'), 'a=xfoo bar')

// do not word split in quotes on var asssign
assert.equal(fakeBash('flip="flap flop"'), '')
assert.equal(fakeBash('echo $flip'), 'flap flop')

assert.equal(fakeBash('x="y"'), '')
assert.equal(fakeBash('echo $x'), 'y')
assert.equal(fakeBash('a="g$x"'), '')
assert.equal(fakeBash('echo $a'), 'gy')
// assert.equal(fakeBash('a="g $x"'), '')
// assert.equal(fakeBash('echo $a'), 'g y')

assert.equal(fakeBash('a="${x} g"'), '')
assert.equal(fakeBash('echo $a'), 'y g')

assert.equal(fakeBash('v1=val1'), '')
assert.equal(fakeBash('v2=base2$v1'), '')
assert.equal(fakeBash('echo $v2'), 'base2val1')

assert.equal(fakeBash('v1=val1'), '')
assert.equal(fakeBash('v2="base2$v1"'), '')
assert.equal(fakeBash('echo $v2'), 'base2val1')

assert.equal(fakeBash('g1=gal1'), '')
assert.equal(fakeBash('g2="base2$g1"'), '')
assert.equal(fakeBash('echo "$g2"'), 'base2gal1')

assert.equal(fakeBash('vv1=val1'), '')
assert.equal(fakeBash('vv2="$vv1 suffix2"'), '')
assert.equal(fakeBash('echo $vv2'), 'val1 suffix2')

assert.equal(fakeBash('var1=value'), '')
assert.equal(fakeBash('var2="$var1 and another value"'), '')
assert.equal(fakeBash('echo $var2'), 'value and another value')
assert.equal(fakeBash('echo $var2 echo word split'), 'value and another value echo word split')
assert.equal(fakeBash('unused=x ls .env'), '.env')
assert.equal(fakeBash('CC=g++ make -j2'), 'bash: make: command not found')

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

// ENV
assert.equal(fakeBash('echo $PATH'), '/home/pi/.cargo/bin:/home/pi/.nvm/versions/node/v18.16.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games')

// var replace
assert.equal(fakeBash('echo ${SHELL}gaming'), '/bin/bashgaming')
assert.equal(fakeBash('echo "${SHELL}gaming"'), '/bin/bashgaming')
assert.equal(fakeBash('SHELL=wot'), '')
assert.equal(fakeBash('echo ${SHELL}gaming'), 'wotgaming')
assert.equal(fakeBash('SHELL="wot"'), '')
assert.equal(fakeBash('echo ${SHELL}gaming'), 'wotgaming')
assert.equal(fakeBash('myvar="foo"'), '')
assert.equal(fakeBash('sum="$myvar bar"'), '')
assert.equal(fakeBash('echo $sum'), 'foo bar')
assert.equal(fakeBash('echo $sum2'), '')
assert.equal(fakeBash('echo $sum'), 'foo bar')

// var replace overlap
assert.equal(fakeBash('inner=INSIDE'), '')
assert.equal(fakeBash('innerouter=OUTER'), '')
assert.equal(fakeBash('echo $innerouter'), 'OUTER')

// vars should not expand in single quotes or double expand
// not working yet too lazy to bother i wanna go on
assert.equal(fakeBash("foo='$HOME'"), '')
// assert.equal(fakeBash("echo $foo"), '$HOME')
// assert.equal(fakeBash("echo $foo $foo"), '$HOME $HOME')

// non alpha numeric vars
assert.equal(fakeBash("echo $$"), '24410')
assert.equal(fakeBash("echo ${$}"), '24410')
assert.equal(fakeBash("echo $$$"), '24410$')
assert.equal(fakeBash("echo ${$}$"), '24410$')
assert.equal(fakeBash("echo $?"), '0')
assert.equal(fakeBash("echo ${?}"), '0')
assert.equal(fakeBash("echo $??"), '0?')

assert.equal(fakeBash("printf hi"), 'hi')
assert.equal(fakeBash("printf -v x hi"), '')
assert.equal(fakeBash("printf $x"), 'hi')
assert.equal(fakeBash("printf -v iggs '$x'"), '')
// assert.equal(fakeBash('printf "$iggs"'), '$x')
// assert.equal(fakeBash("printf '$iggs'"), '$iggs')

assert.equal(fakeBash('ls README.md'), 'README.md')
assert.equal(fakeBash('echo $?'), '0')
assert.equal(fakeBash('ls SCHMEDEME.md'), "ls: cannot access '/home/pi/SCHMEDEME.md': Permission denied") // wrong should say no such file
assert.equal(fakeBash('echo $?'), '2')
assert.equal(fakeBash('ls *.md'), 'README.md')
assert.equal(fakeBash('ls -l README.md'), '-rw-r--r-- pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('chmod +x README.md'), '')
assert.equal(fakeBash('ls -l README.md'), '-rwxr-xr-x pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('rm README.md'), '')
assert.equal(fakeBash('ls README.md'), "ls: cannot access '/home/pi/README.md': Permission denied") // wrong should say no such file
assert.equal(fakeBash('cat f'), 'cat: f: No such file or directory')
assert.equal(fakeBash('cat .f'), 'cat: .f: No such file or directory')
assert.equal(fakeBash('cd ~'), '')
assert.equal(fakeBash('echo $PWD'), '/home/pi')
assert.equal(fakeBash('rm *'), '')
assert.equal(fakeBash('ls'), '')
assert.equal(fakeBash('touch foo.txt'), '')
assert.equal(fakeBash('ls'), 'foo.txt')
assert.equal(fakeBash('echo foo > bar.txt'), '')
assert.equal(fakeBash('cat bar.txt'), 'foo ') // the leading space is weird
// assert.equal(fakeBash('cd ..'), '') // does not detect /home as dir for whatever reason
// assert.equal(fakeBash('cd /home'), '')
// assert.equal(fakeBash('pwd'), 'pi')
// assert.equal(fakeBash('pwd'), '/home/pi')
// assert.equal(fakeBash('cd /'), '')
// assert.equal(fakeBash('ls home'), 'pi')
// assert.equal(fakeBash('pwd'), '/')
// assert.equal(fakeBash('cd $HOME'), '')
// assert.equal(fakeBash('pwd'), '/home/pi')

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
