/**
 * Name: 级联选择器控件
 * Version: 2020-06-16
 * Author: 王海峰 <wanghaifeng@iyiou.com>
 * Function List:
 * 1. 级联面板 - 支持多选 - 单选
 * 2. 支持回显已选中数据的完整路径 父级-父级-子级(可通过配置项 separator 自定义分隔符)
 * 3. 支持删除单个选中的数据项
 * 4. 支持一键删除所有选中数据项(可通过配置项 clearable 是否启用改功能)
 * 5. 接口: 一键获取所选中的所有文本数组
 * 6. 接口: 一键获取所选中的所有ID数组
 */

(function() {
  /**
   * cascader_node 适配器模式
   * 将用户传入的数据通过该适配器进行处理
   * 数据驱动的思路，一个 CascaderNode 实例对应一个数据项（不管是子级还是父级）
   */
  var cascader_node = function () {
    /**
     * @param {Object} data 数据
     * @param {Object} config 配置项
     * @param {Object} parentNode 父级 递归时传入
     */
    function CascaderNode(data, config, parentNode) {
      this.data = data // 原始数据
      this.config = config // 配置项
      this.indeterminate = false // 该父级下的子级是否全选，用于控制父级显示状态(只有子级全选，父级才全选)
      this.parent = parentNode || null // 该项的父级
      this.level = !this.parent ? 1 : this.parent.level + 1 // 等级序列号
      this.uid = data.id // 数据ID
      // 因是数据驱动的方式，一个数据项对应一个DOM，DOM选中与否
      this.checked = false // 该项数据是否选中
      this.initState()
      this.initChildren()
    }
  
    /**
     * 初始化数据
     */
    CascaderNode.prototype.initState = function initState() {
      var _config = this.config,
        valueKey = _config.value,
        labelKey = _config.label
  
      this.value = this.data[valueKey]
      this.label = this.data[labelKey]
      this.pathNodes = this.calculatePathNodes()
      this.path = this.pathNodes.map(function (node) {
        return node.value
      })
      this.pathLabels = this.pathNodes.map(function (node) {
        return node.label
      })
    }
  
    /**
     * 初始化该数据下的子级
     * 内部通过递归生成 CascaderNode 实例，即子级
     */
    CascaderNode.prototype.initChildren = function initChildren() {
      var _this = this
      var config = this.config
      var childrenKey = config.children
      var childrenData = this.data[childrenKey]
      this.hasChildren = Array.isArray(childrenData)
      this.children = (childrenData || []).map(function (child) {
        return new CascaderNode(child, config, _this)
      })
    }
  
    /**
     * 计算路径
     */
    CascaderNode.prototype.calculatePathNodes = function calculatePathNodes() {
      var nodes = [this]
      var parent = this.parent
  
      while (parent) {
        nodes.unshift(parent)
        parent = parent.parent
      }
      return nodes
    }
  
    /**
     * 获取该项的路径（包含父级+）
     */
    CascaderNode.prototype.getPath = function getPath() {
      return this.path
    }
  
    /**
     * 获取该项的路径（不包含父级）
     */
    CascaderNode.prototype.getValue = function getPath() {
      return this.value
    }
  
    /**
     * 多选 - 父级选中操作，让所有子级选中
     * @param {Boolean} checked 
     */
    CascaderNode.prototype.onParentCheck = function onParentCheck(checked) {
      var child = this.children.length ? this.children : this
      this.checked = checked
      this.indeterminate = false
      this.doAllCheck(child, checked)
    }
  
    /**
     * 多选 - 父级选中时，子级全选
     * @param {Array} child 
     * @param {Boolean} checked 
     */
    CascaderNode.prototype.doAllCheck = function doAllCheck(child, checked) {
      var _this = this
      if (Array.isArray(child) && child.length) {
        child.forEach(function (c) {
          c.checked = checked
          c.indeterminate = false
          _this.doAllCheck(c.children, checked)
        })
      }
    }
  
    /**
     * 多选 - 子级选中，操作父级
     * @param {*} checked 
     */
    CascaderNode.prototype.onChildCheck = function onChildCheck(checked) {
      this.checked = checked
      var parent = this.parent
      var isChecked = parent.children.every(function (child) {
        return child.checked
      })
      this.setCheckState(this.parent, isChecked);
    }
  
    /**
     * 设置父级相应的状态
     * 当该项有同级，且都没有选中，父级为 无选中 状态： 口
     * 当该项有同级，且同级的所有数据都为选中时，父级为 选中 状态：√
     * 当该项有同级，但同级中有且只有一项没有被选中，父级为 半选中 状态： -
     * @param {Object} parent 
     * @param {Boolean} isChecked 
     */
    CascaderNode.prototype.setCheckState = function setCheckState(parent, isChecked) {
      parent.checked = isChecked
      var totalNum = parent.children.length;
      var checkedNum = parent.children.reduce(function (c, p) {
        var num = p.checked ? 1 : p.indeterminate ? 0.5 : 0;
        return c + num;
      }, 0);
      parent.indeterminate = checkedNum !== totalNum && checkedNum > 0;
      parent.parent && this.setCheckState(parent.parent, isChecked)
    }
  
    return CascaderNode
  }()
  
  /**
   * eo_cascader 生成级联选择器
   * 绑定相关事件、操作数据、渲染选择器、 回显选中列表
   */
  var eo_cascader = function () {
    // 默认配置
    var defaultConfig = {
      disabled: 'disabled',
      emitPath: true,
      value: 'id',
      label: 'label',
      children: 'children'
    }
    /**
     * 级联选择器构造函数
     * @param {Array} data 
     * @param {Object} config 
     */
    function EoCascader(data, config) {
      this.config = Object.assign(config, defaultConfig) || null
      this.multiple = config.multiple // 是否多选
      this.separator = config.separator // 自定义数据之间分隔符
      this.data = data // 原始数据
      this.clearable = config.clearable // 是否可一键清空
      this.panelShowState = false // 控制级联选择器显示
      this.storageChecked = {} // 存储已选中的数据项
      this.checkedText = [] // 选中的文本
      this.checkedID = [] // 选中的ID
      this.ele = document.getElementById(config.elementID) // DOM容器
      this.panelWrap = this.initPanel() // 级联选择器DOM容器
      this.checkedWrap = this.initCheckedWrap() // 回显选中列表DOM容器
      this.initNodes(data)
      this.initEvents()
    }
  
    /**
     * 事件绑定
     */
    EoCascader.prototype.initEvents = function initEvents(e) {
      this.ele.addEventListener('click', this.bindCascaderClick.bind(this))
      document.body.addEventListener('click', this.bindBodyClick.bind(this), true)
      if(this.clearable) {
        this.ele.addEventListener('mouseover', this.bindCascaderHover.bind(this))
        this.ele.addEventListener('mouseout', this.bindCascaderOut.bind(this))
      }
    }
  
    /**
     * body点击隐藏级联面板
     */
    EoCascader.prototype.bindBodyClick = function bindCascaderClick(e) {
      if(e.target.tagName !== 'BODY') return
      this.panelShowState = false
      this.ele.className = 'cascader-wrap'
    }
  
    /**
     * 点击容器控制切换级联面板显示
     */
    EoCascader.prototype.bindCascaderClick = function bindCascaderClick(e) {
      e.stopPropagation();
      if(e.target.id !== this.ele.id ) return
      this.panelShowState = !this.panelShowState
      this.ele.className = this.panelShowState? 'cascader-wrap is-show': 'cascader-wrap'
    }
  
    /**
     * 当且仅当 clearable 为 true 时绑定
     * 鼠标移入容器，显示一键清空按钮
     */
    EoCascader.prototype.bindCascaderHover = function bindCascaderHover(e) {
      e.stopPropagation();
      if(e.target.id !== this.ele.id && e.target.className !== 'eo-clear-btn' ) return
      if(JSON.stringify(this.storageChecked) !== '{}') {
        this.ele.className = this.panelShowState? 'cascader-wrap is-show is-clear': 'cascader-wrap is-clear'
      }
    }
  
    /**
     * 当且仅当 clearable 为 true 时绑定
     * 鼠标移出容器，隐藏一键清空按钮
     */
    EoCascader.prototype.bindCascaderOut = function bindCascaderOut(e) {
      e.stopPropagation();
      if(e.target.id !== this.ele.id) return
      this.ele.className = this.panelShowState? 'cascader-wrap is-show': 'cascader-wrap'
    }
  
    /**
     * 动态生成级联面板DOM容器
     */
    EoCascader.prototype.initPanel = function initPanel() {
      var panel = document.createElement('div')
      panel.className = 'eo-cascader-panel'
      return panel
    }
  
    /**
     * 动态生成回显选中列表DOM容器
     */
    EoCascader.prototype.initCheckedWrap = function initCheckedWrap() {
      var checkedWrap = document.createElement('div')
      checkedWrap.className = 'eo-checked-wrap'
      return checkedWrap
    }
  
    /**
     * 动态生成一键清空按钮
     */
    EoCascader.prototype.initClearDom = function initClearDom() {
      var clearBtn = document.createElement('i')
      clearBtn.className = 'eo-clear-btn'
      clearBtn.innerHTML = 'x'
      var _this = this
      // 绑定事件，初始化所有数据，重新渲染级联面板
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _this.storageChecked = {}
        _this.config.checkedValue = null
        _this.checkedText = []
        _this.checkedID = []
        _this.initNodes(_this.data)
        _this.initCheckedLi()
        _this.panelWrap.style.top = _this.ele.offsetHeight + 2 + 'px'
      })
      return clearBtn
    }
  
    /**
     * 通过 CascaderNode 适配器对原始数据进行改造，并赋值给当前构造函数的 nodes 对象
     * @param {Array} data 用户传入的原始数据
     */
    EoCascader.prototype.initNodes = function initNodes(data) {
      var _this = this
      this.nodes = data.map(function (nodeData) {
        // 访问适配器
        return new cascader_node(nodeData, _this.config)
      })
      // 级联面板
      this.menus = [this.nodes]
      // 当为编辑页面时，往往需要回显上次提交的数据，即，
      // 如果存在 checkedValue
      //  那么调用 findChecked 方法，通过传入的已选 ID，渲染级联面板、回显列表
      // 反之，根据初始数据正常渲染即可
      this.config.checkedValue ? this.findChecked(this.config.checkedValue) : this.createNodes(this.menus)
      // 如果可一键清空，动态添加清空按钮
      this.clearable && this.ele.appendChild(this.initClearDom())
    }
  
    /**
     * @param {Object} currentMenu 级联面板中，当前的点击项
     * 点击同级项时，通过操作 menus，使对应的子级进行渲染
     */
    EoCascader.prototype.renderNodes = function (currentMenu) {
      // 操作 menus
      var menus = this.menus.slice(0, currentMenu.level)
      currentMenu.children.length && menus.push(currentMenu.children)
      this.menus = menus
      var wrap = this.panelWrap
      var wrapChild = wrap.children
      // 操作DOM
      for (let j = currentMenu.level; j < wrap.children.length; j++) {
        wrap.removeChild(wrapChild[j])
        j = j - 1
      }
      return menus
    }
  
    /**
     * 数据驱动的方式，通过 menus 渲染DOM
     * 每次操作 menus，增删都需要修改 menus，进而再次调用改方法进行渲染
     * @param {Array} menus 级联面板数据
     */
    EoCascader.prototype.createNodes = function (menus) {
      var wrap = this.panelWrap
      wrap.innerHTML = ''
      var _this = this
  
      for (let i = 0; i < menus.length; i++) {
        var menu = document.createElement('div')
        menu.className = 'eo-cascader-menu'
        var ul = document.createElement('ul')
        var menusList = menus[i];
        for (let k = 0; k < menusList.length; k++) {
          var li = document.createElement('li')
          if(menusList[k].children.length) li.className = 'has-child'
          // 当且仅当多选时 创建 label checkbox
          if(_this.multiple) {
            var label = document.createElement('label')
            var checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.checked = menusList[k].checked
            checkbox.setAttribute('uid', menusList[k].uid)
    
            checkbox.className = menusList[k].indeterminate ? 'is-indeterminate' : ''
    
    
            checkbox.addEventListener('click', _this.bindClickEvent.bind(checkbox,
              _this, _this.handleCheckCb)
            )
    
            label.appendChild(checkbox)
            li.appendChild(label)
          }
          // 创建文本
          var span = document.createElement('span')
          span.innerHTML = menusList[k]['label']
          span.setAttribute('uid', menusList[k].uid)
          li.addEventListener('click', _this.bindClickEvent.bind(span, _this, _this.handleDanxuanCb))
          // 将 label 及 文本追加到 li
          li.appendChild(span)
          ul.appendChild(li)
        }
        menu.appendChild(ul)
        wrap.appendChild(menu)
        wrap.style.top = _this.ele.offsetHeight + 2 + 'px'
      }
      this.ele.appendChild(wrap)
    }
  
    /**
     * 点击 checkbox 和 文本回调函数
     * @param {this} _this 当前实例
     * @param {Function} cb 回调函数
     * 当且仅当点击 checkbox 时，传入 cb
     */
    EoCascader.prototype.bindClickEvent = function bindClickEvent(_this, cb) {
      var uid = this.getAttribute('uid')
      var _thisMenu = _this.menus.flat(Infinity).filter(function (menu) {
        return menu.uid == uid
      })
      typeof cb === 'function' && cb.call(this, _thisMenu, _this, this.checked)
      _this.createNodes(_this.renderNodes(_thisMenu[0]))
    }

    EoCascader.prototype.handleDanxuanCb = function handleDanxuanCb(currentMenu, _this) {
      if(_this.multiple) return
      var child = currentMenu[0].children
      if(!child.length) {
        _this.storageChecked = {}
        _this.storageChecked[currentMenu[0].uid] = currentMenu[0].pathLabels
        _this.checkedWrap.innerHTML = ''
        // 渲染回显列表
        _this.initCheckedLi()
      }
    }
  
    /**
     * 点击 checkbox 触发回调
     * 内部对父级、子级选中状态进行修改
     * 同时对选中的数据进行存储，调用渲染回显列表函数
     * @param {Array} currentMenu 当前点击的面板项
     * @param {this} _this 
     * @param {Boolean} isChecked 
     */
    EoCascader.prototype.handleCheckCb = function handleCheckCb(currentMenu, _this, isChecked) {
      // 如果当前点击项为第一级，那么让所有子级都选中
      // 如果当前项有父级，设置父级选中状态
      if (currentMenu[0].level !== 1) {
        currentMenu[0].onChildCheck(isChecked)
      }
      currentMenu[0].onParentCheck(isChecked)
  
      // 存储当前选中状态
      currentMenu[0].children.length ?
        _this.showReviewCheckedOb(currentMenu[0]) :
        _this.handleReviewCheckedOb(currentMenu[0])
  
      _this.checkedWrap.innerHTML = ''
      // 渲染回显列表
      _this.initCheckedLi()
    }
  
    EoCascader.prototype.initCheckedLi = function () {
      var ul = document.createElement('ul')
      var _this = this
      if(JSON.stringify(this.storageChecked) === '{}') {
        return this.checkedWrap.innerHTML = ''
      }
      for (const key in this.storageChecked) {
        if (this.storageChecked.hasOwnProperty(key)) {
          var li = document.createElement('li')
          var p = document.createElement('p')
          var i = document.createElement('i')
          li.setAttribute('uid', key)
          p.innerHTML = this.storageChecked[key].join(_this.separator)
          i.innerHTML = 'x'
  
          i.addEventListener('click', function () {
            var uidd = this.parentElement.getAttribute('uid')
            delete _this.storageChecked[uidd]
            var fn = function (parent) {
              for (let i = 0; i < parent.length; i++) {
                if (parent[i].children.length) {
                  fn(parent[i].children)
                } else {
                  if (parent[i].uid == uidd) {
                    _this.handleCheckCb([parent[i]], _this, false)
                    _this.createNodes(_this.menus)
                  }
                }
              }
            }
            fn(_this.nodes)
          })
          li.appendChild(p)
          li.appendChild(i)
          ul.appendChild(li)
          _this.checkedWrap.appendChild(ul)
        }
      }
      this.ele.appendChild(this.checkedWrap)
    }
  
    /**
     * 根据编辑页面传入的已选ID数组，修改面板数据 menus
     * @param {Array} uidArr 
     */
    EoCascader.prototype.findChecked = function (uidArr) {
      var _this = this
      // 获取上次已经提交过的三级标签
      var checkedNodesMatch = []
      var nodes = this.nodes
      var recursionFn = function (parent) {
        for (let i = 0; i < parent.length; i++) {
          if (parent[i].children.length) {
            recursionFn(parent[i].children)
          } else {
            if (uidArr.includes(parent[i].uid)) {
              parent[i].checked = true
              _this.handleCheckCb([parent[i]], _this, true)
              checkedNodesMatch.push(parent[i])
            }
          }
        }
      }
  
      recursionFn(nodes)
  
      var menus = []
      var getMenusMatch = function (menu) {
        if (menu.parent) {
          menus.push(menu.parent.children)
          return getMenusMatch(menu.parent)
        }
      }
  
      getMenusMatch(checkedNodesMatch[0])
  
      menus.reverse().forEach(function (m) {
        _this.menus.push(m)
      })
      _this.createNodes(this.menus)
    }
  
    /**
     * 递归的找到当前 node 下最后一个子级，并将其存入 storageChecked 中
     * @param {Object} node 
     */
    EoCascader.prototype.showReviewCheckedOb = function (node) {
      if (!node.children.length) {
        this.handleReviewCheckedOb(node)
      } else {
        for (let k = 0; k < node.children.length; k++) {
          this.showReviewCheckedOb(node.children[k])
        }
      }
    }
  
    /**
     * 如果当前 node 已选中，存入 storageChecked 中，反之删除 storageChecked 中的当前 node
     * @param {Object} node 
     */
    EoCascader.prototype.handleReviewCheckedOb = function (node) {
      node.checked ? this.storageChecked[node.uid] = node.pathLabels : delete this.storageChecked[node.uid]
    }
  
    /**
     * 接口：获取所有选中的文本
     */
    EoCascader.prototype.getCheckedByText = function () {
      this.checkedText = []
      for (const key in this.storageChecked) {
        if (this.storageChecked.hasOwnProperty(key)) {
          this.checkedText.push(this.storageChecked[key].join(this.separator))
        }
      }
      return this.checkedText
    }
  
    /**
     * 接口：获取所有选中的ID
     */
    EoCascader.prototype.getCheckedByID = function () {
      this.checkedID = []
      for (const key in this.storageChecked) {
        if (this.storageChecked.hasOwnProperty(key)) {
          this.checkedID.push(key - 0)
        }
      }
      return this.checkedID
    }
  
    return EoCascader
  }()

  window.eo_cascader = eo_cascader

}(window))
