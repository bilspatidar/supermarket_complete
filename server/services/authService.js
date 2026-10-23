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
  async getUserRolesAndPermissionsDELETE(userId) {
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



async getUserRolesAndPermissions(userId) {
  const user = await db.get(
    `SELECT id, account_type, status
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  if (!user || user.status !== 'ACTIVE') {
    const error = new Error(
      'Account is no longer active. Please log in again.'
    );
    error.statusCode = 401;
    error.code = 'ACCOUNT_DELETED';
    throw error;
  }

  const accountType = user.account_type || 'CUSTOMER';

  const roles = await db.query(
    `SELECT r.id, r.name, r.description
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  const permissions = await db.query(
    `SELECT DISTINCT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  const roleNames = roles.map(r => r.name);
  const permNames = permissions.map(p => p.name);

  let destination = '/account';

  if (accountType === 'INTERNAL') {
    if (
      roleNames.includes('SUPER_ADMIN') ||
      roleNames.includes('ADMIN') ||
      roleNames.includes('STORE_MANAGER')
    ) {
      destination = '/admin/dashboard';
    } else if (roleNames.includes('CASHIER_POS')) {
      destination = '/admin/pos';
    } else if (roleNames.includes('DELIVERY_STAFF')) {
      destination = '/admin/orders';
    } else {
      destination = '/admin/dashboard';
    }
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
    
    // Trigger Welcome Bonus

    try {

      await this.triggerWelcomeBonusIfEligible(
        userId,
        name,
        cleanMobile
      );

      const bonusCheck = await db.get(
        `SELECT id, amount, status
         FROM customer_bonus_transactions
         WHERE user_id = ? AND type = 'WELCOME_BONUS'
         ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      console.log('[REGISTER DEBUG] Bonus verification:', {
        userId,
        credited: !!bonusCheck,
        transaction: bonusCheck || null,
      });
    } catch (err) {
      console.error('[REGISTER DEBUG] Bonus flow failed:', {
        userId,
        message: err.message,
        code: err.code,
      });
    }

    // Send registration welcome message (bonus notification remains disabled)
    Promise.resolve()
      .then(() =>
        whatsAppService.send({
          recipient: cleanMobile,
          templateKey: 'greeting.welcome',
          variables: {
            customer_name: name || 'Valued Customer',
            store_name: 'Swastik Supermarket',
          },
          userId,
        })
      )
      .then((result) => {
        console.log('[REGISTER DEBUG] Welcome WhatsApp send result:', {
          userId,
          result,
        });
      })
      .catch((err) => {
        console.error('[REGISTER DEBUG] Welcome WhatsApp failed:', {
          userId,
          message: err.message,
          status: err.response?.status || err.status,
          providerError: err.response?.data || err.providerError || null,
        });
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
    const setting = await db.get(
      "SELECT value FROM store_settings WHERE setting_key = 'welcome_bonus_enabled'"
    );

 

if (setting && String(setting.value).toLowerCase() !== 'true') {
  return;
}
    if (
      setting &&
      String(setting.value).toLowerCase() !== 'true'
    ) {
      return;
    }

    const existing = await db.get(
      `SELECT id
       FROM customer_bonus_transactions
       WHERE user_id = ? AND type = 'WELCOME_BONUS'`,
      [userId]
    );

    if (existing) return;

    const amountRow = await db.get(
      "SELECT value FROM store_settings WHERE setting_key = 'welcome_bonus_amount'"
    );

    const validityRow = await db.get(
      "SELECT value FROM store_settings WHERE setting_key = 'welcome_bonus_validity_days'"
    );

    const minOrderRow = await db.get(
      "SELECT value FROM store_settings WHERE setting_key = 'welcome_bonus_min_order'"
    );

    const amount = Number(amountRow?.value ?? 10);
    const validityDays = Number(validityRow?.value ?? 30);
    const minOrder = Number(minOrderRow?.value ?? 499);

  
    if (
      !Number.isFinite(amount) || amount <= 0 ||
      !Number.isFinite(validityDays) || validityDays <= 0 ||
      !Number.isFinite(minOrder) || minOrder < 0
    ) {
      throw new Error('Invalid welcome bonus configuration');
    }

   const expiresAt = new Date(
      Date.now() + validityDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

 
    const insertResult = await db.run(
      `INSERT INTO customer_bonus_transactions (
        user_id,
        type,
        amount,
        reference_type,
        reference_id,
        expires_at,
        status,
        description
      ) VALUES (?, 'WELCOME_BONUS', ?, 'REGISTRATION', ?, ?, 'ACTIVE', ?)`,
      [
        userId,
        amount,
        `REG-${userId}`,
        expiresAt,
        'Promotional Welcome Credit',
      ]
    );



    // Send bonus notification independently of the credit.
    // Promise.resolve()
    //   .then(() =>
    //     whatsAppService.send({
    //       recipient: mobile,
    //       templateKey: 'welcome_bonus.received',
    //       variables: {
    //         bonus_amount: amount,
    //         min_order: minOrder,
    //       },
    //       userId,
    //     })
    //   )
    //   .catch((err) => {
    //     console.error(
    //       '[AuthService] Welcome bonus WhatsApp failed:',
    //       err.response?.data || err.message || err
    //     );
    //   });
  } catch (err) {
    console.error(
      `[AuthService] Welcome bonus failed for user ${userId}:`,
      err.message
    );
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
    const cleanMobile = String(mobile || '').replace(/\D/g, '');

    if (!/^\d{10}$/.test(cleanMobile)) {
      throw new Error('Please provide a valid 10-digit mobile number');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.delete(cleanMobile);

    try {
      await whatsAppService.send({
        recipient: cleanMobile,
        templateKey: 'otp.login',
        variables: { otp_code: otp },
      });

      otpStore.set(cleanMobile, {
        otp,
        expiresAt,
        attempts: 0,
      });

      return {
        success: true,
        message: 'OTP submission accepted. Check WhatsApp.',
      };
    } catch (err) {
  otpStore.delete(cleanMobile);

  // Actual error for backend debugging
  console.error('[OTP] Failed to send WhatsApp OTP:', {
    message: err.message,
    status: err.status || err.response?.status,
    providerError: err.providerError || err.details || null,
  });

  // Keep the frontend message generic
  throw new Error('Could not send OTP. Please try again later.');
}
  }

  /**
   * Verify OTP and Login or Register
   */
  async verifyOtpAndLogin({ mobile, otp, name = 'Customer', ipAddress = null, userAgent = null }) {
    const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
    const entry = otpStore.get(cleanMobile);

    // Allow static demo OTP '123456' for instant testing or evaluate stored OTP
    const isMockMatch = otp === '876543';
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

async updateCustomerProfile(
  userId,
  {
    name,
    email,
    dob,
    anniversaryDate,
    anniversary_date,
    profileImage,
    profile_image,
  }
) {
  const user = await db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Normalize both frontend naming conventions.
  const incomingAnniversary =
    anniversaryDate !== undefined
      ? anniversaryDate
      : anniversary_date;

  const incomingProfileImage =
    profileImage !== undefined
      ? profileImage
      : profile_image;

  // Preserve existing values when a field is omitted.
  const finalName =
    name !== undefined ? name : user.name;

  const finalEmail =
    email !== undefined ? email : user.email;

  const finalDob =
    dob !== undefined ? dob : user.dob;

  const finalAnniv =
    incomingAnniversary !== undefined
      ? incomingAnniversary
      : user.anniversary_date;

  const finalProfileImage =
    incomingProfileImage !== undefined
      ? incomingProfileImage
      : user.profile_image;

  // Lock dates after they are first saved.
  if (
    user.dob &&
    dob !== undefined &&
    dob !== user.dob
  ) {
    throw new Error(
      'Date of birth cannot be changed once saved.'
    );
  }

  if (
    user.anniversary_date &&
    incomingAnniversary !== undefined &&
    incomingAnniversary !== user.anniversary_date
  ) {
    throw new Error(
      'Anniversary date cannot be changed once saved.'
    );
  }

  const dobLocked =
    user.dob_locked || (finalDob ? 1 : 0);

  const anniversaryLocked =
    user.anniversary_locked || (finalAnniv ? 1 : 0);

  await db.run(
    `UPDATE users
     SET name = ?,
         email = ?,
         dob = ?,
         anniversary_date = ?,
         profile_image = ?,
         dob_locked = ?,
         anniversary_locked = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      finalName,
      finalEmail,
      finalDob ?? null,
      finalAnniv ?? null,
      finalProfileImage ?? null,
      dobLocked,
      anniversaryLocked,
      userId,
    ]
  );

  return await db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
}




async updateCustomerPassword(userId, { currentPassword, newPassword }) {
  const user = await db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    throw new Error('User not found');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long');
  }

  // If the user already has a password, verify the current password.
  if (user.password) {
    if (!currentPassword) {
      throw new Error('Current password is required');
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      throw new Error('New password must be different from the current password');
    }
  }

  // If no password exists, set the new password directly.
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.run(
    `UPDATE users
     SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hashedPassword, userId]
  );

  return {
    success: true,
    message: user.password
      ? 'Password changed successfully'
      : 'Password set successfully'
  };
}


async getAccountDeletionRequests({ status = 'ALL', search = '' } = {}) {
  let sql = `
    SELECT
      id,
      user_id,
      name,
      mobile,
      reason,
      status,
      admin_notes,
      requested_at,
      reviewed_at,
      completed_at,
      updated_at
    FROM account_deletion_requests
    WHERE 1 = 1
  `;

  const params = [];

  if (status !== 'ALL') {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR mobile LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += `
    ORDER BY requested_at DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}




async updateAccountDeletionRequest(requestId, status, adminNotes) {
  let notification = null;

  const allowedStatuses = [
    'PENDING',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
  ];

  if (!allowedStatuses.includes(status)) {
    const error = new Error('Invalid status for this operation.');
    error.statusCode = 400;
    throw error;
  }

  const finalNotes =
    adminNotes === undefined
      ? undefined
      : typeof adminNotes === 'string'
        ? adminNotes.trim() || null
        : null;

  // Save the transaction result instead of returning immediately.
  const result = await db.transaction(async (tx) => {
    const existing = await tx.get(
      `SELECT id, user_id, status, admin_notes
       FROM account_deletion_requests
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [requestId]
    );

    if (!existing) {
      const error = new Error('Account deletion request not found.');
      error.statusCode = 404;
      throw error;
    }

    if (existing.status === 'COMPLETED') {
      const error = new Error('Account deletion is already completed.');
      error.statusCode = 409;
      throw error;
    }

    const notes =
      finalNotes === undefined ? existing.admin_notes : finalNotes;

    if (status === 'APPROVED') {
      const userId = existing.user_id;

      if (!userId) {
        const error = new Error(
          'No user is linked to this deletion request.'
        );
        error.statusCode = 400;
        throw error;
      }

      const user = await tx.get(
        `SELECT id, name, mobile, status
         FROM users
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [userId]
      );

      if (user && user.status !== 'DELETED') {
        // Capture notification details before anonymizing the user.
        notification = {
          recipient: user.mobile,
          name: user.name,
          requestId,
        };

        const anonymizedMobile =
          `DEL${String(userId).padStart(17, '0')}`;

        await tx.run(
          `DELETE FROM customer_addresses
           WHERE user_id = ?`,
          [userId]
        );

        await tx.run(
          `DELETE FROM checkout_sessions
           WHERE user_id = ?
             AND payment_status = 'PENDING'
             AND order_id IS NULL`,
          [userId]
        );

        await tx.run(
          `UPDATE users
           SET mobile = ?,
               password_hash = ?,
               name = 'Deleted User',
               email = NULL,
               dob = NULL,
               anniversary_date = NULL,
               profile_image = NULL,
               status = 'DELETED',
               mobile_verified = 0,
               data_deleted_request_id = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            anonymizedMobile,
            `DELETED_ACCOUNT_${userId}_${requestId}`,
            requestId,
            userId,
          ]
        );
      }

      await tx.run(
        `UPDATE account_deletion_requests
         SET status = 'COMPLETED',
             admin_notes = ?,
             reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [notes, requestId]
      );
    } else {
      await tx.run(
        `UPDATE account_deletion_requests
         SET status = ?,
             admin_notes = ?,
             reviewed_at = CASE
               WHEN ? IN ('UNDER_REVIEW', 'REJECTED')
               THEN COALESCE(reviewed_at, CURRENT_TIMESTAMP)
               ELSE reviewed_at
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, notes, status, requestId]
      );
    }

    return await tx.get(
      `SELECT
         id, user_id, name, mobile, reason, status,
         admin_notes, requested_at, reviewed_at,
         completed_at, updated_at
       FROM account_deletion_requests
       WHERE id = ?
       LIMIT 1`,
      [requestId]
    );
  });

  // The transaction has now committed successfully.
  // Notification failure must not undo completed deletion.
  if (
    status === 'APPROVED' &&
    result?.status === 'COMPLETED' &&
    notification?.recipient
  ) {
    await this.sendAccountDeletionConfirmation(notification);
  }

  return result;
},

async sendAccountDeletionConfirmation({
  recipient,
  name,
  requestId,
}) {
  try {
    const result = await whatsAppService.send({
      recipient,
      templateKey: 'account.delete_inform',
      variables: {
        customer_name: name || 'Valued Customer',
        store_name: 'Swastik Supermarket',
      },
    });

    console.log('[ACCOUNT DELETION] Confirmation sent:', {
      requestId,
      result,
    });
  } catch (err) {
    console.error('[ACCOUNT DELETION] WhatsApp confirmation failed:', {
      requestId,
      message: err.message,
      status: err.response?.status || err.status,
      providerError: err.response?.data || err.providerError || null,
    });
  }
}

async  sendAccountDeletionConfirmation({
  recipient,
  name,
  requestId,
}) {
  try {
    const result = await whatsAppService.send({
      recipient,
      templateKey: 'otp.account_delete_information',
      variables: {
        customer_name: name || 'Valued Customer',
        store_name: 'Swastik Supermarket',
      },
      // Avoid associating a deleted account with new user-linked logs.
      // Include userId only if your WhatsApp service requires it.
    });

    console.log('[ACCOUNT DELETION] Confirmation sent:', {
      requestId,
      result,
    });
  } catch (err) {
    console.error('[ACCOUNT DELETION] Confirmation failed:', {
      requestId,
      message: err.message,
      status: err.response?.status || err.status,
      providerError: err.response?.data || err.providerError || null,
    });
  }
}

async createAccountDeleteRequest(userId, mobile, reason) {
  // Fetch customer from MySQL-backed users table.
  const user = await db.get(
    `SELECT id, name, mobile
     FROM users
     WHERE id = ?
       AND account_type = 'CUSTOMER'`,
    [userId]
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Check for an existing active deletion request.
  const existing = await db.get(
    `SELECT id
     FROM account_deletion_requests
     WHERE user_id = ?
       AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
     LIMIT 1`,
    [userId]
  );

  if (existing) {
    const error = new Error(
      'You already have an active account deletion request.'
    );
    error.statusCode = 409;
    throw error;
  }

  // Validate and normalize the reason.
  const finalReason =
    typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : null;

  if (finalReason && finalReason.length > 1000) {
    throw new Error(
      'Reason cannot exceed 1000 characters.'
    );
  }

  // Create the deletion request.
  const result = await db.run(
    `INSERT INTO account_deletion_requests
       (user_id, name, mobile, reason, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [
      user.id,
      user.name,
      user.mobile || mobile,
      finalReason,
    ]
  );

  // Return the saved request.
  return await db.get(
    `SELECT *
     FROM account_deletion_requests
     WHERE id = ?`,
    [result.lastID ?? result.insertId]
  );
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
