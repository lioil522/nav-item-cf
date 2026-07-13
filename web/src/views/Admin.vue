<template>
  <div v-if="!isLoggedIn" class="login-container">
    <div class="login-card">
      <h2 class="login-title">后台管理登录</h2>
      <div class="login-form">
        <input v-model="username" type="text" placeholder="用户名" class="login-input" @keyup.enter="handleLogin" />
        <div class="password-input-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            class="login-input password-input"
            @keyup.enter="handleLogin"
          />
          <span class="toggle-password" @click="showPassword = !showPassword">
            <svg v-if="showPassword" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
          </span>
        </div>
        <div class="login-buttons">
          <button @click="goHome" class="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回首页
          </button>
          <button @click="handleLogin" class="login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
        <p v-if="loginError" class="login-error">{{ loginError }}</p>
      </div>
    </div>
  </div>
  
  <div v-else class="admin-layout" :data-theme="adminTheme">
    <aside class="admin-sider" :class="{ open: siderOpen }" @click.self="closeSider">
      <div class="logo clickable" @click="page='welcome'; closeSider()">Admin</div>
      <ul class="menu-list">
        <li :class="{active: page==='menu'}" @click="page='menu'; closeSider()">栏目管理</li>
        <li :class="{active: page==='card'}" @click="page='card'; closeSider()">卡片管理</li>
        <li :class="{active: page==='ad'}" @click="page='ad'; closeSider()">广告管理</li>
        <li :class="{active: page==='friend'}" @click="page='friend'; closeSider()">友链管理</li>
        <li :class="{active: page==='user'}" @click="page='user'; closeSider()">用户管理</li>
        <li :class="{active: page==='theme'}" @click="page='theme'; closeSider()">主题管理</li>
      </ul>
    </aside>
    <main class="admin-main">
      <div class="admin-header">
        <button class="menu-toggle" @click="toggleSider">
          &#9776;
        </button>
        <div class="header-title">{{ pageTitle }}</div>
        <div class="header-actions">
          <span class="home-icon" @click="goHome" title="进入主页">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <button class="btn logout-btn" @click="logout">退出登录</button>
        </div>
      </div>
      <div class="admin-content">
        <div v-if="page==='welcome'" class="welcome-page">
          <h2 class="welcome-title">欢迎您进入 Nav-Item 后台管理系统</h2>
          <div class="welcome-cards">
            <div class="welcome-card">
              <div class="welcome-icon time-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#1abc9c" stroke-width="2" stroke-linecap="round"/></svg>
              </div>
              <div class="welcome-label">本次登录时间</div>
              <div class="welcome-value">{{ currentLoginTime || '--' }}</div>
            </div>
            <div class="welcome-card">
              <div class="welcome-icon ip-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="#1abc9c" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#1abc9c"/></svg>
              </div>
              <div class="welcome-label">本次登录IP</div>
              <div class="welcome-value">{{ currentLoginIp || '--' }}</div>
            </div>
            <div class="welcome-card">
              <div class="welcome-icon time-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#1abc9c" stroke-width="2" stroke-linecap="round"/></svg>
              </div>
              <div class="welcome-label">上次登录时间</div>
              <div class="welcome-value">{{ lastLoginTime || '--' }}</div>
            </div>
            <div class="welcome-card">
              <div class="welcome-icon ip-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="#1abc9c" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#1abc9c"/></svg>
              </div>
              <div class="welcome-label">上次登录IP</div>
              <div class="welcome-value">{{ lastLoginIp || '--' }}</div>
            </div>
          </div>
        </div>
        <MenuManage v-if="page==='menu'" />
        <CardManage v-if="page==='card'" />
        <AdManage v-if="page==='ad'" />
        <FriendLinkManage v-if="page==='friend'" />
        <UserManage v-if="page==='user'" />
        <ThemeManage v-if="page==='theme'" @theme-change="onThemeChange" />
      </div>
      <footer class="admin-footer">
        <p class="admin-copyright">Copyright © 2025 Nav-Item | <a href="https://github.com/eooce/Nav-Item" target="_blank" class="footer-link">Powered by eooce</a></p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { login, getMe } from '../api';
import MenuManage from './admin/MenuManage.vue';
import CardManage from './admin/CardManage.vue';
import AdManage from './admin/AdManage.vue';
import FriendLinkManage from './admin/FriendLinkManage.vue';
import UserManage from './admin/UserManage.vue';
import ThemeManage from './admin/ThemeManage.vue';

const page = ref('welcome');
const currentLoginTime = ref('');
const currentLoginIp = ref('');
const lastLoginTime = ref('');
const lastLoginIp = ref('');
const isLoggedIn = ref(false);
const username = ref('');
const password = ref('');
const loading = ref(false);
const loginError = ref('');
const showPassword = ref(false);
const siderOpen = ref(false);
// NOTE: 从 localStorage 同步读取初始主题，防止刷新页面时出现颜色闪烁
const adminTheme = ref(localStorage.getItem('adminTheme') || 'light');

const pageTitle = computed(() => {
  switch (page.value) {
    case 'menu': return '栏目管理';
    case 'card': return '卡片管理';
    case 'ad': return '广告管理';
    case 'friend': return '友链管理';
    case 'user': return '用户管理';
    case 'theme': return '主题管理';
    default: return '';
  }
});

/**
 * 从后端加载主题设置并应用
 */
async function loadTheme() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.code === 200 && data.data?.admin_theme) {
      adminTheme.value = data.data.admin_theme;
      localStorage.setItem('adminTheme', data.data.admin_theme);
    }
  } catch (_e) {
    // ignore
  }
}

/**
 * ThemeManage 组件切换主题时的回调
 * @param {string} theme - 'light' 或 'dark'
 */
function onThemeChange(theme) {
  adminTheme.value = theme;
  localStorage.setItem('adminTheme', theme);
}

// token 失效（过期/无效）时的统一处理：清除本地 token 并回到登录页
function handleUnauthorized() {
  localStorage.removeItem('token');
  isLoggedIn.value = false;
}

onMounted(() => {
  window.addEventListener('auth:unauthorized', handleUnauthorized);
  const token = localStorage.getItem('token');
  isLoggedIn.value = !!token;
  if (isLoggedIn.value) {
    fetchLastLoginInfo();
    loadTheme();
  }
});

onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleUnauthorized);
});

async function fetchLastLoginInfo() {
  try {
    const { data } = await getMe();
    currentLoginTime.value = data.current_login_time || '';
    currentLoginIp.value = data.current_login_ip || '';
    lastLoginTime.value = data.last_login_time || '';
    lastLoginIp.value = data.last_login_ip || '';
  } catch (error) {
    // 401 已由 axios 拦截器统一处理（清除 token 并触发 auth:unauthorized）。
    // 其它错误仅记录日志，不影响页面。
    if (error.response?.status !== 401) {
      console.error('获取用户信息失败:', error);
    }
  }
}

async function handleLogin() {
  if (!username.value || !password.value) {
    loginError.value = '请输入用户名和密码';
    return;
  }
  
  loading.value = true;
  loginError.value = '';
  
  try {
    const response = await login(username.value, password.value);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      isLoggedIn.value = true;
      currentLoginTime.value = response.data.currentLoginTime || '';
      currentLoginIp.value = response.data.currentLoginIp || '';
      lastLoginTime.value = response.data.lastLoginTime || '';
      lastLoginIp.value = response.data.lastLoginIp || '';
    }
  } catch (error) {
    loginError.value = error.response?.data?.message || '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
}

function logout() {
  localStorage.removeItem('token');
  isLoggedIn.value = false;
  username.value = '';
  password.value = '';
  loginError.value = '';
}

function goHome() {
  window.open('/', '_blank');
}
function toggleSider() {
  siderOpen.value = !siderOpen.value;
}
function closeSider() {
  siderOpen.value = false;
}
</script>

<style scoped>
/* ===================== CSS 变量系统 ===================== */
/* NOTE: 浅色模式为默认值，深色模式通过 data-theme="dark" 选择器覆盖 */
.admin-layout {
  --admin-bg: #f5f6fa;
  --admin-card-bg: #fff;
  --admin-card-header-bg: #fafbfc;
  --admin-text: #222;
  --admin-text-secondary: #888;
  --admin-border: #e3e6ef;
  --admin-input-bg: #fff;
  --admin-input-border: #d0d7e2;
  --admin-sider-bg: #fff;
  --admin-sider-shadow: rgba(0,0,0,0.06);
  --admin-header-bg: #f5f6fa;
  --admin-active-bg: #eaf1ff;
  --admin-active-color: #2566d8;
  --admin-hover-bg: #f5f6fa;
  --admin-logo-color: #1349a6;
  --admin-footer-color: #1d70cc;
  --admin-welcome-card-border: #e3e6ef;
  --admin-welcome-icon-bg: #f5f6fa;
}
.admin-layout[data-theme="dark"] {
  --admin-bg: #181825;
  --admin-card-bg: #1e1e2e;
  --admin-card-header-bg: #232336;
  --admin-text: #cdd6f4;
  --admin-text-secondary: #7f849c;
  --admin-border: #313244;
  --admin-input-bg: #232336;
  --admin-input-border: #45475a;
  --admin-sider-bg: #1e1e2e;
  --admin-sider-shadow: rgba(0,0,0,0.3);
  --admin-header-bg: #181825;
  --admin-active-bg: #2a2a40;
  --admin-active-color: #89b4fa;
  --admin-hover-bg: #2a2a40;
  --admin-logo-color: #89b4fa;
  --admin-footer-color: #89b4fa;
  --admin-welcome-card-border: #313244;
  --admin-welcome-icon-bg: #232336;
}

/* ===================== 登录页（不受主题影响） ===================== */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg,#667eea,#764ba2);
  font-family: 'Segoe UI', Arial, sans-serif;
}
.login-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  padding: 0 40px 40px 40px;
  width: 400px;
  max-width: 90%;
}
.login-title {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  color: #2164e1;
  margin-bottom: 32px;
  letter-spacing: 2px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.login-input {
  padding: 12px 16px;
  border: 1px solid #d0d7e2;
  border-radius: 8px;
  font-size: 16px;
  background: #fff;
  color: #222;
  height: 48px;
  line-height: 48px;
  box-sizing: border-box;
}
.login-input:focus {
  outline: 2px solid #2566d8;
  border-color: #2566d8;
}
.login-btn {
  background: #2566d8;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.login-btn:hover:not(:disabled) {
  background: #174ea6;
}
.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.login-buttons {
  display: flex;
  gap: 12px;
}
.back-btn {
  background: #f5f5f5;
  color: #2b2b2b;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}
.back-btn:hover {
  background: #e9ecef;
  color: #7e42ff;
  border-color: #adb5bd;
}
.login-btn {
  flex: 2;
}
.login-error {
  color: #e74c3c;
  text-align: center;
  margin: 0;
  font-size: 14px;
}
.password-input-wrapper {
  position: relative;
  width: 100%;
}
.password-input {
  width: 100%;
  padding-right: 48px;
  border-radius: 8px;
  box-sizing: border-box;
}
.toggle-password {
  position: absolute;
  top: 0;
  right: 0;
  height: 48px;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #2566d8;
  margin: 0;
  padding: 0;
  z-index: 2;
  transition: color 0.2s;
}
.toggle-password:hover {
  color: #174ea6;
  background: none;
}
.toggle-password svg {
  display: block;
  width: 22px;
  height: 22px;
  pointer-events: none;
}

/* ===================== 后台布局（使用 CSS 变量） ===================== */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-bg);
  font-family: 'Segoe UI', Arial, sans-serif;
  transition: background 0.3s;
}
.admin-sider {
  width: 180px;
  background: var(--admin-sider-bg);
  color: var(--admin-text);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-top: 32px;
  box-shadow: 2px 0 8px var(--admin-sider-shadow);
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  transition: background 0.3s, box-shadow 0.3s;
}
.logo {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--admin-logo-color);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}
.logo.clickable:hover {
  color: #176efa;
}
.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}
.menu-list li {
  padding: 16px 32px;
  cursor: pointer;
  font-size: 16px;
  border-left: 4px solid transparent;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  color: var(--admin-text);
}
.menu-list li:hover {
  background: var(--admin-hover-bg);
}
.menu-list li.active {
  background: var(--admin-active-bg);
  border-left: 4px solid var(--admin-active-color);
  color: var(--admin-active-color);
  font-weight: bold;
}
.admin-main {
  flex: 1;
  background: var(--admin-bg);
  padding: 64px 0 0 180px;
  min-width: 0;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: background 0.3s;
}
.admin-header {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 64px;
  padding: 0 48px 0 0;
  background: var(--admin-header-bg);
  position: fixed;
  top: 0;
  left: 180px;
  right: 0;
  z-index: 101;
  border-bottom: 1px solid var(--admin-border);
  transition: background 0.3s, border-color 0.3s;
}
.header-title {
  flex: 1;
  text-align: center;
  margin-left: 180px;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--admin-text);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.home-icon {
  display: flex;
  align-items: center;
  margin-right: 18px;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
  padding: 4px;
}
.home-icon:hover {
  background: var(--admin-active-bg);
}
.btn.logout-btn {
  background: #f7caca;
  color: #e74c3c;
  border: 1px solid #f7caca;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 15px;
  font-weight: 500;
  margin: 0;
  transition: background 0.2s, color 0.2s;
}
.btn.logout-btn:hover {
  background: #e74c3c;
  color: #fff;
}
.admin-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 0 0;
  margin-top: 0;
}
.admin-footer {
  margin-top: auto;
  text-align: center;
  padding: 2rem 0 1rem 0;
  background: transparent;
}
.admin-copyright {
  color: var(--admin-footer-color);
  font-size: 14px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.footer-link {
  color: var(--admin-footer-color);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover {
  color: #3218ed;
}

/* ===================== 欢迎页 ===================== */
.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48px;
}
.welcome-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: var(--admin-text);
  margin-bottom: 32px;
}
.welcome-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 32px;
  max-width: 640px;
}
.welcome-card {
  background: var(--admin-card-bg);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 32px 40px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1.5px solid var(--admin-welcome-card-border);
  transition: background 0.3s, border-color 0.3s;
}
.welcome-icon {
  width: 48px;
  height: 48px;
  background: var(--admin-welcome-icon-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.welcome-label {
  font-size: 1.1rem;
  color: var(--admin-text);
  margin-bottom: 8px;
}
.welcome-value {
  font-size: 2rem;
  color: #1abc9c;
  font-weight: 600;
  letter-spacing: 1px;
}

/* ===================== 响应式 ===================== */
@media (max-width: 900px) {
  .welcome-cards {
    flex-direction: column;
    gap: 18px;
    align-items: center;
  }
  .welcome-card {
    min-width: 220px;
    width: 90vw;
    padding: 24px 10px;
  }
}
@media (max-width: 768px) {
  .admin-sider {
    position: fixed;
    left: 0;
    top: 0;
    width: 70vw;
    max-width: 260px;
    height: 100vh;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s, background 0.3s;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
    background: var(--admin-sider-bg);
  }
  .admin-sider.open {
    transform: translateX(0);
  }
  .admin-main {
    padding: 64px 0 0 0 !important;
  }
  .admin-header {
    left: 0 !important;
    width: 100vw !important;
    min-width: 0 !important;
    padding: 0 8px 0 8px !important;
    box-sizing: border-box;
    flex-wrap: nowrap;
    height: 56px;
  }
  .header-title {
    font-size: 1.1rem !important;
    margin-left: 0 !important;
    text-align: left !important;
    width: auto !important;
    flex: 1 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 1px;
  }
  .header-actions {
    gap: 4px;
    margin-left: 0;
  }
  .btn.logout-btn {
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 8px;
  }
  .menu-toggle {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-right: 4px !important;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--admin-active-color);
    z-index: 300;
  }
  .input, .btn {
    margin-bottom: 8px;
  }
}
.menu-toggle {
  display: none;
}
</style>

<!-- NOTE: 非 scoped 样式，用于深色模式下覆盖所有子组件的通用颜色 -->
<style>
/* ============== 通用文字颜色 ============== */
.admin-layout[data-theme="dark"] .page-title,
.admin-layout[data-theme="dark"] .section-title,
.admin-layout[data-theme="dark"] .header-content h2,
.admin-layout[data-theme="dark"] .welcome-label,
.admin-layout[data-theme="dark"] .form-group label,
.admin-layout[data-theme="dark"] .order-label,
.admin-layout[data-theme="dark"] .sub-menu-title,
.admin-layout[data-theme="dark"] .empty-sub-menu,
.admin-layout[data-theme="dark"] .menu-name-input,
.admin-layout[data-theme="dark"] .sub-menu-name-input {
  color: var(--admin-text) !important;
}

/* ============== 所有卡片/面板容器 ============== */
.admin-layout[data-theme="dark"] .card-card,
.admin-layout[data-theme="dark"] .menu-content,
.admin-layout[data-theme="dark"] .ad-card,
.admin-layout[data-theme="dark"] .friend-card,
.admin-layout[data-theme="dark"] .user-card,
.admin-layout[data-theme="dark"] .password-section {
  background: var(--admin-card-bg) !important;
  border-color: var(--admin-border) !important;
}

/* ============== 所有表格 ============== */
.admin-layout[data-theme="dark"] .card-table,
.admin-layout[data-theme="dark"] .ad-table,
.admin-layout[data-theme="dark"] .friend-table {
  background: var(--admin-card-bg) !important;
  color: var(--admin-text) !important;
}
.admin-layout[data-theme="dark"] .card-table th,
.admin-layout[data-theme="dark"] .ad-table th,
.admin-layout[data-theme="dark"] .friend-table th {
  background: var(--admin-card-header-bg) !important;
  color: var(--admin-text) !important;
  border-color: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .card-table td,
.admin-layout[data-theme="dark"] .ad-table td,
.admin-layout[data-theme="dark"] .friend-table td {
  color: var(--admin-text) !important;
  border-color: var(--admin-border) !important;
}

/* 表格内的输入框 */
.admin-layout[data-theme="dark"] .ad-table td input,
.admin-layout[data-theme="dark"] .friend-table td input,
.admin-layout[data-theme="dark"] .card-table td input {
  background: var(--admin-input-bg) !important;
  color: var(--admin-text) !important;
  border-color: var(--admin-input-border) !important;
}

/* ============== 所有输入框和选择框 ============== */
.admin-layout[data-theme="dark"] .input,
.admin-layout[data-theme="dark"] .table-input,
.admin-layout[data-theme="dark"] .menu-name-input,
.admin-layout[data-theme="dark"] .order-input,
.admin-layout[data-theme="dark"] .sub-name-input,
.admin-layout[data-theme="dark"] .sub-order-input,
.admin-layout[data-theme="dark"] select,
.admin-layout[data-theme="dark"] select.input {
  background: var(--admin-input-bg) !important;
  color: var(--admin-text) !important;
  border-color: var(--admin-input-border) !important;
}
/* select 下拉框的 option 在深色模式 */
.admin-layout[data-theme="dark"] select option {
  background: var(--admin-card-bg);
  color: var(--admin-text);
}
/* 输入框 placeholder */
.admin-layout[data-theme="dark"] .input::placeholder,
.admin-layout[data-theme="dark"] .menu-name-input::placeholder,
.admin-layout[data-theme="dark"] input::placeholder {
  color: var(--admin-text-secondary) !important;
}
/* 输入框 focus 状态 */
.admin-layout[data-theme="dark"] .menu-name-input:focus,
.admin-layout[data-theme="dark"] .sub-menu-name-input:focus {
  background: var(--admin-input-bg) !important;
}

/* ============== 栏目管理（MenuManage） ============== */
/* 紫色渐变头部 → 深色模式改为暗色渐变 */
.admin-layout[data-theme="dark"] .menu-header {
  background: linear-gradient(135deg, #313244 0%, #45475a 100%) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
}
.admin-layout[data-theme="dark"] .menu-header .page-title {
  color: #cdd6f4 !important;
}
/* 菜单项 */
.admin-layout[data-theme="dark"] .main-menu {
  background: var(--admin-card-bg) !important;
}
.admin-layout[data-theme="dark"] .menu-item {
  background: var(--admin-card-bg) !important;
  border-color: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .menu-item:hover {
  background: var(--admin-active-bg) !important;
}
/* 菜单图标保留渐变但调暗 */
.admin-layout[data-theme="dark"] .menu-icon {
  background: linear-gradient(135deg, #585b70 0%, #45475a 100%) !important;
  color: #89b4fa !important;
}
/* 子菜单区域 */
.admin-layout[data-theme="dark"] .sub-menu-section {
  background: var(--admin-card-header-bg) !important;
  border-color: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-header {
  background: var(--admin-card-header-bg) !important;
  border-color: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-title {
  color: var(--admin-text-secondary) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-item {
  background: var(--admin-card-bg) !important;
  border-color: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-item::before {
  background: var(--admin-border) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-list::before {
  background: linear-gradient(to bottom, var(--admin-border), var(--admin-border)) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-icon {
  background: linear-gradient(135deg, #1e7a47 0%, #166534 100%) !important;
}
.admin-layout[data-theme="dark"] .sub-menu-name-input {
  color: var(--admin-text) !important;
}
.admin-layout[data-theme="dark"] .empty-sub-menu p {
  color: #a6e3a1 !important;
}
/* 展开按钮 */
.admin-layout[data-theme="dark"] .btn-icon.expand-btn {
  background: var(--admin-card-header-bg) !important;
  color: var(--admin-text) !important;
  border: 1px solid var(--admin-border) !important;
}
/* 轮廓按钮 */
.admin-layout[data-theme="dark"] .btn-outline {
  color: #89b4fa !important;
  border-color: #89b4fa !important;
}
.admin-layout[data-theme="dark"] .btn-outline:hover {
  background: #89b4fa !important;
  color: #1e1e2e !important;
}

/* ============== 广告管理（AdManage） ============== */
.admin-layout[data-theme="dark"] .ad-add-block {
  background: var(--admin-card-header-bg) !important;
}
.admin-layout[data-theme="dark"] .ad-add-block .section-title {
  color: #89b4fa !important;
}

/* ============== 用户管理 ============== */
.admin-layout[data-theme="dark"] .user-manage .section-title,
.admin-layout[data-theme="dark"] .user-card label {
  color: var(--admin-text) !important;
}
.admin-layout[data-theme="dark"] .user-card {
  background: var(--admin-card-bg) !important;
}

/* ============== 友链管理 ============== */
.admin-layout[data-theme="dark"] .friend-form {
  background: var(--admin-card-bg);
  border-color: var(--admin-border);
}
.admin-layout[data-theme="dark"] .friend-form label {
  color: var(--admin-text);
}

/* ============== 通用消息样式 ============== */
.admin-layout[data-theme="dark"] .message.success {
  color: #a6e3a1;
}
.admin-layout[data-theme="dark"] .message.error {
  color: #f38ba8;
}
</style>

