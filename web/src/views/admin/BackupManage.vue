<template>
  <div class="backup-manage">
    <div class="bm-card">
      <div class="bm-card-header">
        <h3 class="bm-card-title">数据备份 / 迁移</h3>
      </div>
      <div class="bm-card-body">

        <div class="bm-section">
          <h4 class="bm-section-title">导出备份</h4>
          <p class="bm-hint">
            导出当前所有栏目、子栏目、卡片、广告、友链、站点设置为一个 JSON 文件。<strong>不包含</strong>用户账号，也<strong>不包含</strong>后台上传的图片文件（背景图 / 自定义图标等），迁移后请重新上传或改用外链。
          </p>
          <button class="bm-btn bm-btn-primary" :disabled="exporting" @click="doExport">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {{ exporting ? '导出中...' : '下载备份文件' }}
          </button>
        </div>

        <div class="bm-divider"></div>

        <div class="bm-section">
          <h4 class="bm-section-title">导入备份</h4>
          <p class="bm-hint bm-warning">
            <strong>警告：</strong>导入会<strong>清空</strong>数据库中的现有栏目、卡片、广告、友链和设置，
            再用备份文件中的数据完全替换。用户账号不受影响。请在确认要恢复的备份文件后再执行。
          </p>
          <div class="bm-file-row">
            <input type="file" accept="application/json,.json" ref="fileInput" class="bm-file-input" @change="onFileChange" />
            <button class="bm-btn bm-btn-outline" @click="pickFile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              选择备份文件
            </button>
            <span v-if="selectedName" class="bm-file-name">{{ selectedName }}</span>
          </div>
          <div v-if="preview" class="bm-preview">
            <div class="bm-preview-title">备份文件内容预览</div>
            <ul class="bm-preview-list">
              <li>版本：{{ preview.version ?? '—' }}</li>
              <li>导出时间：{{ preview.exportedAt || '—' }}</li>
              <li>来源：{{ preview.source || '—' }}</li>
              <li v-for="(count, name) in preview.counts" :key="name">
                {{ name }}：{{ count }} 条
              </li>
            </ul>
          </div>
          <button
            class="bm-btn bm-btn-danger"
            :disabled="!selectedFile || importing"
            @click="doImport"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {{ importing ? '导入中...' : '确认导入并覆盖现有数据' }}
          </button>
          <p v-if="message" :class="['bm-message', messageType]">{{ message }}</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { exportBackup, importBackup } from '../../api';

const exporting = ref(false);
const importing = ref(false);
const selectedFile = ref(null);
const selectedName = ref('');
const preview = ref(null);
const message = ref('');
const messageType = ref('success');
const fileInput = ref(null);

const TABLE_LABELS = {
  menus: '主栏目',
  sub_menus: '子栏目',
  cards: '卡片',
  ads: '广告',
  friends: '友链',
  site_settings: '站点设置',
};

async function doExport() {
  exporting.value = true;
  try {
    const res = await exportBackup();
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `nav-item-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('导出成功', 'success');
  } catch (e) {
    showMessage('导出失败：' + (e.response?.data?.error || e.message), 'error');
  } finally {
    exporting.value = false;
  }
}

function pickFile() {
  fileInput.value?.click();
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  selectedFile.value = file;
  selectedName.value = file.name;
  preview.value = null;
  message.value = '';
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed?.data || {};
      const counts = {};
      for (const key of Object.keys(TABLE_LABELS)) {
        if (Array.isArray(data[key])) counts[TABLE_LABELS[key]] = data[key].length;
      }
      preview.value = {
        version: parsed?.version,
        exportedAt: parsed?.exportedAt,
        source: parsed?.source,
        counts,
      };
    } catch (_err) {
      preview.value = null;
      showMessage('文件不是有效的 JSON 备份', 'error');
      selectedFile.value = null;
      selectedName.value = '';
    }
  };
  reader.readAsText(file);
}

async function doImport() {
  if (!selectedFile.value) return;
  if (!window.confirm('确定要用该备份文件覆盖现有数据吗？此操作不可撤销。')) return;

  importing.value = true;
  message.value = '';
  try {
    const text = await selectedFile.value.text();
    const payload = JSON.parse(text);
    const res = await importBackup(payload);
    const msg = res.data?.message || '导入成功';
    showMessage(msg + '，2 秒后自动刷新页面...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e) {
    showMessage('导入失败：' + (e.response?.data?.error || e.message), 'error');
  } finally {
    importing.value = false;
  }
}

function showMessage(text, type) {
  message.value = text;
  messageType.value = type;
  if (type !== 'success') {
    setTimeout(() => { message.value = ''; }, 4000);
  }
}
</script>

<style scoped>
.backup-manage {
  max-width: 900px;
  width: 90%;
  margin: 0 auto;
  padding: 20px 0;
}
.bm-card {
  background: #fff;
  border: 1px solid #e3e6ef;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.bm-card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e3e6ef;
  background: #fafbfc;
}
.bm-card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #222;
}
.bm-card-body { padding: 24px; }
.bm-section { margin-bottom: 8px; }
.bm-section-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #222;
  margin: 0 0 12px 0;
}
.bm-hint {
  color: #555;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 16px 0;
}
.bm-hint.bm-warning {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px 14px;
}
.bm-divider {
  height: 1px;
  background: #e3e6ef;
  margin: 24px 0;
}
.bm-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.bm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.bm-btn-primary {
  background: #2566d8;
  color: #fff;
  border-color: #2566d8;
}
.bm-btn-primary:hover:not(:disabled) { background: #174ea6; }
.bm-btn-outline {
  background: #fff;
  color: #2566d8;
  border-color: #2566d8;
}
.bm-btn-outline:hover:not(:disabled) { background: #eaf1ff; }
.bm-btn-danger {
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
  margin-top: 16px;
}
.bm-btn-danger:hover:not(:disabled) { background: #c0392b; }
.bm-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.bm-file-input { display: none; }
.bm-file-name {
  color: #2566d8;
  font-size: 14px;
  word-break: break-all;
}
.bm-preview {
  background: #f5f6fa;
  border: 1px solid #e3e6ef;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
}
.bm-preview-title {
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
  font-size: 14px;
}
.bm-preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #555;
  font-size: 13px;
  line-height: 1.9;
}
.bm-message {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
}
.bm-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
.bm-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 深色模式 */
.admin-layout[data-theme="dark"] .bm-card {
  background: var(--admin-card-bg);
  border-color: var(--admin-border);
}
.admin-layout[data-theme="dark"] .bm-card-header {
  background: var(--admin-card-header-bg);
  border-color: var(--admin-border);
}
.admin-layout[data-theme="dark"] .bm-card-title,
.admin-layout[data-theme="dark"] .bm-section-title {
  color: var(--admin-text);
}
.admin-layout[data-theme="dark"] .bm-hint {
  color: var(--admin-text-secondary);
}
.admin-layout[data-theme="dark"] .bm-hint.bm-warning {
  background: #3d2f14;
  border-color: #7a5a1a;
  color: #fbbf24;
}
.admin-layout[data-theme="dark"] .bm-divider {
  background: var(--admin-border);
}
.admin-layout[data-theme="dark"] .bm-preview {
  background: var(--admin-card-header-bg);
  border-color: var(--admin-border);
}
.admin-layout[data-theme="dark"] .bm-preview-title {
  color: var(--admin-text);
}
.admin-layout[data-theme="dark"] .bm-preview-list {
  color: var(--admin-text-secondary);
}
.admin-layout[data-theme="dark"] .bm-btn-outline {
  background: transparent;
  color: #89b4fa;
  border-color: #89b4fa;
}
.admin-layout[data-theme="dark"] .bm-btn-outline:hover:not(:disabled) {
  background: #89b4fa;
  color: #1e1e2e;
}

@media (max-width: 768px) {
  .backup-manage { width: 96%; padding: 10px 0; }
  .bm-card-body { padding: 16px; }
  .bm-btn { width: 100%; justify-content: center; }
}
</style>
