import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(authenticateToken as any);
usersRouter.use(requireRole(['admin']) as any);

// Get all users
usersRouter.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users').all();
  
  // Attach permissions to each user
  const permissions = db.prepare('SELECT * FROM user_permissions').all();
  const usersWithPermissions = users.map((u: any) => {
    u.permissions = permissions.filter((p: any) => p.user_id === u.id);
    return u;
  });
  
  res.json(usersWithPermissions);
});

// Create a new user
usersRouter.post('/', (req: AuthRequest, res) => {
  const { username, password, role, permissions } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password and role are required' });
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    
    db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
      `).run(username, passwordHash, role);
      
      const userId = result.lastInsertRowid;
      
      if (permissions && Array.isArray(permissions)) {
        const insertPerm = db.prepare(`
          INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const p of permissions) {
          insertPerm.run(userId, p.module, p.can_view ? 1 : 0, p.can_create ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0);
        }
      }

      logAudit(req.user!.id, 'CREATE', 'user', userId as number, `Created user ${username} with role ${role}`);
      res.status(201).json({ id: userId, username, role });
    })();
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user role and permissions
usersRouter.put('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role, permissions } = req.body;

  if (!role || !['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    db.transaction(() => {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
      if (!user) throw new Error('User not found');

      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
      
      if (permissions && Array.isArray(permissions)) {
        // Delete existing permissions
        db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(id);
        
        // Insert new permissions
        const insertPerm = db.prepare(`
          INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const p of permissions) {
          insertPerm.run(id, p.module, p.can_view ? 1 : 0, p.can_create ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0);
        }
      }
      
      logAudit(req.user!.id, 'UPDATE', 'user', Number(id), `Updated role and permissions for ${user.username}`);
    })();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
usersRouter.put('/:id/password', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
    
    logAudit(req.user!.id, 'UPDATE', 'user', Number(id), `Reset password for ${user.username}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
usersRouter.delete('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  if (Number(id) === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    logAudit(req.user!.id, 'DELETE', 'user', Number(id), `Deleted user ${user.username}`);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      res.status(400).json({ error: 'Cannot delete user because they are referenced in transactions or orders.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
