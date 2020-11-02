import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'
import ConditionUtils from '~/src/util/conditionUtils'

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
  `browser`,
  // `stage`,
  `create_time`,
  `app_version`
]

/**
 * 获取表名
 * @param {*} projectId
 * @param {number} createAt unix
 */
function getTableName(projectId, createAt) {
  let createAtMoment = moment.unix(createAt)
  let monthStr = createAtMoment.clone().format('YYYYMM')
  return `${BASE_TABLE_NAME}_${projectId}_${monthStr}`
}

async function insert(recordJson, projectId, createAt) {
  let tableName = getTableName(projectId, createAt)
  let updateAt = moment().unix() // 服务器时间
  let data = {
    tenantid: recordJson.tenantid,
    ucid: recordJson.ucid,
    item_id: recordJson.itemId,
    pagecode: recordJson.pageCode,
    count_at_time: recordJson.countAtTime,
    loaded_time: recordJson.loadedTime,
    url: recordJson.url,
    browser: recordJson.browser,
    create_time: createAt || updateAt, // 服务器时间，任务时间
    app_version: recordJson.app_version
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

async function getList(projectId, startAt, finishAt, condition = {}) {
  let recordList = []
  // startAt = moment.unix(startAt).subtract(-2, 'minute').unix()
  // finishAt = moment.unix(finishAt).subtract(-2, 'minute').unix()
  Logger.log('parse\page-engine-onload.js getList start', moment.unix(startAt).toDate())
  Logger.log('parse\page-engine-onload.js getList finish', moment.unix(finishAt).toDate())
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
  Logger.log('parse\page-engine-onload.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .whereBetween('create_time', [startAt, finishAt])
      .andWhere(builder => {
        ConditionUtils.setCondition(builder, condition)
      }).catch(e => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    recordList = recordList.concat(rawRecordList)
  }
  return recordList
}

async function getListRange(projectId, startAt, finishAt, condition = {}) {
  let recordList = []
  Logger.log('parse\page-engine-onload.js getList start', moment.unix(startAt).toDate())
  Logger.log('parse\page-engine-onload.js getList finish', moment.unix(finishAt).toDate())
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
  Logger.log('parse\page-engine-onload.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  let limit = condition.pagesize || 20
  let pageindex = condition.pageindex || 1
  delete condition.pagesize
  delete condition.pageindex
  let total = 0
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .whereBetween('create_time', [startAt, finishAt])
      .andWhere(builder => {
        ConditionUtils.setCondition(builder, condition)
      })
      .limit(limit)
      .offset(limit * pageindex - limit)
      .catch(e => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return {
          data: [],
          total: 0,
          pageindex: 1,
          pagesize: 0
        }
      })
    let rawCount = await Knex(tableName)
      .count('*')
      .whereBetween('create_time', [startAt, finishAt])
      .andWhere(builder => {
        ConditionUtils.setCondition(builder, condition)
      }).catch(e => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return {
          data: [],
          total: 0,
          pageindex: 1,
          pagesize: 0
        }
      })
    total += rawCount[0]['count(*)']
    recordList = recordList.concat(rawRecordList)
  }
  return {
    data: recordList,
    total: total,
    pageindex: pageindex,
    pagesize: limit
  }
}

export default {
  insert,
  getList,
  getListRange
}