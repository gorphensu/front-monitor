import _ from 'lodash'
import Logger from '~/src/library/logger'
import DATE_FORMAT from '~/src/constants/date_format'
import DatabaseUtil from '~/src/library/utils/modules/database'
import MPageEngineRenderParser from '~/src/model/parse/page_engine_render'
import MProject from '~/src/model/project/project'
import moment from 'moment'
import Knex from '~/src/library/mysql'
import { match } from 'date-fns/locale/af'

const TABLE_COLUMN = [
  `id`,
  `project_id`,
  `ucid`,
  `tenantid`,
  `pagecode`,
  `ctrlsize`,
  `container_ctrl`,
  `container_ctrl_detail`,
  `render_time`,
  `loaded_time`,
  `loaded_eventsize`,
  `loaded_event_detail`,
  `count_size`,
  `url`,
  `create_time`,
  `update_time`
]

const BASE_TABLE_NAME = 't_r_page_engine_render'

function getTableName(projectId, createTimeAt) {
  const DATE_FORMAT = 'YYYYMM'
  let YmDate = moment.unix(createTimeAt).format(DATE_FORMAT)
  return BASE_TABLE_NAME + '_' + projectId + '_' + YmDate
}

// async function summaryPageEngineRender(visitAt) {
//   let endAtMoment = moment.unix(visitAt).set('minute', 0).set('second', 0)
//   let startAtMoment = endAtMoment.clone().add(-1, 'hour')
//   let rawProjectList = await MProject.getList()
//   Logger.info('项目列表获取完毕, =>', rawProjectList)
//   for (let rawProject of rawProjectList) {
//     let projectId = _.get(rawProject, 'id', '')
//     let projectName = _.get(rawProject, 'project_name', '')
//     if (projectId === 0 || projectId === '') {
//       continue
//     }
//     Logger.info(`开始处理项目${projectId}(${projectName})的数据`)
//     Logger.info(`[${projectId}(${projectName})] 时间范围:${startAtMoment.format(DATE_FORMAT.DIAPLAY_BY_MINUTE) + ':00'}~${endAtMoment.format(DATE_FORMAT.DIAPLAY_BY_MINUTE) + ':59'}`)
//     let res = await MPageEngineRenderParser.getList(projectId, startAtMoment.unix(), endAtMoment.unix())
//     if (!res || !res.length) {
//       Logger.info('当前无数据需要统计')
//       return
//     }
//     res = groupPageEngineRenderRecord(res)
//     res.forEach(async item => {
//       try {
//         let isSuccess = await replaceAndAutoIncrementRecord(item, visitAt)

//       } catch (e) {

//       }
//     })
//   }
// }

function groupPageEngineRenderRecord(list) {
  // 根据item_id进行分组
  let res = {}
  list.forEach(item => {
    if (!res[item.item_id]) {
      res[item.item_id] = []
    }
    res[item.item_id].push(item)
  })
  return res
}

function mergeGroupRecords(list) {
  let res = {}
  list.forEach(item => {
    if (item.operation_type === 'render') {
      res['project_id'] = item.project_id
      res['ucid'] = item.ucid
      res['pagecode'] = item.pagecode
      res['url'] = item.url
      res['render_time'] = item.cost_time
      res['count_size'] = 0
    } else if (item.operation_type === 'sumcount') {
      if (item.detail) {
        try {
          let detail = JSON.parse(item.detail)
          item['ctrlsize'] = detail.ctrlsize
          item['container_ctrl'] = detail.containerctrl
          item['container_ctrl_detail'] = detail.containerctrldetail
        } catch { }
      } else if (item.operation_type === 'onload') {
        res['loaded_time'] = item.cost_time
        if (item.detail) {
          try {
            let detail = JSON.parse(item.detail)
            res['loaded_eventsize'] = detail.eventsize
            res['loaded_event_detail'] = detail.eventdetail
          } catch { }
        }
      }
    }
  })
  return res
}

async function replaceAndAutoIncrementRecord(recordInfo, visitAt) {
  let projectId = recordInfo.project_id
  let ucid = recordInfo.ucid
  let pagecode = recordInfo.pagecode
  let tenantid = recordInfo.tenantid
  let url = recordInfo.url
  // 查询是否存在该数据
  let rawRecordList = await getRecord(projectId, visitAt, {
    // ucid,
    tenantid,
    pagecode,
    // url,
    project_id: projectId
  })
  // 插入更新
  if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
    // 需要改变下操作数据
    let updateData = dealUpdateRecordData(rawRecordList[0], recordInfo)
    return await updateRecord(projectId, visitAt, updateData)
  } else { // 新建
    return await insertRecord(projectId, visitAt, recordInfo)
  }
}

function dealUpdateRecordData(oldData, newData) {
  let res = {
    ...oldData
  }
  delete res.id
  res['count_size']
  res['render_time'] = (res['render_time'] * res['count_size'] + newData['render_time']) / (res['count_size'] + 1)
  res['loaded_time'] = (res['loaded_time'] * res['count_size'] + newData['loaded_time']) / (res['count_size'] + 1)
  res['count_size']++

  res['ctrlsize'] = newData['ctrlsize']
  res['container_ctrl'] = newData['container_ctrl']
  res['container_ctrl_detail'] = newData['container_ctrl_detail']
  res['loaded_eventsize'] = newData['loaded_eventsize']
  res['loaded_event_detail'] = newData['loaded_event_detail']
  return res
}

async function insertRecord(projectId, visitAt, recordInfo) {
  let tableName = getTableName(projectId, visitAt)
  let updateAt = moment().unix()
  let data = Object.assign({}, recordInfo, {
    update_time: updateAt,
    create_time: updateAt,
    count_size: 1
  })
  let insertResult = await Knex
    .returning('id')
    .insert(data)
    .from(tableName)
    .catch(e => {
      Logger.warn(tableName + ' page engine insert数据插入失败，错误原因=>', e)
      return 0
    })
  let insertId = _.get(insertResult, [0], 0)
  return insertId
}

async function updateRecord(projectId, visitAt, recordInfo) {
  let tableName = getTableName(projectId, visitAt)
  let ucid = recordInfo.ucid
  let pagecode = recordInfo.pagecode
  let tenantid = recordInfo.tenantid
  let url = recordInfo.url
  let updateAt = moment().unix()
  let data = Object.assign({}, recordInfo, {
    update_time: updateAt
  })

  let affectRows = await Knex(tableName)
    .where('project_id', '=', projectId)
    .where('tenantid', '=', ucid)
    .where('pagecode', '=', pagecode)
    .update(data)
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
      for (let key in condition) {
        if (condition[key]) {
          builder.where(key, '=', condition[key])
        }
      }
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
  Logger.log('summary\page-engine-render.js getList tableNameList', tableNameList)
  console.log('condition', condition)
  for (let tableName of tableNameList) {
    let rawRecordList = await Knex
      .select(TABLE_COLUMN)
      .from(tableName)
      .whereBetween('update_time', [startAt, finishAt])
      .andWhere(builder => {
        // if (condition['pagecode']) {
        //   builder.where('pagecode', condition['pagecode'])
        // }
        // if (condition['tenantid']) {
        //   builder.where('tenantid', condition['tenantid'])
        // }
        let conditionOperationMap = {
          '__range_min__': '>=',
          '__range_max__': '<=',
          '__like__': 'like'
        }
        for (let key in condition) {
          if (condition[key]) {
            let matcher = key.match(/(__.+__)(.+)?/)
            let operation = ''
            let prop = key
            if (matcher && matcher[1]) {
              operation = conditionOperationMap[matcher[1]]
              prop = matcher[2]
            }
            if (operation) {
              console.log('prop', prop)
              console.log('operation', operation)
              console.log('condition[key]', condition[key])
              builder.where(prop, operation, condition[key])
            } else {
              builder.where(prop, condition[prop])
            }
          }
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
  getTableName,
  updateRecord,
  getRecord,
  insertRecord,
  replaceAndAutoIncrementRecord,
  getList
}