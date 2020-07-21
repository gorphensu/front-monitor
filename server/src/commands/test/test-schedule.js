var schedule = require('node-schedule')
let i = 3
let job = schedule.scheduleJob('0 * * * * *', function() {
  console.log('registerTaskRepeatPer1Minute 开始执行')
  i++
  if (i == 3) {
    job.cancel()
  }
})