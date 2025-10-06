# Flask Backend لتحليل السيرة الذاتية باستخدام معايير ATS
# يستقبل ملفات PDF و DOCX ويحللها ويعيد نتائج JSON

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import PyPDF2
import docx
import re
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # للسماح بطلبات من domains مختلفة

# إعدادات رفع الملفات
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # حد أقصى 16 ميجابايت

# إنشاء مجلد uploads إذا لم يكن موجوداً
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    """التحقق من صيغة الملف المسموحة"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """استخراج النص من ملف PDF"""
    try:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def extract_text_from_docx(file_path):
    """استخراج النص من ملف DOCX"""
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

def analyze_resume(text):
    """تحليل السيرة الذاتية وحساب النقاط"""
    
    # تحويل النص إلى lowercase للبحث
    text_lower = text.lower()
    
    # الأقسام الأساسية المطلوبة في ATS
    sections = {
        'contact': ['email', 'phone', 'contact', 'mobile', 'linkedin', '@'],
        'experience': ['experience', 'work history', 'employment', 'professional experience'],
        'education': ['education', 'degree', 'university', 'college', 'bachelor', 'master'],
        'skills': ['skills', 'technical skills', 'competencies', 'expertise']
    }
    
    # التحقق من وجود الأقسام
    found_sections = []
    missing_sections = []
    
    for section_name, keywords in sections.items():
        found = any(keyword in text_lower for keyword in keywords)
        if found:
            found_sections.append(section_name)
        else:
            missing_sections.append(section_name)
    
    # حساب عدد الكلمات
    word_count = len(text.split())
    
    # حساب النقاط
    score = 0
    
    # كل قسم موجود = 25 نقطة
    score += len(found_sections) * 25
    
    # إذا كان عدد الكلمات مناسب (300-800 كلمة)
    if 300 <= word_count <= 800:
        score += 10
    elif word_count > 200:
        score += 5
    
    # التحقق من وجود رقم هاتف أو بريد إلكتروني
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    
    has_email = bool(re.search(email_pattern, text))
    has_phone = bool(re.search(phone_pattern, text))
    
    if has_email:
        score += 5
    if has_phone:
        score += 5
    
    # التأكد من أن النتيجة لا تتجاوز 100
    score = min(score, 100)
    
    # توليد النصائح
    advice = []
    
    if score >= 80:
        advice.append("✅ سيرتك الذاتية ممتازة ومتوافقة مع أنظمة ATS!")
    elif score >= 60:
        advice.append("⚠️ سيرتك الذاتية جيدة لكن تحتاج بعض التحسينات")
    else:
        advice.append("❌ سيرتك الذاتية تحتاج إلى تحسينات كبيرة")
    
    if 'contact' in missing_sections:
        advice.append("📧 أضف معلومات التواصل: البريد الإلكتروني ورقم الهاتف")
    
    if 'experience' in missing_sections:
        advice.append("💼 أضف قسم الخبرات العملية بشكل واضح")
    
    if 'education' in missing_sections:
        advice.append("🎓 أضف قسم التعليم والشهادات")
    
    if 'skills' in missing_sections:
        advice.append("🛠️ أضف قسم المهارات التقنية")
    
    if word_count < 200:
        advice.append("📝 السيرة قصيرة جداً، أضف المزيد من التفاصيل")
    elif word_count > 800:
        advice.append("📄 السيرة طويلة، حاول اختصارها لصفحة أو صفحتين")
    
    if not has_email:
        advice.append("📧 تأكد من إضافة بريدك الإلكتروني")
    
    if not has_phone:
        advice.append("📞 تأكد من إضافة رقم هاتفك")
    
    # إضافة نصائح عامة
    advice.append("💡 استخدم كلمات مفتاحية من الوظيفة المستهدفة")
    advice.append("📊 استخدم أفعال قوية مثل: أدرت، طورت، حققت، قدت")
    
    return {
        'score': score,
        'word_count': word_count,
        'found_sections': found_sections,
        'missing_sections': missing_sections,
        'advice': advice,
        'has_email': has_email,
        'has_phone': has_phone
    }

@app.route('/')
def index():
    """عرض الصفحة الرئيسية"""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    """تحليل السيرة الذاتية المرفوعة"""
    
    # التحقق من وجود ملف
    if 'resume' not in request.files:
        return jsonify({'error': 'لم يتم رفع أي ملف'}), 400
    
    file = request.files['resume']
    
    # التحقق من اختيار ملف
    if file.filename == '':
        return jsonify({'error': 'لم يتم اختيار ملف'}), 400
    
    # التحقق من صيغة الملف
    if not allowed_file(file.filename):
        return jsonify({'error': 'صيغة الملف غير مدعومة. استخدم PDF أو DOCX'}), 400
    
    try:
        # حفظ الملف
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # استخراج النص حسب نوع الملف
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        else:
            text = extract_text_from_docx(file_path)
        
        # حذف الملف بعد المعالجة
        os.remove(file_path)
        
        # التحقق من استخراج النص بنجاح
        if text.startswith("Error"):
            return jsonify({'error': text}), 500
        
        # تحليل النص
        results = analyze_resume(text)
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': f'حدث خطأ: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
