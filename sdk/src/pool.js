export default class Pool {
  constructor(size) {
    // 同时任务数
    this.size = size || 1
    this.list = []
    this.running = []
  }
  add(promise) {
    this.list.push(promise)
    this.run()
  }
  run() {
    if (!window.requestIdleCallback) {
      if (!this.list.length) {
        return
      }
      // 如果线程没有满
      if (this.running.length < this.size) {
        let promise = this.list.shift()
        this.running.push(promise)
        // 运行
        promise = this.running[0]
        promise().then(() => {
          // 完成后清除队列
          this.running.shift()
          this.run()
        })
      }
    } else {
      window.requestIdleCallback(() => {
        if (!this.list.length) {
          return
        }
        // 如果线程没有满
        if (this.running.length < this.size) {
          let promise = this.list.shift()
          this.running.push(promise)
          // 运行
          promise = this.running[0]
          promise().then(() => {
            // 完成后清除队列
            this.running.shift()
            this.run()
          })
        }
      })
    }
  }
}