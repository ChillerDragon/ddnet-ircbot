import { strict as assert } from 'node:assert'
import { getIssueUrls, getMessageTextWithoutCodeSnippets } from '../msg_matchers'

assert.deepEqual(getIssueUrls(''), [])
assert.deepEqual(getIssueUrls('no match'), [])
assert.deepEqual(getIssueUrls('#1'), ['https://github.com/ddnet/ddnet/issues/1'])
assert.deepEqual(getIssueUrls('#2'), ['https://github.com/ddnet/ddnet/issues/2'])
assert.deepEqual(getIssueUrls('#22'), ['https://github.com/ddnet/ddnet/issues/22'])
assert.deepEqual(getIssueUrls('#22, #33'), ['https://github.com/ddnet/ddnet/issues/22', 'https://github.com/ddnet/ddnet/issues/33'])
assert.deepEqual(getIssueUrls('#8912'), ['https://github.com/ddnet/ddnet/issues/8912'])
assert.deepEqual(getIssueUrls('rust#43'), ['https://github.com/ddnet/ddnet-rs/issues/43'])
assert.deepEqual(getIssueUrls('poggers#44'), ['https://github.com/ddnet/ddnet/issues/44'])
assert.deepEqual(getIssueUrls('ddnet#444'), ['https://github.com/ddnet/ddnet/issues/444'])
assert.deepEqual(getIssueUrls('tclient#42'), ['https://github.com/sjrc6/TaterClient-ddnet/issues/42'])
assert.deepEqual(getIssueUrls('xxxxxtclient#42'), ['https://github.com/ddnet/ddnet/issues/42'])
assert.deepEqual(getIssueUrls(' #42 rs#7 tc#3'), ['https://github.com/ddnet/ddnet/issues/42', 'https://github.com/ddnet/ddnet-rs/issues/7', 'https://github.com/sjrc6/TaterClient-ddnet/issues/3'])

assert.deepEqual(getMessageTextWithoutCodeSnippets('hello world'), ['hello world'])
assert.deepEqual(getMessageTextWithoutCodeSnippets('hi devs ``int a = 2;`` waddup'), ['hi devs ', ' waddup'])
assert.deepEqual(getMessageTextWithoutCodeSnippets('nested ```  deez` nuts ``` nice'), ['nested ', ' nice'])
assert.deepEqual(getMessageTextWithoutCodeSnippets('missing ``` close'), ['missing ', '``` close'])
assert.deepEqual(getMessageTextWithoutCodeSnippets('develop``er``a'), ['develop', 'a'])
assert.deepEqual(getMessageTextWithoutCodeSnippets('don`t'), ['don', '`t'])

assert.deepEqual(getIssueUrls('#1 ``#2`` #3'), ['https://github.com/ddnet/ddnet/issues/1', 'https://github.com/ddnet/ddnet/issues/3'])
