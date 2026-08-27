-- =========================================================================
-- AAPLA VYAPAR, AAPLI BHASHA - SUPABASE EMAIL-BASED DATABASE & AUTH SCHEMA
-- Run this SQL in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. DROP EXISTING TABLE IF YOU WANT A CLEAN EMAIL-BASED SCHEMA
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.queries CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;

-- 2. PROFILES & USERS TABLE (EMAIL PRIMARY IDENTIFIER)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_hi TEXT,
    name_en TEXT,
    email TEXT UNIQUE NOT NULL,
    village TEXT,
    business_type TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_verified BOOLEAN DEFAULT true,
    preferred_language TEXT DEFAULT 'mr',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VIDEOS TRAINING HUB TABLE
CREATE TABLE public.videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_hi TEXT,
    title_en TEXT,
    embed_url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'notebooklm',
    description TEXT,
    description_hi TEXT,
    description_en TEXT,
    duration TEXT DEFAULT '08:00',
    language TEXT DEFAULT 'मराठी / हिंदी',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENTREPRENEUR QUERIES & HELP DESK TABLE
CREATE TABLE public.queries (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_name_hi TEXT,
    user_name_en TEXT,
    email TEXT,
    phone TEXT,
    query TEXT NOT NULL,
    query_hi TEXT,
    query_en TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    date TEXT NOT NULL,
    reply TEXT DEFAULT '',
    reply_hi TEXT,
    reply_en TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DOCUMENTS REPOSITORY TABLE
CREATE TABLE public.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'सामान्य',
    size TEXT DEFAULT '1.0 MB',
    date TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Public videos all" ON public.videos FOR ALL USING (true);
CREATE POLICY "Public queries all" ON public.queries FOR ALL USING (true);
CREATE POLICY "Public documents all" ON public.documents FOR ALL USING (true);

-- =========================================================================
-- SEED INITIAL DATA (Videos, Docs, Default Admin & Users)
-- =========================================================================

-- Seed Training Videos
INSERT INTO public.videos (id, title, title_hi, title_en, embed_url, category, description, description_hi, description_en, duration, language)
VALUES
('vid-1', 'NotebookLM द्वारे कोणत्याही व्हिडिओचे स्थानिक भाषेत भाषांतर कसे करावे?', 'NotebookLM से किसी भी वीडियो का स्थानीय भाषा में अनुवाद कैसे करें?', 'How to translate any video into local language using NotebookLM', 'https://www.youtube.com/embed/41X1WpXh46g', 'notebooklm', 'Google NotebookLM वापरून इंग्रजी आणि इतर भाषेतील व्हिडिओंचे मराठीत सारांश व विश्लेषण करा.', 'Google NotebookLM का उपयोग करके वीडियो का हिंदी/स्थानीय भाषा में विश्लेषण और सारांश समझें।', 'Complete guide to importing video links or notes into NotebookLM and listening to audio overviews.', '09:20', 'मराठी / हिंदी'),
('vid-2', 'व्यापार बिलिंग ॲप (Vyapar App) कसे वापरावे?', 'व्यापार बिलिंग ऐप (Vyapar App) कैसे उपयोग करें?', 'Complete guide to Vyapar Billing & Inventory App for Retail Shops', 'https://www.youtube.com/embed/gLg4HwX898I', 'billing', 'मोबाईलवर किराणा आणि जनरल स्टोअर्ससाठी GST आणि नॉन-GST बिल कसे तयार करावे.', 'मोबाइल पर किराना दुकान और जनरल स्टोर्स के लिए डिजिटल बिल और खाता बनाना सीखें।', 'Learn how to create customer invoices, track stock, and manage payments offline on mobile.', '07:45', 'मराठी / हिंदी'),
('vid-3', 'सुरक्षित UPI, QR कोड आणि साउंडबॉक्स पेमेंट कसे स्वीकारावे?', 'सुरक्षित UPI, QR कोड और साउंडबॉक्स पेमेंट कैसे स्वीकार करें?', 'Safe Digital Payments, QR Code & Soundbox Guide for Merchants', 'https://www.youtube.com/embed/3JZ_D3ELwOQ', 'payments', 'PhonePe, Google Pay आणि Paytm QR द्वारे ग्राहकांकडून फसवणूक न होता सुरक्षित पैसे स्वीकारण्याची पद्धत.', 'PhonePe, Google Pay और Paytm QR कोड से धोखाधड़ी से बचते हुए सुरक्षित ऑनलाइन पैसे प्राप्त करें।', 'Step-by-step security practices to avoid QR payment fraud and use Soundbox confirmations.', '06:30', 'मराठी / हिंदी'),
('vid-4', 'प्रधानमंत्री मुद्रा योजना (PMMY) कर्ज अर्ज प्रक्रिया', 'प्रधानमंत्री मुद्रा योजना (PMMY) लोन आवेदन प्रक्रिया', 'Pradhan Mantri Mudra Yojana (PMMY) Loan Application Process', 'https://www.youtube.com/embed/v9q3F1tWpKg', 'schemes', 'शिशु, किशोर आणि तरुण मुद्रा कर्जासाठी आवश्यक कागदपत्रे आणि बँकेत अर्ज कसा करावा.', 'शिशु, किशोर और तरुण मुद्रा लोन के लिए आवश्यक दस्तावेज और बैंक में आवेदन कैसे करें।', 'How rural entrepreneurs can get collateral-free business loans up to ₹10 Lakhs under PMMY.', '08:15', 'मराठी / हिंदी'),
('vid-5', 'WhatsApp Business ॲप द्वारे दुकानाची विक्री कशी वाढवावी?', 'WhatsApp Business ऐप से दुकान की बिक्री कैसे बढ़ाएं?', 'Grow Your Retail Business using WhatsApp Business Catalog & Quick Replies', 'https://www.youtube.com/embed/kXYiU_JCYtU', 'billing', 'उत्पादनांचा कॅटलॉग बनवणे, ऑटोमॅटिक मेसेज आणि ग्राहकांना ऑफर्स पाठवण्याचे तंत्र.', 'उत्पादों का डिजिटल कैटलॉग बनाएं और ग्राहकों को ऑटोमैटिक ऑफर्स और बिल भेजें।', 'Learn how to create business catalogs, automatic greetings, and broadcast sales offers.', '06:50', 'मराठी / हिंदी');

-- Seed Help Desk Queries
INSERT INTO public.queries (id, user_name, user_name_hi, user_name_en, email, query, query_hi, query_en, status, date, reply, reply_hi, reply_en)
VALUES
('q-101', 'संतोष जाधव (नाशिक)', 'संतोष जाधव (नासिक)', 'Santosh Jadhav (Nashik)', 'santosh.jadhav@gmail.com', 'माझ्या गावात इंटरनेट कमी असते, तर बिलिंग ॲप ऑफलाइन चालू शकते का?', 'मेरे गांव में इंटरनेट कमजोर रहता है, तो क्या बिलिंग ऐप ऑफलाइन काम कर सकता है?', 'Internet connectivity is weak in my village, can billing apps work offline?', 'resolved', '20 Feb 2026', 'होय संतोषजी, व्यापार (Vyapar App) आणि खाताबुक हे दोन्ही ॲप्स ऑफलाइन काम करतात. इंटरनेट नसतानाही तुम्ही बिल तयार करू शकता आणि इंटरनेट आल्यावर डेटा सिंक होतो.', 'हाँ संतोष जी, व्यापार (Vyapar App) और खाताबुक दोनों ऐप ऑफलाइन काम करते हैं। इंटरनेट न होने पर भी आप बिल बना सकते हैं और इंटरनेट आने पर डेटा सिंक हो जाता है।', 'Yes Santosh ji, billing apps like Vyapar and Khatabook work completely offline. You can generate customer bills without internet, and the data automatically syncs once online.'),
('q-102', 'सुनीता गायकवाड (कोल्हापूर)', 'सुनीता गायकवाड़ (कोल्हापुर)', 'Sunita Gaikwad (Kolhapur)', 'sunita.shg@gmail.com', 'महिला बचत गटासाठी कोणत्या सरकारी अनुदानाच्या योजना उपलब्ध आहेत?', 'महिला स्वयं सहायता समूह (SHG) के लिए कौन सी सरकारी सब्सिडी योजनाएं उपलब्ध हैं?', 'What government subsidy and loan schemes are available for Women Self-Help Groups (SHGs)?', 'resolved', '21 Feb 2026', 'सुनीताजी, उमेद (MSRLM) अभियान आणि मुद्रा महिला उद्योग निधी अंतर्गत कमी व्याजात कर्ज व सबसिडी मिळते. तुम्ही पंचायत समितीच्या विस्तार अधिकाऱ्यांशी संपर्क साधू शकता.', 'सुनीता जी, उमेद (MSRLM) अभियान और मुद्रा महिला उद्योग निधि के तहत कम ब्याज पर ऋण और सब्सिडी मिलती है। आप ब्लॉक/पंचायत समिति कार्यालय में संपर्क कर सकती हैं।', 'Sunita ji, under MSRLM (Umed Mission) and Mudra Mahila Udyog Nidhi, women SHGs receive low-interest loans with capital subsidies. You can visit your local block development or panchayat office.'),
('q-103', 'अनिल शिंदे (पुणे ग्रामीण)', 'अनिल शिंदे (पुणे ग्रामीण)', 'Anil Shinde (Pune Rural)', 'anil.shinde@gmail.com', 'NotebookLM मध्ये इंग्रजी व्हिडिओ टाकल्यावर मराठी ऑडिओ कसा ऐकायचा?', 'NotebookLM में अंग्रेजी वीडियो डालने के बाद अपनी भाषा में ऑडियो कैसे सुनें?', 'How to listen to audio summaries in local language after uploading video to NotebookLM?', 'resolved', '22 Feb 2026', 'NotebookLM मध्ये सोर्स जोडल्यानंतर चॅट बॉक्समध्ये "मराठीत ऑडिओ सारांश द्या" असे लिहा आणि "Generate Audio Overview" बटनावर क्लिक करा.', 'NotebookLM में सोर्स जोड़ने के बाद चैट बॉक्स में "हिंदी में ऑडियो सारांश दें" लिखें और "Generate Audio Overview" बटन पर क्लिक करें।', 'After adding your video link as a source in NotebookLM, type "Provide summary in my language" in the prompt box and click "Generate Audio Overview" to listen.');

-- Seed Admin Profile
INSERT INTO public.profiles (name, name_hi, name_en, email, village, business_type, role, is_verified)
VALUES 
('शैलेश (Administrator)', 'शैलेश (Administrator)', 'Shailesh (Administrator)', 'shailesh14362@gmail.com', 'Maharashtra', 'System Admin', 'admin', true);

-- =========================================================================
-- HOW TO SET YOUR EMAIL AS ADMIN IN SUPABASE:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'shailesh14362@gmail.com';
-- =========================================================================
