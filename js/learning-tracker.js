/**
 * Aapla Vyapar, Aapli Bhasha - Learning Progress & Certificate Engine
 * Multilingual dynamic progress starting at 0% for new users/guests
 * Real actions: video completion, translations, voice queries, badges, dynamic localized quiz, and verified certificate
 */

class LearningTracker {
  constructor() {
    this.storageKey = 'aapla_vyapar_learning_state';
    this.state = this.loadState();
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed.completedModules)) parsed.completedModules = [];
        parsed.completedModules = parsed.completedModules.filter(id => id.startsWith('vid-'));
        if (!Array.isArray(parsed.badges)) parsed.badges = [];
        return parsed;
      } catch (e) {
        console.error('Error reading learning state:', e);
      }
    }

    // Default clean 0% initial state for all new users & guests
    return {
      completedModules: [],
      totalModules: 4,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      translationsCount: 0,
      voiceQueriesCount: 0,
      quizScore: 0,
      badges: [],
      userName: window.currentUserName || 'नवीन उद्योजक (New Entrepreneur)',
      village: 'महाराष्ट्र'
    };
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    this.updateUI();
  }

  setUser(user) {
    if (!user) return;
    const userKey = user.mobile || user.id || 'guest';
    this.storageKey = `aapla_vyapar_learning_state_${userKey}`;
    this.state = this.loadState();
    this.state.userName = user.name || this.state.userName;
    this.state.village = user.village || this.state.village || 'महाराष्ट्र';
    this.saveState();
  }

  resetProgress() {
    this.state.completedModules = [];
    this.state.translationsCount = 0;
    this.state.voiceQueriesCount = 0;
    this.state.quizScore = 0;
    this.state.badges = [];
    this.state.streakDays = 1;
    this.saveState();
    if (typeof window.renderVideoHub === 'function') {
      window.renderVideoHub();
    }
    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? 'प्रगति 0% पर रीसेट हो गई!' : lang === 'en' ? 'Progress reset to 0%!' : 'प्रगती ०% वर रीसेट झाली!';
    showToast(msg, 'info');
  }

  getTotalModulesCount() {
    if (window.adminPortal && typeof window.adminPortal.getVideos === 'function') {
      const vids = window.adminPortal.getVideos();
      if (vids && vids.length > 0) return vids.length;
    }
    return 4;
  }

  markModuleComplete(moduleId) {
    if (!this.state.completedModules.includes(moduleId)) {
      this.state.completedModules.push(moduleId);
      const lang = window.currentLanguage || 'mr';
      const msg = lang === 'hi' ? '🎉 मॉड्यूल सफलतापूर्वक पूर्ण हुआ! प्रगति बढ़ गई।' : lang === 'en' ? '🎉 Module completed! Progress increased.' : '🎉 मॉड्यूल यशस्वीरित्या पूर्ण झाले! प्रगती वाढली.';
      showToast(msg, 'success');
      this.checkBadgeUnlocks();
      this.saveState();
    }
  }

  recordTranslation() {
    this.state.translationsCount = (this.state.translationsCount || 0) + 1;
    this.checkBadgeUnlocks();
    this.saveState();
  }

  recordVoiceQuery() {
    this.state.voiceQueriesCount = (this.state.voiceQueriesCount || 0) + 1;
    this.checkBadgeUnlocks();
    this.saveState();
  }

  checkBadgeUnlocks() {
    const b = this.state.badges;
    const total = this.getTotalModulesCount();
    const lang = window.currentLanguage || 'mr';

    // Badge 1: Pioneer (1st module completed)
    if (this.state.completedModules.length >= 1 && !b.includes('pioneer')) {
      b.push('pioneer');
      const msg = lang === 'hi' ? '🏆 नया बैज अनलॉक: डिजिटल पायनियर!' : lang === 'en' ? '🏆 New Badge Unlocked: Digital Pioneer!' : '🏆 नवीन बॅज अनलॉक: डिजिटल पायनियर!';
      showToast(msg, 'success');
    }

    // Badge 2: Payment Master (Completed payment module or 2 modules)
    if ((this.state.completedModules.includes('vid-3') || this.state.completedModules.length >= 2) && !b.includes('payments')) {
      b.push('payments');
      const msg = lang === 'hi' ? '🏆 नया बैज अनलॉक: पेमेंट मास्टर!' : lang === 'en' ? '🏆 New Badge Unlocked: Payment Master!' : '🏆 नवीन बॅज अनलॉक: पेमेंट मास्टर!';
      showToast(msg, 'success');
    }

    // Badge 3: Translator Expert (Used translator >= 2 times)
    if (this.state.translationsCount >= 2 && !b.includes('translator')) {
      b.push('translator');
      const msg = lang === 'hi' ? '🏆 नया बैज अनलॉक: अनुवाद विशेषज्ञ!' : lang === 'en' ? '🏆 New Badge Unlocked: Translation Expert!' : '🏆 नवीन बॅज अनलॉक: भाषांतर तज्ज्ञ!';
      showToast(msg, 'success');
    }

    // Badge 4: Voice Champion (Asked >= 2 voice queries)
    if (this.state.voiceQueriesCount >= 2 && !b.includes('voice')) {
      b.push('voice');
      const msg = lang === 'hi' ? '🏆 नया बैज अनलॉक: वॉयस चैंपियन!' : lang === 'en' ? '🏆 New Badge Unlocked: Voice Champion!' : '🏆 नवीन बॅज अनलॉक: व्हॉईस चॅम्पियन!';
      showToast(msg, 'success');
    }

    // Badge 5: Maha-Entrepreneur (All modules completed)
    if (this.state.completedModules.length >= total && !b.includes('master')) {
      b.push('master');
      const msg = lang === 'hi' ? '🌟 महा-उद्यमी बैज प्राप्त हुआ! 100% पूर्ण।' : lang === 'en' ? '🌟 Maha-Entrepreneur Badge Earned! 100% Complete.' : '🌟 महा-उद्योजक (Maha-Entrepreneur) बॅज मिळाला! १००% पूर्ण.';
      showToast(msg, 'success');
    }
  }

  getProgressPercentage() {
    const total = this.getTotalModulesCount();
    const completed = this.state.completedModules.length;
    return Math.min(100, Math.round((completed / total) * 100));
  }

  isCertificateUnlocked() {
    return this.state.completedModules.length >= 3;
  }

  updateUI() {
    const pct = this.getProgressPercentage();
    const total = this.getTotalModulesCount();
    const completed = this.state.completedModules.length;
    const lang = window.currentLanguage || 'mr';
    const t = window.translations[lang] || window.translations.mr;
    
    // Progress Bars
    document.querySelectorAll('.hp-fill, .mini-fill, #tracker-progress-fill').forEach(el => {
      el.style.width = `${pct}%`;
    });

    // Progress Text
    document.querySelectorAll('.progress-pct-text').forEach(el => {
      el.innerText = `${pct}%`;
    });

    document.querySelectorAll('.completed-count-text').forEach(el => {
      el.innerText = `${completed} / ${total}`;
    });

    // Update streak
    const streakEl = document.getElementById('streak-count-val');
    if (streakEl) {
      const daysText = lang === 'hi' ? 'दिन' : lang === 'en' ? 'Day' : 'दिवस';
      streakEl.innerText = `${this.state.streakDays} ${daysText}`;
    }

    // Badges Container
    const badgeContainer = document.getElementById('badges-grid');
    if (badgeContainer) {
      badgeContainer.innerHTML = this.renderBadgesHtml(lang);
    }

    // Certificate Lock state
    const certLockBox = document.getElementById('cert-status-box');
    const certBtn = document.getElementById('btn-download-cert');
    if (certLockBox && certBtn) {
      if (this.isCertificateUnlocked()) {
        certLockBox.className = 'cert-status unlocked';
        certLockBox.innerHTML = `
          <div style="font-size:32px;">🎓</div>
          <div>
            <h4 style="color:#0f6b3d;font-weight:800;font-size:15.5px;">${t.trackCertEligible || 'प्रमाणपत्र तयार आहे!'} (${pct}% पूर्ण)</h4>
            <p style="font-size:12.5px;color:#555;">${t.trackCertEligibleDesc || 'तुम्ही आवश्यक मॉड्यूल्स पूर्ण केले आहेत. तुमचे अधिकृत डिजिटल प्रमाणपत्र डाउनलोड करू शकता.'}</p>
          </div>
        `;
        certBtn.disabled = false;
        certBtn.classList.remove('btn-disabled');
      } else {
        const remaining = Math.max(0, 3 - completed);
        certLockBox.className = 'cert-status locked';
        const remText = lang === 'hi' ? `प्रमाण पत्र अनलॉक करने के लिए और <b>${remaining} मॉड्यूल</b> पूरे करें (कम से कम 3 आवश्यक)।` : lang === 'en' ? `Complete <b>${remaining} more modules</b> to unlock certificate (minimum 3 required).` : `प्रमाणपत्र अनलॉक करण्यासाठी आणखी <b>${remaining} मॉड्यूल्स</b> पूर्ण करा (किमान ३ आवश्यक).`;

        certLockBox.innerHTML = `
          <div style="font-size:32px;">🔒</div>
          <div>
            <h4 style="color:#666;font-weight:800;font-size:15.5px;">${t.trackCertLocked || 'प्रमाणपत्र सध्या लॉक आहे'} (${pct}% ${lang === 'en' ? 'Done' : 'पूर्ण'})</h4>
            <p style="font-size:12.5px;color:#777;">${remText}</p>
          </div>
        `;
        certBtn.disabled = true;
        certBtn.classList.add('btn-disabled');
      }
    }

    // Render Localized Daily Quiz
    this.renderQuiz(lang);
  }

  renderBadgesHtml(lang = window.currentLanguage || 'mr') {
    const badgesData = {
      mr: [
        { id: 'pioneer', icon: '🥇', title: 'डिजिटल पायनियर', desc: 'पहिले मॉड्यूल पूर्ण केले' },
        { id: 'payments', icon: '💳', title: 'पेमेंट मास्टर', desc: 'UPI व QR कोड शिकले' },
        { id: 'translator', icon: '🌐', title: 'भाषांतर तज्ज्ञ', desc: 'दस्तऐवज भाषांतर वापरले' },
        { id: 'voice', icon: '🎙️', title: 'व्हॉईस चॅम्पियन', desc: 'आवाजाने प्रश्न विचारले' },
        { id: 'master', icon: '🏆', title: 'महा-उद्योजक', desc: 'सर्व मॉड्यूल्स पूर्ण केले' }
      ],
      hi: [
        { id: 'pioneer', icon: '🥇', title: 'डिजिटल पायनियर', desc: 'पहला मॉड्यूल पूरा किया' },
        { id: 'payments', icon: '💳', title: 'पेमेंट मास्टर', desc: 'UPI व QR कोड सीखा' },
        { id: 'translator', icon: '🌐', title: 'अनुवाद विशेषज्ञ', desc: 'दस्तावेज़ अनुवाद उपयोग किया' },
        { id: 'voice', icon: '🎙️', title: 'वॉयस चैंपियन', desc: 'आवाज़ से प्रश्न पूछे' },
        { id: 'master', icon: '🏆', title: 'महा-उद्यमी', desc: 'सभी मॉड्यूल पूरे किए' }
      ],
      en: [
        { id: 'pioneer', icon: '🥇', title: 'Digital Pioneer', desc: 'Completed first module' },
        { id: 'payments', icon: '💳', title: 'Payment Master', desc: 'Mastered UPI & QR tools' },
        { id: 'translator', icon: '🌐', title: 'Translation Pro', desc: 'Used document translator' },
        { id: 'voice', icon: '🎙️', title: 'Voice Champion', desc: 'Asked voice assistant queries' },
        { id: 'master', icon: '🏆', title: 'Maha-Entrepreneur', desc: 'Completed all course modules' }
      ]
    };

    const allBadges = badgesData[lang] || badgesData.mr;
    const earned = this.state.badges || [];
    const lockedDesc = lang === 'hi' ? 'अनलॉक करने के लिए अभ्यास करें' : lang === 'en' ? 'Practice to unlock' : 'अनलॉक करण्यासाठी सराव करा';

    return allBadges.map(b => {
      const isEarned = earned.includes(b.id);
      return `
        <div class="badge-card ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-icon">${isEarned ? b.icon : '🔒'}</div>
          <div class="badge-title">${b.title}</div>
          <div class="badge-desc">${isEarned ? b.desc : lockedDesc}</div>
        </div>
      `;
    }).join('');
  }

  renderQuiz(lang = window.currentLanguage || 'mr') {
    const quizContainer = document.getElementById('daily-quiz-container');
    if (!quizContainer) return;

    const t = window.translations[lang] || window.translations.mr;

    quizContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <b style="font-size:16px; color:var(--green-dark);">${t.trackQuizTitle}</b>
        <span class="badge badge-warning">⭐ ${lang === 'hi' ? 'ज्ञान अभ्यास' : lang === 'en' ? 'Knowledge Check' : 'ज्ञान सराव'}</span>
      </div>

      <form id="daily-quiz-form">
        <div class="quiz-question-box" style="margin-bottom:16px;">
          <p style="font-size:13.5px; font-weight:700; margin-bottom:8px; color:var(--ink);">${t.quizQ1}</p>
          <label class="quiz-option"><input type="radio" name="q1" value="a" required> ${t.quizQ1OptA}</label>
          <label class="quiz-option"><input type="radio" name="q1" value="b"> ${t.quizQ1OptB}</label>
        </div>

        <div class="quiz-question-box" style="margin-bottom:16px;">
          <p style="font-size:13.5px; font-weight:700; margin-bottom:8px; color:var(--ink);">${t.quizQ2}</p>
          <label class="quiz-option"><input type="radio" name="q2" value="a"> ${t.quizQ2OptA}</label>
          <label class="quiz-option"><input type="radio" name="q2" value="b"> ${t.quizQ2OptB}</label>
          <label class="quiz-option"><input type="radio" name="q2" value="c"> ${t.quizQ2OptC}</label>
        </div>

        <div class="quiz-question-box" style="margin-bottom:16px;">
          <p style="font-size:13.5px; font-weight:700; margin-bottom:8px; color:var(--ink);">${t.quizQ3}</p>
          <label class="quiz-option"><input type="radio" name="q3" value="a"> ${t.quizQ3OptA}</label>
          <label class="quiz-option"><input type="radio" name="q3" value="b"> ${t.quizQ3OptB}</label>
        </div>

        <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-quiz">${t.btnSubmitQuiz || 'उत्तर तपासा'}</button>
      </form>

      <div id="quiz-result-box" style="display:none; margin-top:14px; background:var(--green-light); padding:16px; border-radius:12px; border:1px solid #bce1ca;"></div>
    `;

    // Re-bind quiz submit
    const form = document.getElementById('daily-quiz-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const answers = {
          q1: formData.get('q1'),
          q2: formData.get('q2'),
          q3: formData.get('q3')
        };
        const score = this.submitQuiz(answers, lang);
        const resultBox = document.getElementById('quiz-result-box');
        if (resultBox) {
          resultBox.style.display = 'flex';
          resultBox.style.alignItems = 'center';
          resultBox.style.gap = '12px';
          
          const title = lang === 'hi' ? `आपका स्कोर: 3 में से ${score}!` : lang === 'en' ? `Your Score: ${score} out of 3!` : `तुमचा स्कोअर: ३ पैकी ${score}!`;
          const desc = lang === 'hi' ? 'बधाई! नियमित अभ्यास से आपका डिजिटल व्यापार सुरक्षित रहेगा।' : lang === 'en' ? 'Congratulations! Regular practice keeps your digital transactions safe.' : 'अभिनंदन! नियमित सरावामुळे तुमचा डिजिटल व्यवसाय सुरक्षित राहील.';

          resultBox.innerHTML = `
            <div style="font-size:28px;">${score === 3 ? '🎉' : '👍'}</div>
            <div>
              <b style="font-size:15px; color:var(--green-dark);">${title}</b>
              <p style="font-size:12.5px; color:#444; margin-top:3px;">${desc}</p>
            </div>
          `;
        }
      });
    }
  }

  submitQuiz(answers, lang = window.currentLanguage || 'mr') {
    let score = 0;
    if (answers.q1 === 'b') score++;
    if (answers.q2 === 'c') score++;
    if (answers.q3 === 'a') score++;

    this.state.quizScore = score;
    this.saveState();
    const msg = lang === 'hi' ? `क्विज सबमिट हुई! स्कोर: 3 में से ${score}` : lang === 'en' ? `Quiz submitted! Score: ${score}/3` : `क्विझ सबमिट झाली! स्कोअर: ३ पैकी ${score}`;
    showToast(msg, score >= 2 ? 'success' : 'info');
    return score;
  }

  generateCertificate(userName = this.state.userName) {
    const lang = window.currentLanguage || 'mr';
    if (!this.isCertificateUnlocked()) {
      const lockMsg = lang === 'hi' ? 'प्रमाण पत्र डाउनलोड करने के लिए कम से कम 3 मॉड्यूल पूरे करें।' : lang === 'en' ? 'Complete at least 3 modules to unlock your certificate.' : 'प्रमाणपत्र डाउनलोड करण्यासाठी किमान ३ मॉड्यूल्स पूर्ण करा.';
      showToast(lockMsg, 'warning');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Background Gradient & Border
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, 1200, 800);

    // Decorative Borders
    ctx.strokeStyle = '#0f6b3d';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 1140, 740);

    ctx.strokeStyle = '#e8722a';
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, 1112, 712);

    // Multilingual Certificate Texts
    let title1 = 'आपला व्यापार, आपली भाषा';
    let title2 = 'महाराष्ट्र ग्रामीण डिजिटल उद्योजकता साक्षरता अभियान';
    let certifyText = 'हे प्रमाणित करण्यात येते की';
    let body1 = 'यांनी "ग्रामीण डिजिटल व्यवसाय, NotebookLM व्हिडिओ भाषांतर व डिजिटल पेमेंट्स"';
    let body2 = 'हा प्रशिक्षण कोर्स यशस्वीरीत्या पूर्ण करून डिजिटल साक्षरता संपादन केली आहे.';
    let dateLabel = 'दिनांक:';
    let certLabel = 'प्रमाणपत्र आयडी:';
    let signTitle = 'समन्वयक, डिजिटल साक्षरता मिशन';

    if (lang === 'hi') {
      title1 = 'अपना व्यापार, अपनी भाषा';
      title2 = 'ग्रामीण डिजिटल उद्यमिता साक्षरता अभियान';
      certifyText = 'प्रमाणित किया जाता है कि';
      body1 = 'इन्होंने "ग्रामीण डिजिटल व्यापार, NotebookLM वीडियो अनुवाद व डिजिटल पेमेंट्स"';
      body2 = 'प्रशिक्षण कोर्स सफलतापूर्वक पूरा करके डिजिटल साक्षरता प्राप्त की है।';
      dateLabel = 'तारीख:';
      certLabel = 'प्रमाण पत्र आईडी:';
      signTitle = 'समन्वयक, डिजिटल साक्षरता मिशन';
    } else if (lang === 'en') {
      title1 = 'Aapla Vyapar, Aapli Bhasha';
      title2 = 'Rural Entrepreneurship Digital Literacy Mission';
      certifyText = 'This is to certify that';
      body1 = 'has successfully completed the comprehensive training course on';
      body2 = '"Rural Digital Commerce, NotebookLM Video Translation & Digital Payments".';
      dateLabel = 'Date:';
      certLabel = 'Certificate ID:';
      signTitle = 'Coordinator, Digital Literacy Mission';
    }

    // Header Title
    ctx.fillStyle = '#0f6b3d';
    ctx.font = 'bold 36px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title1, 600, 120);

    ctx.fillStyle = '#e8722a';
    ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(title2, 600, 160);

    // Certificate of Achievement
    ctx.fillStyle = '#222';
    ctx.font = '24px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(certifyText, 600, 240);

    // Candidate Name
    ctx.fillStyle = '#0f6b3d';
    ctx.font = 'bold 44px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(userName, 600, 310);

    // Underline name
    ctx.beginPath();
    ctx.moveTo(350, 330);
    ctx.lineTo(850, 330);
    ctx.strokeStyle = '#0f6b3d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Body Text
    ctx.fillStyle = '#444';
    ctx.font = '20px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(body1, 600, 390);
    ctx.fillText(body2, 600, 430);

    // Verification Details
    const certId = `AVAB-MH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'en' ? 'en-IN' : 'mr-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    ctx.fillStyle = '#666';
    ctx.font = '16px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${dateLabel} ${dateStr}`, 90, 680);
    ctx.fillText(`${certLabel} ${certId}`, 90, 710);

    // Official Seal Simulation
    ctx.beginPath();
    ctx.arc(600, 640, 55, 0, 2 * Math.PI);
    ctx.fillStyle = '#fef3e7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e8722a';
    ctx.stroke();

    ctx.fillStyle = '#e8722a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED', 600, 635);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('IDEA LAB 2026', 600, 655);

    // Authority Signature Simulation
    ctx.textAlign = 'right';
    ctx.fillStyle = '#222';
    ctx.font = 'italic bold 22px "Brush Script MT", cursive, sans-serif';
    ctx.fillText('Pramod V. Patil', 1110, 670);
    ctx.font = 'bold 15px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(signTitle, 1110, 700);

    // Trigger Download
    const link = document.createElement('a');
    link.download = `Aapla_Vyapar_Certificate_${userName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    const successMsg = lang === 'hi' ? '🏆 बधाई! प्रमाण पत्र डाउनलोड हो गया!' : lang === 'en' ? '🏆 Certificate downloaded successfully!' : '🏆 अभिनंदन! प्रमाणपत्र डाउनलोड झाले!';
    showToast(successMsg, 'success');
  }
}

window.LearningTracker = LearningTracker;
