import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineCtrlsSummary from '~/src/model/summary/page_engine_ctrls'
import MPageEngineCtrlDataTimeSummary from '~/src/model/summary/page_engine_data_time'
import MPageEngineCtrl from '~/src/model/parse/page_engine_ctrl'
import MProject from '~/src/model/project/project'
import DATE_FORMAT from '~/src/constants/date_format'
import _ from 'lodash'

export default class PageEngineCtrlsSummary extends Base {
  static get signature() {
    return `
    Summary:PageEngineCtrlsSummary
     
     {countAtTime:按小时，天，统计引擎表单页面加载渲染情况${DATE_FORMAT.DATABASE_BY_DAY}格式}
     {countType:统计类型${DATE_FORMAT.UNIT.MINUTE}/${DATE_FORMAT.UNIT.HOUR}/${DATE_FORMAT.UNIT.DAY}}
     `
  }

  static get description() {
    return '[按小时/天] 基于数据库统计引擎表单页面加载情况'
  }

  async execute(args, options) {
    Logger.info('开始执行 Summary:PageEngineCtrlsSummary')
    let { countAtTime, countType } = args
    console.log('countAtTime', countAtTime)
    console.log('countType', countType)
    if (this.isArgumentsLegal(args, options) === false) {
      this.warn('参数不正确, 自动退出')
      return false
    }
    // 天，时间要变回前一天
    // 月，时间要回前一个月
    // 时，前一个小时
    let countAtMoment = moment(countAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_UNIT[countType])
    let countDate = countAtMoment.format(DATE_FORMAT.DISPLAY_BY_UNIT[countType])
    let countMoment = null
    let startAt = 0
    let endAt = 0
    debugger
    switch (countType) {
      case DATE_FORMAT.UNIT.MINUTE:
        countMoment = moment(countAtMoment).set('second', 0)
        endAt = countMoment.unix() - 1
        startAt = countAtMoment.clone().add(-10, 'minutes').set('second', 0).unix()
        console.log('startAt', moment.unix(startAt).format(), startAt)
        console.log('endAt', moment.unix(endAt).format(), endAt)
        break
      case DATE_FORMAT.UNIT.HOUR:
        countMoment = moment(countAtMoment).add(-1, 'hour').set('minute', 0).set('second', 0)
        startAt = countMoment.unix()
        endAt = countAtMoment.clone().add(-1, 'hours').set('minute', 59).set('second', 59).unix()
        console.log('startAt', moment.unix(startAt).format(), startAt)
        console.log('endAt', moment.unix(endAt).format(), endAt)
        break
      case DATE_FORMAT.UNIT.DAY:
        countMoment = moment(countAtMoment).add(-1, 'day').set('hour', 0).set('minute', 0).set('second', 0)
        startAt = countMoment.unix()
        endAt = countAtMoment.clone().add(-1, 'days').set('hour', 23).set('minute', 59).set('second', 59).unix()
        console.log('startAt', moment.unix(startAt).format())
        console.log('endAt', moment.unix(endAt).format())
        break
    }
    let rowProjectList = await MProject.getList()
    for (let rawProject of rowProjectList) {
      let projectId = _.get(rawProject, 'id', '')
      let projectName = _.get(rawProject, 'project_name', '')
      if (!projectId) {
        continue
      }
      let res
      let resObj
      let dataAndTimeRes
      switch (countType) {
        case DATE_FORMAT.UNIT.MINUTE:
          resObj = await this.dealMinutePart(projectId, startAt, endAt)
          res = resObj.ctrls
          dataAndTimeRes = resObj.datasources
          break;
        case DATE_FORMAT.UNIT.HOUR:
          resObj = await this.dealHourPart(projectId, startAt, endAt)
          res = resObj.ctrls
          dataAndTimeRes = resObj.datasources
          break;
        case DATE_FORMAT.UNIT.DAY:
          resObj = await this.dealDayPart(projectId, startAt, endAt)
          res = resObj.ctrls
          dataAndTimeRes = resObj.datasources
          break;
      }
      debugger
      if (!res || !res.length) {
        Logger.info('当前无数据需要统计')
      } else {
        Logger.info(`开始处理项目${projectId}(${projectName})的数据 时间:${countDate}, 共${res.length}条`)
        // 拿到数据后，一条一条插入
        this.save2DB(projectId, res, startAt, endAt, countType)
      }

      if (!dataAndTimeRes || !dataAndTimeRes.length) {
        Logger.info('当前无数据需要统计')
      } else {
        debugger
        Logger.info(`开始处理项目${projectId}(${projectName})的数据 时间:${countDate}, 共${res.length}条`)
        this.save2DataTimeDB(projectId, dataAndTimeRes, startAt, endAt, countType)
      }
    }
  }

  async addOrReplaceRecord(projectId, recordInfo, startAt, endAt, countType) {
    // return await MPageEngineCtrlsSummary.replaceAndAutoIncrementRecord(projecetId, data, startAt, countType)
    let component_type = recordInfo.component_type
    let app_version = recordInfo.app_version
    let operation_type = recordInfo.operation_type
    let count_type = countType
    if (countType === DATE_FORMAT.UNIT.MINUTE) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlsSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        app_version,
        operation_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt
      }, countType)
      // 插入更新
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlsSummary.insertRecord(projectId, startAt, recordInfo, countType)
      }
    } else if (countType === DATE_FORMAT.UNIT.HOUR) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlsSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        operation_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      }, countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlsSummary.insertRecord(projectId, startAt, {
          ...recordInfo,
          count_type: DATE_FORMAT.UNIT.HOUR
        }, countType)
      }
    } else if (countType === DATE_FORMAT.UNIT.DAY) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlsSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        operation_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      }, countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlsSummary.insertRecord(projectId, startAt, {
          ...recordInfo,
          count_type: DATE_FORMAT.UNIT.DAY
        }, countType)
      }

    }
  }

  async addOrReplaceDataTimeRecord(projectId, recordInfo, startAt, endAt, countType) {
    let component_type = recordInfo.component_type
    let app_version = recordInfo.app_version
    let group_type = recordInfo.group_type
    let count_type = countType
    if (countType === DATE_FORMAT.UNIT.MINUTE) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlDataTimeSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        app_version,
        group_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt
      }, countType)
      // 插入更新
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        return await MPageEngineCtrlDataTimeSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlDataTimeSummary.insertRecord(projectId, startAt, recordInfo, countType)
      }
    } else if (countType === DATE_FORMAT.UNIT.HOUR) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlDataTimeSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        group_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      }, countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlDataTimeSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlDataTimeSummary.insertRecord(projectId, startAt, {
          ...recordInfo,
          count_type: DATE_FORMAT.UNIT.HOUR
        }, countType)
      }
    } else if (countType === DATE_FORMAT.UNIT.DAY) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlDataTimeSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        group_type,
        __range_min__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      }, countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlDataTimeSummary.updateRecord(projectId, startAt, rawRecordList[rawRecordList.length - 1], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlDataTimeSummary.insertRecord(projectId, startAt, {
          ...recordInfo,
          count_type: DATE_FORMAT.UNIT.DAY
        }, countType)
      }

    }
  }

  getGroupType(len) {
    if (len <= 50) {
      return '0-50'
    } else if (len > 50 && len <= 100) {
      return '50-100'
    } else if (len > 100 && len <= 200) {
      return '100-200'
    } else if (len > 200 && len <= 500) {
      return '200-500'
    } else if (len > 500 && len <= 1000) {
      return '500-1000'
    } else if (len > 1000 && len <= 2000) {
      return '1000-2000'
    } else if (len > 2000 && len <= 5000) {
      return '2000-5000'
    } else if (len > 5000 && len <= 10000) {
      return '5000-10000'
    } else if (len > 10000 && len <= 20000) {
      return '10000-20000'
    } else {
      return '20000-'
    }
  }

  // 分钟级别的需要从源表当中去获取replaceAndAutoIncrementRecord
  async dealMinutePart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrl.getList(projectId, startAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt
    })
    // 提前处理好
    if (res.length) {
      let tmpData = {}
      res.forEach(data => {
        if (!tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`]) {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`] = {
            ...data,
            count_size: data.count_size || 1
          }
        } else {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time =
            (tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size * tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size)
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size = tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size + (data.count_size || 1)

        }
      })

      let tmpDatasources = {}
      res.forEach(data => {
        if (data.detail) {
          let sourceLen
          try {
            sourceLen = JSON.parse(data.detail).length
          } catch (e) { }
          if (sourceLen != null) {
            let group_type = this.getGroupType(data['count_size'] || 1)
            if (!tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`]) {
              tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`] = {
                component_type: data.component_type,
                count_type: 'minute',
                count_size: data.count_size || 1,
                group_type,
                app_version: data.app_version,
                cost_time: data.cost_time
              }
            } else {
              tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time =
                (tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size * tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size)
              tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size = tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size + (data.count_size || 1)
            }
          }
        }
      })

      return {
        ctrls: Object.values(tmpData),
        datasources: Object.values(tmpDatasources)
      }
    }
    return {
      ctrls: [],
      datasources: []
    }
  }
  // 小时级别的需要从结果表中获取
  // 根据时间，查找所属区域minute中的数据
  async dealHourPart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrlsSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.MINUTE)
    // 提前处理
    let tmpData = {}
    if (res.data.length) {
      res.data.forEach(data => {
        if (!tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`]) {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`] = {
            ...data,
            count_size: data.count_size || 1
          }
        } else {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time =
            (tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size * tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size)
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size = tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size + (data.count_size || 1)
        }
      })
    }

    let dataTimeRes = await MPageEngineCtrlDataTimeSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.MINUTE)
    let tmpDatasources = {}
    dataTimeRes.data.length && dataTimeRes.data.forEach(data => {
      let group_type = this.getGroupType(data['count_size'] || 1)
      if (!tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`]) {
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`] = {
          component_type: data.component_type,
          count_type: 'hour',
          count_size: data.count_size || 1,
          group_type,
          app_version: data.app_version,
          cost_time: data.cost_time
        }
      } else {
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time =
          (tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size * tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size)
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size = tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size + (data.count_size || 1)
      }
    })

    return {
      ctrls: Object.values(tmpData),
      datasources: Object.values(tmpDatasources)
    }
  }

  async dealDayPart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrlsSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.HOUR)
    // 提前处理
    let tmpData = {}
    if (res.data.length) {
      res.data.forEach(data => {
        if (!tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`]) {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`] = {
            ...data,
            count_size: data.count_size || 1
          }
        } else {
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time =
            (tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size * tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size)
          tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size = tmpData[`${data['component_type']}__${data['app_version']}__${data['operation_type']}`].count_size + (data.count_size || 1)
        }
      })

    }
    let dataTimeRes = await MPageEngineCtrlDataTimeSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.MINUTE)
    let tmpDatasources = {}
    dataTimeRes.data.length && dataTimeRes.data.forEach(data => {
      let group_type = this.getGroupType(data['count_size'] || 1)
      if (!tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`]) {
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`] = {
          component_type: data.component_type,
          count_type: 'day',
          count_size: data.count_size || 1,
          group_type,
          app_version: data.app_version,
          cost_time: data.cost_time
        }
      } else {
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time =
          (tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size * tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].cost_time + data.cost_time * (data.count_size || 1)) / ((data.count_size || 1) + tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size)
        tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size = tmpDatasources[`${data['component_type']}__${data['app_version']}__${data['group_type']}`].count_size + (data.count_size || 1)
      }
    })
    return {
      ctrls: Object.values(tmpData),
      datasources: Object.values(tmpDatasources)
    }
  }

  async save2DB(projectId, records = [], startAt, endAt, countType) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0

    for (let record of records) {
      try {
        let isSuccess = await this.addOrReplaceRecord(projectId, record, startAt, endAt, countType)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_ctrl_summary 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_ctrl_summary 插入失败', e)
        processRecordCount++
      }
    }

    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  async save2DataTimeDB(projecetId, records = [], startAt, endAt, countType) {
    let totalRecordCount = records.length
    let processRecordCount = 0
    let successSaveCount = 0
    for (let record of records) {
      try {
        let isSuccess = await this.addOrReplaceDataTimeRecord(projecetId, record, startAt, endAt, countType)
        if (isSuccess) {
          successSaveCount++
        } else {
          Logger.info('summary page_engine_ctrl_summary datatime 插入失败')
        }
        processRecordCount++
      } catch (e) {
        Logger.info('summary page_engine_ctrl_summary datatime 插入失败', e)
        processRecordCount++
      }
    }
    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount)
  }

  /**
   * [可覆盖]检查请求参数, 默认检查传入的时间范围是否正确, 如果有自定义需求可以在子类中进行覆盖
   * @param {*} args
   * @param {*} options
   * @return {Boolean}
   */
  isArgumentsLegal(args, options) {
    let { countAtTime, countType } = args
    if (countType !== DATE_FORMAT.UNIT.MINUTE && countType !== DATE_FORMAT.UNIT.DAY && countType !== DATE_FORMAT.UNIT.HOUR) {
      this.warn(`统计类别不为 ${DATE_FORMAT.UNIT.MINUTE}/${DATE_FORMAT.UNIT.DAY}/${DATE_FORMAT.UNIT.HOUR} `, 'countType => ', countType)
      return false
    }
    let countAtMoment = moment(countAtTime, DATE_FORMAT.COMMAND_ARGUMENT_BY_UNIT[countType])
    if (moment.isMoment(countAtMoment) === false || countAtMoment.isValid() === false) {
      this.warn(`countAtTime解析失败`, ' => ', countAtTime)
      return false
    }
    return true
  }
}