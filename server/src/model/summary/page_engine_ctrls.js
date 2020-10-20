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
  `component_type`,
  `operation_type`,
  `app_version`,
  `cost_time`,
  `count_size`,
  `count_type`,
  `create_time`,
  `update_time`
]

const BASE_TABLE_NAME = 't_r_page_engine_ctrl'

function getTableName(projectId, createTimeAt) {
  const DATE_FORMAT = 'YYYYMM'
  let YmDate = moment.unix(createTimeAt).format(DATE_FORMAT)
  return BASE_TABLE_NAME + '_' + projectId + '_' + YmDate
}



async function replaceAndAutoIncrementRecord(projectId, recordInfo, visitAt, countType) {
  console.log('replaceAndAutoIncrementRecord', visitAt, countType)
  // let projectId = recordInfo.project_id
  let component_type = recordInfo.component_type
  let app_version = recordInfo.app_version
  let count_type = countType
  // 查询是否存在该数据
  let rawRecordList = await getRecord(projectId, visitAt, {
    component_type,
    count_type,
    app_version
  }, countType)
  // 插入更新
  if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
    // 需要改变下操作数据
    return await updateRecord(projectId, visitAt, rawRecordList[0], recordInfo, countType)
  } else { // 新建
    return await insertRecord(projectId, visitAt, recordInfo, countType)
  }
}


async function insertRecord(projectId, countAt, recordInfo, countType) {
  let tableName = getTableName(projectId, countAt)
  let updateAt = moment().unix()

  let data = {
    count_size: recordInfo.count_size || 1,
    count_type: countType,
    update_time: updateAt,
    create_time: countAt,
    component_type: recordInfo.component_type,
    operation_type: recordInfo.operation_type,
    cost_time: recordInfo.cost_time,
    app_version: recordInfo.app_version
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn(tableName + ' page engine ctrl insert 数据插入失败，错误原因=>', e)
      return 0
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function updateRecord(projectId, countAt, rawRecordInfo, updateRecordInfo, countType) {
  let tableName = getTableName(projectId, countAt)

  let component_type = rawRecordInfo.component_type
  let app_version = rawRecordInfo.app_version
  let averge_cost_time = (rawRecordInfo.cost_time * rawRecordInfo.count_size + updateRecordInfo.cost_time * (updateRecordInfo.count_size || 1)) / (rawRecordInfo.count_size + (updateRecordInfo.count_size || 1))
  let updateData = {
    ...rawRecordInfo,
    update_time: countAt,
    count_size: rawRecordInfo.count_size + (updateRecordInfo.count_size || 1),
    cost_time: averge_cost_time
  }
  let affectRows = await Knex(tableName)
    .where('component_type', '=', component_type)
    .where('count_type', '=', countType)
    .update(updateData)
    .catch(e => {
      Logger.warn(`${tableName} page engine ctrl updateRecord 更新失败, 错误原因`, e)
      return 0
    })
  return affectRows > 0
}

async function getRecord(projectId, visitAt, condition = {}, countType) {
  let tableName = getTableName(projectId, visitAt)
  let recordList = await Knex
    .select(TABLE_COLUMN)
    .from(tableName)
    .andWhere(builder => {
      ConditionUtils.setCondition(builder, condition)
      builder.where('count_type', countType)
    }).catch(e => {
      Logger.warn('查询失败, 错误原因 =>', e)
      return []
    })
  return recordList
}

// 默认按天查询?
// 1 没有情况下。安小时统计，
// 2 按天统计，
// 3 最外面是按天统计查询
async function getList(projectId, startAt, finishAt, condition = {}, countType = DATE_FORMAT.UNIT.DAY) {
  // let startAtMoment = moment.unix(startAt)
  // let endAtMoment = moment.unix(finishAt)
  let recordList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
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
        builder.where('count_type', countType)
      })
      .orderBy('create_time')
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
        builder.where('count_type', countType)
      })
      .catch(e => {
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
  // return recordList
  return {
    data: recordList,
    total: total,
    pageindex: pageindex,
    pagesize: limit
  }
}

export default {
  getTableName,
  updateRecord,
  getRecord,
  insertRecord,
  replaceAndAutoIncrementRecord,
  getList
}