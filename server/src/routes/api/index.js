import Behavior from '~/src/routes/api/behavior'
import Os from '~/src/routes/api/os'
import Browser from '~/src/routes/api/browser'
import RuntimeVersion from '~/src/routes/api/runtimeVersion'
import ErrorReport from '~/src/routes/api/error'
import Log from '~/src/routes/api/log'
import Alarm from '~/src/routes/api/alarm'
import User from '~/src/routes/api/user'
import Login from '~/src/routes/api/login'
import Project from '~/src/routes/api/project'
import UV from '~/src/routes/api/uv'
// Performance 本身是内置对象名
import RPerformance from '~/src/routes/api/performance'
import VueComponentRender from '~/src/routes/api/vue-component-render'
// import PageEngineRender from '~/src/routes/api/page-engine-render'
import PageEngineOnload from '~/src/routes/api/page-engine-onload'
import PageEngineCtrls from '~/src/routes/api/page-engine-ctrls'
import PageEngineOnloadCount from '~/src/routes/api/page-engine-onload-count'
import PagePerformance from '~/src/routes/api/page-performance'
// import PageEngineDataTime from '~/src/routes/api/page-engine-data-time'
import PageEngineDataTime from '~/src/routes/api/page-engine-data-time'
export default {
  ...Behavior,
  ...Os,
  ...Browser,
  ...RuntimeVersion,
  ...ErrorReport,
  ...Log,
  ...Alarm,
  ...User,
  ...Login,
  ...Project,
  ...RPerformance,
  ...UV,
  ...VueComponentRender,
  // ...PageEngineRender,
  ...PageEngineOnload,
  ...PageEngineCtrls,
  ...PageEngineOnloadCount,
  ...PagePerformance,
  ...PageEngineDataTime
}
