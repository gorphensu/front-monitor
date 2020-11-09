<template>
  <Row class="expand-row">
    <List border size="small">
      <ListItem class="expand-row-listitem">
        <span class="ctrl-type">控件类型</span>
        <span class="ctrl-operation">操作</span>
        <span class="ctrl-costtime">耗时</span>
        <span class="ctrl_code">控件code</span>
      </ListItem>
      <ListItem class="expand-row-listitem" v-for="(item, index) in listDatas" :key="index">
        <span class="ctrl-type">{{ item.component_type }}</span>
        <span class="ctrl-operation">{{ item.operation_type }}</span>
        <span class="ctrl-costtime">{{ item.cost_time }}</span>
        <span class="ctrl_code">{{ item.component_code }}</span>
      </ListItem>
    </List>
  </Row>
</template>

<script>
import { fetchPageEngineCtrlsByEngineItemId } from '@/api/page-engine-ctrls'
export default {
  props: {
    row: Object
  },
  data() {
    return {
      listDatas: []
    }
  },
  created() {
    this.getCtrlsData()
  },
  methods: {
    async getCtrlsData() {
      if (this.row) {
        let create_time = this.row.create_time
        let engine_item_id = this.row.item_id
        let res = await fetchPageEngineCtrlsByEngineItemId({
          create_time,
          engine_item_id
        })
        this.listDatas = res.data
        // this.listDatas = [{
        //   component_type: 'text',
        //   component_code: 'text-1',
        //   operation_type: 'setView',
        //   cost_time: 200
        // }, {
        //   component_type: 'text',
        //   component_code: 'text-1',
        //   operation_type: 'setView',
        //   cost_time: 200
        // }, {
        //   component_type: 'text',
        //   component_code: 'text-1',
        //   operation_type: 'setView',
        //   cost_time: 200
        // }]
      }
    }
  }
}
</script>

<style lang="less" scoped>
.expand-row {
  .expand-row-listitem {
    > span {
      width: 300px;
    }
  }
}
</style>