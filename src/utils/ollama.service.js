const axios = require('axios');

const logger = require('../../../utils/logger.utils');
const { REPORT_PROMPT } = require('./prompts');

// 🔥 طابور الانتظار: لضمان عدم تشغيل أكثر من عملية AI في نفس الوقت
let requestQueue = Promise.resolve();

exports.generateReportContent = async (targetUrl, cleanedData) => {
    // نربط الطلب الحالي بنهاية الطلب السابق في الطابور
    const currentTask = async () => {
    
    // 1. هندسة الأوامر (نسخة المقال الاحترافي)
    const prompt = REPORT_PROMPT
        .replace('{{DATA}}', JSON.stringify(cleanedData, null, 2))
        .replace('{{TARGET_URL}}', targetUrl)
        .replace('{{DATE}}', new Date().toISOString().split('T')[0]);

    try {
        if (logger) logger.info(`🤖 Generating Professional Article using Hybrid Mode for: ${targetUrl}`);

        // حساب تقريبي لحجم الداتا عشان لو كبيرة ينبهك في اللوج
        const dataStr = JSON.stringify(cleanedData);
        if (dataStr.length > 10000) if (logger) logger.warn("⚠️ Heavy Input Data: Processing might take extra time.");

        const response = await axios.post('http://localhost:11434/api/generate', {
            model: "llama3.1", 
            prompt: prompt,
            stream: false,
            
            // 🔥 إعدادات المعالجة الهجينة (Hybrid CPU/GPU)
            options: { 
                // 1. الذاكرة (Context)
                // 🔥 تقليل الذاكرة لزيادة السرعة (4096 كافية جداً مع البيانات المنظفة)
                num_ctx: 4096,
                
                // 2. توزيع الحمل (The Magic Number)
                // تعديل خاص لـ 4GB VRAM:
                // تم تقليل الطبقات إلى 8 فقط لتجنب امتلاء ذاكرة الفيديو (VRAM Crash)
                // هذا سيجعل المعالج (CPU) يتحمل الجزء الأكبر، مما قد يبطئ التوليد قليلاً لكنه يضمن العمل باستقرار
                num_gpu: 14, 
                
                // 3. إعدادات جودة الكتابة
                temperature: 0.2,      // تقليل الحرارة لضمان الالتزام بالقالب بدقة
                top_p: 0.9, 
                repeat_penalty: 1.1,   // عشان ميكررش الكلام
                
                // 4. تحسين الأداء
                num_thread: 6,         // استغل انوية البروسيسور (ممكن تخليها 6 أو 8 حسب جهازك)
                num_predict: -1        // سيبه يكتب لحد ما يخلص فكرته
            } 
        }, {
            // وقت كافي جداً للمعالجة الهجينة (20 دقيقة)
            timeout: 1200000, 
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.response) {
            if (logger) logger.info(`✅ Article Generated Successfully (Hybrid Mode)`);
            
            // ترويسة التقرير (Header)
            const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
            
            const reportWithMetadata = `---
Report Generated: ${timestamp}
Target: ${targetUrl}
Analysis Engine: VulnCraft AI (Hybrid Architecture)
Confidentiality: Internal / Restricted
---

${response.data.response}

---
<div align="center">
<strong>VulnCraft Project</strong> • <em>Next-Gen Security Analysis</em>
</div>
`;
            return reportWithMetadata;
        } else {
            throw new Error("Received empty response from AI Model");
        }

    } catch (error) {
        // نفس نظام معالجة الأخطاء العبقري اللي في كودك (سيبته زي ما هو)
        const errMsg = error.message;
        
        if (errMsg.includes("404")) console.error("❌ Model not found! Run: ollama pull llama3.1");
        else if (errMsg.includes("timeout")) console.error("⏱️ Timeout! Try reducing num_ctx to 4096.");
        else if (errMsg.includes("out of memory")) console.error("💾 GPU OOM! Try reducing num_gpu to 15.");
        
        if (logger && logger.error) logger.error(`AI Service Error: ${errMsg}`);
        else console.error("Full Error:", errMsg);
        
        // إرجاع رسالة خطأ منسقة في ملف الـ PDF
        return `# Report Generation Failed
**Target:** ${targetUrl}
**Error:** AI Processing Error (Hybrid Mode)
**Details:** ${errMsg}
**Tip:** If OOM occurs, try lowering 'num_gpu' in code.`;
    }
    };

    // إضافة المهمة للطابور وانتظار النتيجة
    const result = requestQueue.then(currentTask);
    
    // تحديث الطابور ليشير إلى المهمة الحالية (مع معالجة الأخطاء لعدم إيقاف الطابور)
    requestQueue = result.catch(() => {});

    return result;
};