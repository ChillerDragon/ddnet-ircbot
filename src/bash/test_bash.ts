import { fakeBash, pathInfo, glbBs } from './bash'

import { strict as assert } from 'node:assert';

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

assert.equal(fakeBash('ls README.md'), 'README.md')
assert.equal(fakeBash('ls *.md'), 'README.md')
assert.equal(fakeBash('ls -l README.md'), '-rw-r--r-- pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('chmod +x README.md'), '')
assert.equal(fakeBash('ls -l README.md'), '-rwxr-xr-x pi pi Apr 30 10:10 README.md')
assert.equal(fakeBash('rm README.md'), '')
assert.equal(fakeBash('ls README.md'), "ls: cannot access '/home/pi/README.md': Permission denied") // wrong should say no such file
assert.equal(fakeBash('cat f'), 'cat: f: No such file or directory')
assert.equal(fakeBash('cat .f'), 'cat: .f: No such file or directory')

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
