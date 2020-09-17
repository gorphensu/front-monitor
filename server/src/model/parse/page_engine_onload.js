import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'

const BASE_TABLE_NAME = 't_o_page_engine_onload'

const TABLE_COLUMN = [
  `id`,
  `tenantid`,
  `item_id`,
  `ucid`,
  `pagecode`,
  `count_at_time`,
  `loaded_time`,
  `url`,
  `stage`,
  `create_time`,
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
    tenantid: recordJson.tenantid,
    ucid: recordJson.ucid,
    item_id: recordJson.itemId,
    pagecode: recordJson.pageCode,
    count_at_time: recordJson.countAtTime,
    loaded_time: recordJson.loadedTime,
    url: recordJson.url,
    browser: recordJson.browser,
    create_time: updateAt
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('page engine onload数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
  // let insertResult = await Knex
  //   .returning('id')
  //   .insert(data)
  //   .from(tableName)
  //   .catch(e => {
  //     Logger.warn('page engine insert数据插入失败，错误原因=>', e)
  //     return []
  //   })
  // let insertId = _.get(insertResult, [0], 0)
  // return insertId
}

export default {
  insert
}