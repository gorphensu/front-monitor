<template>
  <div class="list-item">
    <template v-if="rowData">
      <span>{{ rowData.component_type }}</span>
      <span>{{ rowData.component_code }}</span>
      <span>{{ rowData.cost_time }}</span>
      <span>{{ rowData.operation_type }}</span>
    </template>
  </div>
</template>

<script>
export default {
  props: {
    rowData: Object,
  },
  data() {
    return {
    }
  },
  methods: {
  }
}
</script>

<style lang="less" scoped>
.list-item {
  width: 100%;
  // min-height: 30px;
  // border: 1px solid #fcfcfc;
  display: flex;
  > * {
    padding: 0px 5px;
    flex: 1;
  }
  &:hover {
    background: #efefef;
  }
  .link {
    color: #2d8cf0;
    cursor: pointer;
    text-decoration: underline;
  }
  &.list-header {
    cursor: initial;
    text-decoration: initial;
    color: initial;
    .link {
      cursor: initial;
      text-decoration: initial;
      color: initial;
    }
    &:hover {
      background: initial;
    }
  }
}
</style>