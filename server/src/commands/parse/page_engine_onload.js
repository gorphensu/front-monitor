import ParseBase from '~/src/commands/parse/base'
import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import MPageEngineOnload from '~/src/model/parse/page_engine_onload'
import MPageEngineCtrls from '~/src/model/parse/page_engine_ctrl'
const LegalRecordType = 'product'
const LegalRecordCode = 11113

const COUNT_TYPE_HOUR = DATE_FORMAT.UNIT.HOUR
const COUNT_BY_HOUR_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_HOUR
const COUNT_BY_MINUTE_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_MINUTE
const COUNT_BY_SECOND_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_SECOND

class PageEngineOnload extends ParseBase {
  static get signature() {
    return `
     Parse:PageEngineOnload 
     {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
     `
  }

  static get description() {
    return '[按分钟] 解析nginx日志, page engine加载时间'
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
    let loadedTime = _.get(record, ['detail', 'loadedtime'], '')
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
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
    if (!pageCode) {
      return false
    }
    if (projectId < 0) {
      return false
    }
    if (!itemId) {
      return false
    }
    if (!detail) {
      return false
    }

    return true
  }

  /**
  * 更新记录
  * [必须覆盖]处理记录, 并将结果缓存在this.ProjectMap中
  */
  async processRecordAndCacheInProjectMap(record) {
    console.log('page_engine_render.js processRecordAndCacheInProjectMap record');
    let projectId = _.get(record, ['project_id'], '')
    let ucid = _.get(record, ['common', 'ucid'])
    let tenantid = _.get(record, ['common', 'tenantid'])
    let url = _.get(record, ['common', 'page_type'])
    let browser = _.get(record, ['ua', 'browser'])
    let itemId = _.get(record, ['detail', 'itemid'], '')
    let pageCode = _.get(record, ['detail', 'pagecode'], '')
    let loadedTime = _.get(record, ['detail', 'loadedtime'], '')
    let stage = _.get(record, ['detail', 'stage'], '')
    let detail = _.get(record, ['detail', 'detail'], '')
    let count = _.get(record, ['detail', 'count'])
    let countIndex = _.get(record, ['detail', 'index'])
    let recordAt = _.get(record, ['time'], 0)
    let countAtTime = moment.unix(recordAt).format(COUNT_BY_MINUTE_DATE_FORMAT)
    let countAtTimeStamp = recordAt
    let itemDataAtMap = new Map()
    let itemDataAtTypeList = new Array(2) // ['onload', 'update']
    let vueRecord = {
      itemId,
      countAtTime,
      countAtTimeStamp,
      ucid,
      tenantid,
      loadedTime,
      pageCode,
      url,
      stage,
      // detail,
      projectId,
      browser: JSON.stringify(browser),
      count,
      // index: countIndex,
      finished: false
    }
    // {
    //   projectId: {
    //     'item_id': [{
    //       ucid,
    //       tenantid,
    //       loaded_time,
    //       pagecode,
    //       url,
    //       projectId,
    //       browser,
    //       count,
    //       detail: new Array(count)
    //     }, {}]
    //   }
    // }

    if (this.projectMap.has(projectId)) {
      itemDataAtMap = this.projectMap.get(projectId)
      itemDataAtTypeList = itemDataAtMap.get(itemId) || new Array(2) // ['onload', 'update']
      let savedItemData = itemDataAtTypeList[stage === 'onload' ? 0 : 1]
      if (savedItemData) {
        // 已经有存在过项的
        savedItemData.detail[countIndex] = detail
        if (vueRecord.loadedTime) {
          savedItemData.loadedTime = vueRecord.loadedTime
        }
        if (vueRecord.stage) {
          savedItemData.stage = vueRecord.stage
        }
        // 判断是哦福合成整的
        if (savedItemData.detail.every((item) => {
          return !!item
        })) {
          savedItemData.finished = true
        }
        itemDataAtTypeList[stage === 'onload' ? 0 : 1] = savedItemData
        itemDataAtMap.set(itemId, itemDataAtTypeList)
      } else {
        // 新的，还没存在
        vueRecord.detail = new Array(count).fill(null)
        vueRecord.detail[countIndex] = detail
        // 判断是否合成整的
        if (vueRecord.detail.every((item) => {
          return !!item
        })) {
          // 说明完成的了
          vueRecord.finished = true
        }
        itemDataAtTypeList[stage === 'onload' ? 0 : 1] = vueRecord
        itemDataAtMap.set(itemId, itemDataAtTypeList)
      }
    } else {
      // 新的，还没存在
      vueRecord.detail = new Array(count).fill(null)
      vueRecord.detail[countIndex] = detail
      // 判断是否合成整的
      if (vueRecord.detail.every((item) => {
        return !!item
      })) {
        // 说明完成的了
        vueRecord.finished = true
      }
      itemDataAtTypeList[stage === 'onload' ? 0 : 1] = vueRecord
      itemDataAtMap.set(itemId, itemDataAtTypeList)
    }
    this.projectMap.set(projectId, itemDataAtMap)
    return true
  }

  /**
 * 将数据同步到数据库中
 */
  async save2DB() {
    let totalRecordCount = this.getRecordCountInProjectMap()
    let processRecordCount = 0
    let successSaveCount = 0
    for (let [projectId, itemDataAtMap] of this.projectMap) {
      for (let [itemId, itemDataAtTypeList] of itemDataAtMap) {
        let [onloadItem, updateItem] = itemDataAtTypeList
        if (onloadItem && onloadItem.finished) {
          let isSuccess = await MPageEngineOnload.insert(onloadItem, projectId, onloadItem.countAtTimeStamp)
          processRecordCount++
          if (isSuccess) {
            successSaveCount++
            // 这里需要将detail的数据组合成一起，然后插入控件数据表中记录
            try {
              let ctrlDetails = JSON.parse(onloadItem.detail.join(''))
              let updateCtrlDetails = {}
              if (updateItem && updateItem.finished) {
                try {
                  updateCtrlDetails = JSON.parse(updateItem.detail.join(''))
                } catch (e) {
                  console.error('ctrlDetails JSON parse error', e)
                }
              }
              let onloadRecordList = this.formatCtrls(ctrlDetails)
              let updateRecordList = this.formatCtrls(updateCtrlDetails)
              await this.saveCtrls(projectId, onloadRecordList, onloadItem)
              if(updateItem) {
                await this.saveCtrls(projectId, updateRecordList, updateItem)
              }
              this.log('page_engine_onload save ctrls success')

            } catch (e) {
              console.error('ctrlDetails JSON parse error', e)
            }
          }
          this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
        }
      }
    }
    return {
      totalRecordCount, processRecordCount, successSaveCount
    }
  }

  formatCtrls(ctrlsMap) {
    let res = []
    for (let ctrlCode in ctrlsMap) {
      let ctrlType = ctrlsMap[ctrlCode].type
      let operations = ctrlsMap[ctrlCode].operations || []
      operations.forEach(operation => {
        res.push({
          type: ctrlType,
          code: ctrlCode,
          operation: operation.type,
          costtime: operation.costtime
        })
      })
    }
    return res
  }

  async saveCtrls(projectId, ctrls, itemData) {
    return MPageEngineCtrls.inserts(projectId, ctrls, itemData)
  }

  /**
 * 统计 projectUvMap 中的记录总数
 */
  getRecordCountInProjectMap() {
    let totalCount = 0
    for (let [projectId, itemDataAtMap] of this.projectMap) {
      for (let [itemId, itemDataAtTypeList] of itemDataAtMap) {
        let [onloadItem, updateItem] = itemDataAtTypeList
        if (onloadItem && onloadItem.finished) {
          totalCount++
        }
      }
    }
    return totalCount
  }
}

export default PageEngineOnload