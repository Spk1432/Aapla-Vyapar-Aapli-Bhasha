/**
 * Aapla Vyapar, Aapli Bhasha - Voice Assistant Engine
 * Speech-to-Text (STT), Neural Google TTS Audio Player (Marathi/Hindi/English) & Web SpeechSynthesis
 */

class VoiceAssistant {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synth = window.speechSynthesis || null;
    this.currentLang = 'mr'; // 'mr', 'hi', 'en'
    this.currentVoice = null;
    this.currentAudio = null;
    this.audioQueue = [];
    
    this.initSpeechRecognition();
    this.initKnowledgeBase();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateUiState(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.handleUserInput(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        this.stopListening();
        const lang = this.currentLang || 'mr';
        const msg = lang === 'hi' ? 'माइक उपयोग में समस्या या अनुमति अस्वीकृत।' : lang === 'en' ? 'Microphone error or permission denied.' : 'माइक वापरण्यात अडचण आली किंवा परवानगी नाकारली.';
        showToast(msg, 'warning');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateUiState(false);
      };
    } else {
      console.log('Web Speech Recognition API not supported in this browser.');
    }
  }

  getLocaleCode(lang = this.currentLang) {
    if (lang === 'mr') return 'mr-IN';
    if (lang === 'hi') return 'hi-IN';
    return 'en-IN';
  }

  startListening(lang = this.currentLang) {
    if (!this.recognition) {
      const msg = lang === 'hi' ? 'आपका ब्राउज़र वॉयस इनपुट का समर्थन नहीं करता है। कृपया टेक्स्ट टाइप करें।' : lang === 'en' ? 'Voice input is not supported in this browser. Please type text.' : 'तुमचा ब्राऊझर व्हॉईस इनपुटला सपोर्ट करत नाही. कृपया मजकूर टाईप करा.';
      showToast(msg, 'info');
      return;
    }
    this.currentLang = lang;
    this.recognition.lang = this.getLocaleCode(lang);
    try {
      this.recognition.start();
    } catch (e) {
      this.recognition.stop();
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.updateUiState(false);
  }

  toggleListening(lang) {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening(lang);
    }
  }

  updateUiState(listening) {
    const micBtn = document.getElementById('va-mic-btn');
    const statusText = document.getElementById('va-status-text');
    const waveEl = document.getElementById('va-waves');

    if (micBtn) {
      micBtn.classList.toggle('active-listening', listening);
      micBtn.innerHTML = listening ? '⏹️' : '🎙️';
    }
    if (statusText) {
      const t = window.translations[this.currentLang] || window.translations.mr;
      statusText.innerHTML = listening ? t.voiceListening : t.voiceBtnStart;
    }
    if (waveEl) {
      waveEl.classList.toggle('active', listening);
    }
  }

  handleUserInput(userQuery) {
    const queryInput = document.getElementById('va-user-query');
    if (queryInput) {
      queryInput.value = userQuery;
    }
    this.processQuery(userQuery);
  }

  processQuery(query) {
    const statusText = document.getElementById('va-status-text');
    const t = window.translations[this.currentLang] || window.translations.mr;
    if (statusText) statusText.innerHTML = t.voiceThinking;

    // Small delay to simulate processing
    setTimeout(() => {
      const response = this.findAnswer(query, this.currentLang);
      this.displayAnswer(response, query);
      this.speak(response, this.currentLang);
      if (statusText) statusText.innerHTML = t.voiceBtnStart;
    }, 450);
  }

  findAnswer(query, lang = 'mr') {
    const q = query.toLowerCase();

    // NotebookLM queries
    if (q.includes('notebook') || q.includes('व्हिडिओ') || q.includes('video') || q.includes('भाषांतर') || q.includes('translate')) {
      if (lang === 'mr') {
        return "NotebookLM वापरण्यासाठी: प्रथम कोणत्याही इंग्रजी व्हिडिओची लिंक किंवा ट्रान्सक्रिप्ट कॉपी करा. नंतर notebooklm.google.com वर जाऊन Source म्हणून जोडा. तिथे 'हा व्हिडिओ मराठीत समजावून सांगा' असे विचारा आणि ऑडिओ ओव्हरव्ह्यूवर क्लिक करून मराठीत ऐका!";
      } else if (lang === 'hi') {
        return "NotebookLM का उपयोग करने के लिए: सबसे पहले किसी भी अंग्रेजी वीडियो का लिंक या ट्रांसक्रिप्ट कॉपी करें। फिर notebooklm.google.com पर जाकर सोर्स के रूप में जोड़ें। वहां 'इसे हिंदी में समझाएं' लिखकर पूछें और ऑडियो ओवरव्यू पर क्लिक करके सुनें!";
      } else {
        return "To use NotebookLM: Copy the transcript or link of any video, add it as a Source in Google NotebookLM, ask 'Summarize in local language', and click 'Audio Overview' to listen to an AI explanation!";
      }
    }

    // QR Code / UPI queries
    if (q.includes('qr') || q.includes('payment') || q.includes('phonepe') || q.includes('gpay') || q.includes('पेमेंट') || q.includes('क्युआर') || q.includes('साउंडबॉक्स')) {
      if (lang === 'mr') {
        return "तुमच्या दुकानासाठी QR कोड मिळवण्यासाठी: PhonePe Business किंवा Google Pay Business ॲप डाउनलोड करा. तुमचा बँक खाते नंबर आणि पॅन कार्ड जोडून ५ मिनिटांत मोफत QR कोड जनरेट करा. साउंडबॉक्स मागवून ग्राहकांचे पेमेंट आवाजात ऐका.";
      } else if (lang === 'hi') {
        return "दुकान के लिए QR कोड लगाने हेतु: PhonePe Business या Google Pay Business ऐप डाउनलोड करें। अपना बैंक खाता और पैन कार्ड जोड़कर 5 मिनट में फ्री QR कोड प्राप्त करें। पेमेंट की पुष्टि के लिए साउंडबॉक्स भी ले सकते हैं।";
      } else {
        return "To set up a QR code: Download PhonePe Business or Google Pay Business app. Link your bank account and PAN to generate a free QR code instantly. Soundbox can also be ordered for instant audio payment alerts.";
      }
    }

    // Mudra Loan / Govt Scheme queries
    if (q.includes('mudra') || q.includes('loan') || q.includes('कर्ज') || q.includes('लोन') || q.includes('pmegp') || q.includes('योजना') || q.includes('scheme')) {
      if (lang === 'mr') {
        return "मुद्रा लोन (Mudra Loan) ३ प्रकारात मिळते: शिशु (₹५०,००० पर्यंत), किशोर (₹५ लाखांपर्यंत) आणि तरुण (₹१० लाखांपर्यंत). यासाठी आधार कार्ड, पॅन कार्ड, दुकानाची नोंदणी (Shop Act) आणि बँक स्टेटमेंट लागते. जवळच्या राष्ट्रीयकृत बँकेत अर्ज करा.";
      } else if (lang === 'hi') {
        return "मुद्रा लोन 3 श्रेणियों में मिलता है: शिशु (₹50,000 तक), किशोर (₹5 लाख तक), और तरुण (₹10 लाख तक)। आवश्यक दस्तावेज़: आधार कार्ड, पैन कार्ड, दुकान का पंजीकरण (उद्यम) और बैंक खाता विवरण। किसी भी बैंक में आवेदन करें।";
      } else {
        return "Mudra Loans are available in 3 categories: Shishu (up to ₹50k), Kishor (up to ₹5 Lakhs), and Tarun (up to ₹10 Lakhs). You need Aadhaar, PAN, Udyam Registration, and 6 months bank statement.";
      }
    }

    // Billing / Khatabook queries
    if (q.includes('bill') || q.includes('बिल') || q.includes('खातेवही') || q.includes('हिशोब') || q.includes('stock') || q.includes('स्टॉक') || q.includes('vyapar')) {
      if (lang === 'mr') {
        return "मोबाईलवर बिल बनवण्यासाठी आणि उधारी ठेवण्यासाठी 'व्यापार' (Vyapar App) किंवा 'खाताबुक' (Khatabook) ॲप वापरा. हे मराठीत उपलब्ध आहे आणि ग्राहकांना थेट WhatsApp वर बिलाची पावती पाठवता येते.";
      } else if (lang === 'hi') {
        return "मोबाइल पर बिल बनाने और उधारी का हिसाब रखने के लिए 'व्यापार ऐप' या 'खाताबुक' का उपयोग करें। यह आपकी भाषा में है और सीधे WhatsApp पर डिजिटल बिल भेजता है।";
      } else {
        return "For digital billing and accounting, use apps like 'Vyapar' or 'Khatabook'. They support regional languages, barcode scanning, and direct WhatsApp invoice sharing.";
      }
    }

    // Default friendly answer
    if (lang === 'mr') {
      return "तुमचा प्रश्न समजला: '" + query + "'. आमच्या डिजिटल लर्निंग हबमध्ये याबद्दल सविस्तर व्हिडिओ उपलब्ध आहे. अधिक मार्गदर्शनासाठी तुम्ही 'मदत आणि प्रश्न' विभागात तज्ज्ञांना थेट विचारू शकता.";
    } else if (lang === 'hi') {
      return "आपका प्रश्न प्राप्त हुआ: '" + query + "'. हमारे डिजिटल लर्निंग हब में इसके लिए वीडियो उपलब्ध है। आप अधिक जानकारी के लिए 'मदद और सवाल' सेक्शन में पूछ सकते हैं।";
    } else {
      return "Regarding your question '" + query + "': Check our Video Training Hub for step-by-step guidance, or submit your specific question to our Help Desk for an admin reply.";
    }
  }

  displayAnswer(answerText, userQuery) {
    const answerContainer = document.getElementById('va-answer-box');
    const answerTextEl = document.getElementById('va-answer-text');
    const questionTextEl = document.getElementById('va-question-badge');

    if (answerContainer && answerTextEl) {
      answerContainer.style.display = 'block';
      answerTextEl.innerText = answerText;
      if (questionTextEl) {
        questionTextEl.innerText = '🗣️ "' + userQuery + '"';
      }
      answerContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- Universal Text-to-Speech (TTS) Engine with Google Marathi Neural Stream & SpeechSynthesis ---
  speak(text, lang = this.currentLang, onStartCallback = null, onEndCallback = null) {
    const cleanText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    // Stop any currently running speech or audio
    this.stopSpeaking();

    // Strategy 1: For Marathi ('mr') & Hindi ('hi'), use Google Neural TTS Stream
    // This gives native, crystal-clear Marathi pronunciation on all Windows/Mac/Android browsers
    const targetLangCode = lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'en';

    this.playNeuralTtsAudio(cleanText, targetLangCode, onStartCallback, onEndCallback);
  }

  playNeuralTtsAudio(text, langCode, onStart, onEnd) {
    // Split into chunks of max 140 chars at sentence/comma boundaries for continuous streaming
    const chunks = this.splitTextIntoChunks(text, 140);
    if (chunks.length === 0) return;

    this.audioQueue = [...chunks];
    this.isSpeaking = true;
    if (onStart) onStart();

    const speakerIcon = document.getElementById('va-speak-btn');
    if (speakerIcon) speakerIcon.classList.add('pulse-anim');

    const playNextChunk = () => {
      if (!this.isSpeaking || this.audioQueue.length === 0) {
        this.isSpeaking = false;
        if (speakerIcon) speakerIcon.classList.remove('pulse-anim');
        if (onEnd) onEnd();
        return;
      }

      const chunk = this.audioQueue.shift();
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${langCode}&client=tw-ob`;

      const audio = new Audio(ttsUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        playNextChunk();
      };

      audio.onerror = (e) => {
        console.warn('Google TTS audio stream error, falling back to Browser SpeechSynthesis:', e);
        // Fallback to Browser SpeechSynthesis if audio stream network blocked
        this.fallbackBrowserSpeech(this.audioQueue.length > 0 ? [chunk, ...this.audioQueue].join(' ') : chunk, langCode, onStart, onEnd);
      };

      audio.play().catch(err => {
        console.warn('Audio play prevented/fallback to SpeechSynthesis:', err);
        this.fallbackBrowserSpeech(text, langCode, onStart, onEnd);
      });
    };

    playNextChunk();
  }

  splitTextIntoChunks(text, maxLen = 140) {
    const sentences = text.match(/[^.!?।\n,]+[.!?।\n,]?/g) || [text];
    const chunks = [];
    let current = '';

    for (let s of sentences) {
      if ((current + s).length > maxLen) {
        if (current.trim()) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  fallbackBrowserSpeech(text, lang, onStart, onEnd) {
    if (!('speechSynthesis' in window)) {
      this.isSpeaking = false;
      if (onEnd) onEnd();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    if (synth.paused) synth.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;

    const voices = synth.getVoices() || [];
    const targetCode = this.getLocaleCode(lang).toLowerCase();

    let matchedVoice = voices.find(v => {
      const vLang = (v.lang || '').replace('_', '-').toLowerCase();
      return vLang === targetCode || vLang.startsWith(lang);
    });

    if (!matchedVoice && (lang === 'mr' || lang === 'hi')) {
      matchedVoice = voices.find(v => {
        const vLang = (v.lang || '').replace('_', '-').toLowerCase();
        const vName = (v.name || '').toLowerCase();
        return vLang.includes('hi') || vLang.includes('in') || vName.includes('hindi') || vName.includes('india');
      });
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || this.getLocaleCode(lang);
    } else {
      utterance.lang = this.getLocaleCode(lang);
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    setTimeout(() => {
      synth.resume();
      synth.speak(utterance);
    }, 40);
  }

  stopSpeaking() {
    this.isSpeaking = false;
    this.audioQueue = [];

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const speakerIcon = document.getElementById('va-speak-btn');
    if (speakerIcon) speakerIcon.classList.remove('pulse-anim');
  }

  initKnowledgeBase() {
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.synth.getVoices();
      };
    }
  }
}

window.VoiceAssistant = VoiceAssistant;
