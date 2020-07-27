import _ from 'lodash'
import path from 'path'
import moment from 'moment'
import shell from 'shelljs'
import Base from '~/src/commands/base'
import appConfig from '~/src/configs/app'
import Nginx from '~/src/library/nginx'
import DATE_FORMAT from '~/src/constants/date_format'
import commonConfig from '~/src/configs/common'
import _fs from 'fs'

const fs = _fs.promises

class CleanOldLog extends Base {
  static get signature() {
    return `
       Utils:CleanNginxLog
       `
  }

  static get description() {
    return '删除两天前的nginx下生产的日志,每天0时1分执行一次'
  }

  async execute(args, options) {
    this.log(`清理 ${commonConfig.nginxLogFilePath} 日志`)
    await this.clearOldNginxLog()
    await this.clearOldCommandLog()
    this.log(`执行完毕`)
  }
  /**
   * 自动清除两天前的nginx日志
   */
  async clearOldNginxLog() {
    let absoluteNginxLogUri = await this.getAbsoluteNginxLogPath()
    try {
      let stat = await fs.stat(absoluteNginxLogUri)
      if (stat.isDirectory()) {
        const files = await fs.readdir(absoluteNginxLogUri)
        // 现在时间
        let currentAtMoment = moment()
        files.forEach(async fileName => {
          let reg = /^(\d{6})-(\d{2})-(\d{2})-(\d{2})\.log$/
          let match = fileName.match(reg)
          if (match) {
            //查看文件的具体时间
            let ym = match[1]
            let year = ym.slice(0, 4)
            let month = ym.slice(4)
            let day = match[2]
            let fileDateAtMoment = moment([year, Number(month) - 1, day])
            if (currentAtMoment.valueOf() - fileDateAtMoment.valueOf() > 172800000) {
              // 删除
              const filePath = path.resolve(absoluteNginxLogUri, fileName)
              try {
                console.log('准备删除文件', filePath)
                await fs.unlink(filePath)
                console.log('删除文件成功', filePath)
              } catch (e) {
                console.log('删除文件失败', e)
              }
            } else {
              console.log('文件在两天内', fileName, fileDateAtMoment.toDate())
            }
          }
        })
      } else {
        this.log('当前路径', absoluteNginxLogUri, '不是文件夹类型')
      }
    } catch (e) {
      this.log('当前路径为', absoluteNginxLogUri, e)
    }
  }

  /**
   * 自动清除log/command下的日志及
   * UserFirstLoginAt-2020-07-27.log
   */
  async clearOldCommandLog() {
    let logPath = appConfig.absoluteLogPath
    let absoluteLogPath = path.resolve(logPath, 'command')
    try {
      let stat = await fs.stat(absoluteLogPath)
      if (stat.isDirectory()) {
        const files = await fs.readdir(absoluteLogPath)
        // 现在时间
        let currentAtMoment = moment()
        files.forEach(async fileName => {
          let reg = /(\d{4})-(\d{2})-(\d{2})\.log$/
          let match = fileName.match(reg)
          if (match) {
            //查看文件的具体时间
            let year = match[1]
            let month = match[2]
            let day = match[3]
            let fileDateAtMoment = moment([year, Number(month) - 1, day])
            if (currentAtMoment.valueOf() - fileDateAtMoment.valueOf() > 172800000) {
              // 删除
              const filePath = path.resolve(absoluteLogPath, fileName)
              try {
                console.log('准备删除文件', filePath)
                await fs.unlink(filePath)
                console.log('删除文件成功', filePath)
              } catch (e) {
                console.log('删除文件失败', e)
              }
            } else {
              console.log('文件在两天内', fileName, fileDateAtMoment.toDate())
            }
          }
        })
      } else {
        this.log('当前路径', absoluteLogPath, '不是文件夹类型')
      }
    } catch (e) {
      this.log('当前路径为', absoluteLogPath, e)
    }
  }

  async getAbsoluteNginxLogPath() {
    let logPath = commonConfig.nginxLogFilePath
    let commandLogPath = path.resolve(logPath, '.')
    return commandLogPath
  }

  execCommand(command) {
    this.log('执行命令=> ', command)
    shell.exec(command)
  }
}

export default CleanOldLog
