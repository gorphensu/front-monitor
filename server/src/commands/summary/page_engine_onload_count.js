import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineOnloadParse from '~/src/model/parse/page_engine_onload'
import MPageEngineOnloadCount from '~/src/model/summary/page_engine_onload_count'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'

export default class PageEngineOnloadCount extends Base {
  static get signature() {
    return `
    Summary:PageEngineOnloadCount
     {countType:统计类型}
     {startAtTime:统计引擎表单页面加载情况}
     {endAtTime:统计引擎表单页面加载情况}
     `
  }

  static get description() {
    return `[按每10分钟/每小时/每天]基于数据库统计表单引擎加载情况`
  }

  isArgumentsLegal(args, options) {
    let { countType, startAtTime, endAtTime } = args
    if (countType !== DATE_FORMAT.UNIT.MINUTE && countType !== DATE_FORMAT.UNIT.DAY && countType !== DATE_FORMAT.UNIT.HOUR) {
      this.warn(`统计类别不为 ${DATE_FORMAT.UNIT.MINUTE}/${DATE_FORMAT.UNIT.DAY}/${DATE_FORMAT.UNIT.HOUR} `, 'countType => ', countType)
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
    Logger.info('开始执行 Summary:PageEngineOnloadCount')
    let { countType, startAtTime, endAtTime } = args
    console.log(countType, startAtTime, endAtTime)
    let startMoment = moment(startAtTime)
    let endMoment = moment(endAtTime)

    console.log(startMoment, endMoment)

    let startAt = startMoment.unix()
    let endAt = endMoment.unix() - 1

    let rowProjectList = await MProject.getList()
    for (let rawProject of rowProjectList) {
      let projectId = _.get(rawProject, 'id', '')
      let projectName = _.get(rawProject, 'project_name', '')
      if (!projectId) {
        continue
      }
      Logger.info(`开始处理项目${projectId}(${projectName})的数据 时间:${moment().toString()}`)
      let res = []
      // 确认coutType，如果是分钟的，先从源表中根据时间范围查找相关的数据表。
      switch (countType) {
        case DATE_FORMAT.UNIT.MINUTE:
          res = await MPageEngineOnloadParse.getList(projectId, startAt, endAt)
          res = this.preCountData(res, countType)
          break
        case DATE_FORMAT.UNIT.HOUR:
        case DATE_FORMAT.UNIT.DAY:
          // 从结果表里面找区间数据，然后合并
          res = await MPageEngineOnloadCount.getList(projectId, startAt, endAt, {
            __range_min__create_time: startAt,
            __range_max__create_time: endAt,
            count_type: countType === DATE_FORMAT.UNIT.HOUR ? 'minute' : 'hour'
          })
          res = this.preCountData(res, countType)
          break
        default:
          break;
      }
      this.save2DB(projectId, res, countType, startAt, endAt)
    }
  }

  async save2DB(projectId, records, countType, startAt, endAt) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0

    for (let record of records) {
      try {
        debugger
        let isSuccess = await MPageEngineOnloadCount.updateOrInsert(projectId, record, startAt, endAt, countType !== 'minute' ? true : false)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_onload_count 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_onload_count 插入失败', e)
        processRecordCount++
      }
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  // 根据源数据，将tenantid pagecode url app_version分组
  preCountData(records, countType) {
    let dataMap = {}
    records.forEach(record => {
      let url = record.url
      let urlObj = new URL(url)
      url = `${urlObj.origin}`
      let key = `${record.tenantid}:${record.pagecode}:${url}:${record.app_version}`
      let countedData = dataMap[key]
      if (!countedData) {
        countedData = {
          count_size: record.count_size || 1,
          loaded_time: record.loaded_time,
          tenantid: record.tenantid,
          pagecode: record.pagecode,
          app_version: record.app_version,
          url,
          create_time: record.create_time,
          count_type: countType
        }
      }
      countedData.loaded_time = (countedData.loaded_time * countedData.count_size + record.loaded_time) / (countedData.count_size + 1)
      if (countType === 'minute') {
        countedData.count_size = countedData.count_size + 1
      }
      countedData.update_time = record.create_time
      dataMap[key] = countedData
    })
    return Object.values(dataMap)
  }
}