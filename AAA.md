请帮我开发一个纯前端网页应用，名字叫「AI 酒馆 Tavern Agents」。

技术要求：
1. 使用单文件 HTML 实现。
2. 只使用原生 HTML、CSS、JavaScript，不使用 React、Vue、Node.js、后端服务。
3. 页面可以直接保存为 index.html 后在浏览器打开运行。
4. API 使用 OpenAI-compatible Chat Completions 格式。
5. API Base URL 固定为：https://ai2.hhhl.cc/v1
6. API Key 固定为：sk-free
7. 请求地址为：https://ai2.hhhl.cc/v1/chat/completions
8. 请求方式为 POST。
9. Authorization Header 使用：
   Authorization: Bearer sk-free
10. Content-Type 为 application/json。
11. url:ai2.hhhl.cc/v1,key:sk-free.模型默认内置gpt-5.5,gpt-5.4,gpt-5.4-mini

核心功能：
1. 页面是一个酒馆风格的多智能体聊天室。
2. 用户可以添加多个智能体。
3. 每个智能体可以设置：
   - 名称
   - 模型名
   - 人格提示词 system prompt
   - temperature
   - max_tokens
   - 是否启用
4. 默认预置 3 个智能体：
   - 酒保艾琳
   - 神秘旅人
   - 流浪诗人
5. 每个默认智能体都要有不同的人格提示词。
6. 页面有一个全局场景设定输入框，例如：
   “这里是一间位于边境小镇的中世纪奇幻酒馆，窗外下着雨，客人们围绕一封来自北境的神秘信件交谈。”
7. 页面有一个“对话轮数”输入框。
8. 页面有一个“每次发言间隔”输入框，单位毫秒。
9. 页面有“开始对话”“停止对话”“清空聊天”“添加智能体”按钮。
10. 点击“开始对话”后，多个智能体按顺序轮流发言。
11. 对话逻辑是：
    - 第 1 个智能体读取当前聊天记录并发言。
    - 它的输出会加入聊天记录。
    - 第 2 个智能体再读取包含第 1 个智能体输出的聊天记录并发言。
    - 依次循环。
    - 每一轮所有启用的智能体各发言一次。
    - 总轮数由用户设置。
12. 点击“停止对话”后，应尽快停止后续调用。
13. 聊天记录实时显示在页面中。
14. 每条消息显示：
    - 智能体名称
    - 轮数
    - 发言内容
    - 时间
15. 当前正在发言的智能体需要有明显状态提示。
16. API 调用失败时，要在聊天区显示错误信息，但不要导致整个页面崩溃。

Prompt 构造规则：
每次调用某个智能体时，messages 结构应该类似：

[
  {
    "role": "system",
    "content": "你正在参与一个多智能体酒馆对话。\n\n【全局场景】\n{globalSetting}\n\n【你的角色】\n名字：{agentName}\n人格设定：\n{systemPrompt}\n\n【严格规则】\n1. 你只能扮演 {agentName}。\n2. 不要替其他角色说话。\n3. 不要输出其他角色的台词。\n4. 不要总结整个对话。\n5. 不要使用剧本格式批量续写。\n6. 只输出你当前这一轮的自然发言。\n7. 发言要符合你的角色人格。\n8. 每次发言控制在 120 字以内。\n9. 如果聊天刚开始，请自然地开启话题。\n"
  },
  {
    "role": "user",
    "content": "以下是目前酒馆中的对话记录：\n\n{historyText}\n\n现在轮到你发言。请只输出你的角色当前这一轮的发言。"
  }
]

historyText 的格式类似：
酒保艾琳：欢迎来到暮色酒馆。
神秘旅人：我从北境带来了一封信。

如果还没有聊天记录，则 historyText 为：
暂无对话记录，请你自然地开始发言。

请求体示例：
{
  "model": agent.model,
  "messages": messages,
  "temperature": agent.temperature,
  "max_tokens": agent.maxTokens
}

需要兼容 OpenAI 返回格式：
data.choices[0].message.content

界面设计要求：
1. 整体风格为暗色酒馆风格。
2. 背景使用深棕色、暗金色、黑色渐变。
3. 聊天区像羊皮纸或暗色木板。
4. 智能体配置区在右侧或下方。
5. 页面需要响应式设计，手机和电脑都能看。
6. 按钮要有 hover 效果。
7. 聊天消息用卡片样式展示。
8. 不同智能体的消息可以使用不同颜色边框。
9. 正在运行时，“开始对话”按钮禁用。
10. 停止后可以再次开始。

数据结构建议：
Agent:
{
  id: string,
  name: string,
  model: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  enabled: boolean
}

Message:
{
  id: string,
  agentId: string,
  agentName: string,
  content: string,
  round: number,
  time: string,
  error?: boolean
}

默认模型名可以设置为：
gpt-4o-mini

如果接口不支持该模型，用户可以在智能体配置中自己修改模型名。

需要实现的 JavaScript 函数：
1. renderAgents()
2. renderMessages()
3. addAgent()
4. removeAgent(agentId)
5. updateAgent(agentId, field, value)
6. startConversation()
7. stopConversation()
8. clearMessages()
9. buildMessagesForAgent(agent)
10. callAgent(agent, messages)
11. sleep(ms)

上下文控制：
为了避免上下文太长，每次调用只传最近 30 条聊天记录。
如果聊天记录超过 30 条，只使用最后 30 条。

异常处理：
1. 如果没有启用的智能体，点击开始时弹窗提示。
2. 如果轮数小于 1，提示用户设置正确轮数。
3. 如果 API 返回错误，在聊天区显示：
   “API 调用失败：状态码 xxx，错误信息 xxx”
4. 如果网络错误，在聊天区显示：
   “网络请求失败：xxx”
5. 某个智能体调用失败后，继续下一个智能体，而不是直接全部停止。

请输出完整的 index.html 代码。
代码必须可以直接复制运行。
不要省略任何代码。
不要只给伪代码。