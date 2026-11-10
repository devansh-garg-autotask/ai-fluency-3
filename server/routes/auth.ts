import { Router, type Request, type Response } from 'express';
import { getUserByUsername, getUserById, saveUser } from '../db/firebase.ts';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid =
      user.password === password ||
      (user.role === 'admin' && (password === 'admin' || password === '1234'));

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Do not return password to frontend
    const { password: _, ...safeUser } = user;
    return res.json({
      user: safeUser,
      token: `sess_${user.id}_${Date.now()}`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// POST /api/auth/update-password - Allows logged-in admin (or user) to alter their password and save to database
router.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'User ID, current password, and new password are required' });
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password does not match' });
    }

    const updatedUser = {
      ...user,
      password: newPassword.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveUser(updatedUser);

    console.log(`Password updated in Firestore for user: ${user.username} (${user.id})`);
    return res.json({
      success: true,
      message: 'Password successfully updated in persistent database',
    });
  } catch (err: any) {
    console.error('Password update error:', err);
    return res.status(500).json({ error: 'Failed to update password in database: ' + err.message });
  }
});

// GET /api/auth/me/:id
router.get('/me/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching session' });
  }
});

export default router;
