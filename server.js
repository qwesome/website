const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://api.studiobean.com';

const corsOptions = {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '4mb' }));

// --- Static assets (avatars, uploaded images) ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const SERVER_ICONS_DIR = path.join(UPLOADS_DIR, 'server-icons');
const BANNERS_DIR = path.join(UPLOADS_DIR, 'banners');
fs.mkdirSync(AVATARS_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(SERVER_ICONS_DIR, { recursive: true });
fs.mkdirSync(BANNERS_DIR, { recursive: true });

// Served BEFORE the rate limiter so parallel asset loads aren't throttled.
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Image storage: keep base64 out of SQLite, write decoded files to disk ---
const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB decoded payload

function decodeDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    const m = /^data:image\/(png|jpeg|gif|webp);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    let buf;
    try {
        buf = Buffer.from(m[2], 'base64');
    } catch {
        return null;
    }
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;

    const signatures = {
        png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        jpg: [0xff, 0xd8, 0xff],
        gif: [0x47, 0x49, 0x46, 0x38],
        webp: [0x52, 0x49, 0x46, 0x46],
    };
    const sig = signatures[ext];
    for (let i = 0; i < sig.length; i++) {
        if (buf[i] !== sig[i]) return null;
    }
    return { ext, buf };
}

// Saves an image data URL to disk and returns a public absolute URL (or null if invalid).
function saveImage(dataUrl, folder) {
    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) return null;
    const name = `${crypto.randomBytes(8).toString('hex')}.${decoded.ext}`;
    const filePath = path.join(UPLOADS_DIR, folder, name);
    try {
        fs.writeFileSync(filePath, decoded.buf);
    } catch (e) {
        console.error('Failed to write upload:', e);
        return null;
    }
    return `${PUBLIC_URL}/uploads/${folder}/${name}`;
}

// Removes a previously stored image URL from disk (no-op for legacy/remote values).
function deleteImageByUrl(url) {
    if (typeof url !== 'string' || !url.includes('/uploads/')) return;
    const rel = url.slice(url.indexOf('/uploads/') + '/uploads/'.length);
    const filePath = path.join(UPLOADS_DIR, rel);
    if (!filePath.startsWith(UPLOADS_DIR)) return;
    fs.unlink(filePath, () => {});
}

// Giphy GIF URLs are stored verbatim (the client searches Giphy directly), so we
// accept them alongside uploaded data URLs.
const GIPHY_URL_RE = /^https:\/\/[a-z0-9.-]+\.giphy\.com\//i;
function isRemoteAvatar(url) {
    return typeof url === 'string' && GIPHY_URL_RE.test(url);
}

// --- Rate Limiter ---
const rateLimitMap = new Map();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '60', 10);        // max requests per window
const RATE_WINDOW = parseInt(process.env.RATE_WINDOW || '10000', 10);   // 10 second window (ms)
const PENALTY_DURATION = 15000; // 15 second cooldown (ms)

function getRateLimitInfo(ip) {
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 0, windowStart: now, penalizedUntil: 0 });
    }
    return rateLimitMap.get(ip);
}

function rateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const now = Date.now();
    const info = getRateLimitInfo(ip);

    // Check if currently penalized
    if (info.penalizedUntil > now) {
        const retryAfter = Math.ceil((info.penalizedUntil - now) / 1000);
        return res.status(429).json({
            message: "Too many requests. Try again later.",
            retryAfter
        });
    }

    // Reset window if expired
    if (now - info.windowStart > RATE_WINDOW) {
        info.count = 0;
        info.windowStart = now;
    }

    info.count++;

    // Apply penalty if over limit
    if (info.count > RATE_LIMIT) {
        info.penalizedUntil = now + PENALTY_DURATION;
        info.count = 0;
        return res.status(429).json({
            message: "Rate limit exceeded. You are blocked for 15 seconds.",
            retryAfter: 15
        });
    }

    next();
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [ip, info] of rateLimitMap.entries()) {
        if (now - info.windowStart > PENALTY_DURATION && info.penalizedUntil < now) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

app.use(rateLimiter);

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Database opening error:", err.message);
    else console.log("Connected to SQLite database.");
});

// --- Initial Table Setup and Migrations ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT,
        author TEXT,
        text TEXT,
        image TEXT,
        ts INTEGER,
        reply_to INTEGER,
        edited INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        avatar TEXT,
        is_admin INTEGER DEFAULT 0
    )`);

    // Session tokens for authenticated endpoints
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        username TEXT,
        created_at INTEGER
    )`);

    // Per-user settings JSON storage
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
        username TEXT PRIMARY KEY,
        settings TEXT,
        updated_at INTEGER
    )`);

    // Table to track which users have hidden which DM conversations
    db.run(`CREATE TABLE IF NOT EXISTS hidden_dms (
        username TEXT,
        channel TEXT,
        PRIMARY KEY (username, channel)
    )`);

    // Per-user, per-channel last-read timestamp (unread counts survive reloads)
    db.run(`CREATE TABLE IF NOT EXISTS reads (
        username TEXT NOT NULL,
        channel TEXT NOT NULL,
        last_read INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (username, channel)
    )`);

    // Discord-style servers
    db.run(`CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        avatar TEXT,
        owner TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        is_public INTEGER DEFAULT 1,
        created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS server_members (
        server_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        joined_at INTEGER,
        PRIMARY KEY (server_id, username)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS server_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sort INTEGER DEFAULT 0,
        created_at INTEGER,
        UNIQUE (server_id, name)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS friends (
        requester TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER,
        PRIMARY KEY (requester, target)
    )`);

    db.all("PRAGMA table_info(messages)", (err, columns) => {
        if (!columns.some(c => c.name === 'reply_to')) db.run("ALTER TABLE messages ADD COLUMN reply_to INTEGER");
        if (!columns.some(c => c.name === 'edited')) db.run("ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0");
    });

    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (!columns.some(c => c.name === 'is_admin')) db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
        if (!columns.some(c => c.name === 'status_emoji')) db.run("ALTER TABLE users ADD COLUMN status_emoji TEXT");
        if (!columns.some(c => c.name === 'status_text')) db.run("ALTER TABLE users ADD COLUMN status_text TEXT");
        if (!columns.some(c => c.name === 'status_expires')) db.run("ALTER TABLE users ADD COLUMN status_expires INTEGER");
        if (!columns.some(c => c.name === 'banner')) db.run("ALTER TABLE users ADD COLUMN banner TEXT");
        if (!columns.some(c => c.name === 'bio')) db.run("ALTER TABLE users ADD COLUMN bio TEXT");
        if (!columns.some(c => c.name === 'pronouns')) db.run("ALTER TABLE users ADD COLUMN pronouns TEXT");
        if (!columns.some(c => c.name === 'profile_color')) db.run("ALTER TABLE users ADD COLUMN profile_color TEXT");
    if (!columns.some(c => c.name === 'display_name')) db.run("ALTER TABLE users ADD COLUMN display_name TEXT");
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_channel_ts ON messages (channel, ts DESC)`);

    // The "global" default-server idea was scrapped — remove any default servers
    // (and everything that belonged to them) left behind by older databases.
    db.all(`SELECT id FROM servers WHERE is_default = 1`, (err, rows) => {
        if (err || !rows || rows.length === 0) return;
        const ids = rows.map(r => r.id);
        const ph = ids.map(() => '?').join(',');
        db.all(`SELECT id FROM server_channels WHERE server_id IN (${ph})`, ids, (e2, chans) => {
            const chIds = (chans || []).map(c => String(c.id));
            if (chIds.length) {
                const ph2 = chIds.map(() => '?').join(',');
                db.run(`DELETE FROM messages WHERE channel IN (${ph2})`, chIds);
            }
            db.run(`DELETE FROM server_channels WHERE server_id IN (${ph})`, ids);
            db.run(`DELETE FROM server_members WHERE server_id IN (${ph})`, ids);
            db.run(`DELETE FROM servers WHERE id IN (${ph})`, ids, (delErr) => {
                if (!delErr) console.log(`Removed ${ids.length} legacy default server(s).`);
            });
        });
    });
});

// --- Invite codes for servers ---

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function generateServerCode() {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
}

function backfillServerCodes() {
    db.all(`SELECT id FROM servers WHERE code IS NULL OR code = ''`, (err, rows) => {
        if (err || !rows.length) return;
        let i = 0;
        const attempt = () => {
            if (i >= rows.length) return;
            const serverId = rows[i++].id;
            // Retry on a (very unlikely) code collision.
            db.run(`UPDATE servers SET code = ? WHERE id = ?`, [generateServerCode(), serverId], (updateErr) => {
                if (updateErr) return attempt();
                attempt();
            });
        };
        attempt();
    });
}

// Older databases: add the invite `code` and `is_public` columns, backfill
// codes, then create the index only after the columns exist.
db.all("PRAGMA table_info(servers)", (err, columns) => {
    if (err) {
        console.error("Failed to inspect servers table:", err.message);
        return;
    }

    const ensureIndex = () => {
        backfillServerCodes();

        db.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_code
             ON servers (code) WHERE code IS NOT NULL`,
            (indexErr) => {
                if (indexErr) {
                    console.error("Failed to create server code index:", indexErr.message);
                }
            }
        );
    };

    const runMigrations = () => {
        if (!columns.some(c => c.name === 'is_public')) {
            db.run(`ALTER TABLE servers ADD COLUMN is_public INTEGER DEFAULT 1`, (isPubErr) => {
                if (isPubErr) console.error("Failed to add servers.is_public:", isPubErr.message);
            });
        }
        ensureIndex();
    };

    if (!columns.some(c => c.name === 'code')) {
        db.run(`ALTER TABLE servers ADD COLUMN code TEXT`, (alterErr) => {
            if (alterErr) {
                console.error("Failed to add servers.code:", alterErr.message);
                return;
            }
            runMigrations();
        });
    } else {
        runMigrations();
    }
});

// MODIFIED: Cleanup only wipes public channels, keeping DMs permanent
setInterval(() => {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    db.run(`DELETE FROM messages WHERE ts < ? AND channel NOT LIKE 'dm:%'`, [twentyFourHoursAgo]);
}, 3600000);

// --- Session Middleware ---

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Sessions pile up on every login; keep only the newest few per user.
function pruneSessions(username) {
    db.run(`DELETE FROM sessions WHERE username = ? AND token NOT IN (
        SELECT token FROM sessions WHERE username = ? ORDER BY created_at DESC LIMIT 5
    )`, [username, username]);
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Authentication required" });

    db.get(`SELECT username FROM sessions WHERE token = ?`, [token], (err, session) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!session) return res.status(403).json({ message: "Invalid or expired session token" });

        req.user = { username: session.username };
        next();
    });
}

// --- Auth Endpoints ---

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing fields" });
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) return res.status(400).json({ message: "Username already taken" });
                return res.status(500).json({ message: "Database error" });
            }

            const token = generateToken();
            db.run(`INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)`, [token, username, Date.now()], (sessErr) => {
                if (sessErr) return res.status(500).json({ message: "Session creation error" });
                pruneSessions(username);
                res.status(201).json({ message: "User created", token, isAdmin: false });
            });
        });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing fields" });
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(401).json({ message: "Account does not exist" });
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            const token = generateToken();
            db.run(`INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)`, [token, username, Date.now()], (sessErr) => {
                if (sessErr) return res.status(500).json({ message: "Session creation error" });
                pruneSessions(username);
                res.status(200).json({ message: "Login successful", token, isAdmin: Boolean(user.is_admin) });
            });
        } else {
            res.status(401).json({ message: "Incorrect password" });
        }
    });
});

// "Remember me" handshake: the stored token is exchanged for a fresh one
// each time the app loads (like a launcher minting a new access token),
// so a leaked localStorage token goes stale after the first use.
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    const oldToken = req.headers.authorization.split(' ')[1];
    db.get(`SELECT is_admin FROM users WHERE username = ?`, [req.user.username], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });
        const token = generateToken();
        db.run(`INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)`, [token, req.user.username, Date.now()], (sessErr) => {
            if (sessErr) return res.status(500).json({ message: "Session creation error" });
            db.run(`DELETE FROM sessions WHERE token = ?`, [oldToken], (delErr) => {
                pruneSessions(req.user.username);
                res.json({ message: "Session refreshed", token, username: req.user.username, isAdmin: Boolean(user && user.is_admin) });
            });
        });
    });
});

// --- Settings Endpoints ---

app.get('/api/settings', authenticateToken, (req, res) => {
    db.get(`SELECT settings FROM user_settings WHERE username = ?`, [req.user.username], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        let settings = {};
        if (row && row.settings) {
            try {
                settings = JSON.parse(row.settings);
            } catch (e) {
                console.error("Failed to parse stored settings JSON", e);
            }
        }
        res.json({ settings });
    });
});

app.put('/api/settings', authenticateToken, (req, res) => {
    const { settings } = req.body;
    if (typeof settings !== 'object') return res.status(400).json({ message: "Invalid settings format" });

    const settingsJson = JSON.stringify(settings);
    if (settingsJson.length > 50000) {
        return res.status(400).json({ message: "Settings size exceeds limits" });
    }

    db.run(
        `INSERT INTO user_settings (username, settings, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`,
        [req.user.username, settingsJson, Date.now()],
        (err) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ message: "Settings saved successfully" });
        }
    );
});

// --- Avatar Endpoints ---

app.get('/api/avatar/:username', (req, res) => {
    const { username } = req.params;
    db.get(`SELECT avatar FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!row) return res.status(404).json({ message: "User not found" });
        res.json({ avatar: row.avatar || null });
    });
});

// MODIFIED: username is derived from the session token, not the request body.
app.post('/api/avatar', authenticateToken, (req, res) => {
    const { avatar } = req.body;
    db.get(`SELECT avatar FROM users WHERE username = ?`, [req.user.username], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });

        let newAvatar = null;
        if (isRemoteAvatar(avatar)) {
            newAvatar = avatar;
            deleteImageByUrl(user.avatar);
        } else if (typeof avatar === 'string' && avatar.startsWith('data:image/')) {
            newAvatar = saveImage(avatar, 'avatars');
            if (!newAvatar) return res.status(400).json({ message: "Invalid or too large image" });
            deleteImageByUrl(user.avatar);
        } else if (avatar !== null && avatar !== undefined) {
            return res.status(400).json({ message: "Unsupported image format" });
        }

        db.run(`UPDATE users SET avatar = ? WHERE username = ?`, [newAvatar, req.user.username], function(updateErr) {
            if (updateErr) return res.status(500).json({ message: "Database error" });
            io.emit('avatar_update', { username: req.user.username, avatar: newAvatar });
            res.json({ message: "Avatar updated", avatar: newAvatar });
        });
    });
});

// --- Presence / custom status ---

// A short-lived "what I'm up to" line shown beside a user's name.
app.post('/api/status', authenticateToken, (req, res) => {
    const me = req.user.username;
    const body = req.body || {};
    const emoji = typeof body.emoji === 'string' ? body.emoji.trim().slice(0, 8) : '';
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 128) : '';
    const expires = Number.isFinite(body.expires) && body.expires > 0 ? Math.floor(body.expires) : null;

    if (!emoji && !text) {
        db.run(`UPDATE users SET status_emoji = NULL, status_text = NULL, status_expires = NULL WHERE username = ?`, [me], (err) => {
            if (err) return res.status(500).json({ message: "Database error" });
            io.emit('presence_status', { username: me, emoji: '', text: '', expires: null });
            res.json({ message: "Status cleared" });
        });
        return;
    }

    db.run(`UPDATE users SET status_emoji = ?, status_text = ?, status_expires = ? WHERE username = ?`,
        [emoji || null, text || null, expires, me], (err) => {
            if (err) return res.status(500).json({ message: "Database error" });
            io.emit('presence_status', { username: me, emoji, text, expires });
            res.json({ message: "Status updated", status: { emoji, text, expires } });
        });
});

// Every non-expired custom status, so a freshly loaded client can paint them.
app.get('/api/presence/statuses', authenticateToken, (req, res) => {
    db.all(`SELECT username, status_emoji, status_text, status_expires FROM users
            WHERE status_emoji IS NOT NULL OR status_text IS NOT NULL`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const now = Date.now();
        const statuses = {};
        for (const r of rows) {
            if (r.status_expires && r.status_expires <= now) continue;
            statuses[r.username] = { emoji: r.status_emoji || '', text: r.status_text || '', expires: r.status_expires || null };
        }
        res.json({ statuses });
    });
});

// --- Profiles ---

// Public profile-card fields for a user.
// Bios render inside a small profile card, so keep them to 6 lines / 300 chars.
function cleanBio(value) {
    return String(value).replace(/\r\n?/g, '\n').split('\n').slice(0, 6).join('\n').slice(0, 300);
}

app.get('/api/profile/:username', authenticateToken, (req, res) => {
    const { username } = req.params;
    db.get(`SELECT username, display_name, avatar, banner, bio, pronouns, profile_color, is_admin,
                   status_emoji, status_text, status_expires
            FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!row) return res.status(404).json({ message: "User not found" });
        const expired = row.status_expires && row.status_expires <= Date.now();
        res.json({
            username: row.username,
            display_name: row.display_name || '',
            avatar: row.avatar || null,
            banner: row.banner || null,
            bio: row.bio || '',
            pronouns: row.pronouns || '',
            profile_color: row.profile_color || null,
            is_admin: Boolean(row.is_admin),
            status: expired ? null : {
                emoji: row.status_emoji || '',
                text: row.status_text || '',
                expires: row.status_expires || null
            }
        });
    });
});

// Emits the caller's current profile fields to every client.
function emitProfile(username) {
    db.get(`SELECT username, display_name, bio, pronouns, profile_color, banner FROM users WHERE username = ?`, [username], (err, row) => {
        if (err || !row) return;
        io.emit('profile_update', {
            username: row.username,
            display_name: row.display_name || '',
            bio: row.bio || '',
            pronouns: row.pronouns || '',
            profile_color: row.profile_color || null,
            banner: row.banner || null
        });
    });
}

// Update your own profile card: display name, bio, pronouns, and accent colour.
app.post('/api/profile', authenticateToken, (req, res) => {
    const me = req.user.username;
    const body = req.body || {};
    const updates = [];
    const params = [];

    if (typeof body.bio === 'string') { updates.push('bio = ?'); params.push(cleanBio(body.bio.trim())); }
    if (typeof body.pronouns === 'string') { updates.push('pronouns = ?'); params.push(body.pronouns.trim().slice(0, 40)); }
    if (typeof body.display_name === 'string') { updates.push('display_name = ?'); params.push(body.display_name.trim().slice(0, 40) || null); }
    if (typeof body.profile_color === 'string' || body.profile_color === null) {
        const c = body.profile_color;
        if (c === null || c === '') updates.push('profile_color = NULL');
        else if (/^#[0-9a-fA-F]{6}$/.test(c)) { updates.push('profile_color = ?'); params.push(c); }
        else return res.status(400).json({ message: "Invalid colour" });
    }

    if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
    params.push(me);
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE username = ?`, params, (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        emitProfile(me);
        res.json({ message: "Profile updated" });
    });
});

// Update your own banner image (data URL upload or null to remove).
app.post('/api/profile/banner', authenticateToken, (req, res) => {
    const { banner } = req.body || {};
    db.get(`SELECT banner FROM users WHERE username = ?`, [req.user.username], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });

        let next = null;
        if (isRemoteAvatar(banner)) {
            next = banner;
        } else if (typeof banner === 'string' && banner.startsWith('data:image/')) {
            next = saveImage(banner, 'banners');
            if (!next) return res.status(400).json({ message: "Invalid or too large image" });
        } else if (banner !== null && banner !== undefined) {
            return res.status(400).json({ message: "Unsupported image format" });
        }

        db.run(`UPDATE users SET banner = ? WHERE username = ?`, [next, req.user.username], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: "Database error" });
            if (user.banner !== next) deleteImageByUrl(user.banner);
            io.emit('profile_update', { username: req.user.username, banner: next });
            res.json({ message: "Banner updated", banner: next });
        });
    });
});

// --- Account Endpoints ---

// Renames the signed-in user. Requires the current password, because the
// username is the identity every other table keys off, so this is a
// transactional cascade across all of them rather than a display-only change.
app.post('/api/account/username', authenticateToken, (req, res) => {
    const current = req.user.username;
    const { password, newUsername } = req.body || {};
    if (!password || !newUsername) return res.status(400).json({ message: "Missing fields" });

    const next = String(newUsername).trim();
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(next)) {
        return res.status(400).json({ message: "Username must be 3-32 letters, numbers, _ . or -" });
    }
    if (next.toUpperCase() === 'SYSTEM') return res.status(400).json({ message: "That username is reserved" });
    if (next === current) return res.status(400).json({ message: "That is already your username" });

    db.get(`SELECT username, password_hash FROM users WHERE username = ?`, [current], async (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: "Incorrect password" });

        db.get(`SELECT username FROM users WHERE username = ?`, [next], (takenErr, taken) => {
            if (takenErr) return res.status(500).json({ message: "Database error" });
            if (taken) return res.status(409).json({ message: "Username already taken" });

            const run = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, (e) => (e ? reject(e) : resolve()));
            });

            (async () => {
                try {
                    await run("BEGIN TRANSACTION");
                    const steps = [
                        ["UPDATE users SET username = ? WHERE username = ?", [next, current]],
                        ["UPDATE messages SET author = ? WHERE author = ?", [next, current]],
                        ["UPDATE server_members SET username = ? WHERE username = ?", [next, current]],
                        ["UPDATE servers SET owner = ? WHERE owner = ?", [next, current]],
                        ["UPDATE sessions SET username = ? WHERE username = ?", [next, current]],
                        ["UPDATE reads SET username = ? WHERE username = ?", [next, current]],
                        ["UPDATE friends SET requester = ? WHERE requester = ?", [next, current]],
                        ["UPDATE friends SET target = ? WHERE target = ?", [next, current]],
                        ["UPDATE hidden_dms SET username = ? WHERE username = ?", [next, current]],
                        ["UPDATE user_settings SET username = ? WHERE username = ?", [next, current]]
                    ];
                    for (const step of steps) await run(step[0], step[1]);
                    await run("COMMIT");
                    io.emit('username_changed', { from: current, to: next });
                    res.json({ message: "Username updated", username: next });
                } catch (e) {
                    try { await run("ROLLBACK"); } catch (rollbackErr) { /* ignore */ }
                    res.status(500).json({ message: "Could not update username" });
                }
            })();
        });
    });
});

// MODIFIED: Fetches the caller's conversations, identified by the session token.
app.get('/api/conversations', authenticateToken, (req, res) => {
    const username = req.user.username;

    const query = `
        SELECT m.channel, MAX(m.ts) as last_ts
        FROM messages m
        LEFT JOIN hidden_dms h ON m.channel = h.channel AND h.username = ?
        WHERE m.channel LIKE 'dm:%' AND m.channel LIKE ? AND h.channel IS NULL
        GROUP BY m.channel
        ORDER BY last_ts DESC
    `;

    db.all(query, [username, `%:${username}%`], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });

        const partners = rows.map(row => {
            const parts = row.channel.split(':');
            const otherUser = parts[1] === username ? parts[2] : parts[1];
            return {
                username: otherUser,
                last_ts: row.last_ts
            };
        });

        res.json(partners);
    });
});

// MODIFIED: username is derived from the session token, not the request body.
app.post('/api/conversations/hide', authenticateToken, (req, res) => {
    const { channel } = req.body;
    db.run(`INSERT OR IGNORE INTO hidden_dms (username, channel) VALUES (?, ?)`, [req.user.username, channel], (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "DM hidden" });
    });
});

// --- Friends ---

app.get('/api/friends', authenticateToken, (req, res) => {
    const me = req.user.username;
    db.all(`SELECT requester, target, status FROM friends`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const friends = [], incoming = [], outgoing = [];
        for (const r of rows) {
            if (r.status === 'accepted') {
                if (r.requester === me) friends.push(r.target);
                else if (r.target === me) friends.push(r.requester);
            } else if (r.target === me) incoming.push(r.requester);
            else if (r.requester === me) outgoing.push(r.target);
        }
        res.json({ friends, incoming, outgoing });
    });
});

app.post('/api/friends/request', authenticateToken, (req, res) => {
    const me = req.user.username;
    const target = String((req.body || {}).username || '').trim();
    if (!target) return res.status(400).json({ message: "Missing username" });
    if (target === me) return res.status(400).json({ message: "You cannot friend yourself" });

    db.get(`SELECT username FROM users WHERE username = ?`, [target], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });

        db.get(`SELECT requester, target, status FROM friends WHERE (requester = ? AND target = ?) OR (requester = ? AND target = ?)`,
            [me, target, target, me], (err2, existing) => {
                if (err2) return res.status(500).json({ message: "Database error" });
                if (existing && existing.status === 'accepted') return res.status(409).json({ message: "Already friends" });
                if (existing && existing.requester === me && existing.target === target) return res.status(409).json({ message: "Request already sent" });

                if (existing && existing.requester === target) {
                    // They already sent us a request -> accepting it both ways.
                    db.run(`UPDATE friends SET status = 'accepted' WHERE requester = ? AND target = ?`, [target, me], (err3) => {
                        if (err3) return res.status(500).json({ message: "Database error" });
                        io.to(me).emit('friend_update', { type: 'accepted', other: target });
                        io.to(target).emit('friend_update', { type: 'accepted', other: me });
                        res.json({ status: 'accepted', friend: target });
                    });
                    return;
                }

                db.run(`INSERT INTO friends (requester, target, status, created_at) VALUES (?, ?, 'pending', ?)`,
                    [me, target, Date.now()], (err4) => {
                        if (err4) return res.status(500).json({ message: "Database error" });
                        io.to(target).emit('friend_update', { type: 'request', from: me });
                        io.to(me).emit('friend_update', { type: 'outgoing', to: target });
                        res.status(201).json({ status: 'pending', target });
                    });
            });
    });
});

// Called by the recipient of a pending request.
app.post('/api/friends/respond', authenticateToken, (req, res) => {
    const me = req.user.username;
    const from = String((req.body || {}).username || '').trim();
    const accept = Boolean((req.body || {}).accept);
    if (!from) return res.status(400).json({ message: "Missing username" });

    const query = accept
        ? `UPDATE friends SET status = 'accepted' WHERE requester = ? AND target = ?`
        : `DELETE FROM friends WHERE requester = ? AND target = ?`;
    db.run(query, [from, me], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        if (this.changes === 0) return res.status(404).json({ message: "No pending request" });
        if (accept) {
            io.to(me).emit('friend_update', { type: 'accepted', other: from });
            io.to(from).emit('friend_update', { type: 'accepted', other: me });
            res.json({ status: 'accepted', friend: from });
        } else {
            io.to(from).emit('friend_update', { type: 'declined', by: me });
            io.to(me).emit('friend_update', { type: 'removed', other: from });
            res.json({ status: 'declined' });
        }
    });
});

// Live suggestions for the "add a friend" box: substring match, prefix-first.
app.get('/api/users/search', authenticateToken, (req, res) => {
    const me = req.user.username;
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const like = `%${q}%`;
    db.all(
        `SELECT username FROM users
         WHERE username != ? AND username LIKE ?
         ORDER BY (CASE WHEN username LIKE ? THEN 0 ELSE 1 END), username
         LIMIT 8`,
        [me, like, `${q}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ users: (rows || []).map((r) => r.username) });
        }
    );
});

// Unfriend, or cancel an outgoing request.
app.delete('/api/friends/:username', authenticateToken, (req, res) => {
    const me = req.user.username;
    const other = String(req.params.username || '').trim();
    if (!other) return res.status(400).json({ message: "Missing username" });
    db.run(`DELETE FROM friends WHERE (requester = ? AND target = ?) OR (requester = ? AND target = ?)`,
        [me, other, other, me], function(err) {
            if (err) return res.status(500).json({ message: "Database error" });
            if (this.changes === 0) return res.status(404).json({ message: "Not a friend" });
            io.to(me).emit('friend_update', { type: 'removed', other });
            io.to(other).emit('friend_update', { type: 'removed', other: me });
            res.json({ message: "Friend removed" });
        });
});

// --- Servers & Channels ---

const SERVER_NAME_RE = /^.{1,40}$/;
const CHANNEL_NAME_RE = /^[a-z0-9\-]{1,24}$/;

function getServerWithChannels(serverId, callback) {
    db.get(`SELECT * FROM servers WHERE id = ?`, [serverId], (err, server) => {
        if (err || !server) return callback(err || new Error('not found'), null);
        db.all(`SELECT id, name, sort FROM server_channels WHERE server_id = ? ORDER BY sort ASC, id ASC`, [serverId], (err2, channels) => {
            callback(err2, { ...server, channels });
        });
    });
}

// Optimistically put the default "global" server last so user servers come first.
function getUserServers(username, callback) {
    // A LEFT JOIN plus an `owner` fallback keeps servers visible even if their
    // server_members row is missing (e.g. created before memberships existed).
    const query = `
        SELECT s.* FROM servers s
        LEFT JOIN server_members m ON m.server_id = s.id AND m.username = ?
        WHERE m.username IS NOT NULL OR s.owner = ?
        ORDER BY s.id ASC
    `;
    db.all(query, [username, username], (err, servers) => {
        if (err) return callback(err, []);
        if (servers.length === 0) return callback(null, []);
        const remaining = servers.length;
        const results = [];
        servers.forEach((srv, i) => {
            db.all(`SELECT id, name, sort FROM server_channels WHERE server_id = ? ORDER BY sort ASC, id ASC`, [srv.id], (err2, channels) => {
                results[i] = { ...srv, channels };
                if (--remaining === 0) callback(null, results);
            });
        });
    });
}

app.get('/api/servers', authenticateToken, (req, res) => {
    getUserServers(req.user.username, (err, servers) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ servers });
    });
});

// Public servers available to join (excludes ones you're already in).
app.get('/api/servers/public', authenticateToken, (req, res) => {
    db.all(`
        SELECT s.id, s.name, s.avatar, s.owner,
               (SELECT COUNT(*) FROM server_members m WHERE m.server_id = s.id) AS member_count
        FROM servers s
        WHERE s.is_public = 1 AND s.id NOT IN (
            SELECT server_id FROM server_members WHERE username = ?
        )
        ORDER BY s.id ASC
    `, [req.user.username], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ servers: rows });
    });
});

// Create a server; the creator becomes owner and gets #general.
app.post('/api/servers', authenticateToken, (req, res) => {
    const { name, avatar } = req.body;
    if (typeof name !== 'string' || !SERVER_NAME_RE.test(name)) {
        return res.status(400).json({ message: "Invalid server name" });
    }
    let iconUrl = null;
    if (isRemoteAvatar(avatar)) {
        iconUrl = avatar;
    } else if (typeof avatar === 'string' && avatar.startsWith('data:image/')) {
        iconUrl = saveImage(avatar, 'server-icons');
        if (!iconUrl) return res.status(400).json({ message: "Invalid or too large image" });
    }
    const now = Date.now();
    const insert = (attemptsLeft) => {
        const code = generateServerCode();
        db.run(`INSERT INTO servers (name, avatar, owner, is_default, created_at, code) VALUES (?, ?, ?, 0, ?, ?)`,
            [name.trim(), iconUrl, req.user.username, now, code],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE') && attemptsLeft > 0) return insert(attemptsLeft - 1);
                    return res.status(500).json({ message: "Database error" });
                }
                finishCreate(this.lastID);
            });
    };
    const finishCreate = (serverId) => {
        db.run(`INSERT INTO server_channels (server_id, name, sort, created_at) VALUES (?, 'general', 0, ?)`,
            [serverId, now], function(err2) {
                if (err2) return res.status(500).json({ message: "Database error" });
                db.run(`INSERT OR IGNORE INTO server_members (server_id, username, joined_at) VALUES (?, ?, ?)`,
                    [serverId, req.user.username, now], (err3) => {
                        if (err3) return res.status(500).json({ message: "Database error" });
                        getServerWithChannels(serverId, (err4, server) => {
                            if (err4) return res.status(500).json({ message: "Database error" });
                            res.status(201).json({ server });
                        });
                    });
            });
    };
    insert(3);
});

// Join by numeric id or by the generated invite code.
app.post('/api/servers/:key/join', authenticateToken, (req, res) => {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ message: "Invalid server" });
    const numeric = /^\d+$/.test(key);
    const where = numeric ? `id = ?` : `code = ?`;
    const value = numeric ? Number(key) : key.toUpperCase();
    db.get(`SELECT id FROM servers WHERE ${where}`, [value], (err, srv) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!srv) return res.status(404).json({ message: "Server not found" });
        db.run(`INSERT OR IGNORE INTO server_members (server_id, username, joined_at) VALUES (?, ?, ?)`,
            [srv.id, req.user.username, Date.now()], function(err2) {
                if (err2) return res.status(500).json({ message: "Database error" });
                if (this.changes > 0) {
                    io.to('srv-' + srv.id).emit('server_member_added', { serverId: srv.id, username: req.user.username });
                }
                getServerWithChannels(srv.id, (err3, server) => {
                    if (err3) return res.status(500).json({ message: "Database error" });
                    res.json({ server });
                });
            });
    });
});

// Update server settings (icon / visibility) — owner only.
app.patch('/api/servers/:id', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    const { name, avatar, is_public } = req.body;

    isServerOwner(req, res, serverId, () => {
        const updates = [];
        const params = [];

        if (name !== undefined) {
            if (typeof name !== 'string' || !SERVER_NAME_RE.test(name)) {
                return res.status(400).json({ message: "Invalid server name" });
            }
            updates.push('name = ?');
            params.push(name.trim());
        }

        if (typeof is_public === 'boolean') {
            updates.push('is_public = ?');
            params.push(is_public ? 1 : 0);
        }

        const finishAvatar = () => {
            db.run(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`, [...params, serverId], function(err) {
                if (err) return res.status(500).json({ message: "Database error" });
                getServerWithChannels(serverId, (err2, server) => {
                    if (err2) return res.status(500).json({ message: "Database error" });
                    io.to('srv-' + serverId).emit('server_updated', { server });
                    res.json({ server });
                });
            });
        };

        if (avatar !== undefined) {
            if (avatar === null || avatar === '') {
                updates.push('avatar = ?');
                params.push(null);
                return finishAvatar();
            }
            if (isRemoteAvatar(avatar)) {
                db.get(`SELECT avatar FROM servers WHERE id = ?`, [serverId], (e, srv) => {
                    if (srv && srv.avatar) deleteImageByUrl(srv.avatar);
                });
                updates.push('avatar = ?');
                params.push(avatar);
                return finishAvatar();
            }
            if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
                return res.status(400).json({ message: "Unsupported image format" });
            }
            const url = saveImage(avatar, 'server-icons');
            if (!url) return res.status(400).json({ message: "Invalid or too large image" });
            db.get(`SELECT avatar FROM servers WHERE id = ?`, [serverId], (e, srv) => {
                if (srv && srv.avatar) deleteImageByUrl(srv.avatar);
            });
            updates.push('avatar = ?');
            params.push(url);
            return finishAvatar();
        }
        if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
        finishAvatar();
    });
});

// Members of a server (any member can view).
app.get('/api/servers/:id/members', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    db.get(`SELECT 1 AS ok FROM server_members WHERE server_id = ? AND username = ?`,
        [serverId, req.user.username], (err, member) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (!member) return res.status(403).json({ message: "Not a member of this server" });
            db.all(`SELECT username, joined_at FROM server_members WHERE server_id = ? ORDER BY joined_at ASC`,
                [serverId], (err2, rows) => {
                    if (err2) return res.status(500).json({ message: "Database error" });
                    res.json({ members: rows.map(r => r.username) });
                });
        });
});

// Leave a server (owner-only servers must be deleted instead). Remove every
// open socket for this user from the server room and notify their other tabs.
app.delete('/api/servers/:id/leave', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    db.get(`SELECT owner FROM servers WHERE id = ?`, [serverId], (err, srv) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!srv) return res.status(404).json({ message: "Server not found" });
        if (srv.owner === req.user.username) {
            return res.status(400).json({ message: "The server owner cannot leave; delete the server instead" });
        }
        db.run(`DELETE FROM server_members WHERE server_id = ? AND username = ?`,
            [serverId, req.user.username], function(err2) {
                if (err2) return res.status(500).json({ message: "Database error" });
                if (this.changes === 0) return res.status(404).json({ message: "Not a member of this server" });
                io.sockets.sockets.forEach(s => {
                    if (s.data && s.data.username === req.user.username) s.leave('srv-' + serverId);
                });
                io.to(req.user.username).emit('server_left', { serverId });
                io.to('srv-' + serverId).emit('server_member_removed', {
                    serverId,
                    username: req.user.username
                });
                res.json({ message: "Left server" });
            });
    });
});

// Kick a member — owner only. The kicked user's sockets leave the room so
// broadcasts stop reaching them, and their open tabs are told to drop the server.
app.post('/api/servers/:id/kick', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    const username = String((req.body || {}).username || '').trim();
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    if (!username) return res.status(400).json({ message: "Missing username" });

    isServerOwner(req, res, serverId, () => {
        db.get(`SELECT owner FROM servers WHERE id = ?`, [serverId], (err, srv) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (srv.owner === username) return res.status(400).json({ message: "Cannot kick the owner" });
            if (username === req.user.username) return res.status(400).json({ message: "Cannot kick yourself" });
            db.run(`DELETE FROM server_members WHERE server_id = ? AND username = ?`, [serverId, username], function(err2) {
                if (err2) return res.status(500).json({ message: "Database error" });
                if (this.changes === 0) return res.status(404).json({ message: "Not a member" });
                io.sockets.sockets.forEach(s => {
                    if (s.data && s.data.username === username) s.leave('srv-' + serverId);
                });
                io.to(username).emit('server_kicked', { serverId });
                io.to('srv-' + serverId).emit('server_member_removed', { serverId, username });
                res.json({ message: "Member kicked" });
            });
        });
    });
});

function isServerOwner(req, res, serverId, next) {
    db.get(`SELECT owner FROM servers WHERE id = ?`, [serverId], (err, srv) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!srv) return res.status(404).json({ message: "Server not found" });
        if (srv.owner !== req.user.username) return res.status(403).json({ message: "Only the server owner can do that" });
        next();
    });
}

// Create a channel (owner only). Broadcasts to the whole server.
app.post('/api/servers/:id/channels', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    const { name } = req.body;
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    if (typeof name !== 'string' || !CHANNEL_NAME_RE.test(name)) {
        return res.status(400).json({ message: "Invalid channel name (lowercase letters, numbers, hyphens, max 24)" });
    }
    isServerOwner(req, res, serverId, () => {
        db.run(`INSERT INTO server_channels (server_id, name, sort, created_at) VALUES (?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM server_channels WHERE server_id = ?), ?)`,
            [serverId, name.trim(), serverId, Date.now()],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ message: "Channel already exists" });
                    return res.status(500).json({ message: "Database error" });
                }
                const channel = { id: this.lastID, name: name.trim() };
                io.to('srv-' + serverId).emit('channel_created', { serverId, channel });
                res.status(201).json({ channel });
            });
    });
});

// Rename a channel (owner only).
app.patch('/api/servers/:id/channels/:channelId', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    const channelId = parseInt(req.params.channelId);
    const { name } = req.body;
    if (!serverId || !channelId) return res.status(400).json({ message: "Invalid server or channel" });
    if (typeof name !== 'string' || !CHANNEL_NAME_RE.test(name)) {
        return res.status(400).json({ message: "Invalid channel name (lowercase letters, numbers, hyphens, max 24)" });
    }
    isServerOwner(req, res, serverId, () => {
        db.run(`UPDATE server_channels SET name = ? WHERE id = ? AND server_id = ?`,
            [name.trim(), channelId, serverId],
            function(err) {
                if (err) return res.status(500).json({ message: "Database error" });
                if (this.changes === 0) return res.status(404).json({ message: "Channel not found" });
                const channel = { id: channelId, name: name.trim() };
                io.to('srv-' + serverId).emit('channel_renamed', { serverId, channel });
                res.json({ channel });
            });
    });
});

// Delete a channel and its messages (owner only).
app.delete('/api/servers/:id/channels/:channelId', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    const channelId = parseInt(req.params.channelId);
    if (!serverId || !channelId) return res.status(400).json({ message: "Invalid server or channel" });
    isServerOwner(req, res, serverId, () => {
        db.get(`SELECT COUNT(*) AS c FROM server_channels WHERE server_id = ?`, [serverId], (err, row) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (row.c <= 1) return res.status(400).json({ message: "A server needs at least one channel" });
            db.run(`DELETE FROM messages WHERE channel = ?`, [String(channelId)], (err2) => {
                if (err2) return res.status(500).json({ message: "Database error" });
                db.run(`DELETE FROM server_channels WHERE id = ? AND server_id = ?`, [channelId, serverId], function(err3) {
                    if (err3) return res.status(500).json({ message: "Database error" });
                    if (this.changes === 0) return res.status(404).json({ message: "Channel not found" });
                    io.to('srv-' + serverId).emit('channel_deleted', { serverId, channelId });
                    res.json({ message: "Channel deleted" });
                });
            });
        });
    });
});

// Delete an entire server (owner only). Wipes its messages, channels and
// memberships, then tells every member's open tabs to drop it.
app.delete('/api/servers/:id', authenticateToken, (req, res) => {
    const serverId = parseInt(req.params.id);
    if (!serverId) return res.status(400).json({ message: "Invalid server" });
    db.get(`SELECT owner FROM servers WHERE id = ?`, [serverId], (err, srv) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!srv) return res.status(404).json({ message: "Server not found" });
        if (srv.owner !== req.user.username) return res.status(403).json({ message: "Only the server owner can delete it" });

        db.all(`SELECT id FROM server_channels WHERE server_id = ?`, [serverId], (err2, channels) => {
            if (err2) return res.status(500).json({ message: "Database error" });
            const ids = channels.map(c => String(c.id));
            const finish = () => {
                db.run(`DELETE FROM server_members WHERE server_id = ?`, [serverId], () => {
                    db.run(`DELETE FROM server_channels WHERE server_id = ?`, [serverId], () => {
                        db.run(`DELETE FROM servers WHERE id = ?`, [serverId], () => {
                            io.to('srv-' + serverId).emit('server_deleted', { serverId });
                            res.json({ message: "Server deleted" });
                        });
                    });
                });
            };
            if (ids.length) {
                const placeholders = ids.map(() => '?').join(',');
                db.run(`DELETE FROM messages WHERE channel IN (${placeholders})`, ids, (err3) => {
                    if (err3) console.error("Failed to delete server messages:", err3);
                    finish();
                });
            } else {
                finish();
            }
        });
    });
});

// --- Messaging Endpoints ---

app.get('/api/messages/:channel', authenticateToken, (req, res) => {
    const { channel } = req.params;
    const before = req.query.before ? parseInt(req.query.before) : Date.now();
    const limit = parseInt(req.query.limit) || 50;

    const canRead = (ok) => {
        if (!ok) return res.status(403).json({ message: "No access to this channel" });
        const query = `SELECT * FROM messages WHERE channel = ? AND ts < ? ORDER BY ts DESC LIMIT ?`;
        db.all(query, [channel, before, limit], (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json(rows.reverse());
        });
    };

    if (channel.startsWith('dm:')) {
        const participants = channel.split(':').slice(1);
        canRead(participants.includes(req.user.username));
        return;
    }
    if (channel === 'admin-panel') {
        db.get(`SELECT is_admin FROM users WHERE username = ?`, [req.user.username], (err, user) => {
            if (err) return res.status(500).json({ message: "Database error" });
            canRead(Boolean(user && user.is_admin));
        });
        return;
    }
    // Server channel
    db.get(`SELECT id, server_id FROM server_channels WHERE id = ?`, [channel], (err, ch) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!ch) return res.status(404).json({ message: "Channel not found" });
        db.get(`SELECT 1 AS ok FROM server_members WHERE server_id = ? AND username = ?`, [ch.server_id, req.user.username], (err2, member) => {
            if (err2) return res.status(500).json({ message: "Database error" });
            canRead(Boolean(member));
        });
    });
});

// --- Unread tracking ---
// Counts messages newer than the user's last-read marker for every channel they
// can see. Used to restore unread badges after a page reload.

app.get('/api/unread', authenticateToken, (req, res) => {
    const me = req.user.username;
    const dmFirst = 'dm:' + me + ':%';
    const dmLast = 'dm:%:' + me;
    const query = `
        SELECT m.channel AS channel, COUNT(*) AS n
        FROM messages m
        LEFT JOIN reads r ON r.username = ? AND r.channel = m.channel
        WHERE m.author != ?
          AND m.ts > COALESCE(r.last_read, 0)
          AND (
            m.channel LIKE ?
            OR m.channel LIKE ?
            OR m.channel IN (
                SELECT CAST(sc.id AS TEXT)
                FROM server_channels sc
                JOIN server_members sm ON sm.server_id = sc.server_id
                WHERE sm.username = ?
            )
          )
        GROUP BY m.channel
    `;
    db.all(query, [me, me, dmFirst, dmLast, me], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const counts = {};
        (rows || []).forEach((row) => { counts[row.channel] = row.n; });
        res.json({ counts });
    });
});

app.post('/api/channels/read', authenticateToken, (req, res) => {
    const me = req.user.username;
    const { channel } = req.body || {};
    const ts = Number(req.body && req.body.ts) || Date.now();
    if (typeof channel !== 'string' || !channel) return res.status(400).json({ message: "Invalid channel" });

    const store = () => {
        db.run(
            `INSERT INTO reads (username, channel, last_read) VALUES (?, ?, ?)
             ON CONFLICT(username, channel) DO UPDATE SET last_read = MAX(last_read, excluded.last_read)`,
            [me, channel, ts],
            (err) => {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json({ message: "ok" });
            }
        );
    };

    if (channel.startsWith('dm:')) {
        const participants = channel.split(':').slice(1);
        if (!participants.includes(me)) return res.status(403).json({ message: "No access to this channel" });
        return store();
    }
    if (channel === 'admin-panel') return store();
    db.get(`SELECT id, server_id FROM server_channels WHERE id = ?`, [channel], (err, ch) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!ch) return res.status(404).json({ message: "Channel not found" });
        db.get(`SELECT 1 AS ok FROM server_members WHERE server_id = ? AND username = ?`, [ch.server_id, me], (err2, member) => {
            if (err2) return res.status(500).json({ message: "Database error" });
            if (!member) return res.status(403).json({ message: "No access to this channel" });
            store();
        });
    });
});

// --- Giphy Proxy ---
// Proxies Giphy so the API key stays on the server. Requires GIPHY_API_KEY.

app.get('/api/giphy/trending', async (req, res) => {
    const key = process.env.GIPHY_API_KEY;
    if (!key) return res.status(500).json({ message: "Giphy not configured" });
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 50);
    try {
        const giphyRes = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=${limit}&rating=g`);
        const data = await giphyRes.json();
        res.json({ data: data.data || [] });
    } catch (e) {
        console.error('Giphy trending error:', e);
        res.status(502).json({ message: "Giphy upstream error" });
    }
});

app.get('/api/giphy/search', async (req, res) => {
    const key = process.env.GIPHY_API_KEY;
    const q = String(req.query.q || '').trim();
    if (!key) return res.status(500).json({ message: "Giphy not configured" });
    if (!q) return res.status(400).json({ message: "Missing q" });
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 50);
    try {
        const giphyRes = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g`);
        const data = await giphyRes.json();
        res.json({ data: data.data || [] });
    } catch (e) {
        console.error('Giphy search error:', e);
        res.status(502).json({ message: "Giphy upstream error" });
    }
});

// --- Socket.io & Admin Logic ---

// Plain-english admin command key (also shown in the admin panel on first load).
const ADMIN_HELP = [
    "**admin command key**",
    "",
    "*read*",
    "`list users` · `list admins` · `list servers` · `list channels [serverId]`",
    "`list members [serverId]` · `list dms` · `online`",
    "`count messages [channel]`",
    "",
    "*users*",
    "`adduser [user] [pass]` · `deleteuser [user]` · `rename user [old] [new]`",
    "`set admin [user] [on|off]` · `set pass [user] [pass]` · `testpass [user] [pass]`",
    "`set avatar [user] [imageUrl|none]` · `removepfp [user]`",
    "`set status [user] [online|away|offline]`",
    "",
    "*servers & channels*",
    "`create server [name]` · `create channel [serverId] [name]`",
    "`rename server [serverId] [name]` · `rename channel [channelId] [name]`",
    "`set owner [serverId] [user]` · `set public [serverId] [on|off]`",
    "`set servericon [serverId] [imageUrl|none]`",
    "`add member [serverId] [user]` · `kick member [serverId] [user]`",
    "`delete server [serverId]` · `delete channel [channelId]`",
    "",
    "*messages*",
    "`delete [num] [channel]` · `delete all` · `delete servers`",
    "`delete message [id]` · `edit message [id] [text]` · `clear channel [channel]`",
    "`purge user [user]`",
    "`say [channel] [text]` · `broadcast [text]`"
].join('\n');

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'], credentials: true } });
const connectedUsers = new Map();

// Verify the session token during handshake and attach the real identity.
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    db.get(`SELECT username FROM sessions WHERE token = ?`, [token], (err, session) => {
        if (err) return next(new Error('Database error'));
        if (!session) return next(new Error('Invalid or expired session token'));

        db.get(`SELECT is_admin FROM users WHERE username = ?`, [session.username], (err2, user) => {
            if (err2) return next(new Error('Database error'));
            socket.data = {
                username: session.username,
                isAdmin: Boolean(user && user.is_admin)
            };
            next();
        });
    });
});

io.on('connection', (socket) => {
    function joinServerRooms() {
        db.all(`SELECT server_id FROM server_members WHERE username = ?`, [socket.data.username], (err, rows) => {
            if (err) return;
            rows.forEach(r => socket.join('srv-' + r.server_id));
        });
    }

    // `user_joined` payload is ignored — identity always comes from the token.
    socket.on('user_joined', () => {
        socket.join(socket.data.username);
        joinServerRooms();
        connectedUsers.set(socket.id, { username: socket.data.username, status: 'online' });
        broadcastActiveUsers();
    });

    // Re-sync server rooms after the user creates/joins a server in another tab.
    socket.on('refresh_servers', () => {
        joinServerRooms();
    });

    socket.on('chat_message', (msg) => {
        const { channel, text, image, ts, reply_to } = msg || {};
        if (typeof channel !== 'string') return;
        const author = socket.data.username;

        if (channel === 'admin-panel') {
            if (!socket.data.isAdmin) return;
            handleAdminCommand(text || '', socket);
            return;
        }

        if (channel.startsWith('dm:')) {
            insertAndBroadcast(msg, (savedMsg) => {
                // Auto-unhide conversation for everyone involved when a new message appears
                db.run(`DELETE FROM hidden_dms WHERE channel = ?`, [channel]);
                const participants = channel.split(':').slice(1);
                participants.forEach(user => io.to(user).emit('chat_message', savedMsg));
            });
            return;
        }

        // Server channel: require membership, scope the broadcast to the server room.
        db.get(`SELECT id, server_id FROM server_channels WHERE id = ?`, [channel], (err, ch) => {
            if (err || !ch) return;
            db.get(`SELECT 1 AS ok FROM server_members WHERE server_id = ? AND username = ?`, [ch.server_id, author], (err2, member) => {
                if (err2 || !member) return;
                insertAndBroadcast(msg, (savedMsg) => {
                    io.to('srv-' + ch.server_id).emit('chat_message', savedMsg);
                });
            });
        });
    });

    // Converts inline data-URL images to files, inserts, then broadcasts.
    // `msg` is passed through whole so client-supplied extras (e.g. tempId)
    // survive the round-trip for optimistic message replacement.
    function insertAndBroadcast(msg, broadcast) {
        const { channel, text, image, ts, reply_to } = msg || {};
        const author = socket.data.username;
        let storedImage = typeof image === 'string' ? image : null;
        if (storedImage && storedImage.startsWith('data:image/')) {
            storedImage = saveImage(storedImage, 'images');
            if (!storedImage) return; // drop messages with invalid images
        }
        db.run(
            `INSERT INTO messages (channel, author, text, image, ts, reply_to) VALUES (?, ?, ?, ?, ?, ?)`,
            [channel, author, text, storedImage, ts, reply_to || null],
            function(err) {
                if (err) return;
                broadcast({ ...msg, image: storedImage, id: this.lastID, author });
            }
        );
    }

    async function handleAdminCommand(cmdText, socket) {
        const parts = cmdText.trim().split(/\s+/);
        const action = (parts[0] || '').toLowerCase();
        const sub = (parts[1] || '').toLowerCase();
        let log = `> ${cmdText}\n`;
        const tail = (n) => parts.slice(n).join(' ').trim();
        const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
        const isOn = (v) => ['on', 'true', 'yes', '1', 'public'].includes((v || '').toLowerCase());
        const reply = (msg) => sendSystemResponse(log + msg, socket);
        const done = (msg) => { log += msg; sendSystemResponse(log, socket); };

        if (action === 'help' || (action === 'list' && sub === 'commands')) {
            reply(ADMIN_HELP);
            return;
        }

        // --- reads -----------------------------------------------------------
        if (action === 'list' && sub === 'users') {
            db.all("SELECT username, is_admin FROM users", (err, rows) => {
                reply((rows || []).map(r => `${r.is_admin ? '[ADM]' : '[USR]'} ${r.username}`).join('\n') || 'no users');
            });
        }
        else if (action === 'list' && sub === 'admins') {
            db.all("SELECT username FROM users WHERE is_admin = 1", (err, rows) => {
                reply((rows || []).map(r => `[ADM] ${r.username}`).join('\n') || 'no admins');
            });
        }
        else if (action === 'list' && sub === 'servers') {
            db.all(`SELECT s.id, s.name, s.owner, s.is_public,
                           (SELECT COUNT(*) FROM server_members m WHERE m.server_id = s.id) AS members,
                           (SELECT COUNT(*) FROM server_channels c WHERE c.server_id = s.id) AS channels
                    FROM servers s ORDER BY s.id`, (err, rows) => {
                if (!rows || !rows.length) return reply('no servers');
                reply(rows.map(r => `#${r.id} "${r.name}" owner=${r.owner} ${r.is_public ? '[public]' : '[private]'} · ${r.members} member(s), ${r.channels} channel(s)`).join('\n'));
            });
        }
        else if (action === 'list' && sub === 'channels') {
            const sid = num(parts[2]);
            const q = sid ? "SELECT id, server_id, name FROM server_channels WHERE server_id = ? ORDER BY sort, id" : "SELECT id, server_id, name FROM server_channels ORDER BY server_id, sort, id";
            db.all(q, sid ? [sid] : [], (err, rows) => {
                if (!rows || !rows.length) return reply('no channels');
                reply(rows.map(r => `srv#${r.server_id} ch#${r.id} #${r.name}`).join('\n'));
            });
        }
        else if (action === 'list' && sub === 'members') {
            const sid = num(parts[2]);
            if (!sid) return reply('usage: list members [serverId]');
            db.all("SELECT username, joined_at FROM server_members WHERE server_id = ? ORDER BY joined_at", [sid], (err, rows) => {
                reply((rows || []).map(r => r.username).join('\n') || 'no members');
            });
        }
        else if (action === 'list' && sub === 'dms') {
            db.all("SELECT DISTINCT channel FROM messages WHERE channel LIKE 'dm:%' ORDER BY channel", (err, rows) => {
                reply((rows || []).map(r => r.channel).join('\n') || 'no dm channels');
            });
        }
        else if (action === 'online') {
            const seen = {};
            for (const [, info] of connectedUsers) seen[info.username] = info.status || 'online';
            const names = Object.keys(seen);
            reply(names.length ? names.map(n => `${n} (${seen[n]})`).join('\n') : 'nobody online');
        }
        else if (action === 'count' && sub === 'messages') {
            const chan = parts[2];
            db.get(chan ? "SELECT COUNT(*) as c FROM messages WHERE channel = ?" : "SELECT COUNT(*) as c FROM messages", chan ? [chan] : [], (err, row) => {
                reply(`count [${chan || 'all'}]: ${row ? row.c : 0}`);
            });
        }

        // --- users -----------------------------------------------------------
        else if (action === 'adduser') {
            if (!parts[1] || !parts[2]) return reply('usage: adduser [username] [password]');
            const hash = await bcrypt.hash(parts[2], 10);
            db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [parts[1], hash], (err) => {
                done(err ? `failed: ${err.message}` : `user ${parts[1]} created.`);
            });
        }
        else if (action === 'deleteuser') {
            const user = parts[1];
            if (!user) return reply('usage: deleteuser [username]');
            db.run("DELETE FROM users WHERE username = ?", [user], function() {
                db.run("DELETE FROM sessions WHERE username = ?", [user]);
                done(`user ${user} removed (${this.changes} row).`);
            });
        }
        else if (action === 'rename' && sub === 'user') {
            const from = parts[2], to = parts[3];
            if (!from || !to) return reply('usage: rename user [old] [new]');
            const steps = [
                ["UPDATE users SET username = ? WHERE username = ?", [to, from]],
                ["UPDATE messages SET author = ? WHERE author = ?", [to, from]],
                ["UPDATE server_members SET username = ? WHERE username = ?", [to, from]],
                ["UPDATE servers SET owner = ? WHERE owner = ?", [to, from]],
                ["UPDATE sessions SET username = ? WHERE username = ?", [to, from]],
                ["UPDATE reads SET username = ? WHERE username = ?", [to, from]],
                ["UPDATE friends SET requester = ? WHERE requester = ?", [to, from]],
                ["UPDATE friends SET target = ? WHERE target = ?", [to, from]]
            ];
            let i = 0;
            const runNext = () => {
                if (i >= steps.length) return done(`renamed ${from} -> ${to}.`);
                db.run(steps[i][0], steps[i][1], () => { i++; runNext(); });
            };
            runNext();
        }
        else if (action === 'set' && sub === 'admin') {
            const user = parts[2];
            if (!user) return reply('usage: set admin [username] [on|off]');
            db.run("UPDATE users SET is_admin = ? WHERE username = ?", [isOn(parts[3]) ? 1 : 0, user], function() {
                done(`${user} admin=${isOn(parts[3]) ? 'on' : 'off'}.`);
            });
        }
        else if (action === 'set' && sub === 'pass') {
            const user = parts[2], pass = parts[3];
            if (!user || !pass) return reply('usage: set pass [username] [password]');
            const hash = await bcrypt.hash(pass, 10);
            db.run("UPDATE users SET password_hash = ? WHERE username = ?", [hash, user], (err) => {
                done(err ? `failed: ${err.message}` : `password updated for ${user}.`);
            });
        }
        else if (action === 'testpass') {
            db.get("SELECT password_hash FROM users WHERE username = ?", [parts[1]], async (err, row) => {
                if (!row) return reply('user not found.');
                const match = await bcrypt.compare(parts[2] || '', row.password_hash);
                reply(`password for ${parts[1]}: ${match ? 'VALID' : 'INVALID'}`);
            });
        }
        else if (action === 'set' && sub === 'avatar') {
            const user = parts[2];
            const url = tail(3);
            if (!user) return reply('usage: set avatar [username] [imageUrl|none]');
            db.get("SELECT avatar FROM users WHERE username = ?", [user], (err, row) => {
                if (!row) return reply('user not found.');
                const next = (!url || url.toLowerCase() === 'none') ? null : url;
                if (next && !/^https?:\/\//i.test(next)) return reply('avatar must be an http(s) url or "none".');
                if (row.avatar) deleteImageByUrl(row.avatar);
                db.run("UPDATE users SET avatar = ? WHERE username = ?", [next, user], () => {
                    io.emit('avatar_update', { username: user, avatar: next });
                    done(`avatar set for ${user}.`);
                });
            });
        }
        else if (action === 'removepfp') {
            const user = parts[1];
            if (!user) return reply('usage: removepfp [username]');
            db.get("SELECT avatar FROM users WHERE username = ?", [user], (err, row) => {
                if (row && row.avatar) deleteImageByUrl(row.avatar);
                db.run("UPDATE users SET avatar = NULL WHERE username = ?", [user], () => {
                    io.emit('avatar_update', { username: user, avatar: null });
                    done(`avatar cleared for ${user}.`);
                });
            });
        }
        else if (action === 'set' && sub === 'status') {
            const user = parts[2], status = (parts[3] || 'online').toLowerCase();
            if (!user) return reply('usage: set status [username] [online|away|offline]');
            let touched = 0;
            for (const [, info] of connectedUsers) {
                if (info.username === user) { info.status = status; touched++; }
            }
            if (touched) broadcastActiveUsers();
            done(`${user} status=${status}${touched ? '' : ' (not connected)'}.`);
        }

        // --- servers & channels ---------------------------------------------
        else if (action === 'create' && sub === 'server') {
            const name = tail(2);
            if (!name) return reply('usage: create server [name]');
            const owner = socket.data.username;
            const code = generateServerCode();
            db.run(`INSERT INTO servers (name, avatar, owner, is_default, created_at, code) VALUES (?, NULL, ?, 0, ?, ?)`,
                [name, owner, Date.now(), code], function(err) {
                    if (err) return reply(`failed: ${err.message}`);
                    const sid = this.lastID;
                    db.run(`INSERT INTO server_channels (server_id, name, sort, created_at) VALUES (?, 'general', 0, ?)`, [sid, Date.now()]);
                    db.run(`INSERT OR IGNORE INTO server_members (server_id, username, joined_at) VALUES (?, ?, ?)`, [sid, owner, Date.now()]);
                    done(`created server #${sid} "${name}" (owner ${owner}).`);
                });
        }
        else if (action === 'create' && sub === 'channel') {
            const sid = num(parts[2]); const name = parts[3];
            if (!sid || !name) return reply('usage: create channel [serverId] [name]');
            db.run(`INSERT INTO server_channels (server_id, name, sort, created_at)
                    VALUES (?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM server_channels WHERE server_id = ?), ?)`,
                [sid, name, sid, Date.now()], function(err) {
                    if (err) return reply(`failed: ${err.message}`);
                    const channel = { id: this.lastID, name };
                    io.to('srv-' + sid).emit('channel_created', { serverId: sid, channel });
                    done(`created #${name} in srv#${sid}.`);
                });
        }
        else if (action === 'rename' && sub === 'server') {
            const sid = num(parts[2]); const name = tail(3);
            if (!sid || !name) return reply('usage: rename server [serverId] [name]');
            db.run("UPDATE servers SET name = ? WHERE id = ?", [name, sid], (err) => {
                if (err) return reply(`failed: ${err.message}`);
                getServerWithChannels(sid, (e, server) => {
                    if (server) io.to('srv-' + sid).emit('server_updated', { server });
                    done(`renamed srv#${sid} to "${name}".`);
                });
            });
        }
        else if (action === 'rename' && sub === 'channel') {
            const cid = num(parts[2]); const name = tail(3);
            if (!cid || !name) return reply('usage: rename channel [channelId] [name]');
            db.get("SELECT server_id FROM server_channels WHERE id = ?", [cid], (err, ch) => {
                if (!ch) return reply('channel not found.');
                db.run("UPDATE server_channels SET name = ? WHERE id = ?", [name, cid], () => {
                    io.to('srv-' + ch.server_id).emit('channel_renamed', { serverId: ch.server_id, channel: { id: cid, name } });
                    done(`renamed ch#${cid} to #${name}.`);
                });
            });
        }
        else if (action === 'set' && sub === 'owner') {
            const sid = num(parts[2]); const user = parts[3];
            if (!sid || !user) return reply('usage: set owner [serverId] [username]');
            db.run("UPDATE servers SET owner = ? WHERE id = ?", [user, sid], (err) => {
                if (err) return reply(`failed: ${err.message}`);
                db.run("INSERT OR IGNORE INTO server_members (server_id, username, joined_at) VALUES (?, ?, ?)",
                    [sid, user, Date.now()], function(insertErr) {
                        if (insertErr) return reply(`failed: ${insertErr.message}`);
                        if (this.changes > 0) {
                            io.to('srv-' + sid).emit('server_member_added', { serverId: sid, username: user });
                        }
                        getServerWithChannels(sid, (e, server) => {
                            if (server) io.to('srv-' + sid).emit('server_updated', { server });
                            done(`srv#${sid} owner = ${user}.`);
                        });
                });
            });
        }
        else if (action === 'set' && sub === 'public') {
            const sid = num(parts[2]);
            if (!sid) return reply('usage: set public [serverId] [on|off]');
            const pub = isOn(parts[3]) ? 1 : 0;
            db.run("UPDATE servers SET is_public = ? WHERE id = ?", [pub, sid], (err) => {
                if (err) return reply(`failed: ${err.message}`);
                getServerWithChannels(sid, (e, server) => {
                    if (server) io.to('srv-' + sid).emit('server_updated', { server });
                    done(`srv#${sid} public=${pub ? 'on' : 'off'}.`);
                });
            });
        }
        else if (action === 'set' && sub === 'servericon') {
            const sid = num(parts[2]); const url = tail(3);
            if (!sid) return reply('usage: set servericon [serverId] [imageUrl|none]');
            const next = (!url || url.toLowerCase() === 'none') ? null : url;
            if (next && !/^https?:\/\//i.test(next)) return reply('icon must be an http(s) url or "none".');
            db.get("SELECT avatar FROM servers WHERE id = ?", [sid], (err, srv) => {
                if (!srv) return reply('server not found.');
                if (srv.avatar) deleteImageByUrl(srv.avatar);
                db.run("UPDATE servers SET avatar = ? WHERE id = ?", [next, sid], () => {
                    getServerWithChannels(sid, (e, server) => {
                        if (server) io.to('srv-' + sid).emit('server_updated', { server });
                        done(`icon set for srv#${sid}.`);
                    });
                });
            });
        }
        else if (action === 'add' && sub === 'member') {
            const sid = num(parts[2]); const user = parts[3];
            if (!sid || !user) return reply('usage: add member [serverId] [username]');
            db.run("INSERT OR IGNORE INTO server_members (server_id, username, joined_at) VALUES (?, ?, ?)",
                [sid, user, Date.now()], function(err) {
                    if (err) return reply(`failed: ${err.message}`);
                    if (this.changes > 0) {
                        io.to('srv-' + sid).emit('server_member_added', { serverId: sid, username: user });
                    }
                    io.to(user).emit('friend_update');
                    done(`added ${user} to srv#${sid}.`);
            });
        }
        else if ((action === 'kick' && sub === 'member') || action === 'kick') {
            const sid = num(parts[2]); const user = parts[3];
            if (!sid || !user) return reply('usage: kick member [serverId] [username]');
            db.run("DELETE FROM server_members WHERE server_id = ? AND username = ?", [sid, user], () => {
                io.sockets.sockets.forEach(s => { if (s.data && s.data.username === user) s.leave('srv-' + sid); });
                io.to(user).emit('server_kicked', { serverId: sid });
                io.to('srv-' + sid).emit('server_member_removed', { serverId: sid, username: user });
                done(`kicked ${user} from srv#${sid}.`);
            });
        }
        else if (action === 'delete' && sub === 'server') {
            const sid = num(parts[2]);
            if (!sid) return reply('usage: delete server [serverId]');
            db.all("SELECT id FROM server_channels WHERE server_id = ?", [sid], (err, chans) => {
                const chIds = (chans || []).map(c => String(c.id));
                if (chIds.length) {
                    const ph = chIds.map(() => '?').join(',');
                    db.run(`DELETE FROM messages WHERE channel IN (${ph})`, chIds);
                }
                db.run("DELETE FROM server_channels WHERE server_id = ?", [sid]);
                db.run("DELETE FROM server_members WHERE server_id = ?", [sid]);
                db.run("DELETE FROM servers WHERE id = ?", [sid], () => {
                    io.to('srv-' + sid).emit('server_deleted', { serverId: sid });
                    io.emit('servers_cleared');
                    done(`deleted srv#${sid}.`);
                });
            });
        }
        else if (action === 'delete' && sub === 'channel') {
            const cid = num(parts[2]);
            if (!cid) return reply('usage: delete channel [channelId]');
            db.get("SELECT server_id FROM server_channels WHERE id = ?", [cid], (err, ch) => {
                if (!ch) return reply('channel not found.');
                db.run("DELETE FROM messages WHERE channel = ?", [String(cid)]);
                db.run("DELETE FROM server_channels WHERE id = ?", [cid], () => {
                    io.to('srv-' + ch.server_id).emit('channel_deleted', { serverId: ch.server_id, channelId: cid });
                    done(`deleted ch#${cid}.`);
                });
            });
        }

        // --- messages --------------------------------------------------------
        else if (action === 'delete' && sub === 'all') {
            db.run("DELETE FROM messages", () => {
                io.emit('message_deleted', { id: 'all', channel: 'all' });
                done("wiped all messages.");
            });
        }
        else if (action === 'delete' && sub === 'servers') {
            // No more default server — this wipes every server there is.
            db.all("SELECT id FROM servers", (err, rows) => {
                const ids = (rows || []).map(r => r.id);
                if (!ids.length) return reply('no servers to delete.');
                const ph = ids.map(() => '?').join(',');
                db.all(`SELECT id FROM server_channels WHERE server_id IN (${ph})`, ids, (e2, chans) => {
                    const chIds = (chans || []).map(c => String(c.id));
                    const steps = [];
                    if (chIds.length) {
                        const ph2 = chIds.map(() => '?').join(',');
                        steps.push(cb => db.run(`DELETE FROM messages WHERE channel IN (${ph2})`, chIds, cb));
                    }
                    steps.push(cb => db.run(`DELETE FROM server_channels WHERE server_id IN (${ph})`, ids, cb));
                    steps.push(cb => db.run(`DELETE FROM server_members WHERE server_id IN (${ph})`, ids, cb));
                    steps.push(cb => db.run(`DELETE FROM servers WHERE id IN (${ph})`, ids, cb));
                    const runNext = (i) => {
                        if (i >= steps.length) {
                            ids.forEach(id => io.to('srv-' + id).emit('server_deleted', { serverId: id }));
                            io.emit('servers_cleared');
                            return done(`deleted ${ids.length} server(s).`);
                        }
                        steps[i](() => runNext(i + 1));
                    };
                    runNext(0);
                });
            });
        }
        else if (action === 'delete' && sub === 'message') {
            const mid = num(parts[2]);
            if (!mid) return reply('usage: delete message [id]');
            db.get("SELECT channel FROM messages WHERE id = ?", [mid], (err, row) => {
                if (!row) return reply('message not found.');
                db.run("DELETE FROM messages WHERE id = ?", [mid], () => {
                    withinChannel(row.channel, 'message_deleted', { id: mid, channel: row.channel });
                    done(`deleted message #${mid}.`);
                });
            });
        }
        else if (action === 'clear' && sub === 'channel') {
            const chan = parts[2];
            if (!chan) return reply('usage: clear channel [channel]');
            db.run("DELETE FROM messages WHERE channel = ?", [chan], function() {
                withinChannel(chan, 'message_deleted', { id: 'all', channel: chan });
                done(`cleared ${this.changes} message(s) in ${chan}.`);
            });
        }
        else if (action === 'purge' && sub === 'user') {
            const user = parts[2];
            if (!user) return reply('usage: purge user [username]');
            db.run("DELETE FROM messages WHERE author = ?", [user], function() {
                io.emit('messages_purged', { author: user });
                done(`purged ${this.changes} message(s) by ${user}. Refresh suggested.`);
            });
        }
        else if (action === 'edit' && sub === 'message') {
            const mid = num(parts[2]); const text = tail(3);
            if (!mid || !text) return reply('usage: edit message [id] [new text]');
            db.get("SELECT channel FROM messages WHERE id = ?", [mid], (err, row) => {
                if (!row) return reply('message not found.');
                db.run("UPDATE messages SET text = ?, edited = 1 WHERE id = ?", [text, mid], () => {
                    withinChannel(row.channel, 'message_edited', { id: mid, channel: row.channel, newText: text });
                    done(`edited message #${mid}.`);
                });
            });
        }
        else if (action === 'delete' && parts[1] && !sub.startsWith('server') && !sub.startsWith('channel') && !sub.startsWith('message') && !['all', 'servers'].includes(sub)) {
            // legacy: delete [num] [channel]
            const count = num(parts[1]);
            const chan = parts[2];
            if (!count || !chan) return reply('usage: delete [num] [channel] (or: delete message|channel|server|all|servers)');
            db.run("DELETE FROM messages WHERE id IN (SELECT id FROM messages WHERE channel = ? ORDER BY ts DESC LIMIT ?)", [chan, count], function() {
                done(`deleted ${this.changes} message(s) from ${chan}.`);
            });
        }

        // --- send ------------------------------------------------------------
        else if (action === 'say') {
            const chan = parts[1]; const text = tail(2);
            if (!chan || !text) return reply('usage: say [channel] [text]');
            const msg = { channel: chan, author: 'SYSTEM', text, ts: Date.now() };
            db.run(`INSERT INTO messages (channel, author, text, image, ts, reply_to) VALUES (?, 'SYSTEM', ?, NULL, ?, NULL)`,
                [chan, text, msg.ts], function(err) {
                    if (err) return reply(`failed: ${err.message}`);
                    const saved = { ...msg, id: this.lastID };
                    if (chan.startsWith('dm:')) {
                        chan.split(':').slice(1).forEach(u => io.to(u).emit('chat_message', saved));
                    } else if (chan === 'admin-panel') {
                        socket.emit('chat_message', saved);
                    } else {
                        io.to('srv-' + chan).emit('chat_message', saved);
                        withinChannel(chan, 'chat_message', saved);
                    }
                    done(`sent to ${chan}.`);
                });
        }
        else if (action === 'broadcast') {
            const text = tail(1);
            if (!text) return reply('usage: broadcast [text]');
            db.all("SELECT id, server_id FROM server_channels", (err, rows) => {
                if (err || !rows || !rows.length) return reply('no channels to broadcast to.');
                const ts = Date.now();
                let pending = rows.length;
                rows.forEach(r => {
                    db.run(`INSERT INTO messages (channel, author, text, image, ts, reply_to) VALUES (?, 'SYSTEM', ?, NULL, ?, NULL)`,
                        [String(r.id), text, ts], function() {
                            const saved = { channel: String(r.id), author: 'SYSTEM', text, ts, id: this.lastID };
                            io.to('srv-' + r.server_id).emit('chat_message', saved);
                            if (--pending === 0) done(`broadcast to ${rows.length} channel(s).`);
                        });
                });
            });
        }
        else {
            sendSystemResponse(log + "Unknown command. Type `help` for the command key.", socket);
        }
    }

    // SYSTEM replies go ONLY to the requesting socket, not the whole room.
    function sendSystemResponse(txt, socket) {
        socket.emit('chat_message', { id: Date.now(), channel: 'admin-panel', author: 'SYSTEM', text: txt, ts: Date.now() });
    }

    // Emits `event` only to the sockets that can actually see this channel.
    function withinChannel(channel, event, payload) {
        if (channel.startsWith('dm:')) {
            const participants = channel.split(':').slice(1);
            participants.forEach(user => io.to(user).emit(event, payload));
            return;
        }
        // Server channel: broadcast to the server room (members only).
        db.get(`SELECT server_id FROM server_channels WHERE id = ?`, [channel], (err, ch) => {
            if (err || !ch) return;
            io.to('srv-' + ch.server_id).emit(event, payload);
        });
    }

    socket.on('edit_message', (data) => {
        const { id, channel, newText } = data || {};
        const author = socket.data.username;
        const isAdmin = socket.data.isAdmin;
        const query = isAdmin ? `UPDATE messages SET text = ?, edited = 1 WHERE id = ?` : `UPDATE messages SET text = ?, edited = 1 WHERE id = ? AND author = ?`;
        const params = isAdmin ? [newText, id] : [newText, id, author];
        db.run(query, params, function(err) {
            if (this.changes > 0) withinChannel(channel, 'message_edited', { id, channel, newText });
        });
    });

    socket.on('delete_message', (data) => {
        const { id, channel } = data || {};
        const author = socket.data.username;
        const isAdmin = socket.data.isAdmin;
        const query = isAdmin ? `DELETE FROM messages WHERE id = ?` : `DELETE FROM messages WHERE id = ? AND author = ?`;

        db.run(query, isAdmin ? [id] : [id, author], function(err) {
            if (this.changes > 0) withinChannel(channel, 'message_deleted', { id, channel });
        });
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        broadcastActiveUsers();
    });

    function broadcastActiveUsers() {
        const uniqueMap = {};
        for (let [id, socketInfo] of connectedUsers) {
            if (!uniqueMap[socketInfo.username] || socketInfo.status === 'online') {
                uniqueMap[socketInfo.username] = socketInfo.status;
            }
        }
        io.emit('active_users', uniqueMap);
    }

    socket.on('update_status', (status) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            user.status = status;
            broadcastActiveUsers();
        }
    });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));