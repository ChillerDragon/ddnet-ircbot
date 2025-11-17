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

// const score = 'to show points instead of time in the scoreboard remove this line https://github.com/ddnet/ddnet/blob/a9c316055f5d2579f6166152ec20c4241e0da456/src/game/server/gamecontroller.cpp#L600'
// assert.equal(answerToCommonQuestion("Hi how to change Time to Score only on server side I changed every m_Score in player.cpp and removed all Time stuff and it's still showing Time not Score. I know that in DM, CTF, TDM it's showing SCORE but I need to leave DDRace game type."), score)
// assert.equal(answerToCommonQuestion('how can i show scores instead of time in my server ?'), score)
// assert.equal(answerToCommonQuestion('help i need to change tab score to numbers!'), score)
// assert.equal(answerToCommonQuestion('!score'), score)
// assert.equal(answerToCommonQuestion('i scored free food today'), '')
// assert.equal(answerToCommonQuestion('should CPlayer::m_Score really be an std::optional????'), '')
// assert.equal(answerToCommonQuestion('whats the score?'), '')
// assert.equal(answerToCommonQuestion('how do i score?'), '')
// assert.equal(answerToCommonQuestion('i would like to use showhud_score but only for my own time'), '')
// // assert.equal(answerToCommonQuestion("@robyt3 I am currently working through the scoreboard, can you explain to me why the score / time gets an y value of Row.y + (Row.h - FontSize) / 2.0f for the TextRender()->Text( function? I don't get how this aligns anything"), '')
// // assert.equal(answerToCommonQuestion('did you see how simple the scoreboard is rn?'), '')

const host = 'you can see the hosting providers ddnet uses here: https://github.com/ddnet/ddnet-web/blob/master/www/_includes/funding.html'
assert.equal(answerToCommonQuestion('does anybody know which provider ddnet uses in brazil? I am looking if I can get a server there'), host)

const ask = 'Any coding or ddnet related questions are welcome here, just ask. See https://dontasktoask.com/ for more info'
assert.equal(answerToCommonQuestion('i have question'), ask)
assert.equal(answerToCommonQuestion('can I ask a question here?'), ask)
assert.equal(answerToCommonQuestion('i have question how ddnet work'), '')
assert.equal(answerToCommonQuestion('i have question on how to make mod'), '')
assert.equal(answerToCommonQuestion('i have question on how to get unban'), '')
assert.equal(answerToCommonQuestion('i have question: how compile ddnet'), '')
assert.equal(answerToCommonQuestion('i have question: how run server'), '')
