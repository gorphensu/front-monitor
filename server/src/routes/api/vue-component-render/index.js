import moment from 'moment'
import _ from 'lodash'
import DATE_FORMAT from '~/src/constants/date_format'
import API_RES from '~/src/constants/api_res'
import RouterConfigBuilder from '~/src/library/utils/modules/router_config_builder'
import MVueComponentRender from '~/src/model/parse/vue_component_render'

// const getVueComponentRenderList = RouterConfigBuilder.routerConfigBuilder(
//   '/api/vuecomponentrender/list',
//   RouterConfigBuilder.METHOD_TYPE_GET,
//   async (req, res) => {
//     let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
//     console.log('performance projectId ', projectId)
//     let request = _.get(req, ['query'], {})
//     // 获取开始&结束时间
//     let startAt = _.get(request, ['st'], 0)
//     let endAt = _.get(request, ['et'], 0)

//     let condition = {
//       component_type: _.get(request, ['component_type'], '')
//     }

//     const currentStamp = moment().unix()
//     if (startAt) {
//       startAt = _.floor(startAt / 1000)
//     } else {
//       startAt = currentStamp
//     }
//     if (endAt) {
//       endAt = _.ceil(endAt / 1000)
//     } else {
//       endAt = currentStamp
//     }
//     console.log('projectId, /api/vuecomponentrender/list, startAt, endAt, summaryBy ', projectId, '/api/vuecomponentrender/list', startAt, endAt)
//     let list = await MVueComponentRender.getList(projectId, startAt, endAt, condition, condition.count_type)
//     res.send(API_RES.showResult(list))
//   })

const getVueComponentRenderList = RouterConfigBuilder.routerConfigBuilder(
  '/api/vuecomponentrender/renderlist',
  RouterConfigBuilder.METHOD_TYPE_GET,
  async (req, res) => {
    let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
    console.log('performance projectId ', projectId)
    let request = _.get(req, ['query'], {})
    // 获取开始&结束时间
    let startAt = _.get(request, ['st'], 0)
    let endAt = _.get(request, ['et'], 0)

    let condition = {
      component_type: _.get(request, ['component_type'], '')
    }

    const currentStamp = moment().unix()
    if (startAt) {
      startAt = _.floor(startAt / 1000)
    } else {
      startAt = currentStamp
    }
    if (endAt) {
      endAt = _.ceil(endAt / 1000)
    } else {
      endAt = currentStamp
    }
    console.log('projectId, /api/vuecomponentrender/list, startAt, endAt, summaryBy ', projectId, '/api/vuecomponentrender/list', startAt, endAt)
    let list = await MVueComponentRender.getRenderList(projectId, startAt, endAt, condition, condition.count_type)
    res.send(API_RES.showResult(list))
  })


export default {
  ...getVueComponentRenderList
}