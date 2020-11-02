import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import MSummaryPageEngineCtrlsSummary from '~/src/model/summary/page_engine_ctrls.js'

const getPageEngineCtrlsList = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageenginectrls/list',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    let type = _.get(request, ['type'], 'day')
    let pagesize = Number(_.get(request, ['pagesize'], 0))
    let pageindex = _.get(request, ['pageindex'], '')
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
      pagesize,
      pageindex
    }

    let list = await MSummaryPageEngineCtrlsSummary.getList(projectId, startAt, endAt, condition, type)
    // 做统计计算
    res.send(API_RES.showResult(list))
  }
)

export default {
  ...getPageEngineCtrlsList
}