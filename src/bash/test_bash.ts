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

let OKS = 0
glbBs.vars['PWD'] = '/home/pi/test'
console.log(pathInfo("..").join(',') === '/home/pi,/home,' ? OKS++ : pathInfo("..").join(','))
glbBs.vars['PWD'] = '/home/pi'
console.log(pathInfo(".").join(',') === '/home/pi,/home,' ? OKS++ : pathInfo(".").join(','))
//                                                      v this is wrong
console.log(pathInfo("~").join(',') === '/home/pi,/home,pi' ? OKS++ : pathInfo("~").join(','))
// console.log(pathInfo("~/").join(',') === '/home/pi,/home,' ? OKS++ : pathInfo("~/").join(','))
console.log(pathInfo("..").join(',') === '/home,/,' ? OKS++ : pathInfo("..").join(','))
console.log(pathInfo("foo").join(',') === '/home/pi/foo,/home/pi,foo' ? OKS++ : pathInfo("foo").join(','))
console.log(pathInfo("foo/bar").join(',') === '/home/pi/foo/bar,/home/pi/foo,bar' ? OKS++ : pathInfo("foo/bar").join(','))
console.log(pathInfo("foo/bar/baz.txt").join(',') === '/home/pi/foo/bar/baz.txt,/home/pi/foo/bar,baz.txt' ? OKS++ : pathInfo("foo/bar/baz.txt").join(','))
console.log(pathInfo("/").join(',') === '/,/,' ? OKS++ : pathInfo("/").join(','))
console.log(pathInfo("/tmp").join(',') === '/tmp,,tmp' ? OKS++ : pathInfo("/tmp").join(','))
console.log(pathInfo("/tmp/test.txt").join(',') === '/tmp/test.txt,/tmp,test.txt' ? OKS++ : pathInfo("/tmp/test.txt").join(','))
console.log(pathInfo("/tmp/ntested/test.txt").join(',') === '/tmp/ntested/test.txt,/tmp/ntested,test.txt' ? OKS++ : pathInfo("/tmp/ntested/test.txt").join(','))
console.log(pathInfo("/tmp/ntested/").join(',') === '/tmp/ntested,/tmp/ntested,' ? OKS++ : pathInfo("/tmp/ntested/").join(','))
