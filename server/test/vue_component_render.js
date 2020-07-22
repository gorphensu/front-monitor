let MVueComponentRender = require('../dist/model/parse/vue_component_render.js')
let moment = require('moment')


async function get() {
  let condition = {}
  let format = 'YYYY-MM-DD HH:mm'
  // 2020-07-21 14:33:00
  let startAt = moment(1595313180000).unix()
  let finishAt = moment(1595390400000).unix()
  // 2020-07-22 12:00:00'
  // let finishAt = 1595390400000
  let res = await MVueComponentRender.default.getList(1, startAt, finishAt, {})
  console.log('res', res)
}

get()