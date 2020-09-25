import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import MPageEngineOnload from '~/src/model/parse/page_engine_onload'
import MSummaryPageEngineRender from '~/src/model/summary/page_engine_render'
import MSummaryPageEngineOnloadSummary from '~/src/model/summary/page_engine_onload_summary'

const getPageEngineOnloadList = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengine/renderlist',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    console.log('performance projectId ', projectId)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    let condition = {
      pagecode: _.get(request, ['pagecode'], '')
    }

    const currentStamp = moment().unix()
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      startAt = currentStamp
    }
    if (endAt) {
      endAt = _.ceil(endAt / 1000)
    } else {
      endAt = currentStamp
    }
    console.log('projectId, /api/pageengine/renderlist, startAt, endAt, summaryBy ', projectId, '/api/pageengine/renderlist', startAt, endAt)
    let list = await MPageEngineOnload.getList(projectId, startAt, endAt, condition)
    res.send(API_RES.showResult(list))
  })

const getSummaryPageEngineOnloadList = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengine/summarylist',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)
    let loadedTime = _.get(request, ['loadedtime'])

    let condition = {
      pagecode: _.get(request, ['pagecode'], ''),
      tenantid: _.get(request, ['tenantid'], ''),
      __range_min__loaded_time: loadedTime
    }

    const currentStamp = moment().unix()
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      startAt = currentStamp
    }
    if (endAt) {
      endAt = _.ceil(endAt / 1000)
    } else {
      endAt = currentStamp
    }
    console.log('projectId, /api/pageengine/summarylist, startAt, endAt, summaryBy ', projectId, '/api/pageengine/renderlist', startAt, endAt)
    let list = await MSummaryPageEngineRender.getList(projectId, startAt, endAt, condition)
    res.send(API_RES.showResult(list))
  }
)

const getSummaryPageEngineOnloadSummary = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengine/summary',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    // 如果没有设置开始结束时间？
    const currentStamp = moment().unix()
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      startAt = currentStamp
    }
    if (endAt) {
      endAt = _.ceil(endAt / 1000)
    } else {
      endAt = currentStamp
    }

    let condition = {
      tenantid: _.get(request, ['tenantid'], '')
    }

    let resData = {
      '0-3': 0,
      '3-5': 0,
      '5-8': 0,
      '8-10': 0,
      'more': 0
    }
    let list = await MSummaryPageEngineOnloadSummary.getList(projectId, startAt, endAt, condition)
    list.forEach(data => {
      let { loaded_time, count_size } = data
      if (loaded_time < 3000) {
        resData['0-3'] += count_size
      } else if (loaded_time >= 3000 && loaded_time < 5000) {
        resData['3-5'] += count_size
      } else if (loaded_time >= 5000 && loaded_time < 8000) {
        resData['5-8'] += count_size
      } else if (loaded_time >= 8000 && loaded_time < 10000) {
        resData['8-10'] += count_size
      } else {
        resData['more'] += count_size
      }
    })
    // 做统计计算
    res.send(API_RES.showResult(resData))
  }
)

export default {
  ...getPageEngineOnloadList,
  ...getSummaryPageEngineOnloadList,
  ...getSummaryPageEngineOnloadSummary
}