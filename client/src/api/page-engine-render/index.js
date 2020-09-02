import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchPageEngineRenderList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/renderlist`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchSummaryPageEngineRenderList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageengine/summarylist`,
    method: 'get',
    params: {
      ...params
    }
  })
}