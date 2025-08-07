export class Reminding {
  // what to be reminded about
  message: string

  // user to be reminded
  remindee: string

  // when to be reminded
  remindDate: Date

  constructor(message: string, remindee: string, remindDate: Date) {
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
    const remindInSeconds = reminding.remindDate.getSeconds() - now.getSeconds()
    // console.log(`remind in seconds: ${remindInSeconds}`)
    if(remindInSeconds > 0) {
      return true
    }
    if(numDropped > 0) {
      return true
    }
    numDropped++
    say(`Elo @${reminding.remindee} I just wanted to remind you that: ${reminding.message}`)
    return false
  })
  if(remindings.length !== filteredRemindings.length) {
    console.log(`popped ${remindings.length - filteredRemindings.length} remindings ..`)
    remindings = filteredRemindings
  }
}
