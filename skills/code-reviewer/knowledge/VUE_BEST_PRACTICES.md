# Vue最佳实践

## 1. 组件默认值的正确写法

### 问题描述

Vue组件的props默认值如果使用箭头函数返回`{}`，实际返回的是`undefined`。

### 团队真实案例

#### BadCase（2024-XX月线上事故）
```javascript
export default {
  props: {
    // ❌ 错误写法
    auditShowConfig: {
      type: Object,
      default: () => {}  // 返回undefined！
    }
  },
  
  mounted() {
    // ❌ 这里会报错
    console.log(this.auditShowConfig.showAudit);
    // Cannot read property 'showAudit' of undefined
  }
}
```

**为什么会这样？**
```javascript
// 箭头函数的简写
() => {}  // 这是一个函数体，返回undefined

// 要返回对象，必须用括号包裹
() => ({})  // 这才返回空对象
```

**影响：**
- 组件初始化报错
- 页面白屏
- 影响100+个使用该组件的页面

### 正确做法
```javascript
// ✅ 方案1: 用括号包裹（推荐）
export default {
  props: {
    auditShowConfig: {
      type: Object,
      default: () => ({})  // 返回空对象
    }
  }
}

// ✅ 方案2: 使用完整函数体
export default {
  props: {
    auditShowConfig: {
      type: Object,
      default: () => {
        return {};
      }
    }
  }
}

// ✅ 方案3: 普通function（不推荐，但更清晰）
export default {
  props: {
    auditShowConfig: {
      type: Object,
      default: function() {
        return {};
      }
    }
  }
}
```

### 检查清单

- [ ] 所有Object/Array类型的默认值是否用函数返回？
```javascript
  // ❌ 错误：直接用对象
  default: {}
  
  // ✅ 正确：用函数返回
  default: () => ({})
```

- [ ] 箭头函数返回对象是否用括号包裹？
```javascript
  // ❌ 返回undefined
  default: () => {}
  
  // ✅ 返回空对象
  default: () => ({})
```

- [ ] 默认值是否和类型匹配？
```javascript
  // ❌ 类型不匹配
  {
    type: Object,
    default: () => []  // 返回数组，不是对象
  }
  
  // ✅ 类型匹配
  {
    type: Object,
    default: () => ({})
  }
```

### 自动检测
```bash
# 搜索可能的问题代码
grep -rn "default: () => {}" src/

# ESLint规则（Vue官方）
{
  "rules": {
    "vue/require-valid-default-prop": "error"
  }
}
```

### React同理
```javascript
// React也有类似问题

// ❌ 错误
function MyComponent({ config = () => {} }) {
  console.log(config.theme); // undefined
}

// ✅ 正确
function MyComponent({ config = {} }) {
  console.log(config.theme);
}

// 或使用默认参数
function MyComponent({ config = { theme: 'light' } }) {
  console.log(config.theme);
}
```
