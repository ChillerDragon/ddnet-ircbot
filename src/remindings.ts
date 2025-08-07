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
  remindings = remindings.filter((reminding) => {
    if(reminding.remindDate < now) {
      return false
    }
    say(`Elo @${reminding.remindee} I just wanted to remind you that: ${reminding.message}`)
    return true
  })
}
