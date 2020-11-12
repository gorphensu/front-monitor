import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchVersionList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageperformance/version_list`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchUrlList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageperformance/url_list`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchPagePerformanceList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageperformance/list`,
    method: 'get',
    params: {
      ...params
    }
  })
}