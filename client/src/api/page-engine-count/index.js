import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchPageEngineCountSummary = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengineonloadcount/summary`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchPageEngineCountList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengineonloadcount/list`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchPageEngineCountDetailList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/pageonloadlist`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const exportPageEngineCountList = (params = {}) => {
  let query = Object.keys(params).reduce((prev, curr) => {
    if (prev) {
      if (params[curr]) {
        return `${prev}&${curr}=${params[curr]}`
      } else {
        return `${prev}&${curr}`
      }
    } else {
      if (params[curr]) {
        return `${curr}=${params[curr]}`
      } else {
        return `${curr}`
      }
    }
  }, '')
  window.open(`/project/${getProjectId()}/api/pageengineonloadcount/exportlist?${query}`, '_blank')
}