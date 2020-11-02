import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'
import ConditionUtils from '~/src/util/conditionUtils'

const BASE_TABLE_NAME = 't_r_page_engine_onload_count'

const TABLE_COLUMN = [
  'id',
  'tenantid',
  'url',
  'app_version',
  'loaded_time',
  'pagecode',
  'count_size',
  'count_type',
  'create_time',
  'update_time'
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
  let updateAt = createAt
  let data = {
    tenantid: recordJson.tenantid,
    pagecode: recordJson.pagecode,
    url: recordJson.url,
    app_version: recordJson.app_version,
    loaded_time: recordJson.loaded_time,
    count_size: recordJson.count_size,
    count_type: recordJson.count_type,
    create_time: updateAt,
    update_time: updateAt
  }

  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('page engine onload数据插入失败, 错误原因=> ', e)
      return []
    })
  return _.get(insertResult, [0], 0)
}

async function update(rawRecordJson, updateRecordJson, projectId, createAt) {
  let tableName = getTableName(projectId, createAt)
  let updateAt = createAt
  rawRecordJson.update_time = updateAt
  rawRecordJson.loaded_time = updateRecordJson.loaded_time
  rawRecordJson.count_size = updateRecordJson.count_size
  let affectRows = await Knex(tableName)
    .where('id', '=', rawRecordJson.id)
    .update(rawRecordJson)
    .catch(e => {
      Logger.warn(`${tablaName} update失败， 错误原因`, e)
      return 0
    })
  return affectRows > 0
}

async function getRecord(projectId, createAt, condition = {}) {
  console.log('page_engine_onload_count getRecord')
  let tableName = getTableName(projectId, createAt)
  let recordList = await Knex
    .select(TABLE_COLUMN)
    .from(tableName)
    .andWhere(builder => {
      ConditionUtils.setCondition(builder, condition)
    })
    .catch(e => {
      Logger.warn(`${tableName}查询失败, 错误原因 => `, e)
      return []
    })
  return recordList
}

async function updateOrInsert(projectId, recordJson, startAt, endAt, replace) {
  let tableName = getTableName(projectId, startAt)
  let existRecords = await getRecord(projectId, startAt, {
    tenantid: recordJson.tenantid,
    pagecode: recordJson.pagecode,
    url: recordJson.url,
    app_version: recordJson.app_version,
    __range_min__create_time: startAt,
    __range_max__create_time: endAt,
  })
  if (!existRecords.length || replace) {
    return await insert(recordJson, projectId, startAt)
  } else {
    // // 更新
    let rawRecordJson = existRecords[0]
    let updateRecordJson = {
      ...recordJson,
      loaded_time: (rawRecordJson.loaded_time * rawRecordJson.count_size + recordJson.loaded_time * recordJson.count_size) / (rawRecordJson.count_size + recordJson.count_size),
      count_size: rawRecordJson.count_size + recordJson.count_size
    }
    return await update(rawRecordJson, updateRecordJson, projectId, recordJson.update_time)
  }
}

async function getList(projectId, startAt, endAt, condition = {}) {
  Logger.log('parse\page-engine-onload-count.js getList start', moment.unix(startAt).toDate(), startAt)
  Logger.log('parse\page-engine-onload-count.js getList finish', moment.unix(endAt).toDate(), endAt)
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, endAt, getTableName)
  Logger.log('parse\page-engine-onload-count.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  let recordList = []
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .where(builder => {
        ConditionUtils.setCondition(builder, condition)
      })
      .catch(e => {
        Logger.warn('summarg page_engine_onlod_count getList查询失败, 错误原因 =>', e)
        return []
      })
    recordList = recordList.concat(rawRecordList)
  }
  return recordList
}

export default {
  insert,
  update,
  updateOrInsert,
  getRecord,
  getList
}