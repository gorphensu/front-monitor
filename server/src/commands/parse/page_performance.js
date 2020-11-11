import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import moment from 'moment'
import MPerformance from '~/src/model/parse/performance'
import ParseBase from '~/src/commands/parse/base'
import MPagePerformance from '~/src/model/summary/page_performance'

export default class ParsePagePerformance extends ParseBase {
  static get signature() {
    return `
     Parse:PagePerformance 
     {countType:统计类型}
     {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     `
  }

  static get description() {
    return '[按分钟] 解析nginx日志, 分析每10分钟的指定时间范围内的性能指标'
  }

  /**
   * 判断该条记录 是不是perf 记录
   * @param {} record 
   */
  isLegalRecord(record) {
    let projectId = _.get(record, ['project_id'], 0)
    if (_.get(record, ['type'], '') !== 'perf') {
      return false
    }
    projectId = parseInt(projectId)
    if (_.isNumber(projectId) === false) {
      return false
    }
    if (projectId <= 0) {
      return false
    }
    let detail = _.get(record, ['detail'], {})
    return true
  }

  /**
   * 存储记录到内存，临时存储，暂时没有保存到数据库中
   * @param {*} record 
   */
  async processRecordAndCacheInProjectMap(record) {
    let visitAt = _.get(record, ['time'], 0)
    let projectId = _.get(record, ['project_id'], 0)
    // 数据都在detail里面
    let detail = _.get(record, ['detail'], {})
    let app_version = _.get(record, ['common', 'version'], '')
    let url = _.get(detail, ['url'], '')
    if (url && url[url.length - 1] === '/') {
      url = url.slice(0, -1)
    }
    if (_.isNumber(visitAt) === false || visitAt === 0 || _.isEmpty(detail) || _.isString(url) === false || url.length === 0) {
      this.log(`数据不合法, 自动跳过 visitAt => ${visitAt}`, 'detail =>', detail, 'url =>', url)
      return false
    }
    if (detail.domComplete == null) {
      return false
    }
    let visitAtMinute = moment.unix(visitAt).format(DATE_FORMAT.DATABASE_BY_MINUTE)

    // 计算响应指标数据
    let indicatorRecord = this.composeIndicatorRecord(detail)
    this.replaceIndicatorRecord(projectId, url, app_version, indicatorRecord)
    // this.save2DB()
  }

  async save2DB() {
    let totalRecordCount = this.getRecordCountInProjectMap()
    let processRecordCount = 0
    let successSaveCount = 0
    let startAt = this.startAtMoment.unix()
    let endAt = this.endAtMoment.unix()
    for (let [key, record] of this.projectMap) {
      let projectId = key.split(':')[0]
      let oldRecords = await MPagePerformance.get(projectId, record.create_time, {
        url: record.url,
        app_version: record.app_version,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        count_type: 'minute'
      })
      if (!oldRecords.length) {
        let isSuccess = await MPagePerformance.insert(projectId, record.create_time, record)
        if (isSuccess) {
          successSaveCount++
        }
      } else {
        // 处理合并数据
        let oldRecord = oldRecords[0]
        // console.log('record', record)
        // console.log('oldRecord', oldRecord, oldRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_DOM解析耗时] * record.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_DOM解析耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_资源加载耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_资源加载耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_资源加载耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首次渲染耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首次渲染耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首次渲染耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首包时间耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首包时间耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首包时间耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_首次可交互耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_首次可交互耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_首次可交互耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord[MPerformance.INDICATOR_TYPE_页面完全加载耗时] = (oldRecord[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * oldRecord.count_size + record[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * record.count_size) / (record.count_size + oldRecord.count_size)
        oldRecord.count_size = record.count_size + oldRecord.count_size
        // console.log('newRecord', record)
        let isSuccess = await MPagePerformance.update(projectId, oldRecord.create_time, oldRecord)
        if (isSuccess) {
          successSaveCount++
        }
      }
      processRecordCount++
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
    return { totalRecordCount, processRecordCount, successSaveCount }
  }

  getRecordCountInProjectMap() {
    let totalCount = 0
    for (let key of this.projectMap) {
      totalCount = totalCount + 1
    }
    return totalCount
  }

  replaceIndicatorRecord(projectId, url, app_version, indicatorRecord) {
    // indicatorRecord = this.unNormalizeRecord(indicatorRecord)
    // 初始化Map路径
    let uniqIdPath = `${projectId}:${url}:${app_version}`
    let tmpData = null
    let startAt = this.startAtMoment.unix()
    if (!this.projectMap.has(uniqIdPath)) {
      tmpData = {
        ...indicatorRecord,
        create_time: startAt,
        update_time: startAt,
        count_type: 'minute',
        count_size: 1,
        app_version,
        url
      }
    } else {
      tmpData = this.projectMap.get(uniqIdPath)
      // 做合并
      tmpData[MPerformance.INDICATOR_TYPE_DOM解析耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_DOM解析耗时] + tmpData[MPerformance.INDICATOR_TYPE_DOM解析耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_资源加载耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_资源加载耗时] + tmpData[MPerformance.INDICATOR_TYPE_资源加载耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_首次渲染耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_首次渲染耗时] + tmpData[MPerformance.INDICATOR_TYPE_首次渲染耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_首包时间耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_首包时间耗时] + tmpData[MPerformance.INDICATOR_TYPE_首包时间耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_首次可交互耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_首次可交互耗时] + tmpData[MPerformance.INDICATOR_TYPE_首次可交互耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] + tmpData[MPerformance.INDICATOR_TYPE_DOM_READY_耗时] * tmpData.count_size) / (tmpData.count_size + 1)
      tmpData[MPerformance.INDICATOR_TYPE_页面完全加载耗时] = (indicatorRecord[MPerformance.INDICATOR_TYPE_页面完全加载耗时] + tmpData[MPerformance.INDICATOR_TYPE_页面完全加载耗时] * tmpData.count_size) / (tmpData.count_size + 1)
    }
    this.projectMap.set(uniqIdPath, tmpData)
  }

  composeIndicatorRecord(indicatorCollection) {
    let domInteractive = _.get(indicatorCollection, ['domInteractive'], 0)
    let responseEnd = _.get(indicatorCollection, ['responseEnd'], 0)
    let loadEventStart = _.get(indicatorCollection, ['loadEventStart'], 0)
    let domContentLoadedEventEnd = _.get(indicatorCollection, ['domContentLoadedEventEnd'], 0)
    let fetchStart = _.get(indicatorCollection, ['fetchStart'], 0)
    let responseStart = _.get(indicatorCollection, ['responseStart'], 0)
    let domainLookupStart = _.get(indicatorCollection, ['domainLookupStart'], 0)
    // dom-parse
    return {
      [MPerformance.INDICATOR_TYPE_DOM解析耗时]: domInteractive - responseEnd,
      [MPerformance.INDICATOR_TYPE_资源加载耗时]: loadEventStart - domContentLoadedEventEnd,
      [MPerformance.INDICATOR_TYPE_首次渲染耗时]: responseEnd - fetchStart,
      [MPerformance.INDICATOR_TYPE_首包时间耗时]: responseStart - domainLookupStart,
      [MPerformance.INDICATOR_TYPE_首次可交互耗时]: domInteractive - fetchStart,
      [MPerformance.INDICATOR_TYPE_DOM_READY_耗时]: domContentLoadedEventEnd - fetchStart,
      [MPerformance.INDICATOR_TYPE_页面完全加载耗时]: loadEventStart - fetchStart
    }
  }
}