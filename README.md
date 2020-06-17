# miniCascader
Cascader级联选择器控件

#### Function List:
1. 级联面板 - 支持多选 - 单选
2. 支持回显已选中数据的完整路径 父级-父级-子级(可通过配置项 separator 自定义分隔符)
3. 支持删除单个选中的数据项
4. 支持一键删除所有选中数据项(可通过配置项 clearable 是否启用改功能)
5. 接口: 一键获取所选中的所有文本数组
6. 接口: 一键获取所选中的所有ID数组

#### 使用方式
```js
var cascader = new eo_cascader(tags, {
  elementID: 'cascader-wrap',
  multiple: true, // 是否多选
  // 非编辑页，checkedValue 传入 null
  // 编辑时 checkedValue 传入最后一级的 ID 即可
  checkedValue: [4, 7, 10, 11, 21, 31, 33] || null,
  separator: '-', // 分割符 山西-太原-小店区 || 山西/太原/小店区
  clearable: true // 是否可一键删除已选
})
```