// Cloudflare Pages Functions —— 全部后端 API（迁移自 Express routes/*）
// 运行环境: Cloudflare Workers。数据库: D1(env.DB)。对象存储: R2(env.BUCKET)。
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { handle } from 'hono/cloudflare-pages';
import bcrypt from 'bcryptjs';
import { ensureDbInitialized } from '../lib/init.js';

const app = new Hono().basePath('/api');

app.use('*', cors());

// 首次请求自动建表 + 写入默认数据（幂等，无需手动执行 schema.sql）
app.use('*', async (c, next) => {
  try {
    await ensureDbInitialized(c.env);
  } catch (e) {
    return c.json({ error: '数据库初始化失败: ' + (e && e.message ? e.message : e) }, 500);
  }
  await next();
});

// ---------- 工具函数 ----------
function jwtSecret(env) {
  return env.JWT_SECRET || 'your_jwt_secret_key';
}

// 认证中间件: 校验 Authorization: Bearer <token>
async function auth(c, next) {
  const header = c.req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return c.json({ error: '未授权' }, 401);
  }
  try {
    const payload = await verify(header.slice(7), jwtSecret(c.env), 'HS256');
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ error: '无效token' }, 401);
  }
}

function getClientIp(c) {
  let ip = c.req.header('CF-Connecting-IP')
    || c.req.header('x-forwarded-for')
    || '';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function getShanghaiTime() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(x => { p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// ==================== 登录 ====================
app.post('/login', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}));
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  if (!user) return c.json({ error: '用户名或密码错误' }, 401);

  const ok = bcrypt.compareSync(password || '', user.password);
  if (!ok) return c.json({ error: '用户名或密码错误' }, 401);

  // 本次登录之前的记录 = 上次登录
  const lastLoginTime = user.last_login_time;
  const lastLoginIp = user.last_login_ip;
  // 本次登录
  const now = getShanghaiTime();
  const ip = getClientIp(c);
  // 把原「本次」下移为「上次」，再写入新的「本次」
  await c.env.DB.prepare(
    'UPDATE users SET prev_login_time = ?, prev_login_ip = ?, last_login_time = ?, last_login_ip = ? WHERE id = ?'
  ).bind(lastLoginTime ?? null, lastLoginIp ?? null, now, ip, user.id).run();

  // token 有效期（小时），默认 7 天，可用环境变量 TOKEN_TTL_HOURS 覆盖
  const ttlHours = parseInt(c.env.TOKEN_TTL_HOURS) || 24 * 7;
  const token = await sign(
    { id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + ttlHours * 60 * 60 },
    jwtSecret(c.env)
  );
  return c.json({
    token,
    currentLoginTime: now, currentLoginIp: ip,   // 本次
    lastLoginTime, lastLoginIp,                  // 上次
  });
});

// ==================== 菜单 ====================
app.get('/menus', async (c) => {
  const page = c.req.query('page');
  const pageSize = c.req.query('pageSize');

  if (!page && !pageSize) {
    const menus = (await c.env.DB.prepare('SELECT * FROM menus ORDER BY "order"').all()).results;
    const result = [];
    for (const menu of menus) {
      const subMenus = (await c.env.DB.prepare('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"')
        .bind(menu.id).all()).results;
      result.push({ ...menu, subMenus });
    }
    return c.json(result);
  }

  const pageNum = parseInt(page) || 1;
  const size = parseInt(pageSize) || 10;
  const offset = (pageNum - 1) * size;
  const total = (await c.env.DB.prepare('SELECT COUNT(*) as total FROM menus').first()).total;
  const rows = (await c.env.DB.prepare('SELECT * FROM menus ORDER BY "order" LIMIT ? OFFSET ?')
    .bind(size, offset).all()).results;
  return c.json({ total, page: pageNum, pageSize: size, data: rows });
});

app.get('/menus/:id/submenus', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"')
    .bind(c.req.param('id')).all()).results;
  return c.json(rows);
});

app.post('/menus', auth, async (c) => {
  const { name, order } = await c.req.json();
  const r = await c.env.DB.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)')
    .bind(name, order || 0).run();
  return c.json({ id: r.meta.last_row_id });
});

app.put('/menus/:id', auth, async (c) => {
  const { name, order } = await c.req.json();
  const r = await c.env.DB.prepare('UPDATE menus SET name = ?, "order" = ? WHERE id = ?')
    .bind(name, order || 0, c.req.param('id')).run();
  return c.json({ changed: r.meta.changes });
});

app.delete('/menus/:id', auth, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ deleted: r.meta.changes });
});

app.post('/menus/:id/submenus', auth, async (c) => {
  const { name, order } = await c.req.json();
  const r = await c.env.DB.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)')
    .bind(c.req.param('id'), name, order || 0).run();
  return c.json({ id: r.meta.last_row_id });
});

app.put('/menus/submenus/:id', auth, async (c) => {
  const { name, order } = await c.req.json();
  const r = await c.env.DB.prepare('UPDATE sub_menus SET name = ?, "order" = ? WHERE id = ?')
    .bind(name, order || 0, c.req.param('id')).run();
  return c.json({ changed: r.meta.changes });
});

app.delete('/menus/submenus/:id', auth, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM sub_menus WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ deleted: r.meta.changes });
});

// ==================== 卡片 ====================
app.get('/cards/:menuId', async (c) => {
  const subMenuId = c.req.query('subMenuId');
  let rows;
  if (subMenuId) {
    rows = (await c.env.DB.prepare('SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"')
      .bind(subMenuId).all()).results;
  } else {
    rows = (await c.env.DB.prepare('SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"')
      .bind(c.req.param('menuId')).all()).results;
  }
  rows.forEach(card => {
    if (!card.custom_logo_path) {
      card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
    } else {
      card.display_logo = '/uploads/' + card.custom_logo_path;
    }
  });
  return c.json(rows);
});

app.post('/cards', auth, async (c) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = await c.req.json();
  const r = await c.env.DB.prepare(
    'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(menu_id ?? null, sub_menu_id || null, title, url, logo_url ?? null, custom_logo_path ?? null, desc ?? null, order || 0).run();
  return c.json({ id: r.meta.last_row_id });
});

app.put('/cards/:id', auth, async (c) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = await c.req.json();
  const r = await c.env.DB.prepare(
    'UPDATE cards SET menu_id = ?, sub_menu_id = ?, title = ?, url = ?, logo_url = ?, custom_logo_path = ?, desc = ?, "order" = ? WHERE id = ?'
  ).bind(menu_id ?? null, sub_menu_id || null, title, url, logo_url ?? null, custom_logo_path ?? null, desc ?? null, order || 0, c.req.param('id')).run();
  return c.json({ changed: r.meta.changes });
});

app.delete('/cards/:id', auth, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM cards WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ deleted: r.meta.changes });
});

// ==================== 文件上传（R2） ====================
// 根据上传目标返回文件名前缀，用于区分不同用途的图片（各自独立展示，互不混淆）
function themePrefix(target) {
  return target === 'favicon' ? 'favicon-'
    : target === 'mobile' ? 'bg-mobile-'
    : 'bg-desktop-';
}

async function saveToR2(c, field, prefix) {
  const body = await c.req.parseBody();
  const file = body[field];
  if (!file || typeof file === 'string') return null;
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot) : '';
  const filename = `${prefix}${Date.now()}${ext}`;
  await c.env.BUCKET.put(filename, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  });
  return filename;
}

app.post('/upload', auth, async (c) => {
  const filename = await saveToR2(c, 'logo', '');
  if (!filename) return c.json({ error: 'No file uploaded' }, 400);
  return c.json({ filename, url: '/uploads/' + filename });
});

// ==================== 广告 ====================
app.get('/ads', async (c) => {
  const page = c.req.query('page');
  const pageSize = c.req.query('pageSize');
  if (!page && !pageSize) {
    const rows = (await c.env.DB.prepare('SELECT * FROM ads').all()).results;
    return c.json(rows);
  }
  const pageNum = parseInt(page) || 1;
  const size = parseInt(pageSize) || 10;
  const offset = (pageNum - 1) * size;
  const total = (await c.env.DB.prepare('SELECT COUNT(*) as total FROM ads').first()).total;
  const rows = (await c.env.DB.prepare('SELECT * FROM ads LIMIT ? OFFSET ?').bind(size, offset).all()).results;
  return c.json({ total, page: pageNum, pageSize: size, data: rows });
});

app.post('/ads', auth, async (c) => {
  const { position, img, url } = await c.req.json();
  const r = await c.env.DB.prepare('INSERT INTO ads (position, img, url) VALUES (?, ?, ?)')
    .bind(position, img, url).run();
  return c.json({ id: r.meta.last_row_id });
});

app.put('/ads/:id', auth, async (c) => {
  const { img, url } = await c.req.json();
  const r = await c.env.DB.prepare('UPDATE ads SET img = ?, url = ? WHERE id = ?')
    .bind(img, url, c.req.param('id')).run();
  return c.json({ changed: r.meta.changes });
});

app.delete('/ads/:id', auth, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ deleted: r.meta.changes });
});

// ==================== 友情链接 ====================
app.get('/friends', async (c) => {
  const page = c.req.query('page');
  const pageSize = c.req.query('pageSize');
  if (!page && !pageSize) {
    const rows = (await c.env.DB.prepare('SELECT * FROM friends').all()).results;
    return c.json(rows);
  }
  const pageNum = parseInt(page) || 1;
  const size = parseInt(pageSize) || 10;
  const offset = (pageNum - 1) * size;
  const total = (await c.env.DB.prepare('SELECT COUNT(*) as total FROM friends').first()).total;
  const rows = (await c.env.DB.prepare('SELECT * FROM friends LIMIT ? OFFSET ?').bind(size, offset).all()).results;
  return c.json({ total, page: pageNum, pageSize: size, data: rows });
});

app.post('/friends', auth, async (c) => {
  const { title, url, logo } = await c.req.json();
  const r = await c.env.DB.prepare('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)')
    .bind(title, url, logo).run();
  return c.json({ id: r.meta.last_row_id });
});

app.put('/friends/:id', auth, async (c) => {
  const { title, url, logo } = await c.req.json();
  const r = await c.env.DB.prepare('UPDATE friends SET title = ?, url = ?, logo = ? WHERE id = ?')
    .bind(title, url, logo, c.req.param('id')).run();
  return c.json({ changed: r.meta.changes });
});

app.delete('/friends/:id', auth, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM friends WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ deleted: r.meta.changes });
});

// ==================== 用户 ====================
app.get('/users/profile', auth, async (c) => {
  const user = await c.env.DB.prepare('SELECT id, username FROM users WHERE id = ?')
    .bind(c.get('user').id).first();
  if (!user) return c.json({ message: '用户不存在' }, 404);
  return c.json({ data: user });
});

app.get('/users/me', auth, async (c) => {
  const user = await c.env.DB.prepare(
    'SELECT id, username, last_login_time, last_login_ip, prev_login_time, prev_login_ip FROM users WHERE id = ?'
  ).bind(c.get('user').id).first();
  if (!user) return c.json({ message: '用户不存在' }, 404);
  return c.json({
    current_login_time: user.last_login_time,   // 本次
    current_login_ip: user.last_login_ip,
    last_login_time: user.prev_login_time,       // 上次
    last_login_ip: user.prev_login_ip,
  });
});

app.put('/users/password', auth, async (c) => {
  const { oldPassword, newPassword } = await c.req.json();
  if (!oldPassword || !newPassword) return c.json({ message: '请提供旧密码和新密码' }, 400);
  if (newPassword.length < 6) return c.json({ message: '新密码长度至少6位' }, 400);

  const user = await c.env.DB.prepare('SELECT password FROM users WHERE id = ?').bind(c.get('user').id).first();
  if (!user) return c.json({ message: '用户不存在' }, 404);
  if (!bcrypt.compareSync(oldPassword, user.password)) return c.json({ message: '旧密码错误' }, 400);

  const newHash = bcrypt.hashSync(newPassword, 10);
  await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHash, c.get('user').id).run();
  return c.json({ message: '密码修改成功' });
});

app.get('/users', auth, async (c) => {
  const page = c.req.query('page');
  const pageSize = c.req.query('pageSize');
  if (!page && !pageSize) {
    const users = (await c.env.DB.prepare('SELECT id, username FROM users').all()).results;
    return c.json({ data: users });
  }
  const pageNum = parseInt(page) || 1;
  const size = parseInt(pageSize) || 10;
  const offset = (pageNum - 1) * size;
  const total = (await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first()).total;
  const users = (await c.env.DB.prepare('SELECT id, username FROM users LIMIT ? OFFSET ?').bind(size, offset).all()).results;
  return c.json({ total, page: pageNum, pageSize: size, data: users });
});

// ==================== 站点设置 ====================
app.get('/settings', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT key, value FROM site_settings').all()).results;
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  return c.json({ code: 200, data: settings });
});

app.put('/settings', auth, async (c) => {
  const settings = await c.req.json().catch(() => null);
  if (!settings || typeof settings !== 'object') return c.json({ code: 400, message: '参数无效' }, 400);

  const allowedKeys = [
    'site_name', 'admin_theme',
    'bg_desktop_type', 'bg_desktop_value',
    'bg_mobile_type', 'bg_mobile_value',
    'favicon_type', 'favicon_url'
  ];
  let updatedCount = 0;
  const stmt = c.env.DB.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  const batch = [];
  for (const [key, value] of Object.entries(settings)) {
    if (allowedKeys.includes(key)) {
      batch.push(stmt.bind(key, String(value)));
      updatedCount++;
    }
  }
  if (batch.length) await c.env.DB.batch(batch);
  return c.json({ code: 200, message: `已更新 ${updatedCount} 项设置` });
});

app.post('/settings/upload-bg', auth, async (c) => {
  const body = await c.req.parseBody();
  const filename = await saveToR2(c, 'bg', themePrefix(body.target));
  if (!filename) return c.json({ code: 400, message: '未选择文件' }, 400);
  return c.json({ code: 200, data: { url: '/uploads/' + filename } });
});

// 列出某个目标（favicon/desktop/mobile）已上传的图片，仅返回该用途的图片
app.get('/settings/uploads', auth, async (c) => {
  const prefix = themePrefix(c.req.query('target'));
  const list = await c.env.BUCKET.list({ prefix });
  const items = (list.objects || []).map(o => ({
    key: o.key,
    url: '/uploads/' + o.key,
    size: o.size,
    uploaded: o.uploaded,
  }));
  // 按上传时间倒序，最新的排在前面
  items.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
  return c.json({ code: 200, data: items });
});

// 删除一张已上传的主题图片（仅允许 bg-/favicon- 前缀，避免误删卡片 logo 等）
app.delete('/settings/uploads/:key', auth, async (c) => {
  const key = c.req.param('key');
  if (!key || !(key.startsWith('bg-') || key.startsWith('favicon-')) || key.includes('/')) {
    return c.json({ code: 400, message: '非法文件名' }, 400);
  }
  await c.env.BUCKET.delete(key);
  return c.json({ code: 200, message: '已删除' });
});

// ==================== 数据备份 / 迁移 ====================
// 导出: 打包所有 D1 数据为 JSON；不包含 R2 中的图片文件
// 导入: 清空所有表后按备份内容重写，含 users（密码 hash 一同恢复）
const BACKUP_VERSION = 1;
const BACKUP_TABLES = ['menus', 'sub_menus', 'cards', 'ads', 'friends', 'site_settings', 'users'];

app.get('/backup/export', auth, async (c) => {
  const data = {};
  for (const t of BACKUP_TABLES) {
    const rows = (await c.env.DB.prepare(`SELECT * FROM ${t}`).all()).results || [];
    data[t] = rows;
  }
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'nav-item-cf',
    data,
  };
  const filename = `nav-item-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

app.post('/backup/import', auth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: '备份文件格式无效' }, 400);
  // 兼容 { data: {...} }（直接是备份 JSON）和 { data: { data: {...} } }（外层再包一层）
  const payload = body.data && body.data.data ? body.data : body;
  const data = payload.data;
  if (!data || typeof data !== 'object') return c.json({ error: '备份文件格式无效' }, 400);

  // D1 不支持 PRAGMA foreign_keys 运行时切换，但 batch 里 DELETE + INSERT 由 D1 保证事务性
  const clearOrder = ['cards', 'sub_menus', 'menus', 'ads', 'friends', 'site_settings', 'users'];
  const stmts = [];
  for (const t of clearOrder) {
    stmts.push(c.env.DB.prepare(`DELETE FROM ${t}`));
    // 重置自增序列
    stmts.push(c.env.DB.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).bind(t));
  }

  let inserted = 0;
  for (const t of BACKUP_TABLES) {
    const rows = Array.isArray(data[t]) ? data[t] : [];
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const placeholders = cols.map(() => '?').join(', ');
      const quoted = cols.map((col) => `"${col}"`).join(', ');
      const values = cols.map((col) => row[col]);
      stmts.push(c.env.DB.prepare(`INSERT INTO ${t} (${quoted}) VALUES (${placeholders})`).bind(...values));
      inserted++;
    }
  }

  try {
    await c.env.DB.batch(stmts);
    return c.json({ code: 200, message: `导入成功，共写入 ${inserted} 条记录`, inserted });
  } catch (e) {
    return c.json({ error: '导入失败: ' + (e && e.message ? e.message : String(e)) }, 500);
  }
});

export const onRequest = handle(app);
