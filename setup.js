const API_URL = 'https://ai2.hhhl.cc/v1/chat/completions';
const API_KEY = 'sk-free';
const MODEL = 'gpt-5.5';

let generatedSettings = [];
let isGenerating = false;

const settingPrompt = document.getElementById('settingPrompt');
const settingsGrid = document.getElementById('settingsGrid');
const resultCount = document.getElementById('resultCount');
const setupStatus = document.getElementById('setupStatus');
const statusDot = document.getElementById('statusDot');
const generateFromPromptBtn = document.getElementById('generateFromPromptBtn');
const recommendBtn = document.getElementById('recommendBtn');

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

function setGenerating(running, label) {
  isGenerating = running;
  statusDot.classList.toggle('running', running);
  setupStatus.textContent = label || (running ? '正在生成酒馆设定' : '等待你的灵感');
  generateFromPromptBtn.disabled = running;
  recommendBtn.disabled = running;
}

function renderSettings() {
  resultCount.textContent = `${generatedSettings.length} 个设定`;
  if (!generatedSettings.length) {
    settingsGrid.innerHTML = `
      <div class="empty-state">
        <span>🕯️</span>
        <strong>还没有生成设定</strong>
        <p>输入描述后生成，或点击“推荐几个设定”。</p>
      </div>
    `;
    return;
  }

  settingsGrid.innerHTML = generatedSettings.map((item, index) => `
    <article class="setting-card">
      <h3>${escapeHtml(item.title || `酒馆设定 ${index + 1}`)}</h3>
      <p>${escapeHtml(item.setting || item)}</p>
      <div class="setting-actions">
        <button onclick="chooseSetting(${index})">选择并进入对话</button>
        <button class="ghost" onclick="copySetting(${index})">复制设定</button>
      </div>
    </article>
  `).join('');
}

function parseSettings(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];

  try {
    const data = JSON.parse(clean.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        title: item.title || `酒馆设定 ${index + 1}`,
        setting: item.setting || item.content || String(item)
      })).filter(item => item.setting);
    }
  } catch (_) {}

  const chunks = clean
    .split(/\n(?=\s*(?:\d+[\.、]|[-*]\s+|【))/)
    .map(part => part.replace(/^\s*(?:\d+[\.、]|[-*]\s+)/, '').trim())
    .filter(Boolean);

  return (chunks.length ? chunks : [clean]).slice(0, 6).map((part, index) => {
    const lines = part.split('\n').map(line => line.trim()).filter(Boolean);
    const possibleTitle = lines[0]?.replace(/^【|】$/g, '').replace(/[:：]$/, '');
    const title = possibleTitle && possibleTitle.length <= 28 ? possibleTitle : `酒馆设定 ${index + 1}`;
    const setting = title === possibleTitle ? lines.slice(1).join('\n') || part : part;
    return { title, setting };
  });
}

async function generateSettingsFromPrompt() {
  const description = settingPrompt.value.trim();
  if (!description) {
    alert('请先描述你想要的酒馆设定。');
    return;
  }
  await generateSettings(`用户想要这样的酒馆：${description}\n请基于这个方向生成 3 个可直接用于多智能体对话的酒馆全局场景设定。`);
}

async function recommendSettings() {
  await generateSettings('请推荐 4 个风格差异明显、适合多智能体角色对话的奇幻酒馆全局场景设定。');
}

async function generateSettings(userInstruction) {
  if (isGenerating) return;
  let success = false;
  setGenerating(true, 'GPT-5.5 正在点燃场景灵感');
  try {
    const content = await callGpt55([
      {
        role: 'system',
        content: '你是一个奇幻酒馆场景设计师。请为多智能体对话生成酒馆全局场景设定。输出必须是 JSON 数组，每项包含 title 和 setting。setting 用中文，80 到 180 字，包含地点、氛围、当前矛盾或话题引子。不要输出 Markdown，不要输出额外解释。'
      },
      {
        role: 'user',
        content: userInstruction
      }
    ]);
    generatedSettings = parseSettings(content);
    if (!generatedSettings.length) throw new Error('模型没有返回可用设定。');
    renderSettings();
    success = true;
    showToast('设定已生成');
  } catch (error) {
    showToast(error.message || String(error));
  } finally {
    setGenerating(false, success ? '生成完成，可选择一个设定' : '生成失败，可重试或跳过');
  }
}

async function callGpt55(messages) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.95,
        max_tokens: 900
      })
    });
  } catch (error) {
    throw new Error(`网络请求失败：${error.message || String(error)}`);
  }

  const rawText = await response.text();
  let data;
  try { data = rawText ? JSON.parse(rawText) : {}; }
  catch (_) { data = { raw: rawText }; }

  if (!response.ok) {
    const info = data?.error?.message || data?.message || data?.raw || response.statusText || '未知错误';
    throw new Error(`API 调用失败：状态码 ${response.status}，错误信息 ${info}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('API 返回格式不正确。');
  return content.trim();
}

function chooseSetting(index) {
  const item = generatedSettings[index];
  if (!item) return;
  const setting = item.setting || String(item);
  localStorage.setItem('tavernGlobalSetting', setting);
  window.location.href = 'tavern.html?setting=custom';
}

function useRawPrompt() {
  const description = settingPrompt.value.trim();
  if (!description) {
    alert('请先输入一段酒馆设定，或点击“跳过设定”。');
    return;
  }
  localStorage.setItem('tavernGlobalSetting', description);
  window.location.href = 'tavern.html?setting=custom';
}

async function copySetting(index) {
  const item = generatedSettings[index];
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.setting || String(item));
    showToast('已复制设定');
  } catch (_) {
    showToast('复制失败，请手动选择文本复制');
  }
}

renderSettings();
