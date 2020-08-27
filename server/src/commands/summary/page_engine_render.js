import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
// import MSystemBrowser from '~/src/model/summary/system_browser'
import MPageEngineRenderSummary from '~/src/model/summary/page_engine_render'
import MPageEngineRenderParser from '~/src/model/parse/page_engine_render'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'

class PageEngineRender extends Base {
  static get signature() {
    return `
     Summary:PageEngineRender
     
     {sumaryAtTime:按小时统计引擎表单页面加载渲染情况${DATE_FORMAT.DISPLAY_BY_HOUR}格式}
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
    Logger.info('开始执行 Summary:PageEngineRender')
    // 按月统计, 每天都跑
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
      let res = await MPageEngineRenderParser.getList(projectId, startAtMoment.unix(), endAtMoment.unix())
      if (!res || !res.length) {
        Logger.info('当前无数据需要统计')
        return
      }
      let resObj = this.groupPageEngineRenderRecord(res)
      let records = []
      Object.values(resObj).forEach(async items => {
        let item = this.mergeGroupRecords(items)
        records.push(item)
      })
      this.save2DB(records, visitAt)
    }
  }

  async save2DB(records = [], visitAt) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0
    for (let item of records) {
      try {
        let isSuccess = await MPageEngineRenderSummary.replaceAndAutoIncrementRecord(item, visitAt)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_rener 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_rener 插入失败', e)
        processRecordCount++
      }
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  groupPageEngineRenderRecord(list) {
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

  mergeGroupRecords(list) {
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
            res['ctrlsize'] = detail.ctrlsize
            res['container_ctrl'] = detail.containerctrl ? JSON.stringify(detail.containerctrl) : ''
            res['container_ctrl_detail'] = detail.containerctrldetail ? JSON.stringify(detail.containerctrldetail) : ''
          } catch { }
        }
      } else if (item.operation_type === 'onload') {
        res['loaded_time'] = item.cost_time
        if (item.detail) {
          try {
            let detail = JSON.parse(item.detail)
            res['loaded_eventsize'] = detail.eventsize
            res['loaded_event_detail'] = detail.eventdetail ? JSON.stringify(detail.eventdetail) : ''
          } catch { }
        }
      }
    })
    return res
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

export default PageEngineRender
