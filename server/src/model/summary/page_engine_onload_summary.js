import _ from 'lodash'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import MProject from '~/src/model/project/project'
import moment from 'moment'
import Knex from '~/src/library/mysql'
import ConditionUtils from '~/src/util/conditionUtils'
import DATE_FORMAT from '~/src/constants/date_format'

const TABLE_COLUMN = [
  `id`,
  `tenantid`,
  `render_time`,
  `loaded_time`,
  `count_at_time`,
  `create_time`,
  `update_time`,
  `count_size`
]

const BASE_TABLE_NAME = 't_r_page_engine_render_summary'

function getTableName(projectId, countTimeAt) {
  const DATE_FORMAT = 'YYYYMM'
  let YmDate = moment.unix(countTimeAt).format(DATE_FORMAT)
  return BASE_TABLE_NAME + '_' + projectId + '_' + YmDate
}

export default {
  async updateRecord(projectId, record) {
    let { tenantid, count_at_time } = record

    let tableName = getTableName(projectId, moment(count_at_time).unix())
    // 查询是否存在该条数据
    let rawRecordList = await this.getRecord(projectId, tenantid, count_at_time)
    // 更新
    if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
      let { render_time, loaded_time, count_size } = rawRecordList[0]
      let updateAt = moment().unix()
      // let renderTime = (render_time * count_size + record.render_time) / (count_size + 1)
      let loadedTime = (loaded_time * count_size + record.loaded_time) / (count_size + 1)
      // `id`,
      // `tenantid`,
      // `render_time`,
      // `loaded_time`,
      // `count_at_time`,
      // `create_time`,
      // `update_time`,
      // `count_size`
      let tmpRecord = {
        id: record.id,
        tenantid: record.tenantid,
        render_time: 0,
        loaded_time: loadedTime,
        create_time: record.create_time,
        update_time: updateAt,
        count_size: count_size + 1,
        count_at_time: record.count_at_time
      }
      let affectRows = await Knex(tableName)
        .where('tenantid', '=', tenantid)
        .where('count_at_time', '=', count_at_time)
        .update(tmpRecord)
        .catch(e => {
          Logger.warn(`${tableName} page engine summary updateRecord 更新失败, 错误原因`, e)
          return 0
        })
      return affectRows
    } else {
      // 插入
      let updateAt = moment().unix()
      let tmpRecord = {
        tenantid: record.tenantid,
        render_time: 0,
        loaded_time: record.loaded_time,
        count_at_time: record.count_at_time,
        count_size: 1,
        update_time: updateAt,
        create_time: updateAt
      }
      let insertResult = await Knex
        .returning('id')
        .insert(tmpRecord)
        .from(tableName)
        .catch(e => {
          Logger.warn(tableName + ' page engine summary insert数据插入失败，错误原因=>', e)
          return 0
        })
      let insertId = _.get(insertResult, [0], 0)
      return insertId
    }
  },
  async getRecord(projectId, tenantid, countAtTime) {
    let tableName = getTableName(projectId, moment(countAtTime).unix())
    let recordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .where('tenantid', '=', tenantid)
      .where('count_at_time', '=', countAtTime)
      .catch(e => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    return recordList
  },
  async getList(projectId, startAt, finishAt, condition = {}) {
    let recordList = []
    let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
    console.log('startAt', startAt)
    console.log('finishAt', finishAt)
    let dateRange = DatabaseUtil.getDatabaseTimeList(startAt, finishAt, DATE_FORMAT.UNIT.DAY)
    Logger.log('summary\page-engine-onload-summary.js getList tableNameList', tableNameList)
    console.log('dateRange', dateRange)
    console.log('condition', condition)
    for (let tableName of tableNameList) {
      let rawRecordList = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .whereIn('count_at_time', dateRange)
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
}