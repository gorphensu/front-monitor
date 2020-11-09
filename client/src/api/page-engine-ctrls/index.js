import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchPageEngineCtrlsList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageenginectrls/list`,
    method: 'get',
    params: {
      ...params
    }
  })
}

export const fetchPageEngineCtrlsByEngineItemId = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageenginectrls/getbyengineitemid`,
    method: 'get',
    params: {
      ...params
    }
  })
}