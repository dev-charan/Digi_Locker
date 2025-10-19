
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendSuspiciousLoginEmail } from '../utils/mail.js';
import { rateLimit } from '../utils/rateLimit.js';
import { verifyToken } from '../middleware/token.js';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must be 8+ chars, include uppercase and number' });
  }

  try {
    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verified: false,
      },
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.id);

    res.status(201).json({ message: 'User created, verification email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    await prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });
    res.json({ message: 'Email verified' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

router.post('/login', rateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Log login activity
    const ip = req.ip;
    const device = req.headers['user-agent'];
    let city, country;
    try {
      const response = await fetch('https://ipapi.co/json/');
      const geo = await response.json();
      city = geo.city;
      country = geo.country_name;
    } catch (error) {
      city = 'Unknown';
      country = 'Unknown';
    }

    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ip,
        device,
        city,
        country,
      },
    });

    // Check for suspicious login
    const lastLog = await prisma.loginLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: 1, // Skip the just-created log
    });
    if (lastLog && lastLog.ip !== ip) {
      await sendSuspiciousLoginEmail(user.email, ip, device, city, country);
    }

    res.json({ accessToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    // Verify token in DB
    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, expiresAt: { gt: new Date() }, revoked: false },
    });
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate new tokens
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    const newAccessToken = jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    await sendVerificationEmail(
      user.email,
      user.id,
      resetUrl,
      "Password Reset",
      '<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 15 minutes.</p>'
    );

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password required' });
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must be 8+ chars, include uppercase and number' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: decoded.userId } });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.get('/dashboard', verifyToken, async (req, res) => {
  res.json({ message: `Welcome user ${req.user.userId}` });
});

export default router;
