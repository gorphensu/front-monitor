import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchPageEngineDataTimeSummary = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/pageenginedatatime/summary`,
    methods: 'get',
    params
  })
}