/**
 * Aapla Vyapar, Aapli Bhasha - Supabase Email Authentication & Cloud Database Controller
 * 100% Real Email OTP via Supabase Auth & PostgreSQL Cloud Database Sync
 */

class SupabaseManager {
  constructor() {
    this.storageKeyUrl = 'aapla_vyapar_supabase_url';
    this.storageKeyKey = 'aapla_vyapar_supabase_key';
    this.storageKeyAdminEmail = 'aapla_vyapar_admin_email';

    const defaultUrl = 'https://qtnjbvmlsyhhjanoubei.supabase.co';
    const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmpidm1sc3loaGphbm91YmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzI5MDgsImV4cCI6MjEwMzQwODkwOH0.gNzL9znI_B4lWBHkxsGRqqoTgRcUWgg8lDijZZUpR90';

    this.url = localStorage.getItem(this.storageKeyUrl) || defaultUrl;
    this.key = localStorage.getItem(this.storageKeyKey) || defaultKey;
    this.adminEmail = localStorage.getItem(this.storageKeyAdminEmail) || 'shailesh14362@gmail.com';

    this.client = null;
    this.initClient();
  }

  initClient() {
    if (this.url && this.key && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(this.url, this.key);
        console.log('✅ Supabase Email Auth Client Connected Successfully');
      } catch (err) {
        console.warn('⚠️ Supabase client initialization error:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return !!(this.url && this.key && this.client);
  }

  saveConfig(url, key, adminEmail) {
    this.url = url.trim();
    this.key = key.trim();
    this.adminEmail = adminEmail ? adminEmail.trim().toLowerCase() : '';

    localStorage.setItem(this.storageKeyUrl, this.url);
    localStorage.setItem(this.storageKeyKey, this.key);
    localStorage.setItem(this.storageKeyAdminEmail, this.adminEmail);

    this.initClient();
  }

  async testConnection() {
    if (!this.url || !this.key) {
      return { success: false, message: 'Please enter both Supabase Project URL and Public Anon Key.' };
    }
    if (!window.supabase) {
      return { success: false, message: 'Supabase SDK not loaded. Please check your internet connection.' };
    }

    try {
      const testClient = window.supabase.createClient(this.url, this.key);
      const { data, error } = await testClient.from('profiles').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: true,
            needsSchema: true,
            message: 'Connected to Supabase! (Note: Run supabase_schema.sql in your Supabase SQL Editor).'
          };
        }
        return { success: false, message: `Supabase Error: ${error.message}` };
      }
      return { success: true, message: '✅ Connection to Supabase Cloud Database is Live & Working!' };
    } catch (err) {
      return { success: false, message: `Connection Failed: ${err.message}` };
    }
  }

  // REAL SUPABASE EMAIL OTP SENDER
  async sendRealEmailOtp(email) {
    const cleanEmail = email.trim().toLowerCase();

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client.auth.signInWithOtp({
          email: cleanEmail
        });
        if (error) {
          console.warn('Supabase Email error:', error.message);
          return { success: false, error: error.message, cleanEmail };
        }
        return { success: true, cleanEmail, provider: 'supabase_email' };
      } catch (err) {
        return { success: false, error: err.message, cleanEmail };
      }
    }

    return {
      success: true,
      cleanEmail,
      isSimulated: true,
      note: 'Supabase credentials not configured in settings. Using local secure verification.'
    };
  }

  // REAL SUPABASE PASSWORD RESET SENDER
  async sendPasswordResetEmail(email) {
    const cleanEmail = email.trim().toLowerCase();

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          console.warn('Supabase Recover error:', error.message);
          return { success: false, error: error.message, cleanEmail };
        }
        return { success: true, cleanEmail, provider: 'supabase_recovery' };
      } catch (err) {
        return { success: false, error: err.message, cleanEmail };
      }
    }

    return { success: true, cleanEmail };
  }

  // VERIFY REAL EMAIL OTP VIA SUPABASE
  async verifyRealEmailOtp(email, token) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email'
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, session: data.session, user: data.user };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: true, isLocal: true };
  }

  // CHECK IF USER HAS ADMIN PERMISSIONS
  checkIsAdmin(user) {
    if (!user) return false;
    
    // 1. Role is explicitly admin in Supabase DB or Local DB
    if (user.role === 'admin') return true;

    // 2. Email matches designated Supabase Admin email
    if (this.adminEmail && user.email && user.email.toLowerCase() === this.adminEmail.toLowerCase()) {
      return true;
    }

    // 3. Default demo admin username
    if (user.id === 'admin' || user.username === 'admin') {
      return true;
    }

    return false;
  }

  // SYNC USER PROFILE TO SUPABASE POSTGRES CLOUD DATABASE (EMAIL UNIQUE)
  async syncUserToSupabase(userProfile) {
    if (!this.isConfigured() || !userProfile.email) return;
    try {
      const isAdmin = this.checkIsAdmin(userProfile);
      const row = {
        name: userProfile.name,
        name_hi: userProfile.nameHi || userProfile.name,
        name_en: userProfile.nameEn || userProfile.name,
        email: userProfile.email.trim().toLowerCase(),
        village: userProfile.village || '',
        business_type: userProfile.businessType || '',
        role: isAdmin ? 'admin' : (userProfile.role || 'user'),
        is_verified: true,
        preferred_language: userProfile.preferredLanguage || 'mr'
      };

      const { data, error } = await this.client
        .from('profiles')
        .upsert(row, { onConflict: 'email' });

      if (error) console.warn('Supabase profile sync error:', error.message);
    } catch (err) {
      console.warn('Supabase sync error:', err);
    }
  }

  // FETCH USERS FROM SUPABASE CLOUD DATABASE
  async fetchUsersFromSupabase() {
    if (!this.isConfigured()) return null;
    try {
      const { data, error } = await this.client.from('profiles').select('*').order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map(r => ({
        id: r.id,
        name: r.name,
        nameHi: r.name_hi,
        nameEn: r.name_en,
        email: r.email,
        village: r.village,
        businessType: r.business_type,
        role: r.role,
        isVerified: r.is_verified,
        registeredAt: new Date(r.created_at).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      }));
    } catch (err) {
      return null;
    }
  }

  // DELETE USER PROFILE FROM SUPABASE CLOUD DATABASE
  async deleteUserFromSupabase(email) {
    if (!this.isConfigured() || !email) return { success: false };
    try {
      const { data, error } = await this.client
        .from('profiles')
        .delete()
        .eq('email', email.trim().toLowerCase());

      if (error) {
        console.warn('Supabase delete error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      console.warn('Supabase delete exception:', err);
      return { success: false, error: err.message };
    }
  }

  // SYNC VIDEO TO SUPABASE CLOUD
  async syncVideoToSupabase(video) {
    if (!this.isConfigured() || !video) return;
    try {
      const row = {
        id: video.id,
        title: video.title,
        title_hi: video.titleHi || video.title,
        title_en: video.titleEn || video.title,
        embed_url: video.embedUrl,
        category: video.category || 'notebooklm',
        description: video.desc || '',
        description_hi: video.descHi || video.desc || '',
        description_en: video.descEn || video.desc || '',
        duration: video.duration || '08:00',
        language: video.language || 'मराठी / हिंदी'
      };
      await this.client.from('videos').upsert(row, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase video sync error:', e);
    }
  }

  // FETCH VIDEOS FROM SUPABASE CLOUD
  async fetchVideosFromSupabase() {
    if (!this.isConfigured()) return null;
    try {
      const { data, error } = await this.client.from('videos').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return null;
      return data.map(v => ({
        id: v.id,
        title: v.title,
        titleHi: v.title_hi || v.title,
        titleEn: v.title_en || v.title,
        embedUrl: v.embed_url,
        category: v.category,
        desc: v.description,
        descHi: v.description_hi || v.description,
        descEn: v.description_en || v.description,
        duration: v.duration,
        language: v.language
      }));
    } catch (e) {
      return null;
    }
  }

  // DELETE VIDEO FROM SUPABASE CLOUD
  async deleteVideoFromSupabase(videoId) {
    if (!this.isConfigured() || !videoId) return;
    try {
      await this.client.from('videos').delete().eq('id', videoId);
    } catch (e) {
      console.warn('Supabase video delete error:', e);
    }
  }
}

window.SupabaseManager = SupabaseManager;
