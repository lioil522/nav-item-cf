-- D1 schema + seed for nav-item (migrated from db.js)
-- 使用方法:
--   本地:  npx wrangler d1 execute nav-item-db --local  --file=./schema.sql
--   远程:  npx wrangler d1 execute nav-item-db --remote --file=./schema.sql
-- 注意: 重复执行会因主键冲突报错。重建请先 DROP 或使用新数据库。

PRAGMA foreign_keys = ON;

-- ================= 表结构 =================
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order");

CREATE TABLE IF NOT EXISTS sub_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order");

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER,
  sub_menu_id INTEGER,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  custom_logo_path TEXT,
  desc TEXT,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY(sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id);
CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id);
CREATE INDEX IF NOT EXISTS idx_cards_order ON cards("order");

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  last_login_time TEXT,
  last_login_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position TEXT NOT NULL,
  img TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);

CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT
);
CREATE INDEX IF NOT EXISTS idx_friends_title ON friends(title);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ================= 默认菜单 =================
INSERT INTO menus (id, name, "order") VALUES
  (1, 'Home', 1),
  (2, 'Ai Stuff', 2),
  (3, 'Cloud', 3),
  (4, 'Software', 4),
  (5, 'Tools', 5),
  (6, 'Other', 6);

-- ================= 默认子菜单 =================
INSERT INTO sub_menus (id, parent_id, name, "order") VALUES
  (1, 2, 'AI chat', 1),
  (2, 2, 'AI tools', 2),
  (3, 5, 'Dev Tools', 1),
  (4, 4, 'Mac', 1),
  (5, 4, 'iOS', 2),
  (6, 4, 'Android', 3),
  (7, 4, 'Windows', 4);

-- ================= 默认卡片（主菜单） =================
INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc) VALUES
  (1, NULL, 'Baidu', 'https://www.baidu.com', '', '全球最大的中文搜索引擎'),
  (1, NULL, 'Youtube', 'https://www.youtube.com', 'https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png', '全球最大的视频社区'),
  (1, NULL, 'Gmail', 'https://mail.google.com', 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', ''),
  (1, NULL, 'GitHub', 'https://github.com', '', '全球最大的代码托管平台'),
  (1, NULL, 'ip.sb', 'https://ip.sb', '', 'ip地址查询'),
  (1, NULL, 'Cloudflare', 'https://dash.cloudflare.com', '', '全球最大的cdn服务商'),
  (1, NULL, 'ChatGPT', 'https://chat.openai.com', 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', '人工智能AI聊天机器人'),
  (1, NULL, 'Huggingface', 'https://huggingface.co', '', '全球最大的开源模型托管平台'),
  (1, NULL, 'ITDOG - 在线ping', 'https://www.itdog.cn/tcping', '', '在线tcping'),
  (1, NULL, 'Ping0', 'https://ping0.cc', '', 'ip地址查询'),
  (1, NULL, '浏览器指纹', 'https://www.browserscan.net/zh', '', '浏览器指纹查询'),
  (1, NULL, 'nezha面板', 'https://ssss.nyc.mn', 'https://nezha.wiki/logo.png', 'nezha面板'),
  (1, NULL, 'Api测试', 'https://hoppscotch.io', '', '在线api测试工具'),
  (1, NULL, '域名检查', 'https://who.cx', '', '域名可用性查询'),
  (1, NULL, '域名比价', 'https://www.whois.com', '', '域名价格比较'),
  (1, NULL, 'NodeSeek', 'https://www.nodeseek.com', 'https://www.nodeseek.com/static/image/favicon/favicon-32x32.png', '主机论坛'),
  (1, NULL, 'Linux do', 'https://linux.do', 'https://linux.do/uploads/default/optimized/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994_2_32x32.png', '新的理想型社区'),
  (1, NULL, '在线音乐', 'https://music.eooce.com', 'https://p3.music.126.net/tBTNafgjNnTL1KlZMt7lVA==/18885211718935735.jpg', '在线音乐'),
  (1, NULL, '在线电影', 'https://libretv.eooce.com', 'https://img.icons8.com/color/240/cinema---v1.png', '在线电影'),
  (1, NULL, '免费接码', 'https://www.smsonline.cloud/zh', '', '免费接收短信验证码'),
  (1, NULL, '订阅转换', 'https://sublink.eooce.com', 'https://img.icons8.com/color/96/link--v1.png', '最好用的订阅转换工具'),
  (1, NULL, 'webssh', 'https://ssh.eooce.com', 'https://img.icons8.com/fluency/240/ssh.png', '最好用的webssh终端管理工具'),
  (1, NULL, '文件快递柜', 'https://filebox.nnuu.nyc.mn', 'https://img.icons8.com/nolan/256/document.png', '文件输出分享'),
  (1, NULL, '真实地址生成', 'https://address.nnuu.nyc.mn', 'https://static11.meiguodizhi.com/favicon.ico', '基于当前ip生成真实的地址'),
  (2, NULL, 'ChatGPT', 'https://chat.openai.com', 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', 'OpenAI官方AI对话'),
  (2, NULL, 'Deepseek', 'https://www.deepseek.com', 'https://cdn.deepseek.com/chat/icon.png', 'Deepseek AI搜索'),
  (2, NULL, 'Claude', 'https://claude.ai', 'https://img.icons8.com/fluency/240/claude-ai.png', 'Anthropic Claude AI'),
  (2, NULL, 'Google Gemini', 'https://gemini.google.com', 'https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg', 'Google Gemini大模型'),
  (2, NULL, '阿里千问', 'https://chat.qwenlm.ai', 'https://g.alicdn.com/qwenweb/qwen-ai-fe/0.0.11/favicon.ico', '阿里云千问大模型'),
  (2, NULL, 'Kimi', 'https://www.kimi.com', '', '月之暗面Moonshot AI'),
  (3, NULL, '阿里云', 'https://www.aliyun.com', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', '阿里云官网'),
  (3, NULL, '腾讯云', 'https://cloud.tencent.com', '', '腾讯云官网'),
  (3, NULL, '甲骨文云', 'https://cloud.oracle.com', '', 'Oracle Cloud'),
  (3, NULL, '亚马逊云', 'https://aws.amazon.com', 'https://img.icons8.com/color/144/amazon-web-services.png', 'Amazon AWS'),
  (3, NULL, 'DigitalOcean', 'https://www.digitalocean.com', 'https://www.digitalocean.com/_next/static/media/apple-touch-icon.d7edaa01.png', 'DigitalOcean VPS'),
  (3, NULL, 'Vultr', 'https://www.vultr.com', '', 'Vultr VPS'),
  (4, NULL, 'Hellowindows', 'https://hellowindows.cn', 'https://hellowindows.cn/logo-s.png', 'windows系统及office下载'),
  (4, NULL, '奇迹秀', 'https://www.qijishow.com/down', 'https://www.qijishow.com/img/ico.ico', '设计师的百宝箱'),
  (4, NULL, '易破解', 'https://www.ypojie.com', 'https://www.ypojie.com/favicon.ico', '精品windows软件'),
  (4, NULL, '软件先锋', 'https://topcracked.com', 'https://cdn.mac89.com/win_macxf_node/static/favicon.ico', '精品windows软件'),
  (4, NULL, 'Macwk', 'https://www.macwk.com', 'https://www.macwk.com/favicon-32x32.ico', '精品Mac软件'),
  (4, NULL, 'Macsc', 'https://mac.macsc.com', 'https://cdn.mac89.com/macsc_node/static/favicon.ico', ''),
  (5, NULL, 'JSON工具', 'https://www.json.cn', 'https://img.icons8.com/nolan/128/json.png', 'JSON格式化/校验'),
  (5, NULL, 'base64工具', 'https://www.qqxiuzi.cn/bianma/base64.htm', 'https://cdn.base64decode.org/assets/images/b64-180.webp', '在线base64编码解码'),
  (5, NULL, '二维码生成', 'https://cli.im', 'https://img.icons8.com/fluency/96/qr-code.png', '二维码生成工具'),
  (5, NULL, 'JS混淆', 'https://obfuscator.io', 'https://img.icons8.com/color/240/javascript--v1.png', '在线Javascript代码混淆'),
  (5, NULL, 'Python混淆', 'https://freecodingtools.org/tools/obfuscator/python', 'https://img.icons8.com/color/240/python--v1.png', '在线python代码混淆'),
  (5, NULL, 'Remove.photos', 'https://remove.photos/zh-cn', 'https://img.icons8.com/doodle/192/picture.png', '一键抠图'),
  (6, NULL, 'Gmail', 'https://mail.google.com', 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', 'Google邮箱'),
  (6, NULL, 'Outlook', 'https://outlook.live.com', 'https://img.icons8.com/color/256/ms-outlook.png', '微软Outlook邮箱'),
  (6, NULL, 'Proton Mail', 'https://account.proton.me', 'https://account.proton.me/assets/apple-touch-icon-120x120.png', '安全加密邮箱'),
  (6, NULL, 'QQ邮箱', 'https://mail.qq.com', 'https://mail.qq.com/zh_CN/htmledition/images/favicon/qqmail_favicon_96h.png', '腾讯QQ邮箱'),
  (6, NULL, '雅虎邮箱', 'https://mail.yahoo.com', 'https://img.icons8.com/color/240/yahoo--v2.png', '雅虎邮箱'),
  (6, NULL, '10分钟临时邮箱', 'https://linshiyouxiang.net', 'https://linshiyouxiang.net/static/index/zh/images/favicon.ico', '10分钟临时邮箱');

-- ================= 默认卡片（子菜单） =================
INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc) VALUES
  (NULL, 1, 'ChatGPT', 'https://chat.openai.com', 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', 'OpenAI官方AI对话'),
  (NULL, 1, 'Deepseek', 'https://www.deepseek.com', 'https://cdn.deepseek.com/chat/icon.png', 'Deepseek AI搜索'),
  (NULL, 2, 'ChatGPT', 'https://chat.openai.com', 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', 'OpenAI官方AI对话'),
  (NULL, 2, 'Deepseek', 'https://www.deepseek.com', 'https://cdn.deepseek.com/chat/icon.png', 'Deepseek AI搜索'),
  (NULL, 3, 'Uiverse', 'https://uiverse.io/elements', 'https://img.icons8.com/fluency/96/web-design.png', 'CSS动画和设计元素'),
  (NULL, 3, 'Icons8', 'https://igoutu.cn/icons', 'https://maxst.icons8.com/vue-static/landings/primary-landings/favs/icons8_fav_32×32.png', '免费图标和设计资源');

-- ================= 默认友情链接 =================
INSERT INTO friends (title, url, logo) VALUES
  ('Noodseek图床', 'https://www.nodeimage.com', 'https://www.nodeseek.com/static/image/favicon/favicon-32x32.png'),
  ('Font Awesome', 'https://fontawesome.com', 'https://fontawesome.com/favicon.ico');

-- ================= 默认管理员 =================
-- 用户名 admin / 密码 123456（bcrypt hash，可用后台“修改密码”更改）
INSERT INTO users (username, password) VALUES
  ('admin', '$2b$10$kADwbZYc6qfXTjPLPwjrQ.Aezy9pwJm.EpQo1faDSluGqs0sNWA1S');

-- ================= 默认站点设置 =================
INSERT INTO site_settings (key, value) VALUES
  ('site_name', '我的导航'),
  ('admin_theme', 'light'),
  ('bg_desktop_type', 'url'),
  ('bg_desktop_value', 'https://main.ssss.nyc.mn/background.webp'),
  ('bg_mobile_type', 'url'),
  ('bg_mobile_value', ''),
  ('favicon_url', 'https://img.icons8.com/lollipop/100/navigation.png');
