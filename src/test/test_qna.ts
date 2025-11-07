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

const score = 'to show points instead of time in the scoreboard remove this line https://github.com/ddnet/ddnet/blob/a9c316055f5d2579f6166152ec20c4241e0da456/src/game/server/gamecontroller.cpp#L600'
assert.equal(answerToCommonQuestion("Hi how to change Time to Score only on server side I changed every m_Score in player.cpp and removed all Time stuff and it's still showing Time not Score. I know that in DM, CTF, TDM it's showing SCORE but I need to leave DDRace game type."), score)
assert.equal(answerToCommonQuestion('how can i show scores instead of time in my server ?'), score)
assert.equal(answerToCommonQuestion('help i need to change tab score to numbers!'), score)
assert.equal(answerToCommonQuestion('!score'), score)
assert.equal(answerToCommonQuestion('i scored free food today'), '')
assert.equal(answerToCommonQuestion('should CPlayer::m_Score really be an std::optional????'), '')
assert.equal(answerToCommonQuestion('whats the score?'), '')
assert.equal(answerToCommonQuestion('how do i score?'), '')

const host = 'you can see the hosting providers ddnet uses here: https://github.com/ddnet/ddnet-web/blob/master/www/_includes/funding.html'
assert.equal(answerToCommonQuestion('does anybody know which provider ddnet uses in brazil? I am looking if I can get a server there'), host)
