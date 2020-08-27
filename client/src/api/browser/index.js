import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchSystemBrowserList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/browser/gets`,
    method: 'get',
    params
  })
}