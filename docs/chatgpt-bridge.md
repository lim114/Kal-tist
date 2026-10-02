# ChatGPT 聊天桥接

代码位于 app/desktop-chat.cjs 和 app/conversation-hub.cjs。复用兼容 Windows Codex 桌面客户端暴露的本地工具入口与已有登录，基于 kajmahal/chatgpt-conversations-mcp；Apache-2.0 说明保留于 app/licenses。

管道名以 codex-browser-use- 开头，帧为 4 字节小端长度加 UTF-8 JSON。tools/call 使用 codex_app 命名空间及真实调用来源 callerSource。外层 threadId 是本机调用上下文，arguments.threadId 是目标会话，两者不可混用。

初始化 DesktopChat 时从真实 CODEX_THREAD_ID 或本机合法配置取得上下文；列出会话后筛选 kind=chatgpt，由用户选择目标。发送前读取并记录已有回合；只发送一次，通过新增回合和完整输入匹配读取 agentMessage。发送后约 3.5 秒轮询；非逐 token 推送。读取可重连重试，发送不明确时不能自动重发。待确认状态写入独立本地配置，重启只恢复确认，不重新发送。

这是版本敏感的客户端内部集成，不是公开稳定 API。新机器必须重新配置真实本机上下文及会话，不能复制凭据或冒充调用来源。当前不在气泡中新建 ChatGPT 会话；原生额外审批仍在客户端处理。
