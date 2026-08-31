/**
 * Aapla Vyapar, Aapli Bhasha - Admin Management Engine
 * Real Video Tutorials, YouTube URL Extractor, Document Repository & Query Resolution Desk
 */

class AdminPortal {
  constructor() {
    this.videosKey = 'aapla_vyapar_admin_videos';
    this.docsKey = 'aapla_vyapar_admin_docs';
    this.queriesKey = 'aapla_vyapar_admin_queries';

    this.initDefaultData();
    setTimeout(() => this.syncFromCloud(), 800);
  }

  async syncFromCloud() {
    if (!window.supabaseManager) return;
    try {
      // 1. VIDEOS: Bidirectional Sync (Desktop Local -> Supabase Cloud -> Phone)
      if (typeof window.supabaseManager.fetchVideosFromSupabase === 'function') {
        const cloudVideos = await window.supabaseManager.fetchVideosFromSupabase();
        const localVideos = this.getVideos();

        // 1A. Back-sync: Upload any local videos that are missing from Supabase Cloud
        if (localVideos && localVideos.length > 0) {
          for (const lv of localVideos) {
            const existsInCloud = cloudVideos && cloudVideos.some(cv => cv.id === lv.id || cv.embedUrl === lv.embedUrl);
            if (!existsInCloud) {
              await window.supabaseManager.syncVideoToSupabase(lv);
            }
          }
        }

        // 1B. Down-sync: Merge Supabase Cloud videos into local storage
        if (cloudVideos && cloudVideos.length > 0) {
          const merged = [...cloudVideos];
          localVideos.forEach(lv => {
            if (!merged.some(mv => mv.id === lv.id || mv.embedUrl === lv.embedUrl)) {
              merged.push(lv);
            }
          });
          localStorage.setItem(this.videosKey, JSON.stringify(merged));
        }
      }

      // 2. DOCUMENTS: Bidirectional Sync
      if (typeof window.supabaseManager.fetchDocsFromSupabase === 'function') {
        const cloudDocs = await window.supabaseManager.fetchDocsFromSupabase();
        const localDocs = this.getDocs();

        if (localDocs && localDocs.length > 0) {
          for (const ld of localDocs) {
            const existsInCloud = cloudDocs && cloudDocs.some(cd => cd.id === ld.id || cd.title === ld.title);
            if (!existsInCloud) {
              await window.supabaseManager.syncDocToSupabase(ld);
            }
          }
        }

        if (cloudDocs && cloudDocs.length > 0) {
          const mergedDocs = [...cloudDocs];
          localDocs.forEach(ld => {
            if (!mergedDocs.some(md => md.id === ld.id || md.title === ld.title)) {
              mergedDocs.push(ld);
            }
          });
          localStorage.setItem(this.docsKey, JSON.stringify(mergedDocs));
        }
      }

      // 3. QUERIES: Bidirectional Sync
      if (typeof window.supabaseManager.fetchQueriesFromSupabase === 'function') {
        const cloudQueries = await window.supabaseManager.fetchQueriesFromSupabase();
        const localQueries = this.getQueries();

        if (localQueries && localQueries.length > 0) {
          for (const lq of localQueries) {
            const existsInCloud = cloudQueries && cloudQueries.some(cq => cq.id === lq.id || cq.query === lq.query);
            if (!existsInCloud) {
              await window.supabaseManager.syncQueryToSupabase(lq);
            }
          }
        }

        if (cloudQueries && cloudQueries.length > 0) {
          const mergedQueries = [...cloudQueries];
          localQueries.forEach(lq => {
            if (!mergedQueries.some(mq => mq.id === lq.id || mq.query === lq.query)) {
              mergedQueries.push(lq);
            }
          });
          localStorage.setItem(this.queriesKey, JSON.stringify(mergedQueries));
        }
      }

      // Re-render views with updated unified cloud data
      if (typeof renderVideoHub === 'function') {
        renderVideoHub();
      }
      if (typeof renderUserQueriesList === 'function') {
        renderUserQueriesList();
      }
      if (typeof renderAdminPanel === 'function' && document && document.body && document.body.classList && typeof document.body.classList.contains === 'function' && document.body.classList.contains('admin-active')) {
        renderAdminPanel();
      }
    } catch (e) {
      console.warn('Cloud sync error note:', e);
    }
  }

  extractYouTubeEmbedUrl(url) {
    if (!url || typeof url !== 'string') return 'https://www.youtube.com/embed/41X1WpXh46g';
    url = url.trim();

    // 1. If user pasted iframe HTML embed code
    const iframeMatch = url.match(/src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      url = iframeMatch[1];
    }

    // 2. If it's already an embed URL
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
    if (embedMatch && embedMatch[1]) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }

    // 3. If it's a short URL: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }

    // 4. If it's standard watch: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/i);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    // 5. If it's YouTube Shorts or Live: youtube.com/shorts/VIDEO_ID or youtube.com/live/VIDEO_ID
    const streamMatch = url.match(/youtube\.com\/(?:shorts|live)\/([a-zA-Z0-9_-]+)/i);
    if (streamMatch && streamMatch[1]) {
      return `https://www.youtube.com/embed/${streamMatch[1]}`;
    }

    // 6. If it's just the 11-character video ID
    const cleanId = url.replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length === 11) {
      return `https://www.youtube.com/embed/${cleanId}`;
    }

    return url;
  }

  getYouTubeThumbnail(embedUrl) {
    if (!embedUrl) return '';
    const match = embedUrl.match(/(?:embed\/|youtu\.be\/|[?&]v=|shorts\/|live\/)([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return '';
  }

  initDefaultData() {
    // 1. Initial Real Educational Videos
    if (!localStorage.getItem(this.videosKey)) {
      const defaultVideos = [
        {
          id: 'vid-1',
          title: 'NotebookLM द्वारे कोणत्याही व्हिडिओचे स्थानिक भाषेत भाषांतर कसे करावे?',
          titleHi: 'NotebookLM से किसी भी वीडियो का स्थानीय भाषा में अनुवाद कैसे करें?',
          titleEn: 'How to translate any video into local language using NotebookLM',
          category: 'notebooklm',
          embedUrl: 'https://www.youtube.com/embed/41X1WpXh46g',
          duration: '08:45',
          language: 'मराठी / हिंदी',
          desc: 'Google NotebookLM चा वापर करून इंग्रजी व्हिडिओमधील माहितीचे मराठीत संक्षिप्त नोट्स आणि ऑडिओ पॉडकास्ट कसे बनवावे ते शिका.',
          descHi: 'Google NotebookLM का उपयोग करके किसी भी वीडियो की जानकारी को अपनी भाषा में सारांश और ऑडियो पॉडकास्ट बनाना सीखें।',
          descEn: 'Learn how to use Google NotebookLM to translate video content into local language and generate audio overviews.'
        },
        {
          id: 'vid-2',
          title: 'किराणा दुकानासाठी डिजिटल बिलिंग आणि स्टॉक मॅनेजमेंट (Vyapar App)',
          titleHi: 'किराना दुकान के लिए डिजिटल बिलिंग और स्टॉक मैनेजमेंट (Vyapar App)',
          titleEn: 'Digital Billing & Stock Management for Kirana Stores (Vyapar App)',
          category: 'billing',
          embedUrl: 'https://www.youtube.com/embed/2v_bXg_2h3g',
          duration: '10:20',
          language: 'मराठी / हिंदी',
          desc: 'मोबाईलवरून ग्राहकांना GST आणि नॉन-GST पक्के बिल कसे द्यावे आणि उधारी खात्याची नोंद कशी ठेवावी.',
          descHi: 'मोबाइल से ग्राहकों को पक्का बिल कैसे दें और उधार खाते (बहीखाता) का पूरा डिजिटल हिसाब कैसे रखें।',
          descEn: 'How to create digital invoices and manage shop credit ledgers directly from your smartphone.'
        },
        {
          id: 'vid-3',
          title: 'PhonePe व Google Pay QR कोड आणि साउंडबॉक्स सुरक्षित वापर',
          titleHi: 'PhonePe और Google Pay QR कोड और साउंडबॉक्स सुरक्षित उपयोग',
          titleEn: 'Safe usage of PhonePe, Google Pay QR & Soundbox',
          category: 'payments',
          embedUrl: 'https://www.youtube.com/embed/YykjpeuMNEk',
          duration: '06:15',
          language: 'मराठी / हिंदी',
          desc: 'दुकानात QR कोड कसा लावावा, ऑनलाइन पेमेंट फसवणूक कशी टाळावी आणि साउंडबॉक्सचे फायदे.',
          descHi: 'दुकान में फ्री QR कोड कैसे लगाएं, ऑनलाइन पेमेंट धोखाधड़ी से कैसे बचें और साउंडबॉक्स का सही इस्तेमाल।',
          descEn: 'How to install QR codes at your shop, prevent digital payment frauds, and verify audio soundbox alerts.'
        },
        {
          id: 'vid-4',
          title: 'प्रधानमंत्री मुद्रा लोन (PMMY) व PMEGP योजना अर्ज कसा करावा?',
          titleHi: 'प्रधानमंत्री मुद्रा लोन (PMMY) और PMEGP योजना आवेदन कैसे करें?',
          titleEn: 'How to apply for Pradhan Mantri Mudra Loan & PMEGP Scheme',
          category: 'schemes',
          embedUrl: 'https://www.youtube.com/embed/hJ8F1hR4x1w',
          duration: '12:30',
          language: 'मराठी / हिंदी',
          desc: 'ग्रामीण भागातील छोट्या व्यवसायांसाठी ५० हजार ते १० लाखांपर्यंत विनातारण कर्ज व २५-३५% सरकारी सबसिडी.',
          descHi: 'ग्रामीण छोटे व्यवसायों के लिए 50 हजार से 10 लाख तक बिना गारंटी लोन और 25% से 35% सरकारी सब्सिडी।',
          descEn: 'Collateral-free micro loans from ₹50,000 to ₹10 Lakhs with 25-35% government capital subsidies.'
        },
        {
          id: 'vid-5',
          title: 'ग्रामीण दुकानांसाठी WhatsApp Business वरून ग्राहकांना ऑर्डर घेणे',
          titleHi: 'ग्रामीण दुकानों के लिए WhatsApp Business से ग्राहकों से ऑर्डर लेना',
          titleEn: 'How local shops can take customer orders using WhatsApp Business',
          category: 'billing',
          embedUrl: 'https://www.youtube.com/embed/8i8-yO8u36k',
          duration: '09:10',
          language: 'मराठी / हिंदी',
          desc: 'WhatsApp Business कॅटलॉग तयार करून गावकऱ्यांना किराणा, कपडे आणि वस्तूंचे थेट ऑनलाइन ऑर्डर घेणे शिका.',
          descHi: 'WhatsApp Business कैटलॉग बनाकर ग्राहकों को सीधे अपने उत्पादों का ऑर्डर लेना और प्रचार करना सीखें।',
          descEn: 'Create your digital product catalog on WhatsApp Business and receive customer orders directly on mobile.'
        }
      ];
      localStorage.setItem(this.videosKey, JSON.stringify(defaultVideos));
    }

    // 2. Initial Documents
    const savedDocs = localStorage.getItem(this.docsKey);
    const defaultDocs = [
      {
        id: 'doc-1',
        title: 'मुद्रा लोन (PMMY) मार्गदर्शक व आवश्यक कागदपत्रे यादी',
        titleHi: 'मुद्रा लोन (PMMY) मार्गदर्शक व आवश्यक दस्तावेज़ सूची',
        titleEn: 'Mudra Loan (PMMY) Guidelines & Required Documents List',
        category: 'लोन / बँकिंग',
        categoryHi: 'ऋण / बैंकिंग',
        categoryEn: 'Loans & Banking',
        size: '1.2 MB',
        date: '15 Feb 2026',
        content: 'मुद्रा लोन अर्ज मार्गदर्शिका: आवश्यक कागदपत्रे - आधार कार्ड, पॅन कार्ड, ६ महिन्यांचे बँक खाते स्टेटमेंट, उद्योग आधार नोंदणी प्रमाणपत्र आणि व्यवसायाचा पत्ता पुरावा.',
        contentHi: 'मुद्रा ऋण आवेदन दिशानिर्देश: आवश्यक दस्तावेज़ - आधार कार्ड, पैन कार्ड, 6 महीने का बैंक स्टेटमेंट, उद्यम आधार पंजीकरण और व्यावसायिक पता प्रमाण।',
        contentEn: 'Mudra Loan Application Guidelines: Required documents - Aadhaar Card, PAN Card, 6 months bank statement, Udyam Aadhar Registration certificate, and business address proof.'
      },
      {
        id: 'doc-2',
        title: 'महाराष्ट्र गुमास्ता (Shop Act) नोंदणी नियम व नमुना फॉर्म',
        titleHi: 'महाराष्ट्र गुमास्ता (Shop Act) पंजीकरण नियम व नमूना फॉर्म',
        titleEn: 'Maharashtra Shop Act (Gumasta) Registration Rules & Sample Form',
        category: 'सरकारी नियम',
        categoryHi: 'सरकारी नियम',
        categoryEn: 'Official Regulations',
        size: '850 KB',
        date: '10 Feb 2026',
        content: 'ग्रामीण भागातील दुकानांसाठी शॉप ॲक्ट नोंदणी कशी करावी. ऑनलाईन महाईसेवा केंद्रावरून किंवा थेट आपले सरकार पोर्टलवरून नोंदणी प्रक्रिया.',
        contentHi: 'ग्रामीण क्षेत्रों में दुकानों के लिए शॉप एक्ट पंजीकरण कैसे करें। ऑनलाइन महाईसेवा केंद्र या आपले सरकार पोर्टल से पंजीकरण प्रक्रिया।',
        contentEn: 'How to register a rural shop under Maharashtra Shop Act. Step-by-step registration via Maha e-Seva centers or Aaple Sarkar portal.'
      },
      {
        id: 'doc-3',
        title: 'डिजिटल पेमेंट सायबर सुरक्षा व फसवणूक प्रतिबंधक मार्गदर्शक',
        titleHi: 'डिजिटल पेमेंट साइबर सुरक्षा व धोखाधड़ी रोकथाम मार्गदर्शक',
        titleEn: 'Digital Payment Cyber Security & Fraud Prevention Guide',
        category: 'सुरक्षा',
        categoryHi: 'सुरक्षा',
        categoryEn: 'Security',
        size: '950 KB',
        date: '02 Feb 2026',
        content: 'व्यापाऱ्यांसाठी सुरक्षा टिप्स: कधीही अनोळखी व्यक्तीला UPI PIN सांगू नका. पैसे प्राप्त करण्यासाठी PIN टाकण्याची आवश्यकता नसते.',
        contentHi: 'व्यापारियों के लिए सुरक्षा सुझाव: कभी भी अनजान व्यक्ति को UPI PIN न बताएं। पैसे प्राप्त करने के लिए PIN दर्ज करने की आवश्यकता नहीं होती।',
        contentEn: 'Security tips for merchants: Never share your UPI PIN with strangers. Entering a UPI PIN is only required for sending money, never for receiving money.'
      }
    ];

    if (!savedDocs || !savedDocs.includes('titleEn')) {
      localStorage.setItem(this.docsKey, JSON.stringify(defaultDocs));
    }

    // 3. Initial Queries (Multilingual with English & Hindi)
    const savedQueries = localStorage.getItem(this.queriesKey);
    const defaultQueries = [
      {
        id: 'q-101',
        userName: 'संतोष जाधव (नाशिक)',
        userNameHi: 'संतोष जाधव (नासिक)',
        userNameEn: 'Santosh Jadhav (Nashik)',
        phone: '9822******',
        query: 'माझ्या गावात इंटरनेट कमी असते, तर बिलिंग ॲप ऑफलाइन चालू शकते का?',
        queryHi: 'मेरे गांव में इंटरनेट कमजोर रहता है, तो क्या बिलिंग ऐप ऑफलाइन काम कर सकता है?',
        queryEn: 'Internet connectivity is weak in my village, can billing apps work offline?',
        status: 'resolved',
        date: '20 Feb 2026',
        reply: 'होय संतोषजी, व्यापार (Vyapar App) आणि खाताबुक हे दोन्ही ॲप्स ऑफलाइन काम करतात. इंटरनेट नसतानाही तुम्ही बिल तयार करू शकता आणि इंटरनेट आल्यावर डेटा सिंक होतो.',
        replyHi: 'हाँ संतोष जी, व्यापार (Vyapar App) और खाताबुक दोनों ऐप ऑफलाइन काम करते हैं। इंटरनेट न होने पर भी आप बिल बना सकते हैं और इंटरनेट आने पर डेटा सिंक हो जाता है।',
        replyEn: 'Yes Santosh ji, billing apps like Vyapar and Khatabook work completely offline. You can generate customer bills without internet, and the data automatically syncs once online.'
      },
      {
        id: 'q-102',
        userName: 'सुनीता गायकवाड (कोल्हापूर)',
        userNameHi: 'सुनीता गायकवाड़ (कोल्हापुर)',
        userNameEn: 'Sunita Gaikwad (Kolhapur)',
        phone: '9421******',
        query: 'महिला बचत गटासाठी कोणत्या सरकारी अनुदानाच्या योजना उपलब्ध आहेत?',
        queryHi: 'महिला स्वयं सहायता समूह (SHG) के लिए कौन सी सरकारी सब्सिडी योजनाएं उपलब्ध हैं?',
        queryEn: 'What government subsidy and loan schemes are available for Women Self-Help Groups (SHGs)?',
        status: 'resolved',
        date: '21 Feb 2026',
        reply: 'सुनीताजी, उमेद (MSRLM) अभियान आणि मुद्रा महिला उद्योग निधी अंतर्गत कमी व्याजात कर्ज व सबसिडी मिळते. तुम्ही पंचायत समितीच्या विस्तार अधिकाऱ्यांशी संपर्क साधू शकता.',
        replyHi: 'सुनीता जी, उमेद (MSRLM) अभियान और मुद्रा महिला उद्योग निधि के तहत कम ब्याज पर ऋण और सब्सिडी मिलती है। आप ब्लॉक/पंचायत समिति कार्यालय में संपर्क कर सकती हैं।',
        replyEn: 'Sunita ji, under MSRLM (Umed Mission) and Mudra Mahila Udyog Nidhi, women SHGs receive low-interest loans with capital subsidies. You can visit your local block development or panchayat office.'
      },
      {
        id: 'q-103',
        userName: 'अनिल शिंदे (पुणे ग्रामीण)',
        userNameHi: 'अनिल शिंदे (पुणे ग्रामीण)',
        userNameEn: 'Anil Shinde (Pune Rural)',
        phone: '9765******',
        query: 'NotebookLM मध्ये इंग्रजी व्हिडिओ टाकल्यावर मराठी ऑडिओ कसा ऐकायचा?',
        queryHi: 'NotebookLM में अंग्रेजी वीडियो डालने के बाद अपनी भाषा में ऑडियो कैसे सुनें?',
        queryEn: 'How to listen to audio summaries in local language after uploading video to NotebookLM?',
        status: 'resolved',
        date: '22 Feb 2026',
        reply: 'NotebookLM मध्ये सोर्स जोडल्यानंतर चॅट बॉक्समध्ये "मराठीत ऑडिओ सारांश द्या" असे लिहा आणि "Generate Audio Overview" बटनावर क्लिक करा.',
        replyHi: 'NotebookLM में सोर्स जोड़ने के बाद चैट बॉक्स में "हिंदी में ऑडियो सारांश दें" लिखें और "Generate Audio Overview" बटन पर क्लिक करें।',
        replyEn: 'After adding your video link as a source in NotebookLM, type "Provide summary in my language" in the prompt box and click "Generate Audio Overview" to listen.'
      }
    ];

    if (!savedQueries || !savedQueries.includes('queryEn')) {
      localStorage.setItem(this.queriesKey, JSON.stringify(defaultQueries));
    }
  }

  // --- Video CRUD ---
  getVideos() {
    return JSON.parse(localStorage.getItem(this.videosKey) || '[]');
  }

  addVideo(videoData) {
    const videos = this.getVideos();
    const cleanEmbedUrl = this.extractYouTubeEmbedUrl(videoData.embedUrl);
    
    const newVideo = {
      id: 'vid-' + Date.now(),
      title: videoData.title,
      titleHi: videoData.titleHi || videoData.title,
      titleEn: videoData.titleEn || videoData.title,
      category: videoData.category || 'notebooklm',
      embedUrl: cleanEmbedUrl,
      duration: videoData.duration || '08:30',
      language: videoData.language || 'मराठी / हिंदी',
      desc: videoData.desc || '',
      descHi: videoData.descHi || videoData.desc || '',
      descEn: videoData.descEn || videoData.desc || ''
    };
    
    videos.unshift(newVideo);
    localStorage.setItem(this.videosKey, JSON.stringify(videos));

    if (window.supabaseManager) {
      window.supabaseManager.syncVideoToSupabase(newVideo);
    }
    
    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? '🎥 नया वीडियो सफलतापूर्वक प्रकाशित हुआ!' : lang === 'en' ? '🎥 Video tutorial published successfully!' : '🎥 नवीन व्हिडिओ यशस्वीरीत्या प्रकाशित झाला!';
    showToast(msg, 'success');
    return newVideo;
  }

  deleteVideo(videoId) {
    let videos = this.getVideos();
    videos = videos.filter(v => v.id !== videoId);
    localStorage.setItem(this.videosKey, JSON.stringify(videos));

    if (window.supabaseManager) {
      window.supabaseManager.deleteVideoFromSupabase(videoId);
    }

    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? 'वीडियो हटा दिया गया।' : lang === 'en' ? 'Video deleted.' : 'व्हिडिओ हटवला गेला.';
    showToast(msg, 'info');
  }

  // --- Document CRUD ---
  getDocs() {
    return JSON.parse(localStorage.getItem(this.docsKey) || '[]');
  }

  addDoc(docData) {
    const docs = this.getDocs();
    const newDoc = {
      id: 'doc-' + Date.now(),
      title: docData.title,
      category: docData.category || 'सामान्य',
      size: docData.size || '1.0 MB',
      date: new Date().toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      content: docData.content || ''
    };
    docs.unshift(newDoc);
    localStorage.setItem(this.docsKey, JSON.stringify(docs));

    if (window.supabaseManager && typeof window.supabaseManager.syncDocToSupabase === 'function') {
      window.supabaseManager.syncDocToSupabase(newDoc);
    }

    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? '📄 दस्तावेज़ सफलतापूर्वक जोड़ा गया!' : lang === 'en' ? '📄 Document added successfully!' : '📄 दस्तऐवज यशस्वीरीत्या जोडला!';
    showToast(msg, 'success');
    return newDoc;
  }

  deleteDoc(docId) {
    let docs = this.getDocs();
    docs = docs.filter(d => d.id !== docId);
    localStorage.setItem(this.docsKey, JSON.stringify(docs));

    if (window.supabaseManager && typeof window.supabaseManager.deleteDocFromSupabase === 'function') {
      window.supabaseManager.deleteDocFromSupabase(docId);
    }

    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? 'दस्तावेज़ हटा दिया गया।' : lang === 'en' ? 'Document deleted.' : 'दस्तऐवज हटवला गेला.';
    showToast(msg, 'info');
  }

  // --- Queries Management ---
  getQueries() {
    return JSON.parse(localStorage.getItem(this.queriesKey) || '[]');
  }

  submitUserQuery(queryText, userName = 'उद्योजक', phone = '') {
    const queries = this.getQueries();
    const newQuery = {
      id: 'q-' + Date.now(),
      userName: userName,
      phone: phone || '98XXXXXXXX',
      query: queryText,
      status: 'pending',
      date: new Date().toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      reply: ''
    };
    queries.unshift(newQuery);
    localStorage.setItem(this.queriesKey, JSON.stringify(queries));

    if (window.supabaseManager && typeof window.supabaseManager.syncQueryToSupabase === 'function') {
      window.supabaseManager.syncQueryToSupabase(newQuery);
    }
    
    const lang = window.currentLanguage || 'mr';
    const msg = lang === 'hi' ? '📤 आपका प्रश्न भेज दिया गया है। जल्द ही उत्तर मिलेगा।' : lang === 'en' ? '📤 Your question has been submitted to experts!' : '📤 तुमचा प्रश्न पाठवला गेला आहे. लवकरच उत्तर मिळेल.';
    showToast(msg, 'success');
    return newQuery;
  }

  replyToQuery(queryId, replyText) {
    const queries = this.getQueries();
    const target = queries.find(q => q.id === queryId);
    if (target) {
      target.reply = replyText;
      target.status = 'resolved';
      localStorage.setItem(this.queriesKey, JSON.stringify(queries));

      if (window.supabaseManager && typeof window.supabaseManager.syncQueryToSupabase === 'function') {
        window.supabaseManager.syncQueryToSupabase(target);
      }

      const lang = window.currentLanguage || 'mr';
      const msg = lang === 'hi' ? '✅ उद्यमी के प्रश्न का उत्तर भेजा गया!' : lang === 'en' ? '✅ Reply sent to entrepreneur!' : '✅ उद्योजकाच्या प्रश्नाचे उत्तर पाठवले गेले!';
      showToast(msg, 'success');
    }
  }

  // --- Registered Users ---
  getUsers() {
    if (typeof getRegisteredUsers === 'function') {
      return getRegisteredUsers();
    }
    return JSON.parse(localStorage.getItem('aapla_vyapar_users_db') || '[]');
  }

  // --- Stats Overview ---
  getStats() {
    const videos = this.getVideos();
    const docs = this.getDocs();
    const queries = this.getQueries();
    const users = this.getUsers();
    const pendingQueries = queries.filter(q => q.status === 'pending').length;

    return {
      totalUsers: users.length > 0 ? `${users.length}` : '1',
      totalVideos: videos.length,
      totalDocs: docs.length,
      pendingQueries: pendingQueries
    };
  }
}

window.AdminPortal = AdminPortal;
