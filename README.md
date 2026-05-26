# AI 酒馆 Tavern Agents

一个纯前端、多智能体酒馆聊天室。多个 AI 智能体会在同一个中世纪奇幻酒馆场景中按顺序轮流发言，形成一段连续的角色对话。

在线访问：<https://huzaigong.github.io/AiTavren/>

## 功能特性

- **纯前端静态应用**：HTML、CSS、JavaScript 分离，无需后端、无需 Node.js、无需构建步骤。
- **多智能体轮流对话**：启用的智能体会按照顺序依次发言，每一轮所有启用智能体各说一次。
- **默认预置角色**：
  - 酒保艾琳
  - 神秘旅人
  - 流浪诗人
- **可自定义智能体**：支持快速添加、手动填写表单添加、删除、启用/禁用智能体。
- **可配置模型参数**：每个智能体可单独设置：
  - 名称
  - 模型名
  - 人格提示词 / system prompt
  - temperature
  - max_tokens
  - 是否启用
- **全局场景设定**：可编辑酒馆背景，例如边境小镇、雨夜、北境来信等。
- **对话控制**：支持设置对话轮数、每次发言间隔、开始、停止、清空聊天。
- **上下文控制**：每次 API 调用只携带最近 30 条聊天记录，避免上下文过长。
- **错误不中断流程**：某个智能体调用失败时，会在聊天区显示错误，并继续下一个智能体。
- **模拟终端输出**：页面内置 `tavern-terminal`，会以终端日志和打字机效果显示请求、AI 输出和错误。
- **响应式界面**：适配桌面端和移动端。

## 技术栈

- HTML
- CSS
- JavaScript
- OpenAI-compatible Chat Completions API

不依赖 React、Vue、Node.js 或任何后端服务。

## API 配置

项目内置固定 API 配置：

```text
API Base URL: https://ai2.hhhl.cc/v1
Request URL:  https://ai2.hhhl.cc/v1/chat/completions
API Key:      sk-free
```

请求方式：`POST`

请求头：

```http
Authorization: Bearer sk-free
Content-Type: application/json
```

默认内置模型名：

- 酒保艾琳：`gpt-5.5`
- 其他默认智能体：`gpt-5.4`
- 手动新增智能体默认：`gpt-5.4`

页面配置下拉中也保留了 `gpt-5.4-mini`、`gpt-4o-mini` 等选项。如果接口不支持某个模型，可以在页面中的智能体配置区手动修改模型名。

## 本地运行

方式一：直接打开文件

1. 下载或克隆本仓库。
2. 双击打开 `index.html`。
3. 在浏览器中使用。

方式二：使用 Git 克隆

```bash
git clone https://github.com/HuZaiGong/AiTavren.git
cd AiTavren
```

然后用浏览器打开：

```text
index.html
```

## 使用说明

1. 打开页面。
2. 根据需要修改全局场景设定。
3. 设置对话轮数和发言间隔。
4. 在右侧配置智能体：名称、模型、人格提示词、temperature、max_tokens 等。
5. 如需新增角色，可使用“手动添加智能体”表单完整填写，也可点击“添加智能体”快速生成默认新客人。
6. 点击 **开始对话**。
7. 多个智能体会按顺序轮流发言。
8. 下方模拟终端会同步显示请求日志和 AI 输出。
9. 如需中断，点击 **停止对话**。
10. 如需重置聊天区，点击 **清空聊天**。

## Prompt 规则

每次调用某个智能体时，会构造类似下面的 messages：

```js
[
  {
    role: "system",
    content: `你正在参与一个多智能体酒馆对话。

【全局场景】
${globalSetting}

【你的角色】
名字：${agent.name}
人格设定：
${agent.systemPrompt}

【严格规则】
1. 你只能扮演 ${agent.name}。
2. 不要替其他角色说话。
3. 不要输出其他角色的台词。
4. 不要总结整个对话。
5. 不要使用剧本格式批量续写。
6. 只输出你当前这一轮的自然发言。
7. 发言要符合你的角色人格。
8. 每次发言控制在 120 字以内。
9. 如果聊天刚开始，请自然地开启话题。
`
  },
  {
    role: "user",
    content: `以下是目前酒馆中的对话记录：

${historyText}

现在轮到你发言。请只输出你的角色当前这一轮的发言。`
  }
]
```

`historyText` 只包含最近 30 条聊天记录。

## 项目结构

```text
AiTavren/
├── AAA.md      # 原始需求文档
├── index.html  # 页面结构
├── styles.css  # 页面样式
├── app.js      # 应用逻辑
└── README.md   # 项目说明
```

## GitHub Pages

本项目已开启 GitHub Pages：

<https://huzaigong.github.io/AiTavren/>

如果刚开启 Pages，页面可能需要等待几十秒到几分钟才会生效。

## 注意事项

- 这是一个纯前端项目，API Key 写在前端代码中，仅适合公开测试或免费接口场景。
- 如果浏览器因为 CORS、网络或接口限制导致请求失败，聊天区会显示错误信息。
- 停止对话会尽快停止后续调用，但已经发出的当前请求需要等待返回或失败。

## License

未指定许可证。若需要开源许可证，可后续添加 `LICENSE` 文件。
