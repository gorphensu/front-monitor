import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'

const BASE_TABLE_NAME = 't_o_vue_component_render'

const TABLE_COLUMN = [
  `id`,
  `project_id`,
  `ucid`,
  `count_type`,
  `count_at_time`,
  `component_type`,
  `render_time`,
  `pagecode`,
  `viewrule`,
  `browser`,
  `create_time`,
  `update_time`,
]

/**
 * 获取表名
 * @param {*} projectId
 * @param {number} createAt
 */
function getTableName(projectId, createAt) {
  let createAtMoment = moment.unix(createAt)
  let monthStr = createAtMoment.clone().format('YYYYMM')
  return `${BASE_TABLE_NAME}_${projectId}_${monthStr}`
}

async function insert(recordJson, projectId, createAt) {
  let tableName = getTableName(projectId, createAt)
  let updateAt = moment().unix()
  let data = {
    count_at_time: recordJson.countAtTime,
    ucid: recordJson.ucid,
    project_id: projectId,
    count_type: 'minute',
    component_type: recordJson.componentType,
    render_time: recordJson.renderTime,
    pagecode: recordJson.pageCode,
    viewrule: recordJson.viewRule,
    browser: recordJson.browser,
    update_time: updateAt,
    create_time: updateAt
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('vue component render 数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

export default {
  insert
}