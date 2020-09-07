let conditionOperationMap = {
  '__range_min__': '>=',
  '__range_max__': '<=',
  '__like__': 'like'
}

export default {
  setCondition(builder, condition) {
    for (let key in condition) {
      if (condition[key]) {
        let matcher = key.match(/(__.+__)(.+)?/)
        let operation = ''
        let prop = key
        if (matcher && matcher[1]) {
          operation = conditionOperationMap[matcher[1]]
          prop = matcher[2]
        }
        if (operation) {
          builder.where(prop, operation, condition[key])
        } else {
          builder.where(prop, condition[prop])
        }
      }
    }
  }
}