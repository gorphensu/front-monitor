<template>
  <div class="list-item">
    <span class="link" @click="handleClick(rowData)">{{ rowData.pagecode }}</span>
    <span>{{ rowData.tenantid }}</span>
    <span>{{ rowData.loaded_time }}</span>
    <span>{{ rowData.count_size }}</span>
    <span>{{ rowData.url }}</span>
  </div>
</template>

<script>
export default {
  props: {
    rowData: Object,
  },
  methods: {
    handleClick(rowData) {
      this.$emit('row-click', rowData)
    }
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