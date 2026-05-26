const API_URL = 'https://ai2.hhhl.cc/v1/chat/completions';
    const API_KEY = 'sk-free';
    const AGENT_COLORS = ['#d7a84d', '#6db5d8', '#b985df', '#7ea05a', '#d15f2b', '#d96c9e', '#9ccf86', '#dfc176'];

    let agents = [
      {
        id: newId(),
        name: '酒保艾琳',
        model: 'gpt-5.5',
        systemPrompt: '你是暮色酒馆的酒保艾琳，温和机敏，善于从只言片语中察觉秘密。你熟悉边境传闻，常以一杯热麦酒和一句意味深长的话引导客人开口。',
        temperature: 0.8,
        maxTokens: 220,
        enabled: true
      },
      {
        id: newId(),
        name: '神秘旅人',
        model: 'gpt-5.4',
        systemPrompt: '你是披着旧斗篷的神秘旅人，刚从北境风雪中归来。你说话克制，带着警惕和疲惫，似乎知道那封信背后的危险。',
        temperature: 0.9,
        maxTokens: 220,
        enabled: true
      },
      {
        id: newId(),
        name: '流浪诗人',
        model: 'gpt-5.4',
        systemPrompt: '你是流浪诗人，幽默、敏感又略带夸张。你喜欢用隐喻描述眼前之事，但不会长篇吟唱；你总能把紧张气氛化成一两句优雅的玩笑。',
        temperature: 0.95,
        maxTokens: 220,
        enabled: true
      }
    ];

    let messages = [];
    let isRunning = false;
    let shouldStop = false;
    let currentSpeakingAgentId = null;

    const agentsList = document.getElementById('agentsList');
    const chatScroll = document.getElementById('chatScroll');
    const startBtn = document.getElementById('startBtn');
    const statusDot = document.getElementById('statusDot');
    const runningStatus = document.getElementById('runningStatus');
    const messageCount = document.getElementById('messageCount');
    const agentCount = document.getElementById('agentCount');
    const terminalOutput = document.getElementById('terminalOutput');

    function newId() {
      return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function showToast(text) {
      const toast = document.getElementById('toast');
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
    }

    function setRunningUi(running, label) {
      startBtn.disabled = running;
      statusDot.classList.toggle('running', running);
      runningStatus.textContent = label || (running ? '酒馆正在交谈中' : '炉火待燃，尚未开谈');
    }

    function renderAgents() {
      agentCount.textContent = `${agents.length} 位`;
      agentsList.innerHTML = agents.map((agent, index) => {
        const speaking = agent.id === currentSpeakingAgentId ? 'speaking' : '';
        const color = AGENT_COLORS[index % AGENT_COLORS.length];
        return `
          <article class="agent-card ${speaking}" style="border-left: 5px solid ${color}">
            <div class="agent-head">
              <div class="agent-name" title="${escapeHtml(agent.name)}">${escapeHtml(agent.name)}</div>
              <label class="switch-line" title="是否启用">
                <input type="checkbox" ${agent.enabled ? 'checked' : ''} onchange="updateAgent('${agent.id}', 'enabled', this.checked)" />启用
              </label>
              <button class="danger mini-delete" onclick="removeAgent('${agent.id}')">删除</button>
            </div>
            <div class="agent-grid">
              <div>
                <label>名称</label>
                <input value="${escapeHtml(agent.name)}" oninput="updateAgent('${agent.id}', 'name', this.value)" />
              </div>
              <div>
                <label>模型名</label>
                <select onchange="updateAgent('${agent.id}', 'model', this.value)">
                  ${modelOption('gpt-5.5', agent.model)}
                  ${modelOption('gpt-5.4', agent.model)}
                  ${modelOption('gpt-5.4-mini', agent.model)}
                  ${modelOption('gpt-4o-mini', agent.model)}
                  ${!['gpt-5.5','gpt-5.4','gpt-5.4-mini','gpt-4o-mini'].includes(agent.model) ? modelOption(agent.model, agent.model) : ''}
                </select>
              </div>
              <div>
                <label>temperature</label>
                <input type="number" min="0" max="2" step="0.1" value="${Number(agent.temperature)}" oninput="updateAgent('${agent.id}', 'temperature', this.value)" />
              </div>
              <div>
                <label>max_tokens</label>
                <input type="number" min="1" step="1" value="${Number(agent.maxTokens)}" oninput="updateAgent('${agent.id}', 'maxTokens', this.value)" />
              </div>
              <div class="full-row">
                <label>自定义模型名（可直接覆盖）</label>
                <input value="${escapeHtml(agent.model)}" oninput="updateAgent('${agent.id}', 'model', this.value)" />
              </div>
              <div class="full-row">
                <label>人格提示词 system prompt</label>
                <textarea oninput="updateAgent('${agent.id}', 'systemPrompt', this.value)">${escapeHtml(agent.systemPrompt)}</textarea>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    function modelOption(value, selected) {
      return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`;
    }

    function terminalPrefix(type = 'info') {
      const time = new Date().toLocaleTimeString();
      const prefixMap = { info: 'INFO', request: 'SEND', response: 'AI', error: 'ERR', system: 'SYS' };
      return `[${time}] [${prefixMap[type] || 'LOG'}] `;
    }

    function appendTerminalLine(text, type = 'info') {
      if (!terminalOutput) return;
      terminalOutput.textContent += `${terminalPrefix(type)}${text}\n`;
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    async function appendTerminalTyped(text, type = 'response') {
      if (!terminalOutput) return;
      terminalOutput.textContent += terminalPrefix(type);
      const content = String(text ?? '');
      for (let index = 0; index < content.length; index++) {
        terminalOutput.textContent += content[index];
        if (index % 3 === 0) terminalOutput.scrollTop = terminalOutput.scrollHeight;
        await sleep(6);
      }
      terminalOutput.textContent += '\n';
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function clearTerminal() {
      if (terminalOutput) terminalOutput.textContent = '';
      appendTerminalLine('terminal cleared', 'system');
    }

    function renderMessages() {
      messageCount.textContent = `${messages.length} 条消息`;
      if (messages.length === 0) {
        chatScroll.innerHTML = `
          <div class="empty">
            <div>
              <div style="font-size: 42px; margin-bottom: 12px;">🕯️</div>
              <strong>酒馆还很安静。</strong><br />点击“开始对话”，让第一位智能体先举杯开口。
            </div>
          </div>
        `;
        return;
      }

      chatScroll.innerHTML = messages.map(msg => {
        const agentIndex = Math.max(0, agents.findIndex(a => a.id === msg.agentId));
        const color = msg.error ? '#b64131' : AGENT_COLORS[agentIndex % AGENT_COLORS.length];
        return `
          <article class="message ${msg.error ? 'error' : ''}" style="--agent-color: ${color}">
            <div class="message-meta">
              <span><span class="speaker">${escapeHtml(msg.agentName)}</span> · 第 ${escapeHtml(msg.round)} 轮</span>
              <span>${escapeHtml(msg.time)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
          </article>
        `;
      }).join('');
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }

    function addAgent() {
      agents.push({
        id: newId(),
        name: `新客人${agents.length + 1}`,
        model: 'gpt-5.4',
        systemPrompt: '你是一位刚走进酒馆的新客人，观察敏锐，说话自然，只发表自己的看法，不替别人发言。',
        temperature: 0.8,
        maxTokens: 220,
        enabled: true
      });
      renderAgents();
      showToast('已添加一位新智能体');
      appendTerminalLine(`quick add agent: ${agents.at(-1).name} / ${agents.at(-1).model}`, 'system');
    }

    function createAgentFromForm(event) {
      event.preventDefault();
      const name = document.getElementById('newAgentName').value.trim();
      const model = document.getElementById('newAgentModel').value.trim() || 'gpt-5.4';
      const systemPrompt = document.getElementById('newAgentPrompt').value.trim();
      const temperature = Number(document.getElementById('newAgentTemp').value || 0.8);
      const maxTokens = Math.max(1, parseInt(document.getElementById('newAgentMaxTokens').value || '220', 10));
      const enabled = document.getElementById('newAgentEnabled').checked;

      if (!name || !systemPrompt) {
        alert('请填写智能体名称和人格提示词。');
        return;
      }

      agents.push({
        id: newId(),
        name,
        model,
        systemPrompt,
        temperature,
        maxTokens,
        enabled
      });

      event.target.reset();
      document.getElementById('newAgentModel').value = 'gpt-5.4';
      document.getElementById('newAgentTemp').value = '0.8';
      document.getElementById('newAgentMaxTokens').value = '220';
      document.getElementById('newAgentEnabled').checked = true;
      renderAgents();
      showToast(`已手动添加：${name}`);
      appendTerminalLine(`manual add agent: ${name} / ${model}`, 'system');
    }

    function removeAgent(agentId) {
      if (isRunning) {
        showToast('对话运行中暂不删除智能体');
        return;
      }
      agents = agents.filter(agent => agent.id !== agentId);
      renderAgents();
    }

    function updateAgent(agentId, field, value) {
      const agent = agents.find(item => item.id === agentId);
      if (!agent) return;
      if (field === 'temperature') value = Number(value);
      if (field === 'maxTokens') value = Math.max(1, parseInt(value || '1', 10));
      if (field === 'enabled') value = Boolean(value);
      agent[field] = value;
    }

    async function startConversation() {
      if (isRunning) return;

      const enabledAgents = agents.filter(agent => agent.enabled);
      const totalRounds = parseInt(document.getElementById('roundsInput').value, 10);
      const interval = Math.max(0, parseInt(document.getElementById('intervalInput').value || '0', 10));

      if (enabledAgents.length === 0) {
        alert('请至少启用一个智能体。');
        return;
      }
      if (!Number.isFinite(totalRounds) || totalRounds < 1) {
        alert('请设置正确的对话轮数（至少为 1）。');
        return;
      }

      isRunning = true;
      shouldStop = false;
      setRunningUi(true, '酒馆正在交谈中');

      try {
        for (let round = 1; round <= totalRounds; round++) {
          for (const agent of enabledAgents) {
            if (shouldStop) break;
            currentSpeakingAgentId = agent.id;
            setRunningUi(true, `正在发言：${agent.name}（第 ${round} 轮）`);
            renderAgents();

            const promptMessages = buildMessagesForAgent(agent);
            appendTerminalLine(`round ${round}: ${agent.name} -> ${agent.model}`, 'request');
            try {
              const content = await callAgent(agent, promptMessages);
              await appendTerminalTyped(`${agent.name}: ${content}`, 'response');
              messages.push({
                id: newId(),
                agentId: agent.id,
                agentName: agent.name || '未命名智能体',
                content: content || '……',
                round,
                time: new Date().toLocaleTimeString(),
                error: false
              });
            } catch (error) {
              appendTerminalLine(`${agent.name}: ${error.message || String(error)}`, 'error');
              messages.push({
                id: newId(),
                agentId: agent.id,
                agentName: agent.name || '未命名智能体',
                content: error.message || String(error),
                round,
                time: new Date().toLocaleTimeString(),
                error: true
              });
            }
            renderMessages();

            if (shouldStop) break;
            if (interval > 0) await sleep(interval);
          }
          if (shouldStop) break;
        }
      } finally {
        isRunning = false;
        currentSpeakingAgentId = null;
        renderAgents();
        setRunningUi(false, shouldStop ? '对话已停止，可再次开始' : '对话结束，可再次开始');
      }
    }

    function stopConversation() {
      shouldStop = true;
      if (isRunning) setRunningUi(true, '正在停止：等待当前请求返回');
      else setRunningUi(false, '炉火待燃，尚未开谈');
    }

    function clearMessages() {
      messages = [];
      renderMessages();
      showToast('聊天记录已清空');
    }

    function buildMessagesForAgent(agent) {
      const globalSetting = document.getElementById('globalSetting').value.trim();
      const recentMessages = messages.slice(-30);
      const historyText = recentMessages.length
        ? recentMessages.map(msg => `${msg.agentName}：${msg.content}`).join('\n')
        : '暂无对话记录，请你自然地开始发言。';

      return [
        {
          role: 'system',
          content: `你正在参与一个多智能体酒馆对话。\n\n【全局场景】\n${globalSetting}\n\n【你的角色】\n名字：${agent.name}\n人格设定：\n${agent.systemPrompt}\n\n【严格规则】\n1. 你只能扮演 ${agent.name}。\n2. 不要替其他角色说话。\n3. 不要输出其他角色的台词。\n4. 不要总结整个对话。\n5. 不要使用剧本格式批量续写。\n6. 只输出你当前这一轮的自然发言。\n7. 发言要符合你的角色人格。\n8. 每次发言控制在 120 字以内。\n9. 如果聊天刚开始，请自然地开启话题。\n`
        },
        {
          role: 'user',
          content: `以下是目前酒馆中的对话记录：\n\n${historyText}\n\n现在轮到你发言。请只输出你的角色当前这一轮的发言。`
        }
      ];
    }

    async function callAgent(agent, promptMessages) {
      let response;
      try {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: agent.model,
            messages: promptMessages,
            temperature: Number(agent.temperature),
            max_tokens: Number(agent.maxTokens)
          })
        });
      } catch (error) {
        throw new Error(`网络请求失败：${error.message || String(error)}`);
      }

      let data;
      const rawText = await response.text();
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (_) {
        data = { raw: rawText };
      }

      if (!response.ok) {
        const info = data?.error?.message || data?.message || data?.raw || response.statusText || '未知错误';
        throw new Error(`API 调用失败：状态码 ${response.status}，错误信息 ${info}`);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('API 调用失败：状态码 200，错误信息 返回内容格式不符合 data.choices[0].message.content');
      }
      return content.trim();
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    renderAgents();
    renderMessages();
    setRunningUi(false);
    appendTerminalLine('AI 酒馆终端已启动，等待对话。', 'system');
