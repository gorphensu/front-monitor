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

export default {
  get,
  insert,
  update
}