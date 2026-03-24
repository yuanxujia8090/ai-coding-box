# TypeScript 编码规范

## 一、配置

- **【强制】** TypeScript 项目必须至少采用以下 tsconfig 配置（针对新项目和工具库类项目强制开启）：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

对于存量业务项目，开启 `"strict": true` 会带来较大治理成本，可以关闭以下配置：
- `noImplicitAny`
- `strictNullChecks`
- `noUnusedLocals`
- `noUnusedParameters`

## 二、语法

### 2.1 类型/接口

- **【强制】** type 或 interface 中定义的可选属性，不可以赋值 undefined，除非在类型中显式定义包含 undefined。落地方式：静态代码扫描。
- **【强制】** 不能有隐式的 any（新项目&工具类项目建议严格开启）。落地方式：静态代码扫描。
- **【强制】** 重载的签名相邻放置。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/adjacent-overload-signatures
- **【强制】** 不要仅因某个特定位置上的参数类型不同而定义重载。落地方式：CodeReview/静态代码扫描。
- **【强制】** 方法签名应使用函数类型。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/prefer-function-type/
- **【强制】** 禁止在泛型和函数返回值之外使用 void。落地方式：CodeReview/静态代码扫描。
- **【强制】** 在不进行任何覆盖操作的前提下，禁止定义冗余类型。落地方式：静态代码扫描。
- **【强制】** 禁止不必要的类型断言。落地方式：静态代码扫描。
- **【强制】** 禁止对泛型类型进行不必要的约束。落地方式：CodeReview/静态代码扫描。
- **【强制】** 禁止不安全的声明合并。落地方式：CodeReview。
- **【建议】** 类型并集/交集的成分按字母顺序排序。落地方式：CodeReview。参考：https://typescript-eslint.io/rules/member-ordering
- **【强制】** 类型、接口或枚举等需用帕斯卡命名法。落地方式：静态代码扫描。
- **【强制】** 类型或接口的成员结尾，如果不和 `]` 或者 `}` 一行，都要添加分号。落地方式：静态代码扫描。

### 2.2 枚举/常量

- **【强制】** 枚举中不能有重复值。落地方式：静态代码扫描。
- **【强制】** 枚举不能数字和字符串混合使用。落地方式：静态代码扫描。
- **【强制】** 枚举值需要显式初始化。落地方式：静态代码扫描。

### 2.3 数字、字符串字面量

- **【强制】** 禁止对非字符串和非数字类型使用模板字符串表达式。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/restrict-template-expressions/
- **【强制】** 禁止对不能安全转换为字符串的类型调用 `.toString()`。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-base-to-string

### 2.4 数组

- **【建议】** 当只需要索引时，优先使用 for-of 循环而非传统 for 循环。落地方式：CodeReview。参考：https://typescript-eslint.io/rules/prefer-for-of
- **【建议】** 使用 `Array.reduce` 时，优先使用泛型参数指定类型，而非对初始值进行类型断言。落地方式：CodeReview。参考：https://typescript-eslint.io/rules/prefer-reduce-type-parameter

### 2.5 变量

- **【强制】** 禁止声明未使用的变量。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-unused-vars
- **【强制】** 禁止使用 delete 操作符删除动态计算的键。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-dynamic-delete
- **【强制】** 禁止使用非空断言操作符 `!`。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-non-null-assertion/
- **【建议】** 优先使用可选链操作符 `?.` 代替链式的逻辑与 `&&`。落地方式：CodeReview。

### 2.6 对象

- **【强制】** 禁止在对象字面量中出现重复的键。落地方式：静态代码扫描。
- **【强制】** 禁止不必要的计算属性键。落地方式：静态代码扫描。
- **【强制】** 使用对象展开语法而非 Object.assign。落地方式：静态代码扫描。
- **【强制】** 优先使用简写属性值。落地方式：静态代码扫描。
- **【建议】** 对象属性按字母顺序排列。落地方式：CodeReview。
- **【建议】** 简写属性放在对象声明的前面。落地方式：CodeReview。

### 2.7 函数

- **【强制】** 禁止出现空函数（空的构造函数和带有修饰符的参数属性的构造函数除外）。落地方式：静态代码扫描。
- **【强制】** 禁止不必要的 return await。落地方式：静态代码扫描。
- **【强制】** 禁止在可选链表达式后使用非空断言。落地方式：静态代码扫描。
- **【强制】** 函数参数不超过 5 个，超过时使用对象参数。落地方式：静态代码扫描。
- **【强制】** 使用默认参数语法，而不是修改函数参数。落地方式：静态代码扫描。
- **【强制】** 默认参数放在最后。落地方式：CodeReview。
- **【建议】** 优先使用函数类型而非包含调用签名的接口。落地方式：CodeReview。

### 2.8 类

- **【强制】** 禁止出现无用的类（没有添加任何功能的类）。落地方式：静态代码扫描。
- **【强制】** 禁止出现重复的类成员。落地方式：静态代码扫描。
- **【强制】** 类的方法必须使用 this，否则应改为静态方法或独立函数。落地方式：静态代码扫描。
- **【强制】** 使用 class 语法，避免直接操作 prototype。落地方式：CodeReview。
- **【建议】** 类成员按照一定顺序排列：静态成员 → 实例成员 → 构造函数 → 方法。落地方式：CodeReview。

### 2.9 模块

- **【强制】** 禁止使用 namespace，使用 ES Module。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-namespace
- **【强制】** 禁止不必要的命名空间限定符。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/no-unnecessary-qualifier
- **【强制】** 使用 import type 导入仅用于类型的导入。落地方式：静态代码扫描。
- **【强制】** 将所有 import 语句放在非 import 语句之上。落地方式：静态代码扫描。

### 2.10 运算符

- **【强制】** 使用 `===` 和 `!==` 而不是 `==` 和 `!=`。落地方式：静态代码扫描。
- **【强制】** 禁止嵌套三元表达式。落地方式：静态代码扫描。

### 2.11 异步

- **【强制】** 返回 Promise 的函数必须标记为 async。落地方式：静态代码扫描。参考：https://typescript-eslint.io/rules/promise-function-async
- **【强制】** Promise 必须有 catch 处理或在 async 函数中使用 try/catch。落地方式：静态代码扫描。

## 三、风格

### 3.1 空格

- **【强制】** 类型注解的冒号后面需要空一格，冒号前面不空格。落地方式：静态代码扫描。
- **【强制】** 泛型参数的尖括号内不需要空格。落地方式：静态代码扫描。
