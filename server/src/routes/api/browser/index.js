import moment from 'moment'
import _ from 'lodash'
import CModel from '~/src/model'
import API_RES from '~/src/constants/api_res'
import Util from '~/src/library/utils/modules/util'
import DATE_FORMAT from '~/src/constants/date_format'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import Knex from '~/src/library/mysql'
import MSystemBrowser from '~/src/model/summary/system_browser'

let getBrowserList = RouterConfigBuilder.routerConfigBuilder('/api/browser/list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  try {
    let tableName = 't_r_system_browser'
    let currentMonth = moment().format(DATE_FORMAT.DATABASE_BY_MONTH)
    let month = _.get(req, ['query', 'month'], currentMonth)
    const projectId = _.get(req, ['fee', 'project', 'projectId'], 0)

    let browserRecordParams = {
      tableName: tableName,
      distinctName: 'browser',
      where: {
        count_at_month: month,
        project_id: projectId
      }
    }

    let browserRecordList = await CModel.getDistinct(browserRecordParams)

    let result = []
    for (let browserRecord of browserRecordList) {
      result.push(browserRecord.browser)
    }

    res.send(API_RES.showResult(result))
  } catch (err) {
    res.send(API_RES.showError(err.message))
  }
})
let getBrowserDistributionByVersion = RouterConfigBuilder.routerConfigBuilder('/api/browser/distribution_version', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let currentMonth = moment().format(DATE_FORMAT.DATABASE_BY_MONTH)
  let month = _.get(req, ['query', 'month'], currentMonth)
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)

  let browserRecordParams = {
    tableName: 't_r_system_browser',
    splitBy: CModel.SPLIT_BY.NONE,
    where: {
      project_id: projectId,
      count_at_month: month
    },
    projectId
  }

  let browserRecordList = await CModel.getSelect(browserRecordParams).catch(
    err => res.send(API_RES.showError(err.message))
  )

  let result = []
  for (let browserRecord of browserRecordList) {
    // 将浏览器版本 chromium_ver 改为 50.0.2661.102
    if (browserRecord.browser_version === 'chromium_ver') {
      browserRecord.browser_version = '50'
    }

    let browserVersion = browserRecord.browser_version.split('.')[0]
    result.push({
      total_count: browserRecord.total_count,
      version: browserVersion,
      browser: browserRecord.browser
    })
  }
  res.send(API_RES.showResult(result))
})

let getBrowser = RouterConfigBuilder.routerConfigBuilder('/api/browser', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  try {
    let currentMonth = moment().format(DATE_FORMAT.DATABASE_BY_MONTH)
    let month = _.get(req, ['query', 'month'], currentMonth)
    const projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let browserQuery = _.get(req, ['query', 'q'], 'chrome')
    let browserRecordParams = {
      tableName: 't_r_system_browser',
      where: {
        count_at_month: month,
        project_id: projectId,
        browser: browserQuery
      }
    }

    let browserRecordList = await CModel.getSelect(browserRecordParams)
    let datas = {}
    for (let browserRecord of browserRecordList) {
      if (browserRecord.browser_version === 'chromium_ver') {
        browserRecord.browser_version = '50.0.2661.102'
      }

      let browserVersion = browserRecord.browser_version.split('.')[0]

      if (datas[browserVersion]) {
        datas[browserVersion] += browserRecord.total_count
      } else {
        datas[browserVersion] = browserRecord.total_count
      }
    }
    let result = Util.objectToArray(datas)
    res.send(API_RES.showResult(result))
  } catch (err) {
    res.send(API_RES.showError(err.message))
  }
})

let getBrowserListInRange = RouterConfigBuilder.routerConfigBuilder('/api/browser/gets', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  try {
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    let currentMonthAtUnix = moment().set('date', 1).unix()
    let nextMonthAtUnix = moment().add(1, 'month').set('date', 1).unix()
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      startAt = currentMonthAtUnix
    }
    if (endAt) {
      endAt = _.ceil(endAt / 1000)
    } else {
      endAt = nextMonthAtUnix
    }

    const projectId = _.get(req, ['fee', 'project', 'projectId'], 0)

    let result = await MSystemBrowser.getListInRange(projectId, startAt, endAt)
    res.send(API_RES.showResult(result))
  } catch (err) {
    res.send(API_RES.showError(err.message))
  }
})

export default {
  ...getBrowserList,
  ...getBrowser,
  ...getBrowserDistributionByVersion,
  ...getBrowserListInRange
}
