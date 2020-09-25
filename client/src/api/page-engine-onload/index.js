import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchPageEngineOnloadList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/renderlist`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchSummaryPageEngineOnloadList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/summarylist`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchSummaryPageEngineOnloadSummary = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/summary`,
    method: 'get',
    params
  })
}