import Base from './base'
import moment from 'moment'
import Logger from '~/src/library/logger'
import MPageEngineCtrlsSummary from '~/src/model/summary/page_engine_ctrls'
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
        console.log('startAt', moment.unix(startAt).format())
        console.log('endAt', moment.unix(endAt).format())
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
      switch (countType) {
        case DATE_FORMAT.UNIT.MINUTE:
          res = await this.dealMinutePart(projectId, startAt, endAt)
          break;
        case DATE_FORMAT.UNIT.HOUR:
          res = await this.dealHourPart(projectId, startAt, endAt)
          break;
        case DATE_FORMAT.UNIT.DAY:
          res = await this.dealDayPart(projectId, startAt, endAt)
          break;
      }

      if (!res || !res.length) {
        Logger.info('当前无数据需要统计')
        return
      }
      Logger.info(`开始处理项目${projectId}(${projectName})的数据 时间:${countDate}, 共${res.length}条`)
      // 拿到数据后，一条一条插入
      this.save2DB(projectId, res, startAt, endAt, countType)
    }
  }

  async addOrReplaceRecord(projectId, recordInfo, startAt, endAt, countType) {
    // return await MPageEngineCtrlsSummary.replaceAndAutoIncrementRecord(projecetId, data, startAt, countType)
    let component_type = recordInfo.component_type
    let app_version = recordInfo.app_version
    let count_type = countType
    if (countType === DATE_FORMAT.UNIT.MINUTE) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlsSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        app_version,
        __range_max__create_time: startAt,
        __range_max__create_time: endAt
      }, countType)
      // 插入更新
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[0], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlsSummary.insertRecord(projectId, startAt, recordInfo, countType)
      }
    } else if (countType === DATE_FORMAT.UNIT.HOUR) {
      // 查询是否存在该数据
      let rawRecordList = await MPageEngineCtrlsSummary.getRecord(projectId, startAt, {
        component_type,
        count_type,
        __range_max__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      },  countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[0], recordInfo, countType)
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
        __range_max__create_time: startAt,
        __range_max__create_time: endAt,
        app_version
      },  countType)
      // 插入更新
      // 查看下有没有hour数据了
      if (rawRecordList && rawRecordList.length && rawRecordList[0]) {
        // 需要改变下操作数据
        return await MPageEngineCtrlsSummary.updateRecord(projectId, startAt, rawRecordList[0], recordInfo, countType)
      } else { // 新建
        return await MPageEngineCtrlsSummary.insertRecord(projectId, startAt, {
          ...recordInfo,
          count_type: DATE_FORMAT.UNIT.DAY
        }, countType)
      }

    }
  }

  // 分钟级别的需要从源表当中去获取replaceAndAutoIncrementRecord
  async dealMinutePart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrl.getList(projectId, startAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt
    })
    return res
  }
  // 小时级别的需要从结果表中获取
  // 根据时间，查找所属区域minute中的数据
  async dealHourPart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrlsSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.MINUTE)
    return res.data
  }

  async dealDayPart(projectId, startAt, endAt) {
    let res = await MPageEngineCtrlsSummary.getList(projectId, startAt, endAt, {
      __range_min__create_time: startAt,
      __range_max__create_time: endAt,
      pagesize: 999999999
    }, DATE_FORMAT.UNIT.HOUR)
    return res.data
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