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

  const lastLoginTime = user.last_login_time;
  const lastLoginIp = user.last_login_ip;
  const now = getShanghaiTime();
  const ip = getClientIp(c);
  await c.env.DB.prepare('UPDATE users SET last_login_time = ?, last_login_ip = ? WHERE id = ?')
    .bind(now, ip, user.id).run();

  const token = await sign(
    { id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60 },
    jwtSecret(c.env)
  );
  return c.json({ token, lastLoginTime, lastLoginIp });
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
  const user = await c.env.DB.prepare('SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = ?')
    .bind(c.get('user').id).first();
  if (!user) return c.json({ message: '用户不存在' }, 404);
  return c.json({ last_login_time: user.last_login_time, last_login_ip: user.last_login_ip });
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
  const filename = await saveToR2(c, 'bg', 'bg-');
  if (!filename) return c.json({ code: 400, message: '未选择文件' }, 400);
  return c.json({ code: 200, data: { url: '/uploads/' + filename } });
});

export const onRequest = handle(app);
