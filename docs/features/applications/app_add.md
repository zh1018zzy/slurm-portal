> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`
非常棒，后端接口已具备，下一步建议分阶段推进前端和后端的集成与完善。下面是详细的分步建议和可执行方案：

---

## 1. 前端页面对接

### 1.1 用户端 `/dashboard/applications`
- **应用列表**：调用 `/api/applications/available`，展示所有可用应用（卡片/列表/分组）。
- **应用详情与动态表单**：点击应用，拉取 `/api/applications/[id]`，根据 `fields` 渲染参数表单（支持类型、校验、默认值等）。
- **作业提交**：表单提交时，POST 到 `/api/applications/[id]/submit`，展示作业ID、状态、脚本预览等。
- **我的作业管理**：可复用现有作业管理逻辑，或新建作业表，展示提交历史。

### 1.2 管理员端 `/dashboard/applications`
- **应用管理**：调用 `/api/applications`，支持增删改查、状态切换、权限配置。
- **表单设计器**：可用 JSON Schema 编辑器或自定义表单设计UI，编辑 `fields` 字段。
- **脚本模板编辑器**：支持变量高亮、插入、预览。
- **权限配置**：可视化选择用户/角色/部门，配置可见/可用范围。

---

## 2. 脚本模板高级渲染

- 推荐用 [mustache](https://github.com/janl/mustache.js) 或 [handlebars](https://handlebarsjs.com/) 进行模板渲染，支持条件、循环、默认值等。
- 后端可引入 npm 包，替换简单的 `${param}` 方案，支持更复杂的模板逻辑。

**示例：**
```js
import Mustache from 'mustache'
const script = Mustache.render(app.script_template, body)
```

---

## 3. 作业真正提交到集群

- 在 `/api/applications/[id]/submit` 里，渲染脚本后，调用现有的作业提交逻辑（如 slurmAdapter.submitJob）。
- 建议将作业参数、脚本、用户信息等写入 jobs 表，便于后续管理和查询。
- 返回作业ID、状态、日志路径等。

---

## 4. 接口权限校验

- 后端所有接口需校验用户身份（如 req.user），判断是否有权限访问/操作该应用。
- 管理员接口需校验 admin 权限。
- 用户端接口需校验是否在 role_ids、department_ids、user_ids、visible_to_all 范围内。

---

## 5. 推荐开发顺序

1. **用户端应用列表与动态表单提交**（最快可见成效）
2. **管理员端应用管理与表单/脚本设计**
3. **后端脚本模板高级渲染（mustache/handlebars）**
4. **作业真正提交到集群（对接 slurmAdapter）**
5. **接口权限校验与安全加固**

---

## 6. 代码骨架/示例

如需具体页面、组件、API hooks、模板渲染代码、权限中间件等，请明确你想先做哪一块（如“先做用户端应用列表和动态表单”），我可直接帮你写出 TypeScript/React/Next.js 代码骨架和实现！

---

### 你可以这样回复：

- “先做用户端应用列表和动态表单”
- “先做管理员端应用管理页面”
- “先做后端 mustache 脚本渲染和作业提交集群”
- “先做接口权限校验中间件”

**请明确优先级，我将直接帮你实现！**
