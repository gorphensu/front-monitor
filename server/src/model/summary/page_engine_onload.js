import _ from 'lodash'
import Logger from '~/src/library/logger'
import DATE_FORMAT from '~/src/constants/date_format'
import DatabaseUtil from '~/src/library/utils/modules/database'
import MProject from '~/src/model/project/project'
import moment from 'moment'
import Knex from '~/src/library/mysql'
import ConditionUtils from '~/src/util/conditionUtils'

const TABLE_COLUMN = [
  `id`,
  `tenantid`,
  `pagecode`,
  `loaded_time`,
  `count_size`,
  `url`,
  `create_time`,
  `update_time`
]

const BASE_TABLE_NAME = 't_r_page_engine_onload'

function getTableName(projectId, createTimeAt) {
  const DATE_FORMAT = 'YYYYMM'
  let YmDate = moment.unix(createTimeAt).format(DATE_FORMAT)
  return BASE_TABLE_NAME + '_' + projectId + '_' + YmDate
}



async function replaceAndAutoIncrementRecord(recordInfo, visitAt) {
  let projectId = recordInfo.project_id
  let pagecode = recordInfo.pagecode
  let tenantid = recordInfo.tenantid
  // 查询是否存在该数据
  let rawRecordList = await getRecord(projectId, visitAt, {
    // ucid,
    tenantid,
    pagecode,
    // url,
  })
  // 插入更新
  if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
    // 需要改变下操作数据
    return await updateRecord(projectId, visitAt, rawRecordList[0], recordInfo)
  } else { // 新建
    return await insertRecord(projectId, visitAt, recordInfo)
  }
}


async function insertRecord(projectId, visitAt, recordInfo) {
  let tableName = getTableName(projectId, visitAt)
  let updateAt = moment().unix()

  let data = {
    count_size: 1,
    update_time: updateAt,
    create_time: updateAt,
    tenantid: recordInfo.tenantid,
    pagecode: recordInfo.pagecode,
    url: recordInfo.url,
    loaded_time: recordInfo.loaded_time
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn(tableName + ' page engine onload insert 数据插入失败，错误原因=>', e)
      return 0
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function updateRecord(projectId, visitAt, rawRecordInfo, updateRecordInfo) {
  let tableName = getTableName(projectId, visitAt)

  let pagecode = rawRecordInfo.pagecode
  let tenantid = rawRecordInfo.tenantid
  let updateAt = moment().unix()
  let averge_loaded_time = (rawRecordInfo.loaded_time * rawRecordInfo.count_size + updateRecordInfo.loaded_time) / (rawRecordInfo.count_size + 1)
  let updateData = {
    ...rawRecordInfo,
    update_time: updateAt,
    count_size: rawRecordInfo.count_size + 1,
    loaded_time: averge_loaded_time
  }
  let affectRows = await Knex(tableName)
    .where('tenantid', '=', tenantid)
    .where('pagecode', '=', pagecode)
    .update(updateData)
    .catch(e => {
      Logger.warn(`${tableName} page engine updateRecord 更新失败, 错误原因`, e)
      return 0
    })
  return affectRows > 0
}

async function getRecord(projectId, visitAt, condition = {}) {
  let tableName = getTableName(projectId, visitAt)
  let recordList = await Knex
    .select(TABLE_COLUMN)
    .from(tableName)
    .andWhere(builder => {
      ConditionUtils.setCondition(builder, condition)
    }).catch(e => {
      Logger.warn('查询失败, 错误原因 =>', e)
      return []
    })
  return recordList
}

async function getList(projectId, startAt, finishAt, condition = {}) {
  // let startAtMoment = moment.unix(startAt)
  // let endAtMoment = moment.unix(finishAt)
  let recordList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
  Logger.log('summary\page-engine-onload.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .whereBetween('update_time', [startAt, finishAt])
      .andWhere(builder => {
        ConditionUtils.setCondition(builder, condition)
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
  getTableName,
  updateRecord,
  getRecord,
  insertRecord,
  replaceAndAutoIncrementRecord,
  getList
}