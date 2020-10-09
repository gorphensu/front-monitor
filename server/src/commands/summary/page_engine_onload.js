import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineOnloadParser from '~/src/model/parse/page_engine_onload'
import MPageEngineOnloadSummary from '~/src/model/summary/page_engine_onload'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'

class SummaryPageEngineOnload extends Base {
  static get signature() {
    return `
     Summary:PageEngineOnload
     
     {sumaryAtTime:按小时统计引擎表单页面加载情况${DATE_FORMAT.DISPLAY_BY_HOUR}格式}
     `
  }

  static get description() {
    return '[按小时] 基于数据库统计引擎表单页面加载渲染情况'
  }

  /**
   * 每小时跑一次, 获取项目列表, 遍历t_o_page_engine_render表
   * 这里的执行时间点是什么？每小时01分的时候，然后区间是跟一个小时内的数据
   * @param {*} args
   * @param {*} options
   */
  async execute(args, options) {
    Logger.info('开始执行 Summary:PageEngineOnload')
    // 按小时统计, 每天都跑
    let { sumaryAtTime } = args
    if (this.isArgumentsLegal(args, options) === false) {
      this.warn('参数不正确, 自动退出')
      return false
    }
    let visitAt = moment(sumaryAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_HOUR).unix()
    // MPageEngineRenderSummary.summaryPageEngineRender(sumaryAt)
    // 根据小时时间段获取区间列表
    let endAtMoment = moment.unix(visitAt).set('minute', 0).set('second', 0)
    let startAtMoment = endAtMoment.clone().add(-1, 'hour')
    let rawProjectList = await MProject.getList()
    Logger.info('项目列表获取完毕, =>', rawProjectList)
    for (let rawProject of rawProjectList) {
      let projectId = _.get(rawProject, 'id', '')
      let projectName = _.get(rawProject, 'project_name', '')
      if (projectId === 0 || projectId === '') {
        continue
      }
      Logger.info(`开始处理项目${projectId}(${projectName})的数据`)
      Logger.info(`[${projectId}(${projectName})] 时间范围:${startAtMoment.format(DATE_FORMAT.DIAPLAY_BY_MINUTE) + ':00'}~${endAtMoment.format(DATE_FORMAT.DIAPLAY_BY_MINUTE) + ':59'}`)
      // startAt = moment.unix(startAt).subtract(-2, 'minute').unix()
      // finishAt = moment.unix(finishAt).subtract(-2, 'minute').unix()
      // 获取后两分钟，因为执行时间的原因。
      let res = await MPageEngineOnloadParser.getList(projectId, startAtMoment.clone().subtract(-2, 'minute').unix(), endAtMoment.clone().subtract(-2, 'minute').unix(), {
        // loaded_time 大于3000的数据
        __range_min__loaded_time: 3500
      })

      if (!res || !res.length) {
        Logger.info('当前无数据需要统计')
        return
      }
      res = this.mergeRecordData(res, {
        project_id: projectId
      })
      // 保存到每月统计当中
      this.save2DB(res, visitAt)
    }
  }

  mergeRecordData(records, mergeData = {}) {
    if (!records || !records.length) {
      return []
    }
    return records.map(record => {
      return {
        ...record,
        ...mergeData
      }
    })
  }

  async save2DB(records = [], visitAt) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0

    for (let item of records) {
      try {
        let isSuccess = await MPageEngineOnloadSummary.replaceAndAutoIncrementRecord(item, visitAt)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_onload 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_onload 插入失败', e)
        processRecordCount++
      }
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  /**
   * [可覆盖]检查请求参数, 默认检查传入的时间范围是否正确, 如果有自定义需求可以在子类中进行覆盖
   * @param {*} args
   * @param {*} options
   * @return {Boolean}
   */
  isArgumentsLegal(args, options) {
    let { sumaryAtTime } = args
    let sumaryAtMoment = moment(sumaryAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_HOUR)
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

export default SummaryPageEngineOnload
