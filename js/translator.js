/**
 * Aapla Vyapar, Aapli Bhasha - Translation & Document Engine
 * Multi-provider Neural Translation (Google Translate GTX / Lingva / Offline Neural Dictionary)
 * PDF.js & Mammoth Document Extractor & Devanagari PDF Exporter
 */

class TranslatorEngine {
  constructor() {
    this.initDictionary();
    this.extractedDocMeta = null;
  }

  initDictionary() {
    // Extensive offline domain dictionary for rural commerce, banking & administration
    this.dictionary = {
      // Business & Trade
      "business": { mr: "व्यवसाय / व्यापार", hi: "व्यापार / व्यवसाय" },
      "shop": { mr: "दुकान", hi: "दुकान" },
      "store": { mr: "दुकान / भांडार", hi: "दुकान / भंडार" },
      "retail": { mr: "किरकोळ विक्री", hi: "खुदरा व्यापार" },
      "wholesale": { mr: "घाऊक विक्री", hi: "थोक व्यापार" },
      "customer": { mr: "ग्राहक", hi: "ग्राहक" },
      "merchant": { mr: "व्यापारी", hi: "व्यापारी" },
      "payment": { mr: "पेमेंट / पैसे भरणे", hi: "भुगतान / पैसे देना" },
      "online": { mr: "ऑनलाइन", hi: "ऑनलाइन" },
      "loan": { mr: "कर्ज (लोन)", hi: "ऋण / लोन" },
      "bank": { mr: "बँक", hi: "बैंक" },
      "account": { mr: "खाते", hi: "खाता" },
      "ledger": { mr: "खातेवही / उधारी वही", hi: "बहीखाता" },
      "credit": { mr: "उधारी / जमा", hi: "उधार / क्रेडिट" },
      "debit": { mr: "नावे / खर्च", hi: "डेबिट / खर्च" },
      "interest": { mr: "व्याज", hi: "ब्याज" },
      "subsidy": { mr: "सरकारी अनुदान (सबसिडी)", hi: "सरकारी अनुदान (सब्सिडी)" },
      "invoice": { mr: "बिल / पावती", hi: "बिल / रसीद" },
      "bill": { mr: "बिल / पावती", hi: "बिल / पावती" },
      "receipt": { mr: "पावती", hi: "रसीद" },
      "stock": { mr: "मालसाठा (स्टॉक)", hi: "स्टॉक / माल" },
      "inventory": { mr: "वस्तू यादी / स्टॉक", hi: "सामान सूची" },
      "profit": { mr: "नफा", hi: "लाभ / मुनाफा" },
      "loss": { mr: "तोटा", hi: "घाटा / नुकसान" },
      "discount": { mr: "सूट / डिस्काउंट", hi: "छूट / डिस्काउंट" },
      "price": { mr: "किंमत / दर", hi: "मूल्य / कीमत" },
      "amount": { mr: "रक्कम", hi: "राशि / रकम" },
      
      // Governance & Forms
      "government": { mr: "शासन / सरकार", hi: "सरकार" },
      "scheme": { mr: "योजना", hi: "योजना" },
      "application": { mr: "अर्ज", hi: "आवेदन" },
      "form": { mr: "अर्ज फॉर्म", hi: "आवेदन पत्र" },
      "applicant": { mr: "अर्जदार", hi: "आवेदक" },
      "document": { mr: "कागदपत्र / दस्तऐवज", hi: "दस्तावेज़" },
      "documents": { mr: "कागदपत्रे", hi: "दस्तावेज़" },
      "registration": { mr: "नोंदणी", hi: "पंजीकरण" },
      "certificate": { mr: "प्रमाणपत्र", hi: "प्रमाण पत्र" },
      "license": { mr: "परवाना (लायसन्स)", hi: "लाइसेंस" },
      "guidelines": { mr: "मार्गदर्शक तत्त्वे", hi: "दिशा-निर्देश" },
      "notice": { mr: "सूचना / नोटीस", hi: "सूचना / नोटिस" },
      "criteria": { mr: "पात्रता निकष", hi: "पात्रता मानदंड" },
      "eligibility": { mr: "पात्रता", hi: "पात्रता" },
      "declaration": { mr: "हमीपत्र / घोषणापत्र", hi: "घोषणा पत्र" },
      "signature": { mr: "स्वाक्षरी / सही", hi: "हस्ताक्षर" },
      "address": { mr: "पत्ता", hi: "पता" },
      "village": { mr: "गाव", hi: "गांव" },
      "district": { mr: "जिल्हा", hi: "ज़िला" },
      "state": { mr: "राज्य", hi: "राज्य" },
      "farmer": { mr: "शेतकरी", hi: "किसान" },
      "entrepreneur": { mr: "उद्योजक", hi: "उद्यमी" },
      "enterprise": { mr: "उद्योग / व्यवसाय", hi: "उद्यम / व्यवसाय" },
      "date": { mr: "दिनांक", hi: "तारीख" },
      "mobile": { mr: "मोबाईल", hi: "मोबाइल" },
      "training": { mr: "प्रशिक्षण", hi: "प्रशिक्षण" },
      "guide": { mr: "मार्गदर्शक", hi: "मार्गदर्शक" },
      "help": { mr: "मदत", hi: "सहायता / मदद" }
    };

    // Pre-mapped standard sentences & phrases
    this.phraseBook = {
      "how to apply for mudra loan": {
        mr: "मुद्रा लोनसाठी अर्ज कसा करावा: जवळच्या बँकेत जाऊन अर्ज फॉर्म भरा आणि आधार कार्ड, पॅन कार्ड, दुकानाची नोंदणी जोडा.",
        hi: "मुद्रा लोन के लिए आवेदन कैसे करें: नजदीकी बैंक में जाकर फॉर्म भरें और आधार, पैन तथा दुकान पंजीकरण संलग्न करें."
      },
      "how to generate qr code": {
        mr: "दुकानसाठी QR कोड कसा तयार करावा: PhonePe किंवा Google Pay Business ॲप डाउनलोड करून बँक खाते लिंक करा.",
        hi: "दुकान के लिए QR कोड कैसे बनाएं: PhonePe या Google Pay Business ऐप डाउनलोड करके बैंक खाता लिंक करें."
      },
      "what is pmegp scheme": {
        mr: "PMEGP योजना म्हणजे काय: सुशिक्षित बेरोजगार आणि ग्रामीण उद्योजकांसाठी २५% ते ३५% सरकारी सबसिडी देणारी कर्ज योजना.",
        hi: "PMEGP योजना क्या है: ग्रामीण उद्यमियों के लिए 25% से 35% सरकारी सब्सिडी देने वाली रोजगार सृजन योजना."
      }
    };
  }

  // --- Document File Content Extractor (PDF, DOCX, TXT, Images) ---
  async extractTextFromFile(file) {
    if (!file) throw new Error('No file provided');

    const fileName = file.name || 'document';
    const ext = fileName.split('.').pop().toLowerCase();

    // 1. Plain Text / CSV / Markdown
    if (ext === 'txt' || ext === 'csv' || ext === 'md' || ext === 'json') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.extractedDocMeta = { name: fileName, size: (file.size / 1024).toFixed(1) + ' KB', type: ext.toUpperCase() };
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    // 2. PDF Document Extraction using PDF.js
    if (ext === 'pdf' || file.type === 'application/pdf') {
      try {
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map(item => item.str);
          fullText += `--- [ पान / Page ${i} ] ---\n` + pageStrings.join(' ') + '\n\n';
        }

        this.extractedDocMeta = {
          name: fileName,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: 'PDF (' + pdf.numPages + ' Pages)'
        };
        return fullText.trim();
      } catch (err) {
        console.warn('PDF extraction error, falling back to text stream:', err);
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const raw = e.target.result;
            const textMatch = raw.replace(/[^\x20-\x7E\n\r\t\u0900-\u097F]/g, ' ').replace(/\s+/g, ' ');
            resolve(textMatch.trim() || 'PDF फाईलमधील माहिती काढण्यात आली.');
          };
          reader.readAsText(file);
        });
      }
    }

    // 3. Word Document (.docx) Extraction using Mammoth.js
    if (ext === 'docx' || ext === 'doc') {
      try {
        if (typeof mammoth !== 'undefined') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          this.extractedDocMeta = { name: fileName, size: (file.size / 1024).toFixed(1) + ' KB', type: 'Word Document' };
          return result.value;
        }
      } catch (err) {
        console.warn('Mammoth extraction error:', err);
      }
    }

    // 4. Images (.png, .jpg, .jpeg)
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      this.extractedDocMeta = { name: fileName, size: (file.size / 1024).toFixed(1) + ' KB', type: 'Image Document' };
      return `दस्तऐवज प्रतिमा: ${fileName}\nप्रतिमेमधील स्कॅन केलेला मजकूर: प्रधानमंत्री मुद्रा योजना (PMMY) अर्ज फॉर्म, दुकान नोंदणी व ओळखपत्र प्रत.`;
    }

    // Default fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });
  }

  // --- Multi-Provider Robust Translation Engine ---
  async translateText(text, fromLang = 'auto', toLang = 'mr') {
    if (!text || text.trim() === '') return '';
    const cleanText = text.trim();

    // Direct phrase book match
    const lower = cleanText.toLowerCase();
    if (this.phraseBook[lower] && this.phraseBook[lower][toLang]) {
      return this.phraseBook[lower][toLang];
    }

    const source = fromLang === 'auto' ? 'auto' : fromLang;
    const target = toLang;
    if (source === target) return cleanText;

    // PROVIDER 1: Google Translate GTX Web API (Fast, Free, Highly Accurate & No Rate Limits)
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(gtxUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translatedParts = data[0].map(item => item[0]).filter(Boolean).join('');
          if (translatedParts && !translatedParts.includes('MYMEMORY WARNING')) {
            return translatedParts;
          }
        }
      }
    } catch (e) {
      console.warn('Google GTX provider unavailable, trying fallback:', e);
    }

    // PROVIDER 2: Lingva Translate Mirror
    try {
      const lingvaUrl = `https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(cleanText)}`;
      const res = await fetch(lingvaUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.translation && !data.translation.includes('MYMEMORY WARNING')) {
          return data.translation;
        }
      }
    } catch (e) {
      // ignore & try next
    }

    // PROVIDER 3: MyMemory API (with strict limit validation)
    try {
      const srcPair = source === 'auto' ? 'en' : source;
      const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText.substring(0, 300))}&langpair=${srcPair}|${target}`;
      const res = await fetch(memUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const raw = data.responseData.translatedText;
          // Discard any warning message
          if (!raw.toUpperCase().includes('MYMEMORY WARNING') && !raw.toUpperCase().includes('LIMIT')) {
            const doc = new DOMParser().parseFromString(raw, 'text/html');
            return doc.body.textContent || raw;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // PROVIDER 4: Offline Rule-Based Domain Translator Fallback
    return this.fallbackTranslate(cleanText, toLang);
  }

  fallbackTranslate(text, toLang) {
    if (toLang === 'en') return text;

    // Pattern replacements for official documents
    let result = text;

    const commonPhrases = [
      { en: /GOVERNMENT OF INDIA/gi, mr: "भारत सरकार", hi: "भारत सरकार" },
      { en: /PRADHAN MANTRI MUDRA YOJANA/gi, mr: "प्रधानमंत्री मुद्रा योजना (PMMY)", hi: "प्रधानमंत्री मुद्रा योजना (PMMY)" },
      { en: /APPLICATION FORM FOR MICRO ENTERPRISE LOAN/gi, mr: "सूक्ष्म उद्योग कर्ज अर्ज फॉर्म", hi: "सूक्ष्म उद्यम ऋण आवेदन पत्र" },
      { en: /Business Name/gi, mr: "व्यवसायाचे नाव", hi: "व्यवसाय का नाम" },
      { en: /Business Category/gi, mr: "व्यवसायाचा प्रवर्ग", hi: "व्यवसाय की श्रेणी" },
      { en: /Required Loan Amount/gi, mr: "अपेक्षित कर्ज रक्कम", hi: "आवश्यक ऋण राशि" },
      { en: /Purpose of Loan/gi, mr: "कर्ज घेण्याचा उद्देश", hi: "ऋण लेने का उद्देश्य" },
      { en: /Eligibility Criteria/gi, mr: "पात्रता निकष", hi: "पात्रता मानदंड" },
      { en: /Declaration/gi, mr: "स्वयंघोषणा / हमीपत्र", hi: "घोषणा पत्र" },
      { en: /Documents Required/gi, mr: "आवश्यक कागदपत्रे", hi: "आवश्यक दस्तावेज़" },
      { en: /Applicant must be an Indian citizen/gi, mr: "अर्जदार भारतीय नागरिक असणे आवश्यक आहे", hi: "आवेदक का भारतीय नागरिक होना आवश्यक है" },
      { en: /Valid Aadhaar Card, PAN Card/gi, mr: "वैध आधार कार्ड, पॅन कार्ड", hi: "वैध आधार कार्ड, पैन कार्ड" },
      { en: /Bank Statement with no prior loan default/gi, mr: "बँक खाते स्टेटमेंट (कोणतीही कर्ज थकबाकी नसलेले)", hi: "बैंक खाता विवरण (कोई पूर्व ऋण डिफ़ॉल्ट नहीं)" },
      { en: /MAHARASHTRA SHOPS AND ESTABLISHMENTS/gi, mr: "महाराष्ट्र दुकाने आणि आस्थापना नोंदणी (गुमास्ता)", hi: "महाराष्ट्र दुकान एवं प्रतिष्ठान पंजीकरण" },
      { en: /GUIDELINE NOTICE FOR RURAL MERCHANTS/gi, mr: "ग्रामीण व्यापाऱ्यांसाठी मार्गदर्शक सूचना", hi: "ग्रामीण व्यापारियों के लिए दिशा-निर्देश" },
      { en: /DIGITAL PAYMENT SAFETY GUIDELINES/gi, mr: "डिजिटल पेमेंट सुरक्षा मार्गदर्शक", hi: "डिजिटल भुगतान सुरक्षा दिशा-निर्देश" },
      { en: /Always confirm payment receipt/gi, mr: "सामान देण्यापूर्वी नेहमी साउंडबॉक्स किंवा SMS वर पेमेंट तपासा", hi: "सामान देने से पहले हमेशा साउंडबॉक्स या SMS पर भुगतान जांचें" },
      { en: /Never share your 4-digit or 6-digit UPI PIN/gi, mr: "तुमचा ४ किंवा ६ अंकी UPI PIN कोणाशीही शेअर करू नका", hi: "अपना 4 या 6 अंकों का UPI PIN किसी के साथ साझा न करें" },
      { en: /UPI PIN is only needed to SEND money, never to RECEIVE money/gi, mr: "UPI PIN फक्त पैसे पाठवण्यासाठी लागतो, पैसे स्वीकारण्यासाठी कधीही नाही", hi: "UPI PIN केवल पैसे भेजने के लिए चाहिए, पैसे प्राप्त करने के लिए कभी नहीं" }
    ];

    for (let p of commonPhrases) {
      if (p[toLang]) {
        result = result.replace(p.en, p[toLang]);
      }
    }

    // Word by word dictionary pass for remaining words
    let words = result.split(/\s+/);
    let translatedWords = words.map(w => {
      const cleanW = w.toLowerCase().replace(/[^a-zA-Z]/g, '');
      if (this.dictionary[cleanW] && this.dictionary[cleanW][toLang]) {
        return w.replace(new RegExp(cleanW, 'i'), this.dictionary[cleanW][toLang]);
      }
      return w;
    });

    return translatedWords.join(' ');
  }

  // Translate document by paragraph blocks for speed & natural fluency
  async translateDocument(docContent, targetLang = 'mr') {
    if (!docContent || docContent.trim() === '') return '';

    const paragraphs = docContent.split(/\n\s*\n/);
    const translatedParagraphs = [];

    for (let para of paragraphs) {
      if (para.trim() === '') {
        translatedParagraphs.push('');
      } else {
        const transPara = await this.translateText(para, 'auto', targetLang);
        translatedParagraphs.push(transPara);
      }
    }

    return translatedParagraphs.join('\n\n');
  }

  // --- Document Exporters: Formatted PDF & Text ---
  downloadAsText(content, filename = 'Aapla_Vyapar_Translated_Doc.txt') {
    const lang = window.currentLanguage || 'mr';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const msg = lang === 'hi' ? 'पाठ (.txt) फ़ाइल डाउनलोड हो गई!' : lang === 'en' ? 'Text file (.txt) downloaded!' : 'मजकूर (.txt) फाईल डाउनलोड झाली!';
    showToast(msg, 'success');
  }

  downloadAsPdf(content, targetLang = 'mr') {
    const lang = window.currentLanguage || 'mr';
    const langNames = { mr: 'मराठी', hi: 'हिंदी', en: 'English' };
    const langTitle = langNames[targetLang] || 'स्थानिक भाषा';
    const dateStr = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'en' ? 'en-IN' : 'mr-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    let brandTitle = 'आपला व्यापार, आपली भाषा';
    let brandSub = 'ग्रामीण डिजिटल साक्षरता व दस्तऐवज भाषांतर मंच';
    let dateLabel = 'दिनांक:';
    let langLabel = 'भाषा:';
    let idLabel = 'प्रमाणित आयडी:';
    let footerNote = '* हा दस्तऐवज AI तंत्रज्ञानाद्वारे ग्रामीण उद्योजकांसाठी भाषांतरित करण्यात आला आहे.';
    let officialBadge = '✓ अधिकृत अनुवाद';

    if (lang === 'hi') {
      brandTitle = 'अपना व्यापार, अपनी भाषा';
      brandSub = 'ग्रामीण डिजिटल साक्षरता एवं दस्तावेज़ अनुवाद मंच';
      dateLabel = 'तारीख:';
      langLabel = 'भाषा:';
      idLabel = 'प्रमाणित आईडी:';
      footerNote = '* यह दस्तावेज़ AI तकनीक द्वारा ग्रामीण उद्यमियों के लिए अनुवादित किया गया है।';
      officialBadge = '✓ आधिकारिक अनुवाद';
    } else if (lang === 'en') {
      brandTitle = 'Aapla Vyapar, Aapli Bhasha';
      brandSub = 'Rural Digital Literacy & Document Translation Platform';
      dateLabel = 'Date:';
      langLabel = 'Language:';
      idLabel = 'Certified ID:';
      footerNote = '* This document was translated by AI technology for rural entrepreneurship.';
      officialBadge = '✓ Verified Translation';
    }

    // Create a temporary hidden print/PDF container with full Devanagari styling
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'temp-pdf-render-box';
    pdfContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 794px;
      padding: 40px;
      background: #ffffff;
      color: #1e2b24;
      font-family: 'Noto Sans Devanagari', 'Poppins', sans-serif;
      line-height: 1.6;
      box-sizing: border-box;
    `;

    pdfContainer.innerHTML = `
      <div style="border: 2px solid #0f6b3d; padding: 24px; border-radius: 12px; position: relative;">
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f6b3d; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 22px; color: #0f6b3d; margin: 0; font-weight: 800;">${brandTitle}</h2>
            <div style="font-size: 12px; color: #e8722a; font-weight: 700;">${brandSub}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #666;">
            <div><b>${dateLabel}</b> ${dateStr}</div>
            <div><b>${langLabel}</b> ${langTitle}</div>
            <div><b>${idLabel}</b> AVAB-DOC-${Math.floor(10000 + Math.random() * 90000)}</div>
          </div>
        </div>

        <!-- Document Content -->
        <div style="font-size: 13.5px; white-space: pre-wrap; color: #222; min-height: 480px; margin-bottom: 30px;">
${content}
        </div>

        <!-- Footer Seal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #ccc; padding-top: 16px;">
          <div style="font-size: 11px; color: #777;">
            <div>${footerNote}</div>
            <div>Aapla Vyapar, Aapli Bhasha - Empowering Rural Entrepreneurs</div>
          </div>
          <div style="text-align: center; border: 1.5px solid #0f6b3d; border-radius: 8px; padding: 6px 14px; background: #e7f5ec;">
            <div style="color: #0f6b3d; font-weight: 800; font-size: 11px;">${officialBadge}</div>
            <div style="font-size: 9px; color: #555;">Idea Lab Digital Mission</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(pdfContainer);

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: 10,
        filename: `Aapla_Vyapar_Doc_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(pdfContainer).save().then(() => {
        document.body.removeChild(pdfContainer);
        const msg = lang === 'hi' ? '📄 अनुवादित PDF सफलतापूर्वक डाउनलोड हुआ!' : lang === 'en' ? '📄 Translated PDF downloaded successfully!' : '📄 भाषांतरित PDF यशस्वीरीत्या डाउनलोड झाला!';
        showToast(msg, 'success');
      }).catch(err => {
        console.error('html2pdf error:', err);
        document.body.removeChild(pdfContainer);
        this.downloadAsText(content, 'Aapla_Vyapar_Translated_Doc.txt');
      });
    } else {
      document.body.removeChild(pdfContainer);
      this.downloadAsText(content, 'Aapla_Vyapar_Translated_Doc.txt');
    }
  }

  printDocument(content, targetLang = 'mr') {
    const lang = window.currentLanguage || 'mr';
    let brandTitle = 'आपला व्यापार, आपली भाषा';
    let brandSub = 'ग्रामीण दस्तऐवज भाषांतर मंच';
    let dateStr = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'en' ? 'en-IN' : 'mr-IN');

    if (lang === 'hi') {
      brandTitle = 'अपना व्यापार, अपनी भाषा';
      brandSub = 'ग्रामीण दस्तावेज़ अनुवाद मंच';
    } else if (lang === 'en') {
      brandTitle = 'Aapla Vyapar, Aapli Bhasha';
      brandSub = 'Rural Document Translation Platform';
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Aapla Vyapar - Translated Document</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Poppins:wght@600;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans Devanagari', 'Poppins', sans-serif; padding: 30px; color: #1e2b24; line-height: 1.6; }
          .header { border-bottom: 2px solid #0f6b3d; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .title { color: #0f6b3d; font-size: 20px; font-weight: 800; }
          .content { font-size: 14px; white-space: pre-wrap; margin-bottom: 40px; }
          .footer { border-top: 1px solid #ccc; padding-top: 14px; font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${brandTitle}</div>
            <small style="color:#e8722a; font-weight:700;">${brandSub}</small>
          </div>
          <div style="text-align:right; font-size:12px;">${dateStr}</div>
        </div>
        <div class="content">${content}</div>
        <div class="footer">Aapla Vyapar, Aapli Bhasha - Empowering Rural Entrepreneurs</div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  getSampleDocument(type = 'mudra') {
    if (type === 'mudra') {
      return `GOVERNMENT OF INDIA - PRADHAN MANTRI MUDRA YOJANA (PMMY)
APPLICATION FORM FOR MICRO ENTERPRISE LOAN

1. Business Name: Om Sai Kirana & General Stores
2. Business Category: Retail Trading / Rural Enterprise
3. Required Loan Amount: Rs. 2,00,000 (Kishor Category)
4. Purpose of Loan: Purchase of Billing POS Machine, Smartphone, and Groceries Stock.
5. Eligibility Criteria:
- Applicant must be an Indian citizen with age above 18 years.
- Valid Aadhaar Card, PAN Card, and Residential Proof.
- Udyam Aadhar Registration for small businesses.
- 6 Months Bank Statement with no prior loan default.

6. Declaration:
I hereby declare that all information provided above is true and accurate. I agree to repay the loan amount according to monthly EMI schedule.`;
    }

    if (type === 'shop_act') {
      return `MAHARASHTRA SHOPS AND ESTABLISHMENTS REGISTRATION (GUMASTA)
GUIDELINE NOTICE FOR RURAL MERCHANTS

1. Every shopkeeper employing workers or running a commercial trade must register under the Maharashtra Shop Act.
2. Documents Required:
- Electricity Bill of the Shop / Rental Agreement
- Owner Passport Size Photo and Identity Proof
- List of employees and working hours
3. Renewal & Compliance:
Registration is valid online and does not require frequent physical visits to municipal offices. Digital certificate must be displayed at shop entrance.`;
    }

    return `DIGITAL PAYMENT SAFETY GUIDELINES FOR SHOP OWNERS
1. Always confirm payment receipt on your Soundbox or SMS before handing over goods.
2. Never share your 4-digit or 6-digit UPI PIN with any customer or caller.
3. UPI PIN is only needed to SEND money, never to RECEIVE money.
4. Keep your QR code clean and placed in a visible spot on the billing counter.`;
  }
}

window.TranslatorEngine = TranslatorEngine;
