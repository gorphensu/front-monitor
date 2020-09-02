import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'

const BASE_TABLE_NAME = 't_o_page_engine_render'

const TABLE_COLUMN = [
  `id`,
  `item_id`,
  `project_id`,
  `ucid`,
  `tenantid`,
  `count_type`,
  `count_at_time`,
  `pagecode`,
  `url`,
  `operation_type`,
  `cost_time`,
  `browser`,
  `detail`,
  `create_time`,
  `update_time`
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
    count_at_time: recordJson.count_at_time,
    ucid: recordJson.ucid,
    tenantid: recordJson.tenantid,
    project_id: projectId,
    count_type: 'minute',
    item_id: recordJson.item_id,
    pagecode: recordJson.pagecode,
    url: recordJson.url,
    operation_type: recordJson.operation_type,
    cost_time: recordJson.cost_time,
    detail: recordJson.detail,
    browser: recordJson.browser,
    update_time: updateAt,
    create_time: updateAt
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('page engine insert数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function getList(projectId, startAt, finishAt, condition = {}) {
  let startAtMoment = moment.unix(startAt)
  let endAtMoment = moment.unix(finishAt)
  let tableName = getTableName(projectId, startAt)
  let recordList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
  Logger.log('parse\page-engine-render.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .whereBetween('count_at_time', [startAt, finishAt])
      .andWhere(builder => {
        if (condition['pagecode']) {
          builder.where('pagecode', condition['pagecode'])
        }
        if (condition['browser']) {
          builder.where('browser', 'like', `%${condition['browser']}%`)
        }
        if (condition['tenantid']) {
          builder.where('tenantid', condition['tenantid'])
        }
      })
      .catch(e => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    recordList = recordList.concat(rawRecordList)
  }
  return recordList
}

export default {
  insert,
  getList
}