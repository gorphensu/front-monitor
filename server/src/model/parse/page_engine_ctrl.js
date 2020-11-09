import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'
import ConditionUtils from '~/src/util/conditionUtils'

const BASE_TABLE_NAME = 't_o_page_engine_ctrl'

const TABLE_COLUMN = [
  `id`,
  `engine_item_id`,
  `cost_time`,
  `component_code`,
  `component_type`,
  `operation_type`,
  `stage`,
  `create_time`,
  `app_version`
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

async function inserts(projectId, ctrls, itemData) {
  let createAt = item.createAt
  let tableName = getTableName(projectId, createAt)
  Logger.log('page engine ctrl inserts tableName', tableName)
  let updateAt = moment().unix()
  let data = {
    engine_item_id: itemData.itemId,
    create_time: createAt,
    stage: itemData.stage,
    app_version: itemData.app_version
  }
  Logger.warn('page engine ctrl数据 ' + JSON.stringify(data))
  let datas = []
  ctrls.forEach(ctrl => {
    datas.push({
      ...data,
      // type: ctrlType,
      // code: ctrlCode,
      // operation: operation.type,
      // costtime: operation.costtime
      component_code: ctrl.code,
      component_type: ctrl.type,
      operation_type: ctrl.operation,
      cost_time: ctrl.costtime
    })
  })
  let insertResult = await Knex
    .returning('id')
    .insert(datas)
    .from(tableName)
    .catch(e => {
      Logger.warn('page engine ctrl数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function getList(projectId, createAt, condition = {}) {
  let tableName = getTableName(projectId, createAt)
  delete condition.create_time
  let rawRecordList = await Knex
    .select(TABLE_COLUMN)
    .from(tableName)
    .where(builder => {
      ConditionUtils.setCondition(builder, condition)
    }).catch(e => {
      Logger.warn('查询失败, 错误原因 =>', e)
      return []
    })
  return rawRecordList
}

export default {
  inserts,
  getList
}