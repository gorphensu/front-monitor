import moment from 'moment'
import _ from 'lodash'
import Knex from '~/src/library/mysql'
import Logger from '~/src/library/logger'
import DatabaseUtil from '~/src/library/utils/modules/database'
import DATE_FORMAT from '~/src/constants/date_format'

const BASE_TABLE_NAME = 't_o_vue_component_render'
const OPETATION_TABLE_NAME = 't_o_vue_component_operation'

const TABLE_COLUMN = [
  `id`,
  `project_id`,
  `ucid`,
  `count_type`,
  `count_at_time`,
  `component_type`,
  `render_time`,
  `pagecode`,
  `viewrule`,
  `browser`,
  `create_time`,
  `update_time`,
]

const TABLE_OPERATION_COLUMN = [
  `id`,
  `project_id`,
  `ucid`,
  `item_id`,
  `count_type`,
  `count_at_time`,
  `component_type`,
  `operation_type`,
  `cost_time`,
  `pagecode`,
  `detail`,
  `browser`,
  `create_time`,
  `update_time`,
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

function getOperationTableName(projectId, createAt) {
  let createAtMoment = moment.unix(createAt)
  let monthStr = createAtMoment.clone().format('YYYYMM')
  return `${OPETATION_TABLE_NAME}_${projectId}_${monthStr}`
}

async function insert(recordJson, projectId, createAt) {
  let tableName = getTableName(projectId, createAt)
  let updateAt = moment().unix()
  let data = {
    count_at_time: recordJson.countAtTime,
    ucid: recordJson.ucid,
    project_id: projectId,
    count_type: 'minute',
    component_type: recordJson.componentType,
    render_time: recordJson.renderTime,
    pagecode: recordJson.pageCode,
    viewrule: recordJson.viewRule,
    browser: recordJson.browser,
    update_time: updateAt,
    create_time: updateAt
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('vue component render 数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function getList(projectId, startAt, finishAt, condition = {}, countType = DATE_FORMAT.UNIT.MINUTE) {
  let startAtMoment = moment.unix(startAt)
  let tableName = getTableName(projectId, startAt)
  let recordList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getTableName)
  Logger.log('parse\vue_component_render.js tableNameList', tableNameList)
  let countAtTimeList = []
  // 获取所有可能的countAtTime
  for (let countStartAtMoment = startAtMoment.clone(); countStartAtMoment.unix() < finishAt; countStartAtMoment = countStartAtMoment.clone().add(1, countType)) {
    let formatCountAtTime = countStartAtMoment.format(DATE_FORMAT.DATABASE_BY_UNIT[countType])
    countAtTimeList.push(formatCountAtTime)
  }
  // Logger.log('parse\vue_component_render.js countAtTimeList', countAtTimeList)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .where('count_type', '=', countType)
      .whereIn('count_at_time', countAtTimeList)
      .andWhere(builder => {
        if (_.has(condition, ['component_type'])) {
          builder.where('component_type', condition['component_type'])
        }
        if (_.has(condition, ['browser'])) {
          builder.where('browser', 'like', `%${condition['browser']}%`)
        }
      })
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    recordList = recordList.concat(rawRecordList)
  }
  return recordList
}

async function insertOperation(recordJson, projectId, createAt) {
  let tableName = getOperationTableName(projectId, createAt)
  let updateAt = moment().unix()
  let data = {
    count_at_time: recordJson.countAtTimeStamp,
    ucid: recordJson.ucid,
    project_id: projectId,
    count_type: 'minute',
    item_id: recordJson.itemId,
    operation_type: recordJson.operationType,
    component_type: recordJson.componentType,
    cost_time: recordJson.costTime,
    pagecode: recordJson.pageCode,
    component_code: recordJson.componentCode,
    detail: recordJson.detail || recordJson.viewRule,
    browser: recordJson.browser,
    update_time: updateAt,
    create_time: updateAt
  }
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn('vue component insertOperation 数据插入失败，错误原因=>', e)
      return []
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function getRenderList(projectId, startAt, finishAt, condition = {}, countType = DATE_FORMAT.UNIT.MINUTE) {
  let startAtMoment = moment.unix(startAt)
  let endAtMoment = moment.unix(finishAt)
  let tableName = getOperationTableName(projectId, startAt)
  let recordList = []
  let tableNameList = DatabaseUtil.getTableNameListInRange(projectId, startAt, finishAt, getOperationTableName)
  Logger.log('parse\vue_component_render.js getRenderList tableNameList', tableNameList)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_OPERATION_COLUMN)
      .from(tableName)
      .where('count_type', '=', countType)
      // .where('operation_type', '=', 'vm.render')
      .whereBetween('count_at_time', [startAt, finishAt])
      .andWhere(builder => {
        if (_.has(condition, ['component_type'])) {
          builder.where('component_type', condition['component_type'])
        }
        if (_.has(condition, ['browser'])) {
          builder.where('browser', 'like', `%${condition['browser']}%`)
        }
      })
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    recordList = recordList.concat(rawRecordList)
  }
  return recordList
}


export default {
  insert,
  getList,
  insertOperation,
  getRenderList
}