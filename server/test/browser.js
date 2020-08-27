let MBrowser = require('../dist/model/summary/system_browser')
let moment = require('moment')
async function getListInRange() {
  let start = moment('2020-07').toDate().getTime() / 1000
  let finish = moment('2020-08').toDate().getTime() / 1000
  let res = await MBrowser.default.getListInRange(1, start, finish)
  console.log('res', res)
}
getListInRange()