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

export const fetchPageOnloadListByPagecodeAndTenantid = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/pageonloadlist`,
    method: 'get',
    params
  })
}

export const fetchPageOnloadCtrlList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/pageonloadctrllist`,
    method: 'get',
    params
  })
}