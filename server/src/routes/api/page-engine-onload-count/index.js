import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import MPageEngineOnloadCount from '~/src/model/summary/page_engine_onload_count'
import xlsx from 'node-xlsx'

const getPageEngineOnloadCountSummary = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengineonloadcount/summary',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

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
      tenantid: _.get(request, ['tenantid'], ''),
      app_version: _.get(request, ['app_version'], ''),
      url: _.get(request, ['url'], ''),
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      count_type: 'day'
    }
    console.log('/api/pageengineonloadcount/summary get condition', condition)
    let list = await MPageEngineOnloadCount.getList(projectId, startAt, endAt, condition)
    res.send(API_RES.showResult(list))
  }
)

const getPageEngineOnloadCountList = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengineonloadcount/list',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

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

    let start_loaded_time = Number(_.get(request, ['start_loaded_time'], 0))
    let end_loaded_time = Number(_.get(request, ['end_loaded_time'], 0))

    if (!start_loaded_time) {
      start_loaded_time = ''
    }
    if (!end_loaded_time) {
      end_loaded_time = ''
    }

    let condition = {
      tenantid: _.get(request, ['tenantid'], ''),
      app_version: _.get(request, ['app_version'], ''),
      pagecode: _.get(request, ['pagecode'], ''),
      url: _.get(request, ['url'], ''),
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: _.get(request, ['pagesize'], 20),
      pageindex: _.get(request, ['pageindex'], 1),
      count_type: 'day',
      __range_min__loaded_time: start_loaded_time,
      __range_max__loaded_time: end_loaded_time
    }
    console.log('/api/pageengineonloadcount/list get condition', condition)
    let list = await MPageEngineOnloadCount.getListRange(projectId, startAt, endAt, condition)
    res.send(API_RES.showResult(list))
  }
)

const exportPageEngindOnloadCountList = RouterConfigBuilder.routerConfigBuilder(
  '/api/pageengineonloadcount/exportlist',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

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

    let start_loaded_time = Number(_.get(request, ['start_loaded_time'], 0))
    let end_loaded_time = Number(_.get(request, ['end_loaded_time'], 0))

    if (!start_loaded_time) {
      start_loaded_time = ''
    }
    if (!end_loaded_time) {
      end_loaded_time = ''
    }

    let condition = {
      tenantid: _.get(request, ['tenantid'], ''),
      app_version: _.get(request, ['app_version'], ''),
      pagecode: _.get(request, ['pagecode'], ''),
      url: _.get(request, ['url'], ''),
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      // pagesize: _.get(request, ['pagesize'], 20),
      // pageindex: _.get(request, ['pageindex'], 1),
      count_type: 'day',
      __range_min__loaded_time: start_loaded_time,
      __range_max__loaded_time: end_loaded_time
    }
    console.log('/api/pageengineonloadcount/exportlist get condition', condition)
    let list = await MPageEngineOnloadCount.getList(projectId, startAt, endAt, condition)
    // 这里需要对接xmls文件
    let title = ['表单编码', '版本', '租户', '站点', '耗时', '统计次数']
    let data = []
    data.push(title)
    list.forEach(item => {
      let arrInner = []
      arrInner.push(item.pagecode)
      arrInner.push(item.app_version)
      arrInner.push(item.tenantid)
      arrInner.push(item.url)
      arrInner.push(item.loaded_time)
      arrInner.push(item.count_size)
      data.push(arrInner)
    })

    let buffer = xlsx.build([{
      name: 'sheet1',
      data: data
    }])
    // res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    // res.type('application/octet-stream')
    res.attachment('导出.xlsx')
    // res.set('Content-Disposition', 'attachment; filename=导出.xlsx')
    res.send(buffer)
    // res.send(API_RES.showResult(list))
  }
) 

export default {
  ...getPageEngineOnloadCountSummary,
  ...getPageEngineOnloadCountList,
  ...exportPageEngindOnloadCountList
}