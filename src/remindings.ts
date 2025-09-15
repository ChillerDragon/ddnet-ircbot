import { getRndInteger } from './naming_things_util_is_bad'

export class Reminding {
  // what to be reminded about
  message: string

  // user to be reminded
  remindee: string

  // when to be reminded
  remindDate: Date

  constructor (message: string, remindee: string, remindDate: Date) {
    this.message = message
    this.remindee = remindee
    this.remindDate = remindDate
  }
}

export let remindings: Reminding[] = []

export const checkRemindings = (say: (msg: string) => void) => {
  const now = new Date()
  let numDropped = 0
  const filteredRemindings = remindings.filter((reminding) => {
    const nowSecs = now.getTime()
    const remindSecs = reminding.remindDate.getTime()
    const remindInSeconds = Math.floor((remindSecs - nowSecs) / 1000)
    // console.log(`remind in=${remindInSeconds} now=${nowSecs} remindat=${remindSecs}`)
    if (remindInSeconds > 0) {
      return true
    }
    if (numDropped > 0) {
      return true
    }
    numDropped++
    const rigRng = getRndInteger(0, 10)
    if (rigRng === 0) {
      say(`omagawd @${reminding.remindee} I almost forgor to mind you about: ${reminding.message}`)
    } else if (rigRng === 1) {
      say(`ding dong ping pong @${reminding.remindee}  @${reminding.remindee} @${reminding.remindee} @${reminding.remindee}: ${reminding.message}`)
    } else if (rigRng === 2) {
      say(`yo @${reminding.remindee} keep in mind to: ${reminding.message}`)
    } else if (rigRng === 3) {
      say(`DO NOT FORGET @${reminding.remindee} TO: ${reminding.message}`)
    } else {
      say(`Elo @${reminding.remindee} I just wanted to remind you that: ${reminding.message}`)
    }
    return false
  })
  if (remindings.length !== filteredRemindings.length) {
    console.log(`popped ${remindings.length - filteredRemindings.length} remindings ..`)
    remindings = filteredRemindings
  }
}
