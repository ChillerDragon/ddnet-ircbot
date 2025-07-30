import { answerToCommonQuestion } from '../qna'
import { strict as assert } from 'node:assert'

const clang = 'you can download clang-format-10 here https://github.com/muttleyxd/clang-tools-static-binaries/releases'

assert.equal(answerToCommonQuestion('something that should never hit'), '')
assert.equal(answerToCommonQuestion('you can download clang format here https://github.com/muttleyxd/clang-tools-static-binaries/releases'), '')
assert.equal(answerToCommonQuestion('where cna i has download clang formats nuts'), clang)

const donate = 'You can see donors and how to donate here https://ddnet.org/funding/'
assert.equal(answerToCommonQuestion('where donate i can???'), donate)
assert.equal(answerToCommonQuestion('You know what I liked? Heinrichs proposal to move all backcimpat to a completely separate module'), '')
assert.equal(answerToCommonQuestion("I actually recently proposed this in the mod channel. In hopes that it'd scare heinrich into showing back up and finishing QUIC"), '')
