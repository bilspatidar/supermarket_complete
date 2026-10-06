import authService from '../services/authService.js';
import reportService from '../services/reportService.js';

export async function login(req, res) {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile and password are required' });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.loginWithPassword({ mobile, password, ipAddress, userAgent });
    return res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function requestOtp(req, res) {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    const result = await authService.requestOtp(mobile);
    return res.json({ success: true, message: result.message });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { mobile, otp, name } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.verifyOtpAndLogin({ mobile, otp, name, ipAddress, userAgent });
    return res.json({
      success: true,
      message: 'Authentication successful',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function register(req, res) {
  try {
    const { mobile, password, name, email, dob, anniversaryDate } = req.body;
    if (!mobile || !name) {
      return res.status(400).json({ success: false, message: 'Mobile and Name are required' });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.register({
      mobile,
      password: password || 'customer123',
      name,
      email,
      dob,
      anniversaryDate,
      ipAddress,
    });
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome bonus credited.',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const meta = await authService.getUserRolesAndPermissions(req.user.id);
    const stats = await reportService.getCustomerStats(req.user.id);
    return res.json({
      success: true,
      data: {
        user: req.user,
        roles: meta.roles,
        permissions: meta.permissions,
        destination: meta.destination,
        stats,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const updated = await authService.updateCustomerProfile(req.user.id, req.body);
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminCorrectPersonalData(req, res) {
  try {
    const { customerId, dob, anniversaryDate, reason } = req.body;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const updated = await authService.adminCorrectPersonalData({
      adminUserId: req.user.id,
      customerId,
      dob,
      anniversaryDate,
      reason: reason || 'Customer support request',
      ipAddress,
    });
    return res.json({
      success: true,
      message: 'Personal data corrected and audit logged',
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  login,
  requestOtp,
  verifyOtp,
  register,
  getMe,
  updateProfile,
  adminCorrectPersonalData,
};
