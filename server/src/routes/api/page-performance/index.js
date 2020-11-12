import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import MPagePerformance from '~/src/model/summary/page_performance'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'

/**
 * 性能指标接口
 *
 * 提供指定项目时间范围内的如下数据(均只取当月数据):
 * 1. 项目下url列表
 * 4. 提供项目整体指标均值
 * 2. 提供指定url下的各项指标平均值(一个接口, 返回所有指标数据)
 * 3. 提供指定url下的各项指标折线图(按url, 指标进行返回)
 */

/**
 * 提供时间范围之内的所有url列表
 */
let versionList = RouterConfigBuilder.routerConfigBuilder('/api/pageperformance/version_list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0);
  console.log('page performance projectId ', projectId);
  let request = _.get(req, ['query'], {})
  // 获取开始&结束时间
  let startAt = _.get(request, ['st'], 0)
  let endAt = _.get(request, ['et'], 0)
  const summaryBy = _.get(request, 'summaryBy', '')
  if (_.includes([DATE_FORMAT.UNIT.DAY, DATE_FORMAT.UNIT.HOUR, DATE_FORMAT.UNIT.MINUTE], summaryBy) === false) {
    res.send(API_RES.showError(`summaryBy参数不正确`))
    return
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
  let urlList = await MPagePerformance.getDistinctVersionListInRange(projectId, startAt, endAt, summaryBy)
  res.send(API_RES.showResult(urlList))
}
)

/**
 * 提供时间范围之内的所有url列表
 */
let urlList = RouterConfigBuilder.routerConfigBuilder('/api/pageperformance/url_list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0);
  console.log('performance projectId ', projectId);
  let request = _.get(req, ['query'], {})
  // 获取开始&结束时间
  let startAt = _.get(request, ['st'], 0)
  let endAt = _.get(request, ['et'], 0)
  const summaryBy = _.get(request, 'summaryBy', '')
  if (_.includes([DATE_FORMAT.UNIT.DAY, DATE_FORMAT.UNIT.HOUR, DATE_FORMAT.UNIT.MINUTE], summaryBy) === false) {
    res.send(API_RES.showError(`summaryBy参数不正确`))
    return
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
  let urlList = await MPagePerformance.getDistinctUrlListInRange(projectId, startAt, endAt, summaryBy)
  res.send(API_RES.showResult(urlList))
}
)

let list = RouterConfigBuilder.routerConfigBuilder('/api/pageperformance/list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
  let request = _.get(req, ['query'], {})
  // 获取开始&结束时间
  let startAt = _.get(request, ['st'], 0)
  let endAt = _.get(request, ['et'], 0)
  let url = _.get(request, ['url'], '')
  const summaryBy = _.get(request, 'summaryBy', '')
  if (_.includes([DATE_FORMAT.UNIT.DAY, DATE_FORMAT.UNIT.HOUR, DATE_FORMAT.UNIT.MINUTE], summaryBy) === false) {
    res.send(API_RES.showError(`summaryBy参数不正确`))
    return
  }
  const currentStamp = moment().set('hour', 0).set('minute', 0).set('second', 0).unix()
  const lastDayStamp = moment().set('hour', 0).set('minute', 0).set('second', 0).subtract(1, 'days').unix()
  if (startAt) {
    startAt = _.floor(startAt / 1000)
  } else {
    startAt = lastDayStamp
  }
  if (endAt) {
    endAt = _.ceil(endAt / 1000)
  } else {
    endAt = currentStamp
  }

  let list = await MPagePerformance.list(projectId, startAt, endAt, {
    count_type: summaryBy,
    url,
    __range_min__create_time: startAt,
    __range_max__create_time: endAt
  })
  res.send(API_RES.showResult(list))
})


export default {
  ...versionList,
  ...urlList,
  ...list
}
