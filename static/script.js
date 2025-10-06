// منطق JavaScript لتحليل السيرة الذاتية والتعامل مع API

const API_URL = 'https://resume-ats-checker-82vc.onrender.com';

// العناصر الرئيسية
const uploadForm = document.getElementById('uploadForm');
const resumeFile = document.getElementById('resumeFile');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// عناصر النتائج
const scoreNumber = document.getElementById('scoreNumber');
const scoreCircle = document.getElementById('scoreCircle');
const scoreStatus = document.getElementById('scoreStatus');
const wordCount = document.getElementById('wordCount');
const foundSections = document.getElementById('foundSections');
const missingSections = document.getElementById('missingSections');
const foundSectionsList = document.getElementById('foundSectionsList');
const missingSectionsList = document.getElementById('missingSectionsList');
const adviceList = document.getElementById('adviceList');

// ترجمة أسماء الأقسام
const sectionNames = {
    'contact': 'معلومات التواصل',
    'experience': 'الخبرات العملية',
    'education': 'التعليم',
    'skills': 'المهارات'
};

// عرض اسم الملف عند الاختيار
resumeFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        fileName.style.color = '#1e293b';
    } else {
        fileName.textContent = 'اختر ملف';
        fileName.style.color = '#64748b';
    }
});

// معالجة رفع الملف وتحليله
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const file = resumeFile.files[0];
    
    if (!file) {
        alert('الرجاء اختيار ملف أولاً');
        return;
    }
    
    // التحقق من حجم الملف (16 ميجابايت)
    if (file.size > 16 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 16 ميجابايت');
        return;
    }
    
    // التحقق من صيغة الملف
    const validExtensions = ['pdf', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        alert('صيغة الملف غير مدعومة. استخدم PDF أو DOCX');
        return;
    }
    
    // إظهار شاشة التحميل
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    analyzeBtn.disabled = true;
    
    try {
        // إنشاء FormData لإرسال الملف
        const formData = new FormData();
        formData.append('resume', file);
        
        // إرسال الطلب إلى Backend
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'حدث خطأ في التحليل');
        }
        
        const data = await response.json();
        
        // عرض النتائج
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        alert(`حدث خطأ: ${error.message}`);
    } finally {
        loadingSpinner.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

// عرض النتائج
function displayResults(data) {
    // عرض النتيجة المئوية
    animateScore(data.score);
    
    // تحديد حالة النتيجة
    let status = '';
    let statusClass = '';
    
    if (data.score >= 80) {
        status = 'ممتاز! 🎉';
        statusClass = 'excellent';
        scoreCircle.style.stroke = '#10b981';
    } else if (data.score >= 60) {
        status = 'جيد 👍';
        statusClass = 'good';
        scoreCircle.style.stroke = '#f59e0b';
    } else {
        status = 'يحتاج تحسين 📝';
        statusClass = 'poor';
        scoreCircle.style.stroke = '#ef4444';
    }
    
    scoreStatus.textContent = status;
    scoreStatus.className = `score-status ${statusClass}`;
    
    // عرض الإحصائيات
    wordCount.textContent = data.word_count;
    foundSections.textContent = data.found_sections.length;
    missingSections.textContent = data.missing_sections.length;
    
    // عرض الأقسام الموجودة
    foundSectionsList.innerHTML = '';
    if (data.found_sections.length > 0) {
        data.found_sections.forEach(section => {
            const li = document.createElement('li');
            li.textContent = sectionNames[section] || section;
            foundSectionsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'لا توجد أقسام معروفة';
        foundSectionsList.appendChild(li);
    }
    
    // عرض الأقسام المفقودة
    missingSectionsList.innerHTML = '';
    if (data.missing_sections.length > 0) {
        data.missing_sections.forEach(section => {
            const li = document.createElement('li');
            li.textContent = sectionNames[section] || section;
            missingSectionsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'جميع الأقسام موجودة! ✅';
        li.style.color = '#10b981';
        missingSectionsList.appendChild(li);
    }
    
    // عرض النصائح
    adviceList.innerHTML = '';
    data.advice.forEach(advice => {
        const li = document.createElement('li');
        li.textContent = advice;
        adviceList.appendChild(li);
    });
    
    // إظهار قسم النتائج
    resultsSection.classList.remove('hidden');
    
    // Scroll إلى النتائج
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// تحريك الدائرة المئوية
function animateScore(score) {
    const circumference = 2 * Math.PI * 90; // 2πr where r=90
    const offset = circumference - (score / 100) * circumference;
    
    // تحريك الرقم
    let currentScore = 0;
    const increment = score / 50; // 50 خطوة للوصول للنتيجة النهائية
    
    const scoreInterval = setInterval(() => {
        currentScore += increment;
        if (currentScore >= score) {
            currentScore = score;
            clearInterval(scoreInterval);
        }
        scoreNumber.textContent = Math.round(currentScore);
    }, 30);
    
    // تحريك الدائرة
    setTimeout(() => {
        scoreCircle.style.strokeDashoffset = offset;
    }, 100);
}

// زر "تحليل سيرة ذاتية أخرى"
tryAgainBtn.addEventListener('click', function() {
    // إخفاء النتائج
    resultsSection.classList.add('hidden');
    
    // إعادة تعيين النموذج
    uploadForm.reset();
    fileName.textContent = 'اختر ملف';
    fileName.style.color = '#64748b';
    
    // إعادة تعيين الدائرة
    scoreCircle.style.strokeDashoffset = 565;
    scoreNumber.textContent = '0';
    
    // Scroll إلى الأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// منع السحب والإفلات خارج منطقة الرفع
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// إضافة تأثير السحب والإفلات
const fileLabel = document.querySelector('.file-label');

['dragenter', 'dragover'].forEach(eventName => {
    fileLabel.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    fileLabel.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    fileLabel.style.borderColor = '#6366f1';
    fileLabel.style.background = 'rgba(99, 102, 241, 0.1)';
}

function unhighlight(e) {
    fileLabel.style.borderColor = '#e2e8f0';
    fileLabel.style.background = '#f8fafc';
}

// معالجة السحب والإفلات
fileLabel.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        resumeFile.files = files;
        fileName.textContent = files[0].name;
        fileName.style.color = '#1e293b';
    }
}
