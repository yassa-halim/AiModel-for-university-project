const axios = require('axios');

const logger = require('../../../utils/logger.utils');
const { REPORT_PROMPT } = require('./prompts');

// 🔥 طابور الانتظار: لضمان عدم تشغيل أكثر من عملية AI في نفس الوقت
let requestQueue = Promise.resolve();

exports.generateReportContent = async (targetUrl, cleanedData) => {
    // نربط الطلب الحالي بنهاية الطلب السابق في الطابور
    const currentTask = async () => {
    
    // 1. هندسة الأوامر (نسخة المقال الاحترافي)
    const today = new Date().toISOString().split('T')[0];
    const prompt = REPORT_PROMPT
        .replace('{{DATA}}', JSON.stringify(cleanedData, null, 2))
        .replace('{{TARGET_URL}}', targetUrl)
        .replace('{{DATE}}', today)
        .replace('{{END_DATE}}', today)
        .replace('{{TIMESTAMP}}', Date.now().toString());

    try {
        if (logger) logger.info(`🤖 Generating Professional Security Report (Maximum Quality Mode) for: ${targetUrl}`);
        const startTime = Date.now();

        // حساب تقريبي لحجم الداتا
        const dataStr = JSON.stringify(cleanedData);
        if (dataStr.length > 10000) if (logger) logger.warn("⚠️ Heavy Input Data: Processing might take extra time.");

        const response = await axios.post('http://localhost:11434/api/generate', {
            model: "llama3.1:8b-instruct-q4_0", 
            prompt: prompt,
            stream: false,
            
            // 🎯 إعدادات الجودة القصوى (Maximum Quality & Professionalism)
            // الهدف: تقرير احترافي جداً بغض النظر عن الوقت (Hybrid Mode)
            options: { 
                // 1. 📊 الذاكرة (Context Window)
                // رفعنا الذاكرة لـ 8192 عشان الموديل يقرأ كل التفاصيل ويكتب تقرير طويل ومترابط
                num_ctx: 8192,         
                
                // 2. 🔥 GPU + CPU (Hybrid Mode)
                // كرت الشاشة 4GB لا يكفي للموديل بالكامل (4.7GB).
                // الحل: نضع 12 طبقة على الكرت (عشان نسيب مساحة للذاكرة) والباقي على المعالج i5-12500 القوي.
                num_gpu: 12,           
                
                // 3. 🎯 إعدادات الجودة (Professional Tone)
                temperature: 0.1,      // دقة عالية جداً وتقليل التأليف
                top_p: 0.9,            
                top_k: 40,             
                repeat_penalty: 1.1,   // منع التكرار
                
                // 4. 📝 الأداء (CPU Optimization)
                // المعالج i5-12500 يحتوي على 6 أنوية Performance، نستخدمها كلها
                num_thread: 6,         
                num_predict: -1,       // سيبه يكتب براحته لحد ما يخلص الفكرة (Unlimited)
                
                // 5. 🔥 إعدادات تقنية
                num_batch: 512,        
                use_mmap: true,        
                num_keep: 24,          // الاحتفاظ بسياق أكبر لضمان ترابط التقرير
            } 
        }, {
            timeout: 1200000,  // 20 دقيقة - وقت كافي جداً
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.response) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            if (logger) logger.info(`✅ Security Report Generated Successfully (Max Quality Mode) in ${duration}s 💎`);
            console.log(`💎 AI Analysis Time: ${duration}s (Professional Hybrid Mode - i5+RTX3050)`);
            
            const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
            
            const reportWithMetadata = `---
Report Generated: ${timestamp}
Target: ${targetUrl}
Analysis Engine: VulnCraft AI (Maximum Quality - Hybrid Architecture)
Processing Time: ${duration}s
Report Quality: ★★★★★ Professional Security Analysis
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
        const errMsg = error.message;
        
        if (errMsg.includes("404")) {
            console.error("❌ Model not found! Run: ollama pull llama3.1:8b-instruct-q4_0");
        } else if (errMsg.includes("timeout")) {
            console.error("⏱️ Timeout! Your report might be too complex.");
            console.error("   Solutions:");
            console.error("   1. This is normal for 7+ vulnerabilities");
            console.error("   2. Current timeout: 15 minutes");
            console.error("   3. Consider splitting large scans");
        } else if (errMsg.includes("out of memory") || errMsg.includes("CUDA") || errMsg.includes("OOM")) {
            console.error("💾 GPU Out of Memory! Solutions:");
            console.error("   1. Change num_gpu from -1 to 25");
            console.error("   2. Reduce num_ctx to 1536");
            console.error("   3. Reduce num_batch to 1024");
            console.error("   4. Close Chrome and other GPU apps");
            console.error("   5. Run: nvidia-smi to check VRAM usage");
        }
        
        if (logger && logger.error) logger.error(`AI Service Error: ${errMsg}`);
        else console.error("Full Error:", errMsg);
        
        return `# Report Generation Failed
**Target:** ${targetUrl}
**Error:** AI Processing Error (Hybrid Mode)
**Details:** ${errMsg}

**Troubleshooting Tips:**
1. Model: llama3.1:8b-instruct-q4_0 ✅
2. Check VRAM: 4GB is tight for 8192 context.
3. Try reducing num_ctx to 4096 if OOM occurs.
4. Current settings: num_gpu=12 (Hybrid), num_thread=6`;
    }
    };

    const result = requestQueue.then(currentTask);
    requestQueue = result.catch(() => {});

    return result;
};