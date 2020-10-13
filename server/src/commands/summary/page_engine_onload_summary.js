import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineOnload from '~/src/model/summary/page_engine_onload'
import MPageEngineOnloadSummary from '~/src/model/summary/page_engine_onload_summary'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'

export default class PageEngineOnloadSummary extends Base {
  static get signature() {
    return `
    Summary:PageEngineOnloadSummary
     
     {sumaryAtTime:按天统计引擎表单页面加载渲染情况${DATE_FORMAT.DATABASE_BY_DAY}格式}
     `
  }

  static get description() {
    return '[按天] 基于数据库统计引擎表单页面加载情况'
  }

  async execute(args, options) {
    Logger.info('开始执行 Summary:PageEngineRenderOnload')
    let { sumaryAtTime } = args
    console.log('sumaryAtTime', sumaryAtTime)
    // 时间要变回前一天
    let countMoment = moment(sumaryAtTime).subtract(1, 'day').set('hour', 0).set('minute', 0).set('second', 0)
    let countDate = countMoment.format(DATE_FORMAT.DISPLAY_BY_DAY)
    let rowProjectList = await MProject.getList()
    for (let rawProject of rowProjectList) {
      let projectId = _.get(rawProject, 'id', '')
      let projectName = _.get(rawProject, 'project_name', '')
      if (!projectId) {
        continue
      }
      Logger.info(`开始处理项目${projectId}(${projectName})的数据 时间:${countDate}`)
      let startAt = countMoment.unix()
      let endAt = countMoment.clone().set('hour', 23).set('minute', 59).set('second', 59).unix()
      let res = await MPageEngineOnload.getList(projectId, startAt, endAt)
      if (res.total) {
        let tenantDataMap = this.countPageEngineRenerDatas(res)
        this.save2DB(projectId, Object.values(tenantDataMap))
      } else {
        Logger.info('当前无数据需要统计')
        return
      }
    }
  }
  
  countPageEngineRenerDatas(datas = []) {
    // 需要根据tenantid整合
    let res = {}
    datas.forEach(data => {
      let { tenantid } = data
      if (!res[tenantid]) {
        // 新的
        let tmpData = {
          tenantid: data.tenantid,
          render_time: 0,
          loaded_time: data.loaded_time,
          count_size: 1,
          update_time: data.update_time,
          create_time: data.update_time,
          count_at_time: moment(data.update_time * 1000).format(DATE_FORMAT.DISPLAY_BY_DAY)
        }
        res[tenantid] = tmpData
      } else {
        let oldData = res[tenantid]
        // let render_time = (oldData.render_time * oldData.count_size + data.render_time) / (oldData.count_size + 1)
        let loaded_time = (oldData.loaded_time * oldData.count_size + data.loaded_time) / (oldData.count_size + 1)
        let count_size = oldData.count_size + 1
        let tmpData = {
          tenantid: data.tenantid,
          id: oldData.id,
          render_time: 0,
          loaded_time,
          count_size,
          count_at_time: oldData.count_at_time || moment(data.update_time * 1000).format(DATE_FORMAT.DISPLAY_BY_DAY)
        }
        res[tenantid] = tmpData
      }
    })
    return res
  }


  async addOrReplaceRecord(projecetId, data) {
    return await MPageEngineOnloadSummary.updateRecord(projecetId, data)
  }

  async save2DB(projectId, records = []) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0

    for (let record of records) {
      try {
        let isSuccess = await this.addOrReplaceRecord(projectId, record)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_onload_summary 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_onload_summary 插入失败', e)
        processRecordCount++
      }
    }

    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  isArgumentsLegal(args, options) {
    let { sumaryAtTime } = args
    let sumaryAtMoment = moment(sumaryAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_DAY)
    if (
      moment.isMoment(sumaryAtMoment) === false ||
      sumaryAtMoment.isValid() === false
    ) {
      this.warn(`参数不正确 sumaryAtTime => ${sumaryAtTime}`)
      return false
    }
    return true
  }
}