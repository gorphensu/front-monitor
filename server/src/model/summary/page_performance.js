import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import DATE_FORMAT from '~/src/constants/date_format'
import DatabaseUtil from '~/src/library/utils/modules/database'
import Logger from '~/src/library/logger'
import MPerformance from '~/src/model/parse/performance'
import ConditionUtils from '~/src/util/conditionUtils'

const TABLE_COLUMN = [
  'id',
  'count_type',
  'count_size',
  'url',
  'app_version',
  'dom_parse_ms',
  'dom_ready_ms',
  'first_response_ms',
  'load_complete_ms',
  'load_resource_ms',
  'first_render_ms',
  'first_tcp_ms',
  'create_time',
  'update_time'
]

const BASE_TABLE_NAME = 't_r_page_performance'

function getTableName(projectId, createAt) {
  let createAtMoment = moment.unix(createAt)
  let monthStr = createAtMoment.clone().format('YYYYMM')
  return `${BASE_TABLE_NAME}_${projectId}_${monthStr}`
}

async function list(projectId, startAt, endAt, condition = {}) {
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, endAt, getTableName)
  let res = []
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .where(builder => {
        ConditionUtils.setCondition(builder, condition)
      })
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    res = res.concat(rawRecordList)
  }
  return res
}

async function get(projectId, countAt, condition = {}) {
  // console.log('condition', condition)
  let tableName = getTableName(projectId, countAt)
  // console.log('sql', Knex
  //   .select(TABLE_COLUMN)
  //   .from(tableName)
  //   .where(builder => {
  //     ConditionUtils.setCondition(builder, condition)
  //   }).toString())
  let rawRecord = await Knex
    .select(TABLE_COLUMN)
    .from(tableName)
    .where(builder => {
      ConditionUtils.setCondition(builder, condition)
    })
    .catch((e) => {
      Logger.warn('查询失败, 错误原因 =>', e)
      return []
    })
  return rawRecord
}

async function insert(projectId, countAt, record) {
  let tableName = getTableName(projectId, countAt)
  delete record.id
  let insertResult = await Knex
    .returning('id')
    .insert(record)
    .from(tableName)
    .catch(e => {
      Logger.warn(tableName + ' page perfornamce insert数据插入失败，错误原因=>', e)
      return 0
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function update(projectId, countAt, record, condition = {}) {
  let tableName = getTableName(projectId, countAt, record)
  let affectRows = await Knex(tableName)
    .where(builder => {
      if (record.id) {
        builder.where('id', '=', record.id)
      }
      ConditionUtils.setCondition(builder, condition)
    })
    .update(record)
    .catch(e => {
      Logger.warn(`${tableName} page performance updateRecord 更新失败, 错误原因`, e)
      return 0
    })
  return affectRows
}

async function getDistinctVersionListInRange(projectId, startAt, endAt, countType) {
  let versionList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, endAt, getTableName)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex.distinct(['app_version'])
      .from(tableName)
      .where(builder => {
        builder.where('count_type', '=', countType)
        builder.where('create_time', '>=', startAt)
        builder.where('create_time', '<', endAt)
      })
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    for (let rawRecord of rawRecordList) {
      if (_.has(rawRecord, ['app_version'])) {
        let version = _.get(rawRecord, ['app_version'])
        versionList.push(version)
      }
    }
  }
  let distinctVersionList = _.union(versionList)
  return distinctVersionList
}

async function getDistinctUrlListInRange(projectId, startAt, endAt, countType = DATE_FORMAT.UNIT.MINUTE) {
  // let startAtMoment = moment.unix(startAt).startOf(countType)
  let urlList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, endAt, getTableName)

  // let countAtTimeList = []
  // // 获取所有可能的countAtTime
  // for (let countStartAtMoment = startAtMoment.clone(); countStartAtMoment.unix() < endAt; countStartAtMoment = countStartAtMoment.clone().add(1, countType)) {
  //   let formatCountAtTime = countStartAtMoment.format(DATE_FORMAT.DATABASE_BY_UNIT[countType])
  //   countAtTimeList.push(formatCountAtTime)
  // }


  // 循环查询数据库
  for (let tableName of tableNameList) {
    // console.log('tableName,countType,indicatorList,countAtTimeList',tableName,countType,indicatorList,countAtTimeList);
    let rawRecordList = await Knex
      .distinct(['url'])
      .from(tableName)
      .where({
        count_type: countType
      })
      .andWhereBetween('create_time', [startAt, endAt])
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    for (let rawRecord of rawRecordList) {
      if (_.has(rawRecord, ['url'])) {
        let url = _.get(rawRecord, ['url'])
        urlList.push(url)
      }
    }
  }
  let distinctUrlList = _.union(urlList)
  Logger.log('performance distinctUrlList', distinctUrlList)
  return distinctUrlList
}

export default {
  list,
  get,
  insert,
  update,
  getDistinctVersionListInRange,
  getDistinctUrlListInRange
}