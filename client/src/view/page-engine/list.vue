<template>
  <div>
    <div class="filter-container">
      <time-bar class="time-bar" @change="timeChange" dateFormat="yyyy/MM/dd HH:mm" datePickerType="datetimerange" :displayTypeItem="false"></time-bar>
      <i-input class="pagecode-input" search v-model="tenantid" placeholder="租户code" @on-enter="pagecodeChange"></i-input>
      <i-input class="pagecode-input" search v-model="pagecode" placeholder="表单code" @on-enter="pagecodeChange"></i-input>
      <i-select class="pagecode-input" v-model="loadedTimeType" placeholder="加载所需时间" clearable @on-change="pagecodeChange">
        <i-option v-for="(item, index) in loadedTimeTypes" :key="index" :value="item.value">{{ item.label }}</i-option>
      </i-select>
    </div>
    <div>
      <List size="small" border :split="true">
        <MyListItem class="list-header" slot="header" :rowData="listHeaderRow"></MyListItem>
        <ListItem v-for="item in listData.data" :key="item.id">
          <MyListItem @row-click="handleRowClick" :rowData="item"></MyListItem>
        </ListItem>
        <Page :total="listData.total" size="small" :page-size="10" :current="+listData.pageindex" slot="footer" @on-change="pageIndexChange" />
      </List>
    </div>
  </div>
</template>

<script>
import TimeBar from '@/view/components/time-bar'
import Loading from '@/view/components/loading/loading.vue'
import moment from 'moment'
import DataSet from '@antv/data-set'
import { Modal } from 'iview'
import { fetchSummaryPageEngineOnloadList } from '@/api/page-engine-onload'
import MyListItem from './list-item'
const DATE_FORMAT_BY_DAY = 'YYYY/MM/DD'

export default {
  name: 'page-engine-list',
  components: {
    TimeBar,
    Loading,
    Modal,
    MyListItem
  },
  data() {
    return {
      isShowLoading: true,
      chartData: [],
      height: 400,
      dateRange: [moment(moment().format(DATE_FORMAT_BY_DAY)).toDate(), moment(moment().subtract(-1, 'days').format(DATE_FORMAT_BY_DAY)).toDate()],
      pagecode: '',
      tenantid: '',
      loadedTimeType: 5000,
      loadedTimeTypes: [{
        value: 3000,
        label: '3秒以上'
      }, {
        value: 5000,
        label: '5秒以上'
      }, {
        value: 8000,
        label: '8秒以上'
      }, {
        value: 10000,
        label: '10秒以上'
      }],
      listHeaderRow: {
        pagecode: 'pagecode',
        url: 'url',
        tenantid: 'tenantid',
        loaded_time: 'loadedtime',
        count_size: 'countsize'
      },
      listData: {
        data: [],
        total: 0,
        pageindex: 1
      }
    }
  },
  mounted() {
    this.updateListData()
  },
  methods: {
    async timeChange(obj) {
      const {
        dateRange
      } = obj
      this.dateRange = dateRange
      this.updateListData()
    },
    pagecodeChange() {
      this.updateListData()
    },
    // 筛选出有异常的数据，根据时间，租户code, loaded_time
    async updateListData() {
      try {
        let now = moment()
        let start = +moment(this.dateRange[0])
        let end = +moment(this.dateRange[1])
        let res = await fetchSummaryPageEngineOnloadList({
          st: start,
          et: end,
          tenantid: this.tenantid,
          pagecode: this.pagecode,
          loadedtime: this.loadedTimeType,
          pageindex: this.listData.pageindex,
          pagesize: 10
        })
        this.listData = res.data
      } catch (e) {
        console.error(e)
      }
    },
    pageIndexChange(newIndex) {
      this.listData.pageindex = +newIndex
      this.updateListData()
    },
    handleRowClick(rowData) {
      let start = +moment(this.dateRange[0])
      let end = +moment(this.dateRange[1])
      this.$emit('row-click', rowData, {
        st: start,
        et: end
      })
    }
  }
}
</script>

<style lang="less">
.page-engine-container {
  .ivu-list {
    display: flex;
    flex-direction: column;
    max-height: 400px;
    overflow: auto;
    position: relative;
    .ivu-list-header {
      height: 38px;
    }
    .ivu-list-container {
      flex: 1;
      overflow: auto;
    }
    .ivu-list-footer {
      height: 40px;
    }
  }
}
</style>