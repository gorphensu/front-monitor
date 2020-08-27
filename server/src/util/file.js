import fs from 'fs'
import path from 'path'

function deleteFolder(dir) {
  return new Promise(async (resolve, reject) => {
    try {
      await clearFolder(dir)
      fs.rmdir(dir, resolve)
    } catch (e) {
      reject(e)
    }
  })
}

function clearFolder(dir) {
  return new Promise((resolve, reject) => {
    try {
      fs.stat(dir, (err, status) => {
        if (status.isDirectory()) {
          fs.readdir(dir, (err, file) => {
            let res = file.map((item) => deleteFolder(path.join(dir, item)))
            Promise.all(res).then(() => {
              resolve()
            })
          })
        } else {
          fs.unlink(dir, resolve)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

export default {
  deleteFolder,
  clearFolder
}