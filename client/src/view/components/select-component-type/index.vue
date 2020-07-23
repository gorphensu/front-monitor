<template>
  <i-select
    class="component-select"
    v-model="componentType"
    placeholder="请选择控件类型"
    @on-change="change"
  >
    <Option v-for="item in options" :value="item.value" :key="item.value">{{ item.label }}</Option>
  </i-select>
</template>

<script>
export default {
  props: {
    value: String,
    default: ''
  },
  data() {
    return {
      options: [{
        label: '下拉框(dropdownbox)',
        value: 'dropdownbox'
      }, {
        label: '穿梭框(relevance)',
        value: 'relevance'
      }],
      componentType: this.value
    }
  },
  methods: {
    change(value) {
      this.$emit('input', value)
    }
  }
}
</script>

<style lang="scss" scoped>
</style>