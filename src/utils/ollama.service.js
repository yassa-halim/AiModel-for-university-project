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
        if (logger) logger.info(`🤖 Generating Professional Security Report (Balanced Mode) for: ${targetUrl}`);
        const startTime = Date.now();

        // حساب تقريبي لحجم الداتا
        const dataStr = JSON.stringify(cleanedData);
        if (dataStr.length > 10000) if (logger) logger.warn("⚠️ Heavy Input Data: Processing might take extra time.");

        const response = await axios.post('http://localhost:11434/api/generate', {
            model: "llama3.1:8b-instruct-q4_0", 
            prompt: prompt,
            stream: false,
            
            // 🎯 إعدادات متوازنة للتحليل الأمني الاحترافي
            // الهدف: تقرير مفصّل وشامل مع سرعة معقولة
            options: { 
                // 1. 📊 الذاكرة (كافية لتحليل ثغرات متعددة)
                num_ctx: 2048,         // ⚡ مناسبة لتحليل 3-5 ثغرات بتفصيل
                
                // 2. 🔥 GPU: توازن بين الأداء والاستقرار
                num_gpu: 18,           // ⚡ 18 طبقة = جودة عالية مع استقرار
                
                // 3. 🎯 إعدادات الجودة (مُحسّنة للتقارير الأمنية)
                temperature: 0.2,      // منخفضة للدقة والالتزام بالقالب
                top_p: 0.9,            // نطاق واسع للتعبيرات الفنية
                top_k: 50,             // توازن بين التنوع والدقة
                repeat_penalty: 1.2,   // منع التكرار في التحليل
                
                // 4. 📝 حد الكلمات (مرن للتقارير المفصلة)
                num_thread: 4,         
                num_predict: 3500,     // ⚡ كافي لتحليل 5-7 ثغرات بتفصيل كامل
                
                // 5. 🔥 إعدادات الأداء المتوازنة
                num_batch: 512,        // توازن بين السرعة واستهلاك VRAM
                use_mmap: true,        
                use_mlock: false,      
                num_keep: 6,           // الاحتفاظ بسياق أكبر للتحليل المترابط
                
                // 6. 🎯 إعدادات إضافية للجودة
                presence_penalty: 0.1, // تشجيع التنوع في التحليل
                frequency_penalty: 0.1 // تجنب تكرار نفس العبارات
            } 
        }, {
            timeout: 900000,  // 15 دقيقة - وقت كافي للتقارير المفصلة
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.response) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            if (logger) logger.info(`✅ Security Report Generated Successfully (Balanced Mode) in ${duration}s 🎯`);
            console.log(`🎯 AI Analysis Time: ${duration}s (Quality-Optimized for Security Reports)`);
            
            const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
            
            const reportWithMetadata = `---
Report Generated: ${timestamp}
Target: ${targetUrl}
Analysis Engine: VulnCraft AI (Quality-Balanced Architecture)
Processing Time: ${duration}s
Report Quality: Professional Security Analysis
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
**Error:** AI Processing Error (GPU Turbo Mode)
**Details:** ${errMsg}

**Speed Optimization Tips:**
1. Model: llama3.1:8b-instruct-q4_0 ✅
2. Close all GPU apps (Chrome, games)
3. Run 'nvidia-smi' to monitor VRAM
4. Current settings: num_ctx=2048, num_batch=2048

**If OOM occurs:**
- Edit code: num_gpu: 25 (instead of -1)
- Reduce: num_ctx: 1536
- Reduce: num_batch: 1024`;
    }
    };

    const result = requestQueue.then(currentTask);
    requestQueue = result.catch(() => {});

    return result;
};