# 会话删除 · DSH Session Delete

给 **DeepSeek Assistant（DSH）** 的侧边栏会话菜单加上一个真正的「删除会话」。

DSH 官方只提供「归档」，归档的会话会一直留在归档列表里、磁盘数据也还在。这个插件补上了删除：

- 侧边栏会话行的 `...` 菜单里多一行「删除会话」（排在「复制 Session ID」之后）；
- 点击后弹确认框，确认即删除，**不可撤销**；
- 删除内容包括：会话的持久化日志目录、投影缓存，以及 Harness 运行时内存里的会话对象；
- 所以删掉之后它不会出现在「归档」里，也不需要重启，列表里直接消失。

## 效果

| 步骤 | 结果 |
|---|---|
| `...` → 删除会话 | 弹出确认框「删除该会话？」 |
| 确认 | 显示「正在移除该会话及其已保存的历史记录…」 |
| 成功 | 显示「已删除」并自动刷新列表，会话彻底消失 |
| 会话正在跑 | 拒绝删除并提示「回合正在运行，请先停止再删一次」，不会打断正在执行的工作 |

中英文界面跟随 Harness 的语言设置。

## 安装

插件是一个 DSH **bundle**（一个目录，带 `package.json` + `cordis.patch.yml` + 宿主/界面两半）。

### 方式一：让 DeepSeek Assistant 自己装（推荐）

把仓库克隆到本地任意位置，然后在 DSH 里对助手说：

> 把 `/你的路径/dsh-session-delete` 这个 bundle 安装到当前 profile：
> 用 plugin_manager 的 install_bundle，target 传这个绝对路径。

助手会执行安装；装完如果插件行显示 `failed`，让它把该插件行禁用再启用一次即可。

### 方式二：手动装

```bash
git clone https://github.com/2045788325/dsh-session-delete.git
cd dsh-session-delete
```

然后把该目录加入你的 profile（`~/.dsh/profiles/<profile>/`）依赖，并在 `cordis.patch.yml` 里插入：

```yaml
- insert:
    - id: session-delete
      name: '@local/dsh-session-delete'
```

（等价于 `dsh plugin --profile desktop add /绝对路径/dsh-session-delete`，再补上面这段 patch。）

### 装好之后

重启一次 DeepSeek Assistant（客户端 bundle 只在页面加载时取一次）。

验证：侧边栏任意会话行悬停 → 点 `...` → 应能看到「删除会话」。

## 卸载

在「插件」页把「会话删除」的开关关掉，或把上面的 patch 行删掉即可。删除行为不会留下任何后台进程或服务。

## 实现说明（重要）

DSH 没有会话删除接口，本插件通过三个步骤实现：

1. **删持久化数据**：`~/.dsh/sessions/<编码工作目录>/<会话ID>/` 与 `~/.dsh/storages/session_projcache/sessions/<会话ID>.json`；
2. **拆会话**：`agent.cancel({ kind: 'disposed' })` + `await agent.scope.dispose()`（Agent loop 自己的拆卸方式）；
3. **摘出内存**：`sessions.detachEntered(sessions.liveEntryFor(session))`（store 在属主 fiber 卸载时走的同一条路径，会发出 `session/disposed`）。

第 2、3 步用的是 Harness 内部 API。**DSH 升级后如果这两个签名变化**，插件会退化成「删数据 + 归档」并如实提示，不会静默出错（所有调用都有 try/catch，最后会重新检查会话是否仍存活再决定提示文案）。

界面侧通过一个仅本机可达的 HTTP 路由与宿主通信：

- 只接受 `POST` + `application/json`（跨站表单无法构造该类型，跨站 fetch 会先触发预检而本路由从不返回 CORS 头）；
- `Origin` 为普通 http(s) 跨站来源时直接 403；桌面版的 `dsh-app://` 协议、`null`、无 Origin 放行；
- `sessionId` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`，杜绝路径穿越。

## 兼容性

- 需要 DSH 桌面版（会话菜单由 `dsh-client-ui-workspace` 提供）。
- 已在 DeepSeek Assistant 桌面版（macOS）上验证：删除空闲会话后会话从 `sessionController.list()` 中消失，磁盘数据清空。

## 许可证

MIT
