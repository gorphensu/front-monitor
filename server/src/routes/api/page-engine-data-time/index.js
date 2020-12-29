import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import MPageEngineDataTime from '~/src/model/summary/page_engine_data_time'

const getPageEngineDataTimeSummary = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageenginedatatime/summary',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    let count_type = _.get(request, ['count_type'], 'day')
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      moment().subtract(1, 'days').set(0, 'hour').set(0, 'minutes').set(0, 'seconds').unix()
    }
    if (endAt) {
      endAt = _.floor(endAt / 1000)
    } else {
      moment().set(0, 'hour').set(0, 'minutes').set(0, 'seconds').unix() - 1
    }

    let condition = {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      // count_type,
      pagesize: 999999999
    }

    console.log('/api/pageenginedatatime/summary get condition', condition)
    let resData = await MPageEngineDataTime.getList(projectId, startAt, endAt, condition, count_type)
    res.send(API_RES.showResult(resData))
  }
)

export default {
  ...getPageEngineDataTimeSummary
}