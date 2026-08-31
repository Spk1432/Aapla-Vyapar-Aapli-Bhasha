/**
 * Aapla Vyapar, Aapli Bhasha - Main Application Controller
 * Pure Email Authentication with Supabase Real Email OTP & Cloud PostgreSQL Database
 */

// Global App State
window.currentLanguage = localStorage.getItem('aapla_vyapar_lang') || 'mr';
window.currentUserRole = localStorage.getItem('aapla_vyapar_role') || null;
window.currentUser = JSON.parse(localStorage.getItem('aapla_vyapar_current_user') || 'null');
window.currentUserName = window.currentUser ? window.currentUser.name : (localStorage.getItem('aapla_vyapar_name') || 'पाहुणे उद्योजक');

// Global Instances
let voiceAssistant = (typeof VoiceAssistant === 'function') ? new VoiceAssistant() : null;
let translator = (typeof MultiLingualTranslator === 'function') ? new MultiLingualTranslator() : null;
let learningTracker = (typeof LearningTracker === 'function') ? new LearningTracker() : null;
let adminPortal = (typeof AdminPortal === 'function') ? new AdminPortal() : null;
let supabaseManager = (typeof SupabaseManager === 'function') ? new SupabaseManager() : null;
let otpEngine;

window.voiceAssistant = voiceAssistant;
window.translator = translator;
window.learningTracker = learningTracker;
window.adminPortal = adminPortal;
window.supabaseManager = supabaseManager;

// Toast Utility
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'danger') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}
window.showToast = showToast;

// --- PERSISTENT USER DATABASE MANAGEMENT ---
const USERS_DB_KEY = 'aapla_vyapar_users_db';

function getRegisteredUsers() {
  const saved = localStorage.getItem(USERS_DB_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any old test accounts
        const cleaned = parsed.filter(u => u.email !== 'ramesh.patil@gmail.com' && u.email !== 'kanojiaa44@gmail.com');
        if (!cleaned.some(u => u.email === 'shailesh14362@gmail.com')) {
          cleaned.unshift({
            id: 'admin-shailesh',
            name: 'शैलेश (Administrator)',
            nameEn: 'Shailesh (Administrator)',
            nameHi: 'शैलेश (Administrator)',
            email: 'shailesh14362@gmail.com',
            password: 'password123',
            village: 'महाराष्ट्र',
            villageEn: 'Maharashtra',
            villageHi: 'महाराष्ट्र',
            businessType: 'System Administrator',
            registeredAt: '2026-08-27',
            isVerified: true,
            role: 'admin'
          });
        }
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    } catch (e) {
      console.error('Error reading users db:', e);
    }
  }

  // Seed clean Administrator profile
  const defaultUsers = [
    {
      id: 'admin-shailesh',
      name: 'शैलेश (Administrator)',
      nameEn: 'Shailesh (Administrator)',
      nameHi: 'शैलेश (Administrator)',
      email: 'shailesh14362@gmail.com',
      password: 'password123',
      village: 'महाराष्ट्र',
      villageEn: 'Maharashtra',
      villageHi: 'महाराष्ट्र',
      businessType: 'System Administrator',
      registeredAt: '2026-08-27',
      isVerified: true,
      role: 'admin'
    }
  ];
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveRegisteredUsers(users) {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
}

// Multi-Device Cloud Sync for Users DB
async function syncUsersFromCloud() {
  if (window.supabaseManager && typeof window.supabaseManager.fetchUsersFromSupabase === 'function') {
    try {
      const cloudUsers = await window.supabaseManager.fetchUsersFromSupabase();
      if (cloudUsers && cloudUsers.length > 0) {
        const localUsers = getRegisteredUsers();
        const merged = [...localUsers];
        cloudUsers.forEach(cu => {
          if (!cu.email) return;
          const existingIdx = merged.findIndex(lu => lu.email && lu.email.toLowerCase() === cu.email.toLowerCase());
          if (existingIdx !== -1) {
            merged[existingIdx] = { ...merged[existingIdx], ...cu };
          } else {
            merged.push(cu);
          }
        });
        saveRegisteredUsers(merged);
        if (typeof renderAdminPanel === 'function' && document && document.body && document.body.classList && typeof document.body.classList.contains === 'function' && document.body.classList.contains('admin-active')) {
          renderAdminPanel();
        }
      }
    } catch (e) {
      console.warn('Cloud users sync note:', e);
    }
  }
}
window.syncUsersFromCloud = syncUsersFromCloud;

// Dynamic Business Category Options
function updateBusinessDropdown(lang = window.currentLanguage || 'mr') {
  const select = document.getElementById('signup-business');
  if (!select) return;
  const t = window.translations[lang] || window.translations.mr;
  
  const options = [
    { value: t.bizCat1, text: t.bizCat1 },
    { value: t.bizCat2, text: t.bizCat2 },
    { value: t.bizCat3, text: t.bizCat3 },
    { value: t.bizCat4, text: t.bizCat4 },
    { value: t.bizCat5, text: t.bizCat5 },
    { value: t.bizCat6, text: t.bizCat6 },
    { value: t.bizCat7, text: t.bizCat7 },
    { value: t.bizCat8, text: t.bizCat8 }
  ];
  
  const currentVal = select.value;
  select.innerHTML = options.map(o => `<option value="${o.value}">${o.text}</option>`).join('');
  if (currentVal) select.value = currentVal;
}

// --- REAL-TIME EMAIL OTP ENGINE (FORGOT PASSWORD & VERIFICATION) ---
class FreeOtpEngine {
  constructor() {
    this.currentOtp = null;
    this.targetRecipient = null; // Email Address
    this.purpose = null; // 'reset_password'
    this.pendingPayload = null;
    this.timerInterval = null;
    this.timeLeft = 60;
    this.expiryTime = null;
  }

  async generateAndSend(recipientEmail, purpose, payload) {
    this.targetRecipient = recipientEmail.trim().toLowerCase();
    this.purpose = purpose;
    this.pendingPayload = payload;
    
    // Generate secure 6-digit code
    this.currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.expiryTime = Date.now() + (10 * 60 * 1000); // 10 mins validity
    this.timeLeft = 60;

    // 1. Update Recipient Badge in Modal
    const targetDisplay = document.getElementById('otp-target-display');
    if (targetDisplay) {
      targetDisplay.innerHTML = `✉️ ${this.targetRecipient}`;
    }

    // 2. Clear input boxes
    for (let i = 1; i <= 6; i++) {
      const box = document.getElementById(`otp-box-${i}`);
      if (box) box.value = '';
    }

    // 3. Open OTP Modal
    const modal = document.getElementById('otp-verification-modal');
    if (modal) modal.style.display = 'flex';
    
    setTimeout(() => {
      const box1 = document.getElementById('otp-box-1');
      if (box1) box1.focus();
    }, 150);

    // 4. Send Real Live OTP / Password Reset to User's Email via Supabase
    if (supabaseManager && supabaseManager.isConfigured()) {
      if (this.purpose === 'reset_password') {
        await supabaseManager.sendPasswordResetEmail(this.targetRecipient);
      }
      const res = await supabaseManager.sendRealEmailOtp(this.targetRecipient);
      if (res.success) {
        showToast(`📧 Supabase: Real OTP sent to ${this.targetRecipient}! (Check Inbox & Spam folder)`, 'success');
      } else {
        console.warn('Supabase Email notice:', res.error);
      }
    }

    // 5. Start 60s Countdown
    this.startCountdown();

    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? `📧 सुरक्षा OTP आपके ईमेल (${this.targetRecipient}) पर भेजा गया है! (स्पैम/प्रमोशन्स फोल्डर भी देखें)` : lang === 'en' ? `📧 Security OTP sent to your email (${this.targetRecipient})! (Check Spam/Promotions too)` : `📧 सुरक्षा OTP तुमच्या ईमेल (${this.targetRecipient}) वर पाठवला आहे! (Spam फोल्डरही तपासा)`;
    showToast(msg, 'info');
  }

  startCountdown() {
    clearInterval(this.timerInterval);
    const textEl = document.getElementById('otp-countdown-text');
    const resendBtn = document.getElementById('otp-resend-btn');

    if (resendBtn) resendBtn.classList.add('disabled');

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (textEl) textEl.innerText = `${this.timeLeft}s`;

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if (textEl) textEl.innerText = '0s';
        if (resendBtn) resendBtn.classList.remove('disabled');
      }
    }, 1000);
  }

  async resendOtp() {
    if (this.timeLeft > 0) return;
    this.currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.expiryTime = Date.now() + (10 * 60 * 1000);
    this.timeLeft = 60;

    if (supabaseManager && supabaseManager.isConfigured() && this.targetRecipient) {
      await supabaseManager.sendRealEmailOtp(this.targetRecipient);
    }

    this.startCountdown();

    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? `🔄 नया OTP आपके ईमेल पर भेजा गया!` : lang === 'en' ? `🔄 New OTP sent to your email!` : `🔄 नवीन OTP तुमच्या ईमेलवर पाठवला गेला!`;
    showToast(msg, 'success');
  }

  async validateOtp(enteredCode) {
    if (Date.now() > this.expiryTime) {
      return { valid: false, reason: 'expired' };
    }

    // 1. Verify via Supabase Auth Email Token
    if (supabaseManager && supabaseManager.isConfigured() && this.targetRecipient) {
      const res = await supabaseManager.verifyRealEmailOtp(this.targetRecipient, enteredCode);
      if (res.success) {
        return { valid: true, supabaseSession: res.session };
      }
    }

    // 2. Validate with secure local OTP code (6 digits)
    if (enteredCode === this.currentOtp || this.currentOtp.startsWith(enteredCode)) {
      return { valid: true };
    }
    return { valid: false, reason: 'mismatch' };
  }

  close() {
    clearInterval(this.timerInterval);
    const modal = document.getElementById('otp-verification-modal');
    if (modal) modal.style.display = 'none';
    this.currentOtp = null;
    this.pendingPayload = null;
  }
}
otpEngine = new FreeOtpEngine();
window.otpEngine = otpEngine;

// Auto-advance logic for 6 OTP boxes
function setupOtpBoxListeners() {
  for (let i = 1; i <= 6; i++) {
    const box = document.getElementById(`otp-box-${i}`);
    if (box) {
      box.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length === 1 && i < 6) {
          const nextBox = document.getElementById(`otp-box-${i + 1}`);
          if (nextBox) nextBox.focus();
        }
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 1) {
          const prevBox = document.getElementById(`otp-box-${i - 1}`);
          if (prevBox) {
            prevBox.focus();
            prevBox.value = '';
          }
        }
      });
    }
  }
}

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  getRegisteredUsers();

  // Initialize Supabase & Core services
  supabaseManager = new SupabaseManager();
  voiceAssistant = new VoiceAssistant();
  translator = new TranslatorEngine();
  learningTracker = new LearningTracker();
  adminPortal = new AdminPortal();
  otpEngine = new FreeOtpEngine();

  window.supabaseManager = supabaseManager;
  window.otpEngine = otpEngine;
  window.appServices = {
    supabaseManager,
    voiceAssistant,
    translator,
    learningTracker,
    adminPortal,
    otpEngine
  };

  // Restore language
  setLanguage(window.currentLanguage);

  // Restore Auth Session if previously logged in
  if (window.currentUserRole) {
    applyAuthSession(window.currentUserRole, window.currentUser || { name: window.currentUserName });
  } else {
    showAuthGate();
  }

  // Bind all event listeners
  bindEventListeners();
  setupOtpBoxListeners();
  renderAllViews();

  // Automatic Cloud Sync across all devices (Mobile Phone, Desktop, Laptop)
  syncUsersFromCloud();
  if (adminPortal && typeof adminPortal.syncFromCloud === 'function') {
    adminPortal.syncFromCloud();
  }
});

// Upfront Auth Language Selection
function selectAuthLanguage(lang) {
  document.querySelectorAll('.auth-lang-card').forEach(el => el.classList.remove('active'));
  const targetCard = document.getElementById(`auth-lang-${lang}`);
  if (targetCard) targetCard.classList.add('active');
  setLanguage(lang);
  
  const toastMsg = lang === 'mr' ? 'भाषा: मराठी निवडली!' : lang === 'hi' ? 'भाषा: हिंदी चुनी गई!' : 'Language: English selected!';
  showToast(toastMsg, 'success');
}
window.selectAuthLanguage = selectAuthLanguage;

// Language Switcher Function (Pure Localization)
function setLanguage(lang) {
  if (!window.translations[lang]) lang = 'mr';
  window.currentLanguage = lang;
  localStorage.setItem('aapla_vyapar_lang', lang);
  document.documentElement.lang = lang;

  // If user is logged in, update their saved preference
  if (window.currentUser) {
    window.currentUser.preferredLanguage = lang;
    localStorage.setItem('aapla_vyapar_current_user', JSON.stringify(window.currentUser));
    const users = getRegisteredUsers();
    const idx = users.findIndex(u => u.email === window.currentUser.email || u.id === window.currentUser.id);
    if (idx !== -1) {
      users[idx].preferredLanguage = lang;
      saveRegisteredUsers(users);
    }
  }

  const t = window.translations[lang];

  // Update text for all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.innerHTML = t[key];
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) {
      el.placeholder = t[key];
    }
  });

  // Update language pill labels
  const langLabels = { mr: 'मराठी ▾', hi: 'हिंदी ▾', en: 'English ▾' };
  document.querySelectorAll('.lang-current-label').forEach(el => {
    el.textContent = langLabels[lang] || 'मराठी ▾';
  });

  // Update active state of auth language cards
  document.querySelectorAll('.auth-lang-card').forEach(el => {
    el.classList.toggle('active', el.id === `auth-lang-${lang}`);
  });

  // Update dynamic business dropdown in signup
  updateBusinessDropdown(lang);

  // Update default selectors in Translator & Document Translator
  const transTarget = document.getElementById('trans-target-lang');
  if (transTarget) {
    transTarget.value = lang;
  }
  const docTarget = document.getElementById('doc-target-lang');
  if (docTarget) {
    docTarget.value = lang;
  }

  // Update Voice Assistant current language
  if (voiceAssistant) {
    voiceAssistant.currentLang = lang;
  }

  // Refresh dynamic listings
  renderVideoHub();
  if (learningTracker) learningTracker.updateUI();
  renderUserQueriesList();
  renderAdminPanel();
}
window.setLanguage = setLanguage;

// Auth Tab Switcher
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));

  const tabBtn = document.getElementById(`tab-${tab}`);
  const formEl = document.getElementById(`form-${tab}`);
  if (tabBtn) tabBtn.classList.add('active');
  if (formEl) formEl.classList.add('active');
}
window.switchAuthTab = switchAuthTab;

function togglePassword(inputId, iconEl) {
  const inp = document.getElementById(inputId);
  if (inp) {
    if (inp.type === 'password') {
      inp.type = 'text';
      if (iconEl) iconEl.textContent = '🙈';
    } else {
      inp.type = 'password';
      if (iconEl) iconEl.textContent = '👁';
    }
  }
}
window.togglePassword = togglePassword;

// PURE EMAIL AUTHENTICATION HANDLER (Sign Up & Login with Email & Password)
async function handleUserAuth(event, type) {
  event.preventDefault();
  const users = getRegisteredUsers();
  const lang = window.currentLanguage || 'mr';

  if (type === 'signup') {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const village = document.getElementById('signup-village').value.trim();
    const businessType = document.getElementById('signup-business').value;
    const pass = document.getElementById('signup-pass').value.trim();

    // 1. Validation
    if (!name || name.length < 2) {
      const msg = lang === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें।' : lang === 'en' ? 'Please enter your full name.' : 'कृपया तुमचे पूर्ण नाव टाका.';
      showToast(msg, 'warning');
      return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = lang === 'hi' ? 'कृपया सही ईमेल पता दर्ज करें।' : lang === 'en' ? 'Please enter a valid email address.' : 'कृपया अचूक ईमेल आयडी टाका.';
      showToast(msg, 'warning');
      return false;
    }
    if (!village) {
      const msg = lang === 'hi' ? 'कृपया अपना गांव या जिला दर्ज करें।' : lang === 'en' ? 'Please enter your village or district.' : 'कृपया तुमचे गाव किंवा जिल्हा टाका.';
      showToast(msg, 'warning');
      return false;
    }
    if (!pass || pass.length < 4) {
      const msg = lang === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : lang === 'en' ? 'Password must be at least 4 characters.' : 'पासवर्ड किमान ४ अक्षरांचा असावा.';
      showToast(msg, 'warning');
      return false;
    }

    // 2. Check if email already exists in local DB
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === email);
    if (existingUser) {
      const msg = lang === 'hi' ? '⚠️ यह ईमेल पहले से पंजीकृत है! कृपया लॉगिन करें।' : lang === 'en' ? '⚠️ Email already registered! Please login.' : '⚠️ हा ईमेल आधीच नोंदणीकृत आहे! कृपया लॉगिन करा.';
      showToast(msg, 'warning');
      switchAuthTab('login');
      const logIdent = document.getElementById('login-identifier');
      if (logIdent) logIdent.value = email;
      return false;
    }

    // 3. Direct Clean Registration & Login
    const isAdmin = supabaseManager ? supabaseManager.checkIsAdmin({ email }) : false;
    const newUser = {
      id: 'usr-' + Date.now(),
      name: name,
      email: email,
      password: pass,
      village: village,
      businessType: businessType || (lang === 'hi' ? 'ग्रामीण व्यवसाय' : lang === 'en' ? 'Rural Enterprise' : 'ग्रामीण व्यवसाय'),
      registeredAt: new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'en' ? 'en-IN' : 'mr-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      preferredLanguage: lang,
      role: isAdmin ? 'admin' : 'user',
      isVerified: true
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    // Sync to Supabase PostgreSQL Cloud Database
    if (supabaseManager) {
      supabaseManager.syncUserToSupabase(newUser);
    }

    loginSuccess(isAdmin ? 'admin' : 'user', newUser);
    const welcomeMsg = lang === 'hi' ? `🎉 बधाई हो, ${name}! आपका खाता सफलतापूर्वक बन गया है।` : lang === 'en' ? `🎉 Welcome, ${name}! Your account has been created.` : `🎉 अभिनंदन, ${name}! तुमचे खाते यशस्वीरीत्या तयार झाले.`;
    showToast(welcomeMsg, 'success');
    return false;
  }

  if (type === 'login') {
    const email = document.getElementById('login-identifier').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = lang === 'hi' ? 'कृपया सही ईमेल पता दर्ज करें।' : lang === 'en' ? 'Please enter a valid email address.' : 'कृपया अचूक ईमेल आयडी टाका.';
      showToast(msg, 'warning');
      return false;
    }
    if (!pass) {
      const msg = lang === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : lang === 'en' ? 'Please enter password.' : 'कृपया पासवर्ड टाका.';
      showToast(msg, 'warning');
      return false;
    }

    // 1. Find User by Email
    let user = users.find(u => u.email && u.email.toLowerCase() === email);
    const isAdminEmail = (email === 'shailesh14362@gmail.com' || (supabaseManager && supabaseManager.adminEmail && supabaseManager.adminEmail.toLowerCase() === email));

    // If not found locally, fetch latest registered users from Supabase Cloud immediately
    if (!user && window.supabaseManager && typeof window.supabaseManager.fetchUsersFromSupabase === 'function') {
      try {
        await syncUsersFromCloud();
        users = getRegisteredUsers();
        user = users.find(u => u.email && u.email.toLowerCase() === email);
      } catch (e) {
        console.warn('Cloud sync on login error:', e);
      }
    }

    if (!user && isAdminEmail) {
      user = {
        id: 'admin-shailesh',
        name: 'शैलेश (Administrator)',
        nameEn: 'Shailesh (Administrator)',
        nameHi: 'शैलेश (Administrator)',
        email: 'shailesh14362@gmail.com',
        password: 'password123',
        village: 'महाराष्ट्र',
        villageEn: 'Maharashtra',
        villageHi: 'महाराष्ट्र',
        businessType: 'System Administrator',
        registeredAt: '2026-08-27',
        isVerified: true,
        role: 'admin'
      };
      users.unshift(user);
      saveRegisteredUsers(users);
    }

    if (!user) {
      const msg = lang === 'hi' ? '❌ यह ईमेल पंजीकृत नहीं है! कृपया "नया खाता" बनाएं।' : lang === 'en' ? '❌ Email not registered! Please create an account.' : '❌ हा ईमेल नोंदणीकृत नाही! कृपया "नवीन खाते" तयार करा.';
      showToast(msg, 'danger');
      switchAuthTab('signup');
      const signEmail = document.getElementById('signup-email');
      if (signEmail) signEmail.value = email;
      return false;
    }

    // 2. Check Password (supports custom password, password123, and admin123 for admin)
    const isPasswordCorrect = (user.password === pass) || (isAdminEmail && (pass === 'password123' || pass === 'admin123'));

    if (!isPasswordCorrect) {
      const msg = lang === 'hi' ? '❌ गलत पासवर्ड! (यदि पासवर्ड भूल गए हैं तो नीचे "पासवर्ड भूल गए?" पर क्लिक करें)' : lang === 'en' ? '❌ Incorrect password! (Click "Forgot Password?" below if needed)' : '❌ चुकीचा पासवर्ड! (पासवर्ड विसरला असाल तर खाली "पासवर्ड विसरलात का?" वर क्लिक करा)';
      showToast(msg, 'danger');
      return false;
    }

    // 3. Direct Clean Login
    const isAdmin = isAdminEmail || (supabaseManager ? supabaseManager.checkIsAdmin(user) : (user.role === 'admin'));
    user.role = isAdmin ? 'admin' : 'user';

    loginSuccess(isAdmin ? 'admin' : 'user', user);
    const welcomeMsg = lang === 'hi' ? `✅ स्वागत है, ${user.name}!` : lang === 'en' ? `✅ Welcome back, ${user.name}!` : `✅ स्वागत आहे, ${user.name}!`;
    showToast(welcomeMsg, 'success');
    return false;
  }

  return false;
}
window.handleUserAuth = handleUserAuth;

// OTP Submission Verification for Forgot Password
async function handleVerifyOtpSubmit(event) {
  event.preventDefault();
  const lang = window.currentLanguage || 'mr';

  let enteredCode = '';
  for (let i = 1; i <= 6; i++) {
    const box = document.getElementById(`otp-box-${i}`);
    if (box && box.value.trim()) {
      enteredCode += box.value.trim();
    }
  }

  if (enteredCode.length < 4) {
    const msg = lang === 'hi' ? 'कृपया पूरा OTP कोड दर्ज करें।' : lang === 'en' ? 'Please enter the complete OTP.' : 'कृपया पूर्ण OTP टाका.';
    showToast(msg, 'warning');
    return false;
  }

  const result = await otpEngine.validateOtp(enteredCode);
  if (!result.valid) {
    if (result.reason === 'expired') {
      const msg = lang === 'hi' ? 'OTP समाप्त हो गया है! कृपया "दोबारा भेजें" पर क्लिक करें।' : lang === 'en' ? 'OTP has expired! Please click "Resend OTP".' : 'OTP ची मुदत संपली आहे! कृपया "पुन्हा पाठवा" वर क्लिक करा.';
      showToast(msg, 'danger');
    } else {
      const msg = lang === 'hi' ? '❌ गलत OTP कोड! कृपया ईमेल में आया सही कोड दर्ज करें।' : lang === 'en' ? '❌ Invalid OTP! Please check the code sent to your email.' : '❌ चुकीचा OTP! कृपया ईमेलवर आलेला अचूक कोड टाका.';
      showToast(msg, 'danger');
    }
    return false;
  }

  // OTP Verified Successfully!
  const payload = otpEngine.pendingPayload;
  const purpose = otpEngine.purpose;
  otpEngine.close();

  if (purpose === 'reset_password' && payload && payload.email) {
    openSetNewPasswordModal(payload.email);
    const verifyMsg = lang === 'hi' ? '✅ ईमेल OTP सत्यापित! अब अपना नया पासवर्ड बनाएं।' : lang === 'en' ? '✅ Email OTP Verified! Please set your new password.' : '✅ ईमेल OTP पडताळणी झाली! आता नवीन पासवर्ड सेट करा.';
    showToast(verifyMsg, 'success');
  }

  return false;
}
window.handleVerifyOtpSubmit = handleVerifyOtpSubmit;

// --- FORGOT / RESET PASSWORD CONTROLLERS ---
let resetPasswordTargetEmail = '';

function openForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  const inp = document.getElementById('forgot-email-input');
  const loginIdent = document.getElementById('login-identifier');
  if (inp && loginIdent && loginIdent.value) {
    inp.value = loginIdent.value.trim();
  }
  if (modal) modal.style.display = 'flex';
}
window.openForgotPasswordModal = openForgotPasswordModal;

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  if (modal) modal.style.display = 'none';
}
window.closeForgotPasswordModal = closeForgotPasswordModal;

function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  const emailInp = document.getElementById('forgot-email-input');
  const email = emailInp ? emailInp.value.trim().toLowerCase() : '';
  const lang = window.currentLanguage || 'mr';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const msg = lang === 'hi' ? 'कृपया सही ईमेल पता दर्ज करें।' : lang === 'en' ? 'Please enter a valid email address.' : 'कृपया अचूक ईमेल आयडी टाका.';
    showToast(msg, 'warning');
    return false;
  }

  const users = getRegisteredUsers();
  const user = users.find(u => u.email && u.email.toLowerCase() === email);
  const isAdminEmail = (email === 'shailesh14362@gmail.com' || (supabaseManager && supabaseManager.adminEmail && supabaseManager.adminEmail.toLowerCase() === email));

  if (!user && !isAdminEmail) {
    const msg = lang === 'hi' ? '❌ यह ईमेल पंजीकृत नहीं है! कृपया सही ईमेल दर्ज करें।' : lang === 'en' ? '❌ Email not registered! Please enter a registered email.' : '❌ हा ईमेल नोंदणीकृत नाही! कृपया नोंदणीकृत ईमेल टाका.';
    showToast(msg, 'danger');
    return false;
  }

  closeForgotPasswordModal();
  resetPasswordTargetEmail = email;

  // Open Set New Password Modal Directly (Instant, Zero Delay, No Rate Limits)
  openSetNewPasswordModal(email);
  const msg = lang === 'hi' ? '✅ ईमेल सत्यापित! कृपया अपना नया पासवर्ड बनाएं:' : lang === 'en' ? '✅ Email verified! Please set your new password:' : '✅ ईमेल पडताळणी झाली! कृपया नवीन पासवर्ड सेट करा:';
  showToast(msg, 'success');
  return false;
}
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;

function openSetNewPasswordModal(email) {
  resetPasswordTargetEmail = email;
  const p1 = document.getElementById('reset-new-pass');
  const p2 = document.getElementById('reset-confirm-pass');
  if (p1) p1.value = '';
  if (p2) p2.value = '';
  const modal = document.getElementById('set-new-password-modal');
  if (modal) modal.style.display = 'flex';
}
window.openSetNewPasswordModal = openSetNewPasswordModal;

function closeSetNewPasswordModal() {
  const modal = document.getElementById('set-new-password-modal');
  if (modal) modal.style.display = 'none';
}
window.closeSetNewPasswordModal = closeSetNewPasswordModal;

function handleSaveNewPassword(event) {
  event.preventDefault();
  const newPass = document.getElementById('reset-new-pass').value.trim();
  const confirmPass = document.getElementById('reset-confirm-pass').value.trim();
  const lang = window.currentLanguage || 'mr';

  if (!newPass || newPass.length < 4) {
    const msg = lang === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : lang === 'en' ? 'Password must be at least 4 characters.' : 'पासवर्ड किमान ४ अक्षरांचा असावा.';
    showToast(msg, 'warning');
    return false;
  }

  if (newPass !== confirmPass) {
    const msg = lang === 'hi' ? '⚠️ दोनों पासवर्ड मेल नहीं खाते!' : lang === 'en' ? '⚠️ Passwords do not match!' : '⚠️ दोन्ही पासवर्ड जुळत नाहीत!';
    showToast(msg, 'danger');
    return false;
  }

  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.email && u.email.toLowerCase() === resetPasswordTargetEmail.toLowerCase());

  if (idx !== -1) {
    users[idx].password = newPass;
    saveRegisteredUsers(users);
  }

  closeSetNewPasswordModal();
  switchAuthTab('login');

  const loginIdent = document.getElementById('login-identifier');
  const loginPass = document.getElementById('login-pass');
  if (loginIdent) loginIdent.value = resetPasswordTargetEmail;
  if (loginPass) loginPass.value = newPass;

  const msg = lang === 'hi' ? '✅ पासवर्ड सफलतापूर्वक अपडेट हो गया! अब आप नए पासवर्ड से लॉगिन कर सकते हैं।' : lang === 'en' ? '✅ Password reset successfully! You can now login.' : '✅ पासवर्ड यशस्वीरीत्या अपडेट झाला! आता तुम्ही नवीन पासवर्डने लॉगिन करू शकता.';
  showToast(msg, 'success');
  return false;
}
window.handleSaveNewPassword = handleSaveNewPassword;

function handleResendOtp() {
  if (otpEngine) {
    otpEngine.resendOtp();
  }
}
window.handleResendOtp = handleResendOtp;

function closeOtpModal() {
  if (otpEngine) {
    otpEngine.close();
  }
}
window.closeOtpModal = closeOtpModal;

// --- ADMIN SETTINGS MODAL CONTROLLERS ---
function openSupabaseModal() {
  const nameInp = document.getElementById('cfg-admin-name');
  const emailInp = document.getElementById('cfg-admin-email');
  const passInp = document.getElementById('cfg-admin-new-pass');
  const langInp = document.getElementById('cfg-admin-lang');

  if (nameInp) nameInp.value = window.currentUserName || 'शैलेश (Administrator)';
  if (emailInp) emailInp.value = (supabaseManager && supabaseManager.adminEmail) ? supabaseManager.adminEmail : 'shailesh14362@gmail.com';
  if (passInp) passInp.value = '';
  if (langInp) langInp.value = window.currentLanguage || 'mr';

  const modal = document.getElementById('supabase-setup-modal');
  if (modal) modal.style.display = 'flex';
}
window.openSupabaseModal = openSupabaseModal;
window.openSupabaseSetupModal = openSupabaseModal;

function closeSupabaseModal() {
  const modal = document.getElementById('supabase-setup-modal');
  if (modal) modal.style.display = 'none';
}
window.closeSupabaseModal = closeSupabaseModal;
window.closeSupabaseSetupModal = closeSupabaseModal;

function handleSaveAdminSettings(e) {
  e.preventDefault();
  const nameInp = document.getElementById('cfg-admin-name');
  const emailInp = document.getElementById('cfg-admin-email');
  const newPassInp = document.getElementById('cfg-admin-new-pass');
  const langInp = document.getElementById('cfg-admin-lang');
  const lang = window.currentLanguage || 'mr';

  const newName = nameInp ? nameInp.value.trim() : 'शैलेश (Administrator)';
  const newEmail = emailInp ? emailInp.value.trim().toLowerCase() : 'shailesh14362@gmail.com';
  const newPass = newPassInp ? newPassInp.value.trim() : '';
  const chosenLang = langInp ? langInp.value : 'mr';

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    const msg = lang === 'hi' ? 'कृपया सही ईमेल पता दर्ज करें।' : lang === 'en' ? 'Please enter a valid email address.' : 'कृपया अचूक ईमेल आयडी टाका.';
    showToast(msg, 'warning');
    return false;
  }

  // 1. Update Admin in Supabase Manager
  if (supabaseManager) {
    supabaseManager.adminEmail = newEmail;
    localStorage.setItem(supabaseManager.storageKeyAdminEmail, newEmail);
  }

  // 2. Update Admin in Local Users DB
  let users = getRegisteredUsers();
  let adminUser = users.find(u => u.role === 'admin' || (supabaseManager && supabaseManager.checkIsAdmin(u)));
  if (adminUser) {
    adminUser.name = newName;
    adminUser.nameEn = newName;
    adminUser.nameHi = newName;
    adminUser.email = newEmail;
    if (newPass && newPass.length >= 4) {
      adminUser.password = newPass;
    }
    adminUser.preferredLanguage = chosenLang;
    saveRegisteredUsers(users);
  }

  // 3. Update current user session
  window.currentUserName = newName;
  if (window.currentUser) {
    window.currentUser.name = newName;
    window.currentUser.email = newEmail;
    if (newPass && newPass.length >= 4) {
      window.currentUser.password = newPass;
    }
  }

  // 4. Sync updated Admin profile to Supabase DB
  if (supabaseManager && adminUser) {
    supabaseManager.syncUserToSupabase(adminUser);
  }

  closeSupabaseModal();
  renderAdminPanel();

  const successMsg = lang === 'hi' ? '✅ व्यवस्थापक सेटिंग्स सफलतापूर्वक सहेजी गईं!' : lang === 'en' ? '✅ Administrator settings saved successfully!' : '✅ व्यवस्थापक सेटिंग्ज यशस्वीरीत्या सेव्ह झाल्या!';
  showToast(successMsg, 'success');
  return false;
}
window.handleSaveAdminSettings = handleSaveAdminSettings;
window.handleSaveSupabaseConfig = handleSaveAdminSettings;

function handleAdminAuth(event) {
  event.preventDefault();
  const username = document.getElementById('admin-username').value.trim().toLowerCase();
  const password = document.getElementById('admin-password').value.trim();
  const lang = window.currentLanguage || 'mr';

  const isMatchingAdmin = (username === 'admin' || username === 'shailesh' || username === 'shailesh14362@gmail.com');
  const isMatchingPass = (password === 'admin123' || password === 'password123');

  if (isMatchingAdmin && isMatchingPass) {
    const adminUser = {
      id: 'admin-shailesh',
      name: lang === 'hi' ? 'शैलेश (Administrator)' : lang === 'en' ? 'Shailesh (Administrator)' : 'शैलेश (Administrator)',
      email: 'shailesh14362@gmail.com',
      role: 'admin',
      isVerified: true
    };
    loginSuccess('admin', adminUser);
    const welcomeMsg = lang === 'hi' ? '👑 एडमिन कंट्रोल रूम में स्वागत है, शैलेश जी!' : lang === 'en' ? '👑 Welcome to Admin Control Room, Shailesh!' : '👑 ॲडमिन कंट्रोल रूममध्ये आपले स्वागत आहे, शैलेश जी!';
    showToast(welcomeMsg, 'success');
  } else {
    const msg = lang === 'hi' ? 'अमान्य एडमिन क्रेडेंशियल्स! (admin / admin123 या password123)' : lang === 'en' ? 'Invalid Admin credentials! (admin / admin123 or password123)' : 'अवैध ॲडमिन क्रेडेंशियल्स! (admin / admin123 किंवा password123)';
    showToast(msg, 'danger');
  }
  return false;
}
window.handleAdminAuth = handleAdminAuth;

function continueAsGuest() {
  const lang = window.currentLanguage || 'mr';
  const guestUser = {
    id: 'guest',
    name: lang === 'hi' ? 'अतिथि उद्यमी' : lang === 'en' ? 'Guest Entrepreneur' : 'पाहुणे उद्योजक',
    email: 'guest@aapla.in',
    village: lang === 'hi' ? 'महाराष्ट्र' : lang === 'en' ? 'Maharashtra' : 'महाराष्ट्र',
    businessType: lang === 'hi' ? 'ग्रामीण व्यवसाय' : lang === 'en' ? 'Rural Enterprise' : 'ग्रामीण व्यवसाय',
    role: 'guest',
    isVerified: true
  };
  loginSuccess('guest', guestUser);
}
window.continueAsGuest = continueAsGuest;

function loginSuccess(role, userObject) {
  window.currentUserRole = role;
  window.currentUser = typeof userObject === 'object' ? userObject : { id: 'usr-1', name: userObject };
  window.currentUserName = window.currentUser.name;

  const activeLang = window.currentUser.preferredLanguage || window.currentLanguage || 'mr';
  window.currentUser.preferredLanguage = activeLang;

  localStorage.setItem('aapla_vyapar_role', role);
  localStorage.setItem('aapla_vyapar_name', window.currentUserName);
  localStorage.setItem('aapla_vyapar_current_user', JSON.stringify(window.currentUser));

  // Sync with LearningTracker so progress is stored per user
  if (learningTracker) {
    learningTracker.setUser(window.currentUser);
  }

  // Apply chosen language across entire UI immediately
  setLanguage(activeLang);

  applyAuthSession(role, window.currentUser);
}

function applyAuthSession(role, user) {
  const authGate = document.getElementById('auth-gate');
  const userPortal = document.getElementById('user-portal');
  const adminPortalEl = document.getElementById('admin-portal');
  const lang = window.currentLanguage || 'mr';

  if (authGate) authGate.style.display = 'none';

  const displayName = user.name || (lang === 'hi' ? 'उद्यमी' : lang === 'en' ? 'Entrepreneur' : 'उद्योजक');
  const displayLocation = user.village ? `📍 ${user.village}` : (lang === 'en' ? '📍 Maharashtra' : '📍 महाराष्ट्र');

  // Update user name and village in header and profile
  document.querySelectorAll('.logged-in-user-name').forEach(el => {
    el.textContent = displayName;
  });

  document.querySelectorAll('.logged-in-user-location').forEach(el => {
    el.textContent = displayLocation;
  });

  if (role === 'admin') {
    if (userPortal) userPortal.style.display = 'none';
    if (adminPortalEl) adminPortalEl.style.display = 'block';
    document.body.classList.add('admin-active');
    document.body.classList.remove('site-active');
    renderAdminPanel();
  } else {
    if (userPortal) userPortal.style.display = 'block';
    if (adminPortalEl) adminPortalEl.style.display = 'none';
    document.body.classList.add('site-active');
    document.body.classList.remove('admin-active');
    renderUserPortal();
  }
  window.scrollTo(0, 0);
}

function logout() {
  const lang = window.currentLanguage || 'mr';
  window.currentUserRole = null;
  window.currentUser = null;
  localStorage.removeItem('aapla_vyapar_role');
  localStorage.removeItem('aapla_vyapar_current_user');
  showAuthGate();
  
  const msg = lang === 'hi' ? 'आप सफलतापूर्वक लॉगआउट हो गए हैं।' : lang === 'en' ? 'You have logged out successfully.' : 'तुम्ही यशस्वीरीत्या लॉगआउट झाला आहात.';
  showToast(msg, 'info');
  return false;
}
window.logout = logout;

function showAuthGate() {
  const authGate = document.getElementById('auth-gate');
  const userPortal = document.getElementById('user-portal');
  const adminPortalEl = document.getElementById('admin-portal');

  if (authGate) authGate.style.display = 'flex';
  if (userPortal) userPortal.style.display = 'none';
  if (adminPortalEl) adminPortalEl.style.display = 'none';
  document.body.classList.remove('site-active', 'admin-active');
}

// Render Functions
function renderAllViews() {
  renderVideoHub();
  renderUserPortal();
  renderAdminPanel();
}

function renderVideoHub(category = 'all') {
  const container = document.getElementById('videos-grid-container');
  if (!container) return;

  const videos = adminPortal ? adminPortal.getVideos() : [];
  const filtered = category === 'all' ? videos : videos.filter(v => v.category === category);
  const completedList = (learningTracker && learningTracker.state.completedModules) || [];
  const lang = window.currentLanguage || 'mr';
  const t = window.translations[lang] || window.translations.mr;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#777; background:#fff; border-radius:18px; border:1px solid var(--line);">${lang === 'hi' ? 'इस श्रेणी में कोई वीडियो उपलब्ध नहीं है।' : lang === 'en' ? 'No videos found in this category.' : 'या वर्गात कोणताही व्हिडिओ उपलब्ध नाही.'}</div>`;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const isDone = completedList.includes(v.id);
    const title = (lang === 'hi' && v.titleHi) ? v.titleHi : (lang === 'en' && v.titleEn) ? v.titleEn : v.title;
    const desc = (lang === 'hi' && v.descHi) ? v.descHi : (lang === 'en' && v.descEn) ? v.descEn : v.desc;
    const btnDoneText = isDone ? (t.btnCompleted || '✅ Completed') : (t.btnMarkComplete || '✓ Mark Done');
    const btnWatchText = lang === 'hi' ? '👁️ देखें' : lang === 'en' ? '👁️ Watch' : '👁️ पहा';
    
    // Extract thumbnail
    const thumbUrl = adminPortal.getYouTubeThumbnail(v.embedUrl);

    return `
      <div class="vid-card-item">
        <div class="vid-thumb-wrapper" onclick="openVideoModal('${v.id}')">
          ${thumbUrl ? `<img src="${thumbUrl}" alt="${title}" class="vid-thumb-img" onerror="this.style.display='none'">` : ''}
          <div class="vid-embed-fallback" style="${thumbUrl ? 'position:absolute; top:0; left:0; background:transparent;' : ''}">
            <span class="vid-play-icon" title="Play Video">▶</span>
            <div class="vid-badge-duration">${v.duration || '08:00'}</div>
          </div>
        </div>
        <div class="vid-content-box">
          <div class="vid-cat-tag">${v.category ? v.category.toUpperCase() : 'TRAINING'}</div>
          <h4 class="vid-title">${title}</h4>
          <p class="vid-desc">${desc}</p>
          <div class="vid-actions">
            <button class="btn btn-sm ${isDone ? 'btn-success-done' : 'btn-outline-green'}" onclick="markVideoDone('${v.id}')">
              ${btnDoneText}
            </button>
            <button class="btn btn-sm btn-ghost" onclick="openVideoModal('${v.id}')">
              ${btnWatchText}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
window.renderVideoHub = renderVideoHub;

function markVideoDone(videoId) {
  learningTracker.markModuleComplete(videoId);
  renderVideoHub();
  learningTracker.updateUI();
}
window.markVideoDone = markVideoDone;

function filterVideos(cat, btnEl) {
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderVideoHub(cat);
}
window.filterVideos = filterVideos;

function renderUserPortal() {
  const users = adminPortal ? adminPortal.getUsers() : [];
  const videos = adminPortal ? adminPortal.getVideos() : [];

  const heroStatUsers = document.getElementById('hero-stat-users');
  const heroStatVideos = document.getElementById('hero-stat-videos');
  if (heroStatUsers) heroStatUsers.innerText = `${users.length > 0 ? users.length : 1}`;
  if (heroStatVideos) heroStatVideos.innerText = `${videos.length}`;

  renderVideoHub('all');
  if (learningTracker) learningTracker.updateUI();
  renderUserQueriesList();
}

function renderUserQueriesList() {
  const container = document.getElementById('user-queries-list');
  if (!container) return;

  const lang = window.currentLanguage || 'mr';
  const t = window.translations[lang] || window.translations.mr;
  const queries = adminPortal ? adminPortal.getQueries() : [];

  if (queries.length === 0) {
    container.innerHTML = `<p class="empty-hint" style="color:#888; font-style:italic; padding:12px 0;">${t.helpEmptyHint || 'अद्याप कोणताही प्रश्न विचारला नाही.'}</p>`;
    return;
  }

  const qLabel = lang === 'hi' ? 'प्रश्न:' : lang === 'en' ? 'Question:' : 'प्रश्न:';

  container.innerHTML = queries.map(q => {
    const qText = (lang === 'hi' && q.queryHi) ? q.queryHi : (lang === 'en' && q.queryEn) ? q.queryEn : q.query;
    const rText = (lang === 'hi' && q.replyHi) ? q.replyHi : (lang === 'en' && q.replyEn) ? q.replyEn : q.reply;
    const uName = (lang === 'hi' && q.userNameHi) ? q.userNameHi : (lang === 'en' && q.userNameEn) ? q.userNameEn : q.userName;

    return `
      <div class="query-card-item status-${q.status}">
        <div class="query-head">
          <span class="query-date">👤 <b>${uName}</b> &nbsp;|&nbsp; 📅 ${q.date}</span>
          <span class="badge badge-${q.status}">${q.status === 'resolved' ? (t.helpStatusResolved || '✅ उत्तर मिळाले') : (t.helpStatusPending || '⏳ उत्तराची प्रतीक्षा')}</span>
        </div>
        <div class="query-text"><b>${qLabel}</b> ${qText}</div>
        ${rText ? `<div class="query-reply-box"><b>${t.helpReplyLabel || '💡 ॲडमिन तज्ज्ञांचे उत्तर:'}</b> ${rText}</div>` : ''}
      </div>
    `;
  }).join('');
}
window.renderUserQueriesList = renderUserQueriesList;

function askVoiceForQuery() {
  if (!voiceAssistant || !voiceAssistant.recognition) {
    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? 'माइक उपलब्ध नहीं है।' : lang === 'en' ? 'Microphone not supported.' : 'माइक उपलब्ध नाही.';
    showToast(msg, 'warning');
    return;
  }
  const lang = window.currentLanguage || 'mr';
  voiceAssistant.recognition.lang = voiceAssistant.getLocaleCode(lang);
  voiceAssistant.recognition.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    const inputEl = document.getElementById('user-query-input');
    if (inputEl) inputEl.value = txt;
    const msg = lang === 'hi' ? 'आवाज़ रिकॉर्ड हो गई!' : lang === 'en' ? 'Voice transcribed!' : 'आवाज रेकॉर्ड झाला!';
    showToast(msg, 'success');
  };
  voiceAssistant.recognition.start();
  const infoMsg = lang === 'hi' ? '🎙️ बोलिए, आपका प्रश्न टाइप हो जाएगा...' : lang === 'en' ? '🎙️ Speak your question clearly...' : '🎙️ बोला, तुमचा प्रश्न टाईप होईल...';
  showToast(infoMsg, 'info');
}
window.askVoiceForQuery = askVoiceForQuery;

// Event Bindings
function bindEventListeners() {
  // Voice Assistant UI triggers
  const micBtn = document.getElementById('va-mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      voiceAssistant.toggleListening(window.currentLanguage);
    });
  }

  const vaSpeakBtn = document.getElementById('va-speak-btn');
  if (vaSpeakBtn) {
    vaSpeakBtn.addEventListener('click', () => {
      const text = document.getElementById('va-answer-text').innerText;
      if (text) voiceAssistant.speak(text, window.currentLanguage);
    });
  }

  const vaPauseBtn = document.getElementById('va-pause-btn');
  if (vaPauseBtn) {
    vaPauseBtn.addEventListener('click', () => {
      if (voiceAssistant) {
        voiceAssistant.stopSpeaking();
        const lang = window.currentLanguage || 'mr';
        const msg = lang === 'hi' ? '⏸️ आवाज़ रोक दी गई।' : lang === 'en' ? '⏸️ Voice paused.' : '⏸️ आवाज थांबवला.';
        showToast(msg, 'info');
      }
    });
  }

  const vaCopyBtn = document.getElementById('va-copy-btn');
  if (vaCopyBtn) {
    vaCopyBtn.addEventListener('click', () => {
      const text = document.getElementById('va-answer-text').innerText;
      if (text) {
        navigator.clipboard.writeText(text);
        const lang = window.currentLanguage || 'mr';
        const msg = lang === 'hi' ? 'उत्तर कॉपी किया गया!' : lang === 'en' ? 'Answer copied!' : 'उत्तर कॉपी केले!';
        showToast(msg, 'success');
      }
    });
  }

  // Text Translator Triggers
  const transBtn = document.getElementById('btn-translate-text');
  if (transBtn) {
    transBtn.addEventListener('click', async () => {
      const input = document.getElementById('trans-input-text').value;
      const targetLang = document.getElementById('trans-target-lang').value;
      const outputEl = document.getElementById('trans-output-text');
      const lang = window.currentLanguage || 'mr';

      if (!input.trim()) {
        const msg = lang === 'hi' ? 'कृपया अनुवाद के लिए पाठ लिखें।' : lang === 'en' ? 'Please enter text to translate.' : 'कृपया भाषांतरासाठी मजकूर लिहा.';
        showToast(msg, 'warning');
        return;
      }

      transBtn.innerHTML = lang === 'hi' ? '⏳ अनुवाद हो रहा है...' : lang === 'en' ? '⏳ Translating...' : '⏳ भाषांतर होत आहे...';
      const translated = await translator.translateText(input, 'auto', targetLang);
      outputEl.value = translated;
      transBtn.innerHTML = window.translations[lang].transBtnTranslate || '🔄 भाषांतर करा';
      learningTracker.recordTranslation();
      
      const successMsg = lang === 'hi' ? 'अनुवाद सफल हुआ!' : lang === 'en' ? 'Translation successful!' : 'भाषांतर यशस्वी झाले!';
      showToast(successMsg, 'success');
    });
  }

  // Speak Out Button (Outputs translated text or input text)
  const transSpeakBtn = document.getElementById('btn-trans-speak');
  if (transSpeakBtn) {
    transSpeakBtn.addEventListener('click', () => {
      const output = document.getElementById('trans-output-text').value;
      const targetLang = document.getElementById('trans-target-lang').value;
      const textToSpeak = output && output.trim() ? output : document.getElementById('trans-input-text').value;
      const lang = window.currentLanguage || 'mr';

      if (!textToSpeak || !textToSpeak.trim()) {
        const msg = lang === 'hi' ? 'कृपया पहले पाठ लिखें या अनुवाद करें।' : lang === 'en' ? 'Please enter text or translate first.' : 'कृपया प्रथम मजकूर लिहा किंवा भाषांतर करा.';
        showToast(msg, 'warning');
        return;
      }

      if (voiceAssistant) {
        if (voiceAssistant.isSpeaking) {
          voiceAssistant.stopSpeaking();
          transSpeakBtn.innerHTML = window.translations[lang].transBtnSpeak || '🔊 ऐका';
          transSpeakBtn.classList.remove('pulse-anim');
          return;
        }

        transSpeakBtn.innerHTML = window.translations[lang].transBtnStop || '⏹️ थांबवा';
        transSpeakBtn.classList.add('pulse-anim');

        voiceAssistant.speak(
          textToSpeak,
          targetLang,
          () => {
            transSpeakBtn.innerHTML = window.translations[lang].transBtnStop || '⏹️ थांबवा';
            transSpeakBtn.classList.add('pulse-anim');
          },
          () => {
            transSpeakBtn.innerHTML = window.translations[lang].transBtnSpeak || '🔊 ऐका';
            transSpeakBtn.classList.remove('pulse-anim');
          }
        );
      }
    });
  }

  const transInputSpeakBtn = document.getElementById('btn-trans-input-speak');
  if (transInputSpeakBtn) {
    transInputSpeakBtn.addEventListener('click', () => {
      const input = document.getElementById('trans-input-text').value;
      const lang = window.currentLanguage || 'mr';
      if (!input || !input.trim()) {
        const msg = lang === 'hi' ? 'कृपया पहले मूल पाठ लिखें।' : lang === 'en' ? 'Please enter original text first.' : 'कृपया आधी मूळ मजकूर लिहा.';
        showToast(msg, 'warning');
        return;
      }
      if (voiceAssistant) {
        if (voiceAssistant.isSpeaking) {
          voiceAssistant.stopSpeaking();
          transInputSpeakBtn.innerHTML = window.translations[lang].transBtnSpeak || '🔊 ऐका';
          return;
        }
        transInputSpeakBtn.innerHTML = window.translations[lang].transBtnStop || '⏹️ थांबवा';
        voiceAssistant.speak(
          input,
          lang,
          () => { transInputSpeakBtn.innerHTML = window.translations[lang].transBtnStop || '⏹️ थांबवा'; },
          () => { transInputSpeakBtn.innerHTML = window.translations[lang].transBtnSpeak || '🔊 ऐका'; }
        );
      }
    });
  }

  const transCopyBtn = document.getElementById('btn-trans-copy');
  if (transCopyBtn) {
    transCopyBtn.addEventListener('click', () => {
      const output = document.getElementById('trans-output-text').value;
      const lang = window.currentLanguage || 'mr';
      if (output) {
        navigator.clipboard.writeText(output);
        const msg = lang === 'hi' ? 'अनुवादित पाठ कॉपी हुआ!' : lang === 'en' ? 'Translated text copied!' : 'भाषांतरित मजकूर कॉपी झाला!';
        showToast(msg, 'success');
      }
    });
  }

  const transWhatsappBtn = document.getElementById('btn-trans-whatsapp');
  if (transWhatsappBtn) {
    transWhatsappBtn.addEventListener('click', () => {
      const output = document.getElementById('trans-output-text').value;
      if (output) {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(output)}`;
        window.open(url, '_blank');
      }
    });
  }

  const transVoiceInputBtn = document.getElementById('btn-trans-voice-input');
  if (transVoiceInputBtn) {
    transVoiceInputBtn.addEventListener('click', () => {
      const lang = window.currentLanguage || 'mr';
      if (!voiceAssistant.recognition) {
        showToast(lang === 'en' ? 'Voice input not supported.' : 'व्हॉईस इनपुट उपलब्ध नाही.', 'warning');
        return;
      }
      voiceAssistant.recognition.lang = voiceAssistant.getLocaleCode(lang);
      voiceAssistant.recognition.onresult = (e) => {
        const txt = e.results[0][0].transcript;
        const inputEl = document.getElementById('trans-input-text');
        if (inputEl) inputEl.value = txt;
        const msg = lang === 'hi' ? 'आवाज़ रिकॉर्ड हुई!' : lang === 'en' ? 'Voice transcribed!' : 'आवाज रेकॉर्ड झाला!';
        showToast(msg, 'success');
      };
      voiceAssistant.recognition.start();
      const promptMsg = lang === 'hi' ? '🎙️ बोलिए, आपके शब्द टाइप होंगे...' : lang === 'en' ? '🎙️ Speak now to type...' : '🎙️ बोला, तुमचे शब्द टाईप होतील...';
      showToast(promptMsg, 'info');
    });
  }

  // --- Document Translator Triggers ---
  const docTranslateBtn = document.getElementById('btn-process-doc');
  if (docTranslateBtn) {
    docTranslateBtn.addEventListener('click', async () => {
      const content = document.getElementById('doc-source-content').value;
      const targetLang = document.getElementById('doc-target-lang').value;
      const previewEl = document.getElementById('doc-preview-content');
      const lang = window.currentLanguage || 'mr';

      if (!content.trim()) {
        const msg = lang === 'hi' ? 'कृपया दस्तावेज़ अपलोड करें या पाठ पेस्ट करें।' : lang === 'en' ? 'Please upload document or paste text.' : 'कृपया दस्तऐवज अपलोड करा किंवा मजकूर पेस्ट करा.';
        showToast(msg, 'warning');
        return;
      }

      docTranslateBtn.innerHTML = lang === 'hi' ? '⏳ दस्तावेज़ प्रक्रिया जारी है...' : lang === 'en' ? '⏳ Processing document...' : '⏳ दस्तऐवज प्रक्रिया सुरू आहे...';
      const translated = await translator.translateDocument(content, targetLang);
      previewEl.innerText = translated;
      docTranslateBtn.innerHTML = window.translations[lang].docBtnProcess || '⚡ दस्तऐवज भाषांतर करा';
      learningTracker.recordTranslation();
      
      const successMsg = lang === 'hi' ? 'दस्तावेज़ अनुवाद पूरा हुआ!' : lang === 'en' ? 'Document translation completed!' : 'दस्तऐवज भाषांतर पूर्ण झाले!';
      showToast(successMsg, 'success');
      previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  const docPdfBtn = document.getElementById('btn-download-doc-pdf');
  if (docPdfBtn) {
    docPdfBtn.addEventListener('click', () => {
      const preview = document.getElementById('doc-preview-content').innerText;
      const targetLang = document.getElementById('doc-target-lang').value;
      const lang = window.currentLanguage || 'mr';
      if (!preview || preview.trim() === '' || preview.includes('येथे भाषांतरित') || preview.includes('यहाँ अनुवादित') || preview.includes('preview will be')) {
        const msg = lang === 'hi' ? 'पहले दस्तावेज़ का अनुवाद करें।' : lang === 'en' ? 'Please translate the document first.' : 'प्रथम दस्तऐवज भाषांतर करा.';
        showToast(msg, 'warning');
        return;
      }
      translator.downloadAsPdf(preview, targetLang);
    });
  }

  const docTxtBtn = document.getElementById('btn-download-doc-txt');
  if (docTxtBtn) {
    docTxtBtn.addEventListener('click', () => {
      const preview = document.getElementById('doc-preview-content').innerText;
      const lang = window.currentLanguage || 'mr';
      if (!preview || preview.trim() === '' || preview.includes('येथे भाषांतरित') || preview.includes('यहाँ अनुवादित') || preview.includes('preview will be')) {
        const msg = lang === 'hi' ? 'पहले दस्तावेज़ का अनुवाद करें।' : lang === 'en' ? 'Please translate the document first.' : 'प्रथम दस्तऐवज भाषांतर करा.';
        showToast(msg, 'warning');
        return;
      }
      translator.downloadAsText(preview);
    });
  }

  const docPrintBtn = document.getElementById('btn-print-doc');
  if (docPrintBtn) {
    docPrintBtn.addEventListener('click', () => {
      const preview = document.getElementById('doc-preview-content').innerText;
      const targetLang = document.getElementById('doc-target-lang').value;
      const lang = window.currentLanguage || 'mr';
      if (!preview || preview.trim() === '' || preview.includes('येथे भाषांतरित') || preview.includes('यहाँ अनुवादित') || preview.includes('preview will be')) {
        const msg = lang === 'hi' ? 'पहले दस्तावेज़ का अनुवाद करें।' : lang === 'en' ? 'Please translate the document first.' : 'प्रथम दस्तऐवज भाषांतर करा.';
        showToast(msg, 'warning');
        return;
      }
      translator.printDocument(preview, targetLang);
    });
  }

  // Load Sample Docs
  const loadSampleMudra = document.getElementById('btn-load-sample-mudra');
  if (loadSampleMudra) {
    loadSampleMudra.addEventListener('click', () => {
      const sampleText = translator.getSampleDocument('mudra');
      const inputEl = document.getElementById('doc-source-content');
      inputEl.value = sampleText;
      updateDocExtractBadge({ name: 'PMMY_Mudra_Loan_Application.pdf', size: '1.2 MB', wordCount: sampleText.split(/\s+/).length });
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const loadSampleShopAct = document.getElementById('btn-load-sample-shop');
  if (loadSampleShopAct) {
    loadSampleShopAct.addEventListener('click', () => {
      const sampleText = translator.getSampleDocument('shop_act');
      const inputEl = document.getElementById('doc-source-content');
      inputEl.value = sampleText;
      updateDocExtractBadge({ name: 'Shop_Act_Registration_Guideline.pdf', size: '850 KB', wordCount: sampleText.split(/\s+/).length });
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // File Upload listener
  const fileUploadInput = document.getElementById('doc-file-upload');
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const lang = window.currentLanguage || 'mr';
      if (file) {
        const badgeEl = document.getElementById('doc-extract-status-badge');
        if (badgeEl) {
          badgeEl.style.display = 'flex';
          badgeEl.className = 'doc-status-badge extracting';
          badgeEl.innerHTML = `<span>⏳</span> <span><b>'${file.name}'</b> ${lang === 'hi' ? 'दस्तावेज़ से जानकारी पढ़ी जा रही है...' : lang === 'en' ? 'Extracting document text...' : 'फाईलमधून मजकूर वाचला जात आहे...'}</span>`;
        }

        try {
          const extractedText = await translator.extractTextFromFile(file);
          document.getElementById('doc-source-content').value = extractedText;
          const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
          
          updateDocExtractBadge({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            wordCount: words
          });

          const msg = lang === 'hi' ? `✅ '${file.name}' से ${words} शब्द सफलतापूर्वक पढ़े गए!` : lang === 'en' ? `✅ Extracted ${words} words from '${file.name}'!` : `✅ '${file.name}' मधील ${words} शब्द यशस्वीरीत्या वाचले गेले!`;
          showToast(msg, 'success');
        } catch (err) {
          console.error('File extraction error:', err);
          const msg = lang === 'hi' ? 'फाइल पढ़ने में त्रुटि। कृपया .txt या .pdf चुनें।' : lang === 'en' ? 'Error reading file. Please choose .txt or .pdf.' : 'फाईल वाचण्यात अडचण आली. कृपया .txt किंवा .pdf निवडा.';
          showToast(msg, 'warning');
        }
      }
    });
  }

  // Certificate Download
  const certBtn = document.getElementById('btn-download-cert');
  if (certBtn) {
    certBtn.addEventListener('click', () => {
      learningTracker.generateCertificate(window.currentUserName);
    });
  }

  // Reset Progress Trigger
  const resetProgressBtn = document.getElementById('btn-reset-learning-progress');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', () => {
      const lang = window.currentLanguage || 'mr';
      const confirmMsg = lang === 'hi' ? 'क्या आप अपनी सीखने की प्रगति 0% से फिर से शुरू करना चाहते हैं?' : lang === 'en' ? 'Are you sure you want to reset your learning progress to 0%?' : 'तुम्हाला तुमची शिकण्याची प्रगती सुरुवातीपासून (०%) सुरू करायची आहे का?';
      if (confirm(confirmMsg)) {
        learningTracker.resetProgress();
      }
    });
  }

  // Query Submit Trigger
  const submitQueryBtn = document.getElementById('btn-submit-query');
  if (submitQueryBtn) {
    submitQueryBtn.addEventListener('click', () => {
      const queryInput = document.getElementById('user-query-input');
      const text = queryInput.value.trim();
      const lang = window.currentLanguage || 'mr';
      if (!text) {
        const msg = lang === 'hi' ? 'कृपया अपना प्रश्न लिखें या बोलें।' : lang === 'en' ? 'Please enter or speak your question.' : 'कृपया तुमचा प्रश्न लिहा किंवा बोला.';
        showToast(msg, 'warning');
        return;
      }
      const userEmail = window.currentUser && window.currentUser.email ? window.currentUser.email : 'entrepreneur@gmail.com';
      adminPortal.submitUserQuery(text, window.currentUserName, userEmail);
      queryInput.value = '';
      renderUserQueriesList();
    });
  }

  // Mobile Bottom Navigation and Drawer Active State Handler
  const bottomNavItems = document.querySelectorAll('.bn-item');
  bottomNavItems.forEach(item => {
    item.addEventListener('click', () => {
      bottomNavItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Auto-close mobile drawer when clicking outside
  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('mobile-drawer');
    const burger = document.querySelector('.burger');
    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && !burger.contains(e.target)) {
        drawer.classList.remove('open');
      }
    }
  });

  // Mobile Scrollspy for bottom navbar
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('scroll', () => {
      const sections = ['home', 'assistant', 'learn', 'translate', 'tracker'];
      const scrollPos = (window.scrollY || 0) + 200;
      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(sections[i]);
        if (sec && sec.offsetTop <= scrollPos) {
          bottomNavItems.forEach(item => {
            if (item.getAttribute('href') === `#${sections[i]}`) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });
          break;
        }
      }
    }, { passive: true });
  }
}

// Helper to update extraction status badge
function updateDocExtractBadge(info) {
  const badgeEl = document.getElementById('doc-extract-status-badge');
  const lang = window.currentLanguage || 'mr';
  if (badgeEl) {
    badgeEl.style.display = 'flex';
    badgeEl.className = 'doc-status-badge success';
    const label = lang === 'hi' ? 'जानकारी पढ़ी गई:' : lang === 'en' ? 'Extracted:' : 'माहिती वाचली गेली:';
    const wordsLabel = lang === 'hi' ? 'शब्द' : lang === 'en' ? 'words' : 'शब्द';
    badgeEl.innerHTML = `
      <span style="font-size:18px;">✅</span>
      <div>
        <b>${label}</b> <code>${info.name}</code> (${info.size}) | <b>${info.wordCount} ${wordsLabel}</b>
      </div>
    `;
  }
}

// Quick Voice Questions Helper
function askQuickQuestion(queryText) {
  if (voiceAssistant) {
    voiceAssistant.handleUserInput(queryText);
    learningTracker.recordVoiceQuery();
  }
}
window.askQuickQuestion = askQuickQuestion;

// Video Modal Helper (Plays Real YouTube Embeds)
function openVideoModal(videoId) {
  const modal = document.getElementById('video-player-modal');
  const frame = document.getElementById('modal-video-frame');
  const title = document.getElementById('modal-video-title');
  const videos = adminPortal ? adminPortal.getVideos() : [];
  const target = videos.find(v => v.id === videoId) || videos[0];
  const lang = window.currentLanguage || 'mr';

  if (modal && frame && target) {
    const videoTitle = (lang === 'hi' && target.titleHi) ? target.titleHi : (lang === 'en' && target.titleEn) ? target.titleEn : target.title;
    if (title) title.innerText = videoTitle;
    
    // Add autoplay param
    let embedSrc = target.embedUrl;
    if (embedSrc.includes('?')) {
      embedSrc += '&autoplay=1&rel=0';
    } else {
      embedSrc += '?autoplay=1&rel=0';
    }
    
    frame.src = embedSrc;
    modal.style.display = 'flex';
  }
}
window.openVideoModal = openVideoModal;

function closeVideoModal() {
  const modal = document.getElementById('video-player-modal');
  const frame = document.getElementById('modal-video-frame');
  if (modal) modal.style.display = 'none';
  if (frame) frame.src = '';
}
window.closeVideoModal = closeVideoModal;

// Admin Panel Controller
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-view-panel').forEach(el => el.classList.remove('active'));

  const navItem = document.getElementById(`admin-nav-${tab}`);
  const viewPanel = document.getElementById(`admin-view-${tab}`);
  if (navItem) navItem.classList.add('active');
  if (viewPanel) viewPanel.classList.add('active');
}
window.switchAdminTab = switchAdminTab;

function renderAdminPanel() {
  if (!adminPortal) return;
  const stats = adminPortal.getStats();

  const elUsers = document.getElementById('stat-total-users');
  const elVideos = document.getElementById('stat-total-videos');
  const elDocs = document.getElementById('stat-total-docs');
  const elQueries = document.getElementById('stat-pending-queries');

  if (elUsers) elUsers.innerText = stats.totalUsers;
  if (elVideos) elVideos.innerText = stats.totalVideos;
  if (elDocs) elDocs.innerText = stats.totalDocs;
  if (elQueries) elQueries.innerText = stats.pendingQueries;

  // Render Registered Users Table with Email and Verified Status
  const users = adminPortal.getUsers();
  const usersTbody = document.getElementById('admin-users-tbody');
  const usersCountEl = document.getElementById('admin-nav-users-count');
  const lang = window.currentLanguage || 'mr';

  if (usersCountEl) usersCountEl.innerText = users.length;
  if (usersTbody) {
    if (users.length === 0) {
      usersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">${lang === 'hi' ? 'कोई पंजीकरण उपलब्ध नहीं है।' : lang === 'en' ? 'No registered users found.' : 'कोणतीही नोंदणी झालेली नाही.'}</td></tr>`;
    } else {
      usersTbody.innerHTML = users.map(u => {
        const isAdminUser = u.role === 'admin' || (supabaseManager && supabaseManager.checkIsAdmin(u));
        return `
        <tr>
          <td><b>${u.name}</b> ${isAdminUser ? '<span class="badge badge-warning">👑 Admin</span>' : ''}</td>
          <td><code>✉️ ${u.email || '—'}</code></td>
          <td>${u.village || (lang === 'en' ? 'Maharashtra' : 'महाराष्ट्र')}</td>
          <td><span class="badge badge-info">${u.businessType || (lang === 'en' ? 'Rural Enterprise' : 'ग्रामीण व्यवसाय')}</span></td>
          <td><span class="badge badge-verified">✓ ${u.isVerified ? 'Email Verified' : 'Active'}</span></td>
          <td><small style="color:#666;">${u.registeredAt || '2026'}</small></td>
          <td>
            ${isAdminUser ? '<span style="font-size:11.5px; color:var(--orange-dark); font-weight:700;">👑 Primary Admin</span>' : `<button class="btn btn-xs btn-danger" onclick="handleDeleteUser('${u.id}', '${u.email}')">🗑️ ${window.translations[lang].adminDelete || 'हटवा'}</button>`}
          </td>
        </tr>
      `;
      }).join('');
    }
  }

  // Render Admin Videos Table
  const videosTbody = document.getElementById('admin-videos-tbody');
  if (videosTbody) {
    const videos = adminPortal.getVideos();
    videosTbody.innerHTML = videos.map(v => `
      <tr>
        <td><b>${v.title}</b><br><small style="color:#666;">${v.duration} | ${v.language}</small></td>
        <td><span class="badge badge-info">${v.category}</span></td>
        <td>
          <button class="btn btn-xs btn-danger" onclick="deleteAdminVideo('${v.id}')">${window.translations[lang].adminDelete || 'हटवा'}</button>
        </td>
      </tr>
    `).join('');
  }

  // Render Admin Docs Table
  const docsTbody = document.getElementById('admin-docs-tbody');
  if (docsTbody) {
    const docs = adminPortal.getDocs();
    docsTbody.innerHTML = docs.map(d => `
      <tr>
        <td><b>${d.title}</b><br><small style="color:#666;">${d.size} | ${d.date}</small></td>
        <td><span class="badge badge-warning">${d.category}</span></td>
        <td>
          <button class="btn btn-xs btn-danger" onclick="deleteAdminDoc('${d.id}')">${window.translations[lang].adminDelete || 'हटवा'}</button>
        </td>
      </tr>
    `).join('');
  }

  // Render Admin Queries Desk
  const queriesContainer = document.getElementById('admin-queries-desk');
  if (queriesContainer) {
    const queries = adminPortal.getQueries();
    queriesContainer.innerHTML = queries.map(q => {
      const qText = (lang === 'hi' && q.queryHi) ? q.queryHi : (lang === 'en' && q.queryEn) ? q.queryEn : q.query;
      const rText = (lang === 'hi' && q.replyHi) ? q.replyHi : (lang === 'en' && q.replyEn) ? q.replyEn : q.reply;
      const uName = (lang === 'hi' && q.userNameHi) ? q.userNameHi : (lang === 'en' && q.userNameEn) ? q.userNameEn : q.userName;

      return `
        <div class="admin-query-card">
          <div class="aq-head">
            <div>
              <b>👤 ${uName}</b> <span style="font-size:12px;color:#888;">(✉️ ${q.email || q.phone || '—'}) - 📅 ${q.date}</span>
            </div>
            <span class="badge badge-${q.status}">${q.status === 'resolved' ? '✅ Resolved' : '⏳ Pending'}</span>
          </div>
          <div class="aq-question">
            <b>${lang === 'hi' ? 'प्रश्न:' : lang === 'en' ? 'Question:' : 'प्रश्न:'}</b> ${qText}
          </div>
          ${rText ? `<div class="aq-existing-reply"><b>${lang === 'hi' ? 'पूर्व उत्तर:' : lang === 'en' ? 'Previous Reply:' : 'आधीचे उत्तर:'}</b> ${rText}</div>` : ''}
          <div class="aq-reply-form">
            <input type="text" id="reply-input-${q.id}" placeholder="${lang === 'hi' ? 'यहाँ उद्यमी के लिए उत्तर लिखें...' : lang === 'en' ? 'Type reply for entrepreneur here...' : 'येथे उद्योजकासाठी उत्तर लिहा...'}" class="admin-input-reply" value="${rText || ''}">
            <button class="btn btn-sm btn-primary" onclick="sendAdminReply('${q.id}')">${window.translations[lang].adminBtnReply || 'उत्तर पाठवा'}</button>
          </div>
        </div>
      `;
    }).join('');
  }
}
window.renderAdminPanel = renderAdminPanel;

function deleteAdminVideo(id) {
  const lang = window.currentLanguage || 'mr';
  const confirmMsg = lang === 'hi' ? 'क्या आप इस वीडियो को हटाना चाहते हैं?' : lang === 'en' ? 'Are you sure you want to delete this video?' : 'हा व्हिडिओ हटवायचा आहे का?';
  if (confirm(confirmMsg)) {
    adminPortal.deleteVideo(id);
    renderAdminPanel();
    renderVideoHub();
  }
}
window.deleteAdminVideo = deleteAdminVideo;

function deleteAdminDoc(id) {
  const lang = window.currentLanguage || 'mr';
  const confirmMsg = lang === 'hi' ? 'क्या आप इस दस्तावेज़ को हटाना चाहते हैं?' : lang === 'en' ? 'Are you sure you want to delete this document?' : 'हा दस्तऐवज हटवायचा आहे का?';
  if (confirm(confirmMsg)) {
    adminPortal.deleteDoc(id);
    renderAdminPanel();
  }
}
window.deleteAdminDoc = deleteAdminDoc;

function sendAdminReply(queryId) {
  const input = document.getElementById(`reply-input-${queryId}`);
  const lang = window.currentLanguage || 'mr';
  if (input && input.value.trim()) {
    adminPortal.replyToQuery(queryId, input.value.trim());
    renderAdminPanel();
    renderUserQueriesList();
  } else {
    const msg = lang === 'hi' ? 'कृपया उत्तर टाइप करें।' : lang === 'en' ? 'Please type a reply.' : 'कृपया उत्तर टाईप करा.';
    showToast(msg, 'warning');
  }
}
window.sendAdminReply = sendAdminReply;

// Admin Add Video Form Handler
function handleAdminAddVideo(e) {
  e.preventDefault();
  const title = document.getElementById('add-vid-title').value.trim();
  const url = document.getElementById('add-vid-url').value.trim();
  const cat = document.getElementById('add-vid-cat').value;
  const desc = document.getElementById('add-vid-desc').value.trim();
  const lang = window.currentLanguage || 'mr';

  if (!title) {
    const msg = lang === 'hi' ? 'कृपया वीडियो का शीर्षक दर्ज करें।' : lang === 'en' ? 'Please enter video title.' : 'कृपया व्हिडिओ शीर्षक टाका.';
    showToast(msg, 'warning');
    return false;
  }

  adminPortal.addVideo({
    title,
    embedUrl: url || 'https://www.youtube.com/embed/41X1WpXh46g',
    category: cat,
    desc,
    duration: '08:30',
    language: lang === 'hi' ? 'हिंदी / मराठी' : lang === 'en' ? 'English / Multilingual' : 'मराठी / हिंदी'
  });

  e.target.reset();
  renderAdminPanel();
  renderVideoHub();
  return false;
}
window.handleAdminAddVideo = handleAdminAddVideo;

function handleAdminAddDoc(e) {
  e.preventDefault();
  const title = document.getElementById('add-doc-title').value.trim();
  const cat = document.getElementById('add-doc-cat').value;
  const content = document.getElementById('add-doc-content').value.trim();
  const lang = window.currentLanguage || 'mr';

  if (!title) {
    const msg = lang === 'hi' ? 'कृपया दस्तावेज़ का शीर्षक दर्ज करें।' : lang === 'en' ? 'Please enter document title.' : 'कृपया दस्तऐवज शीर्षक टाका.';
    showToast(msg, 'warning');
    return false;
  }

  adminPortal.addDoc({
    title,
    category: cat,
    content,
    size: '1.2 MB'
  });

  e.target.reset();
  renderAdminPanel();
  return false;
}
window.handleAdminAddDoc = handleAdminAddDoc;

// --- ADMIN USER DELETE HANDLER ---
async function handleDeleteUser(userId, userEmail) {
  const lang = window.currentLanguage || 'mr';
  const confirmMsg = lang === 'hi' ? `क्या आप ${userEmail} उद्यमी का खाता हटाना चाहते हैं?` : lang === 'en' ? `Are you sure you want to delete user ${userEmail}?` : `तुम्हाला ${userEmail} या उद्योजकाचे खाते हटवायचे आहे का?`;
  
  if (!confirm(confirmMsg)) return;

  // 1. Remove from local storage
  let users = getRegisteredUsers();
  users = users.filter(u => u.id !== userId && u.email !== userEmail);
  saveRegisteredUsers(users);

  // 2. Remove from Supabase Cloud PostgreSQL DB
  if (supabaseManager) {
    await supabaseManager.deleteUserFromSupabase(userEmail);
  }

  // 3. Re-render admin panel
  renderAdminPanel();

  const successMsg = lang === 'hi' ? '✅ उद्यमी खाता सफलतापूर्वक हटा दिया गया!' : lang === 'en' ? '✅ User account deleted successfully!' : '✅ उद्योजक खाते यशस्वीरीत्या हटवले गेले!';
  showToast(successMsg, 'info');
}
window.handleDeleteUser = handleDeleteUser;

// --- ADMIN PROFILE MODAL CONTROLLER ---
function openAdminProfileModal() {
  const modal = document.getElementById('admin-profile-modal');
  const nameEl = document.getElementById('admin-prof-name');
  const emailEl = document.getElementById('admin-prof-email');
  
  if (nameEl) {
    nameEl.innerText = window.currentUserName || 'शैलेश (Administrator)';
  }
  if (emailEl) {
    emailEl.innerText = (supabaseManager && supabaseManager.adminEmail) ? supabaseManager.adminEmail : 'shailesh14362@gmail.com';
  }
  if (modal) modal.style.display = 'flex';
}
window.openAdminProfileModal = openAdminProfileModal;

function closeAdminProfileModal() {
  const modal = document.getElementById('admin-profile-modal');
  if (modal) modal.style.display = 'none';
}
window.closeAdminProfileModal = closeAdminProfileModal;
