import { strict as assert } from 'node:assert'
import { getIssueUrls } from '../msg_matchers'

assert.deepEqual(getIssueUrls(''), [])
assert.deepEqual(getIssueUrls('no match'), [])
assert.deepEqual(getIssueUrls('#1'), ['https://github.com/ddnet/ddnet/issues/1'])
assert.deepEqual(getIssueUrls('#2'), ['https://github.com/ddnet/ddnet/issues/2'])
assert.deepEqual(getIssueUrls('#22'), ['https://github.com/ddnet/ddnet/issues/22'])
assert.deepEqual(getIssueUrls('#22, #33'), ['https://github.com/ddnet/ddnet/issues/22', 'https://github.com/ddnet/ddnet/issues/33'])
assert.deepEqual(getIssueUrls('#8912'), ['https://github.com/ddnet/ddnet/issues/8912'])
