
import ParseBase from '~/src/commands/parse/base'
import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import MVueComponentRender from '~/src/model/parse/vue_component_render'
import project from '~/src/configs/project'
const LegalRecordType = 'product'
const LegalRecordCode = 11111

const COUNT_TYPE_HOUR = DATE_FORMAT.UNIT.HOUR
const COUNT_BY_HOUR_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_HOUR
const COUNT_BY_MINUTE_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_MINUTE
const COUNT_BY_SECOND_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_SECOND

/**
 * 解析用户点击情况
 */
class VueComponentRender extends ParseBase {
  static get signature() {
    return `
     Parse:VueComponentRender 
     {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     `
  }

  static get description() {
    return '[按分钟] 解析nginx日志, vue控件渲染时间'
  }

  /**
     * 判断该条记录是不是需要解析的记录
     * @param {Object} record
     * @return {Boolean}
     */
  isLegalRecord(record) {
    // console.log('vue_component_rener.js isLegalRecord record', record);
    let recordType = _.get(record, ['type'], '')
    let code = _.get(record, ['code'], '')
    let ucid = _.get(record, ['common', 'ucid'])
    let browser = _.get(record, ['ua', 'browser'])
    let projectId = _.get(record, ['project_id'], '')
    let renderTime = _.get(record, ['detail', 'rendertime'], '')
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
    let componentType = _.get(record, ['detail', 'componenttype'], '')
    let viewRule = _.get(record, ['detail', 'viewrule'], '')
    code = parseInt(code)
    projectId = parseInt(projectId)
    if (recordType !== LegalRecordType) {
      return false
    }
    if (_.isNumber(code) === false) {
      return false
    }
    if (code !== LegalRecordCode) {
      return false
    }
    if (_.isNumber(projectId) === false) {
      return false
    }
    if (!ucid) {
      return false
    }
    if (!browser) {
      return
    }
    if (projectId < 0) {
      return false
    }
    if (!renderTime) {
      return false
    }
    if (!componentType) {
      return false
    }
    return true
  }

  /**
   * 更新记录
   * [必须覆盖]处理记录, 并将结果缓存在this.ProjectMap中
   * {"type":"product","code":11111,"detail": {}}
   */
  async processRecordAndCacheInProjectMap(record) {
    console.log('vue_component_rener.js processRecordAndCacheInProjectMap record', record);
    let projectId = _.get(record, ['project_id'], '')
    let ucid = _.get(record, ['common', 'ucid'])
    let renderTime = _.get(record, ['detail', 'rendertime'], '')
    let browser = _.get(record, ['ua', 'browser'])
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
    let componentType = _.get(record, ['detail', 'componenttype'], '')
    let viewRule = _.get(record, ['detail', 'viewrule'], '')
    let recordAt = _.get(record, ['time'], 0)
    let countAtTime = moment.unix(recordAt).format(COUNT_BY_MINUTE_DATE_FORMAT)
    let countAtMap = new Map()
    let recordList = []

    let vueRecord = {
      countAtTime,
      ucid,
      renderTime,
      pageCode,
      componentType,
      viewRule,
      projectId,
      browser: JSON.stringify(browser)
    }

    if (this.projectMap.has(projectId)) {
      countAtMap = this.projectMap.get(projectId)
      if (countAtMap.has(countAtTime)) {
        recordList = countAtMap.get(countAtTime)
      }
    }
    recordList.push(vueRecord)
    countAtMap.set(countAtTime, recordList)
    this.projectMap.set(projectId, countAtMap)
    return true
  }

  /**
   * 将数据同步到数据库中
   */
  async save2DB() {
    let totalRecordCount = this.getRecordCountInProjectMap()
    let processRecordCount = 0
    let successSaveCount = 0
    for (let [projectId, countAtMap] of this.projectMap) {
      for (let [countAtTime, recordList] of countAtMap) {
        let countAt = moment(countAtTime, COUNT_BY_MINUTE_DATE_FORMAT).unix()
        for (let vueRecord of recordList) {
          let isSuccess = await MVueComponentRender.insert(vueRecord, projectId, countAt)
          processRecordCount = processRecordCount + 1
          if (isSuccess) {
            successSaveCount = successSaveCount + 1
          }
          this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
        }
      }
    }
    return {
      totalRecordCount, processRecordCount, successSaveCount
    }
  }

  /**
   * 统计 projectUvMap 中的记录总数
   */
  getRecordCountInProjectMap() {
    let totalCount = 0
    for (let [projectId, countAtMap] of this.projectMap) {
      for (let [countAtTime, recordList] of countAtMap) {
        for (let vueRecord of recordList) {
          totalCount = totalCount + 1
        }
      }
    }
    return totalCount
  }
}

export default VueComponentRender

/*
{
  type: 'product',
  code: 11111,
  detail: {
    rendertime: 168,
    url: '896938753782845517',
    ctrlcode: 'dropdownbox-900201764014395485',
    componenttype: 'dropdownbox',
    pagecode: '896938753782845517'
  },
  extra: {},
  common: {
    pid: 'apaas-web',
    uuid: '1594806600035-4174',
    ucid: '0102',
    is_test: false,
    record: {
      time_on_page: true,
      performance: true,
      js_error: true,
      js_error_report_config: [Object]
    },
    version: '3.0.0',
    timestamp: 1595313203923,
    runtime_version: '3.0.0',
    sdk_version: '1.0.40',
    page_type: 'http://localhost:9200/#/page/?pagecode=896938753782845517'
  },
  md5: '92d52ad50573b982d8dbb726273418c3',
  project_id: 1,
  project_name: 'apaas-web',
  time: 1595313204,
  ua: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36',
    browser: { name: 'Chrome', version: '81.0.4044.122', major: '81' },
    engine: { name: 'Blink', version: '81.0.4044.122' },
    os: { name: 'Windows', version: '10' },
    device: {},
    cpu: { architecture: 'amd64' }
  },
  ip: '183.238.58.120',
  country: '中国',
  province: '广东',
  city: '广州'
}
*/