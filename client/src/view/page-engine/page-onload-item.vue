<template>
  <div class="list-item">
    <template v-if="rowData">
      <span class="link" @click="handleClick(rowData)">{{ rowData.pagecode }}</span>
      <span>{{ rowData.tenantid }}</span>
      <span>{{ rowData.loaded_time }}</span>
      <span>{{ rowData.ucid }}</span>
      <span>{{ rowData.url }}</span>
      <span>{{ rowData.browser }}</span>
      <span>{{ rowData.count_at_time }}</span>
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