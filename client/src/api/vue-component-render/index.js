import axios from '@/libs/api.request'
import { getProjectId } from '@/libs/util'

export const fetchVueComponentRenderList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/vuecomponentrender/renderlist`,
    method: 'get',
    params: {
      ...params
    }
  })
}