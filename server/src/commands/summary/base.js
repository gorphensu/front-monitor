import Base from '~/src/commands/base'

export default class SummaryBase extends Base {
  constructor() {
    super()
  }

  /**
 * 汇报进度
 * @param {*} processRecordCount
 * @param {*} successSaveCount
 * @param {*} totalRecordCount
 */
  reportProcess(processRecordCount, successSaveCount, totalRecordCount, tableName = '') {
    let insertTable = ''
    if (tableName) {
      insertTable = `, 入库${tableName}`
    }
    this.log(`当前已处理${processRecordCount}/${totalRecordCount}条记录${insertTable}, 已成功${successSaveCount}条`)
  }

  mustBeOverride() {
    this.warn('注意, 这里有个方法没有覆盖')
    this.warn('当场退出←_←')
    process.exit(0)
  }
}