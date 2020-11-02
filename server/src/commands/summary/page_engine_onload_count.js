import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineOnloadParse from '~/src/model/parse/page_engine_onload'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'
import URL from 'url'

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
    let endAt = endMoment.unix()

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
          res = this.preCountMinuteData(res)
          break
        case DATE_FORMAT.UNIT.HOUR:
          break
        case DATE_FORMAT.UNIT.DAY:
          break
        default:
          break;
      }
      this.save2DB(projectId, res, countType)
    }
  }

  save2DB(projectId, records, countType) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0

    for (let record of records) {

    }
  }

  // 根据源数据，将tenantid pagecode url app_version分组
  preCountMinuteData(records) {
    let dataMap = new Map()
    records.forEach(record => {
      let url = record.url
      let urlObj = URL.parse(url)
      url = `${urlObj.host}`
      let key = `${record.tenantid}:${record.pagecode}:${url}:${record.app_version}`
      let countedData = dataMap.get(key)
      if (!countedData) {
        countedData = {
          count_size: 1,
          loaded_time: record.loaded_time,
          tenantid: record.tenantid,
          pagecode: record.pagecode,
          app_version: record.app_version,
          url
        }
      }
      countedData.loaded_time = (countedData.loaded_time * countedData.count_size + record.loaded_time) / (countedData.count_size + 1)
      countedData.count_size = countedData.count_size + 1
    })
    return dataMap.values()
  }
}