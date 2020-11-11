import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MProject from '~/src/model/project/project'
import MSummaryPagePerformance from '~/src/model/summary/page_performance'
import MPerformance from '~/src/model/parse/performance'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'


export default class SummaryPagePerformance extends Base {
  static get signature() {
    return `
    Summary:PagePerformance
     {countType:统计类型}
     {startAtTime:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     {endAtTime:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
    `
  }

  static get description() {
    return '[按小时/天] 解析page_performance数据表, 统计的指定时间范围内的性能指标'
  }

  isArgumentsLegal(args, options) {
    let { countType, startAtTime, endAtTime } = args
    if (countType !== DATE_FORMAT.UNIT.DAY && countType !== DATE_FORMAT.UNIT.HOUR) {
      this.warn(`统计类别不为 ${DATE_FORMAT.UNIT.DAY}/${DATE_FORMAT.UNIT.HOUR} `, 'countType => ', countType)
      return false
    }
    let startAtMoment = moment(startAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_UNIT[countType])
    if (moment.isMoment(startAtMoment) === false || startAtMoment.isValid() === false) {
      this.warn(`startAtTime解析失败`, ' => ', startAtTime)
      return false
    }
    let endAtMoment = moment(endAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_UNIT[countType])
    if (moment.isMoment(endAtMoment) === false || endAtMoment.isValid() === false) {
      this.warn(`endAtTime解析失败`, ' => ', endAtTime)
      return false
    }
    return true
  }

  async execute(args, options) {
    Logger.info('开始执行 Summary:PagePerformance')
    let { countType, startAtTime, endAtTime } = args
    let startMoment = moment(startAtTime)
    let endMoment = moment(endAtTime)
    this.startMoment = startMoment
    this.endMoment = endMoment

    let startAt = startMoment.unix()
    let endAt = endMoment.unix() - 1

    this.startAt = startAt
    this.endAt = endAt

    let rowProjectList = await MProject.getList()
    for (let rawProject of rowProjectList) {
      let projectId = _.get(rawProject, 'id', '')
      if (!projectId) {
        continue
      }
      let res = []
      // 从结果表 结果里面查找区间数据，然后合并
      res = await MSummaryPagePerformance.get(projectId, startAt, {
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        count_type: countType === DATE_FORMAT.UNIT.HOUR ? 'minute' : 'hour'
      })
      res = this.preCountData(res, countType)
      this.save2DB(projectId, res, countType, startAt, endAt)
    }
  }

  async save2DB(projectId, records, countType, startAt, endAt) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0
    for (let record of records) {
      let oldRecords = await MSummaryPagePerformance.get(projectId, startAt, {
        url: record.url,
        app_version: record.app_version,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        count_type: countType
      })
      if (!oldRecords.length) {
        let isSuccess = await MSummaryPagePerformance.insert(projectId, startAt, record)
        if (isSuccess) {
          successSaveCount++
        }
      } else {
        // 处理合并数据
        let oldRecord = oldRecords[0]

        oldRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_DOM解析耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_资源加载耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_资源加载耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_资源加载耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首次渲染耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首次渲染耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首次渲染耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首包时间耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首包时间耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首包时间耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首次可交互耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首次可交互耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首次可交互耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_页面完全加载耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord.count_size = record.count_size + oldRecord.count_size
        let isSuccess = await MSummaryPagePerformance.update(projectId, startAt, oldRecord)
        if (isSuccess) {
          successSaveCount++
        }
      }
      processRecordCount++
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
    return { totalRecordCount, processRecordCount, successSaveCount }
  }

  preCountData(records, countType) {
    let dataMap = {}
    records.forEach(record => {
      let key = `${record.url}:${record.app_version}`
      let countedData = dataMap[key]
      if (!countedData) {
        countedData = {
          ...record
        }
      } else {
        // 更新数据|
        countedData[MPerformance.INDICATOR_TYPE_DOM解析耗时] = (countedData[MPerformance.INDICATOR_TYPE_DOM解析耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_DOM解析耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_资源加载耗时] = (countedData[MPerformance.INDICATOR_TYPE_资源加载耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_资源加载耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_首次渲染耗时] = (countedData[MPerformance.INDICATOR_TYPE_首次渲染耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_首次渲染耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_首包时间耗时] = (countedData[MPerformance.INDICATOR_TYPE_首包时间耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_首包时间耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_首次可交互耗时] = (countedData[MPerformance.INDICATOR_TYPE_首次可交互耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_首次可交互耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] = (countedData[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData[MPerformance.INDICATOR_TYPE_页面完全加载耗时] = (countedData[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * countedData.count_size + record[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * record.count_size) / (record.count_size + countedData.count_size)
        countedData.count_size = record.count_size + countedData.count_size
      }
      countedData.update_time = record.create_time
      countedData.count_type = countType
      dataMap[key] = countedData
    })
    return Object.values(dataMap)
  }
}
