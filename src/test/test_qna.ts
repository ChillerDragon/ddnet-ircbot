import { answerToCommonQuestion } from '../qna'
import { strict as assert } from 'node:assert'

const clang = 'you can download clang-format-10 here https://github.com/muttleyxd/clang-tools-static-binaries/releases'

assert.equal('', answerToCommonQuestion('something that should never hit'))
assert.equal('', answerToCommonQuestion('you can download clang format here https://github.com/muttleyxd/clang-tools-static-binaries/releases'))
assert.equal(clang, answerToCommonQuestion('where cna i has download clang formats nuts'))
