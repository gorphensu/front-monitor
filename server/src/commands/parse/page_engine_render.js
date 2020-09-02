import ParseBase from '~/src/commands/parse/base'
import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import MPageEngineRender from '~/src/model/parse/page_engine_render'

const LegalRecordType = 'product'
const LegalRecordCode = 11112

const COUNT_TYPE_HOUR = DATE_FORMAT.UNIT.HOUR
const COUNT_BY_HOUR_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_HOUR
const COUNT_BY_MINUTE_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_MINUTE
const COUNT_BY_SECOND_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_SECOND

class PageEngineRender extends ParseBase {
  static get signature() {
    return `
     Parse:PageEngineRender 
     {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     `
  }

  static get description() {
    return '[按分钟] 解析nginx日志, page engine渲染时间'
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
    let tenantid = _.get(record, ['common', 'tenantid'])
    let browser = _.get(record, ['ua', 'browser'])
    let projectId = _.get(record, ['project_id'], '')
    let itemId = _.get(record, ['detail', 'itemid'], '')
    let costTime = _.get(record, ['detail', 'costtime'], '')
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
    let operationType = _.get(record, ['detail', 'operationtype'])
    let detail = _.get(record, ['detail', 'detail'], '')
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
    if (!tenantid) {
      return false
    }
    if (!browser) {
      return false
    }
    if (projectId < 0) {
      return false
    }
    if (!itemId) {
      return false
    }
    if (!operationType) {
      return false
    }
    if (costTime === null || costTime === undefined) {
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
    console.log('page_engine_render.js processRecordAndCacheInProjectMap record');
    let projectId = _.get(record, ['project_id'], '')
    let ucid = _.get(record, ['common', 'ucid'])
    let tenantid = _.get(record, ['common', 'tenantid'])
    let url = _.get(record, ['common', 'page_type'])
    let costTime = _.get(record, ['detail', 'costtime'], '')
    let browser = _.get(record, ['ua', 'browser'])
    let itemId = _.get(record, ['detail', 'itemid'], '')
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
    let operationType = _.get(record, ['detail', 'operationtype'])
    let detail = _.get(record, ['detail', 'detail'], '')
    let recordAt = _.get(record, ['time'], 0)
    let countAtTime = moment.unix(recordAt).format(COUNT_BY_MINUTE_DATE_FORMAT)
    let countAtTimeStamp = recordAt
    let countAtMap = new Map()
    let recordList = []
    let vueRecord = {
      item_id: itemId,
      count_at_time: countAtTimeStamp,
      ucid,
      tenantid,
      cost_time: costTime,
      pagecode: pageCode,
      url,
      operation_type: operationType,
      detail,
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
          let isSuccess = await MPageEngineRender.insert(vueRecord, projectId, countAt)
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

export default PageEngineRender