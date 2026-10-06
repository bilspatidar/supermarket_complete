import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../../database/connection.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';

// In-memory OTP cache for demo/fast development: mobile -> { otp, expiresAt }
const otpStore = new Map();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_ACCESS_SECRET || 'supermarket_jwt_access_secret_production_key_2026_xyz';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Helper to load user's roles and permissions
   */
  async getUserRolesAndPermissions(userId) {
    const user = await db.get('SELECT id, account_type FROM users WHERE id = ?', [userId]);
    const accountType = user?.account_type || 'CUSTOMER';

    const roles = await db.query(
      `SELECT r.id, r.name, r.description FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [userId]
    );

    const permissions = await db.query(
      `SELECT DISTINCT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?`,
      [userId]
    );

    const roleNames = roles.map(r => r.name);
    const permNames = permissions.map(p => p.name);

    // Determine target redirect destination strictly based on account_type
    let destination = '/account';
    if (accountType === 'INTERNAL') {
      if (roleNames.includes('SUPER_ADMIN') || roleNames.includes('ADMIN') || roleNames.includes('STORE_MANAGER')) {
        destination = '/admin/dashboard';
      } else if (roleNames.includes('CASHIER_POS')) {
        destination = '/admin/pos';
      } else if (roleNames.includes('DELIVERY_STAFF')) {
        destination = '/admin/orders';
      } else {
        destination = '/admin/dashboard';
      }
    } else {
      destination = '/account';
    }

    return {
      roles: roleNames,
      permissions: permNames,
      destination,
      account_type: accountType,
    };
  }

  /**
   * Generate JWT Token
   */
  generateToken(user, meta) {
    return jwt.sign(
      {
        id: user.id,
        uuid: user.uuid,
        mobile: user.mobile,
        name: user.name,
        account_type: user.account_type || meta.account_type || 'CUSTOMER',
        roles: meta.roles,
        permissions: meta.permissions,
        destination: meta.destination,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  /**
   * Register a new Customer
   */
  async register({ mobile, password, name, email = null, dob = null, anniversaryDate = null, ipAddress = null }) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Valid 10-digit mobile number is required');
    }

    const existing = await db.get('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (existing) {
      throw new Error('An account with this mobile number already exists');
    }

    const passwordHash = await bcrypt.hash(password || 'guest123', 10);
    const userUuid = crypto.randomUUID();
    const dobLocked = dob ? 1 : 0;
    const annivLocked = anniversaryDate ? 1 : 0;

    const res = await db.run(
      `INSERT INTO users (
        uuid, mobile, password_hash, name, email, account_type, dob, anniversary_date,
        status, mobile_verified, dob_locked, anniversary_locked
      ) VALUES (?, ?, ?, ?, ?, 'CUSTOMER', ?, ?, 'ACTIVE', 1, ?, ?)`,
      [userUuid, cleanMobile, passwordHash, name, email, dob || null, anniversaryDate || null, dobLocked, annivLocked]
    );

    const userId = res.lastInsertRowid;

    // Assign CUSTOMER role
    const custRole = await db.get("SELECT id FROM roles WHERE name = 'CUSTOMER'");
    if (custRole) {
      await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, custRole.id]);
    }

    // Trigger Welcome Bonus (Promotional Account Credit)
    await this.triggerWelcomeBonusIfEligible(userId, name, cleanMobile);

    // Asynchronously send Welcome greeting message
    whatsAppService.send({
      recipient: cleanMobile,
      templateKey: 'greeting.welcome',
      variables: { customer_name: name },
      userId,
    });

    // Record login history
    await db.run(
      "INSERT INTO login_history (user_id, ip_address, status) VALUES (?, ?, 'SUCCESS')",
      [userId, ipAddress || '127.0.0.1']
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const meta = await this.getUserRolesAndPermissions(userId);
    const token = this.generateToken(user, meta);

    return { user, token, meta };
  }

  /**
   * Create customer directly from In-House POS register
   */
  async createCustomerFromPos({ name, mobile, email = null }) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Valid 10-digit customer mobile is required');
    }

    const existing = await db.get('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);
    if (existing) {
      if (existing.account_type === 'INTERNAL') {
        throw new Error('This mobile belongs to an internal staff account and cannot be used as customer.');
      }
      return existing;
    }

    const passwordHash = await bcrypt.hash('pos123', 10);
    const userUuid = crypto.randomUUID();

    const res = await db.run(
      `INSERT INTO users (
        uuid, mobile, password_hash, name, email, account_type,
        status, mobile_verified, dob_locked, anniversary_locked
      ) VALUES (?, ?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', 1, 0, 0)`,
      [userUuid, cleanMobile, passwordHash, name, email || null]
    );

    const userId = res.lastInsertRowid;
    const custRole = await db.get("SELECT id FROM roles WHERE name = 'CUSTOMER'");
    if (custRole) {
      await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, custRole.id]);
    }

    await this.triggerWelcomeBonusIfEligible(userId, name, cleanMobile);

    return await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  }

  /**
   * Trigger Welcome Bonus (Promotional Credit) idempotently
   */
  async triggerWelcomeBonusIfEligible(userId, customerName, mobile) {
    try {
      const setting = await db.get("SELECT value FROM store_settings WHERE key = 'welcome_bonus_enabled'");
      if (setting?.value === 'false') return;

      // Idempotency: verify user hasn't received welcome bonus already
      const existing = await db.get(
        "SELECT id FROM customer_bonus_transactions WHERE user_id = ? AND type = 'WELCOME_BONUS'",
        [userId]
      );
      if (existing) return;

      const amountRow = await db.get("SELECT value FROM store_settings WHERE key = 'welcome_bonus_amount'");
      const validityRow = await db.get("SELECT value FROM store_settings WHERE key = 'welcome_bonus_validity_days'");
      const minOrderRow = await db.get("SELECT value FROM store_settings WHERE key = 'welcome_bonus_min_order'");

      const amount = Number(amountRow?.value || 100);
      const validityDays = Number(validityRow?.value || 30);
      const minOrder = Number(minOrderRow?.value || 499);

      const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

      await db.run(
        `INSERT INTO customer_bonus_transactions (
          user_id, type, amount, reference_type, reference_id, expires_at, status, description
        ) VALUES (?, 'WELCOME_BONUS', ?, 'REGISTRATION', ?, ?, 'ACTIVE', 'Promotional Welcome Credit')`,
        [userId, amount, `REG-${userId}`, expiresAt]
      );

      // WhatsApp notification for bonus received
      whatsAppService.send({
        recipient: mobile,
        templateKey: 'welcome_bonus.received',
        variables: {
          bonus_amount: amount,
          min_order: minOrder,
        },
        userId,
      });
    } catch (err) {
      console.error('[AuthService] Welcome bonus error:', err.message);
    }
  }

  /**
   * Authenticate via Mobile + Password
   */
  async loginWithPassword({ mobile, password, ipAddress = null, userAgent = null }) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    const user = await db.get('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);

    if (!user) {
      throw new Error('Invalid mobile number or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error(`Account is ${user.status.toLowerCase()}. Please contact store support.`);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await db.run(
        "INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, 'FAILED')",
        [user.id, ipAddress, userAgent]
      );
      throw new Error('Invalid mobile number or password');
    }

    // Update last login
    await db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    await db.run(
      "INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, 'SUCCESS')",
      [user.id, ipAddress, userAgent]
    );

    const meta = await this.getUserRolesAndPermissions(user.id);
    const token = this.generateToken(user, meta);

    return { user, token, meta };
  }

  /**
   * Request Login / Registration OTP via WhatsApp
   */
  async requestOtp(mobile) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanMobile, { otp, expiresAt });

    // Send OTP via centralized WhatsApp service
    await whatsAppService.send({
      recipient: cleanMobile,
      templateKey: 'otp.login',
      variables: { otp_code: otp },
    });

    return { success: true, message: 'OTP sent successfully to your WhatsApp' };
  }

  /**
   * Verify OTP and Login or Register
   */
  async verifyOtpAndLogin({ mobile, otp, name = 'Customer', ipAddress = null, userAgent = null }) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    const entry = otpStore.get(cleanMobile);

    // Allow static demo OTP '123456' for instant testing or evaluate stored OTP
    const isMockMatch = otp === '123456';
    const isStoreMatch = entry && entry.otp === otp && entry.expiresAt > Date.now();

    if (!isMockMatch && !isStoreMatch) {
      throw new Error('Invalid or expired OTP');
    }

    // Clear used OTP
    otpStore.delete(cleanMobile);

    let user = await db.get('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);

    if (!user) {
      // Auto-register customer if not existing
      const res = await this.register({
        mobile: cleanMobile,
        password: `otp_${Date.now()}`,
        name: name || 'Customer',
        ipAddress,
      });
      return res;
    }

    if (user.status !== 'ACTIVE') {
      throw new Error(`Account is ${user.status.toLowerCase()}.`);
    }

    await db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    await db.run(
      "INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, 'SUCCESS')",
      [user.id, ipAddress, userAgent]
    );

    const meta = await this.getUserRolesAndPermissions(user.id);
    const token = this.generateToken(user, meta);

    return { user, token, meta };
  }

  /**
   * Customer Profile Update - Strictly enforces DOB & Anniversary LOCK
   */
  async updateCustomerProfile(userId, { name, email, dob, anniversaryDate, profileImage }) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    // CHECK DOB LOCK
    let finalDob = user.dob;
    let dobLocked = user.dob_locked;
    if (dob && dob !== user.dob) {
      if (user.dob_locked) {
        throw new Error('Date of Birth is set once and cannot be modified. Contact store admin for corrections.');
      }
      finalDob = dob;
      dobLocked = 1;
    }

    // CHECK ANNIVERSARY LOCK
    let finalAnniv = user.anniversary_date;
    let annivLocked = user.anniversary_locked;
    if (anniversaryDate && anniversaryDate !== user.anniversary_date) {
      if (user.anniversary_locked) {
        throw new Error('Anniversary date is set once and cannot be modified. Contact store admin for corrections.');
      }
      finalAnniv = anniversaryDate;
      annivLocked = 1;
    }

    await db.run(
      `UPDATE users 
       SET name = ?, email = ?, dob = ?, anniversary_date = ?, profile_image = ?,
           dob_locked = ?, anniversary_locked = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || user.name,
        email !== undefined ? email : user.email,
        finalDob,
        finalAnniv,
        profileImage || user.profile_image,
        dobLocked,
        annivLocked,
        userId,
      ]
    );

    return await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  }

  /**
   * Admin / Staff DOB & Anniversary Correction with Mandatory Audit Log
   */
  async adminCorrectPersonalData({ adminUserId, customerId, dob, anniversaryDate, reason = 'Customer request', ipAddress = null }) {
    const customer = await db.get('SELECT * FROM users WHERE id = ?', [customerId]);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const oldValues = {
      dob: customer.dob,
      anniversary_date: customer.anniversary_date,
      dob_locked: customer.dob_locked,
      anniversary_locked: customer.anniversary_locked,
    };

    const newDob = dob !== undefined ? dob : customer.dob;
    const newAnniv = anniversaryDate !== undefined ? anniversaryDate : customer.anniversary_date;

    await db.run(
      `UPDATE users 
       SET dob = ?, anniversary_date = ?, dob_locked = 1, anniversary_locked = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newDob, newAnniv, customerId]
    );

    const newValues = {
      dob: newDob,
      anniversary_date: newAnniv,
      reason,
    };

    // Create Audit Log
    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, notes)
       VALUES (?, 'CUSTOMERS_CORRECT_PERSONAL_DATA', 'USER', ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        String(customerId),
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
        ipAddress || '127.0.0.1',
        reason,
      ]
    );

    return await db.get('SELECT * FROM users WHERE id = ?', [customerId]);
  }
}

export default new AuthService();
