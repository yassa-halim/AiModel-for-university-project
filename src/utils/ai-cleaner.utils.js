// utils/ai-cleaner.utils.js

exports.prepareDataForAI = (scanDetails) => {
    if (!scanDetails || !Array.isArray(scanDetails)) {
        return [];
    }

    return scanDetails
        .filter(vuln => vuln.isDetected) // 🔥 تصفية: نمرر فقط الثغرات المكتشفة
        .map((vuln, index) => {
        const tech = vuln.technicalDetail || {};
        
        // 🔥 FIX: استخراج النتائج بذكاء بناءً على نوع السكربت
        let findings = [];
        
        if (Array.isArray(tech.findings)) {
            // 1. السكربتات الأساسية (SQL, XSS)
            findings = tech.findings;
        } else if (tech.summary && Array.isArray(tech.summary.findings)) {
            // 2. هيكل بديل للسكربتات الأساسية
            findings = tech.summary.findings;
        } else if (Array.isArray(tech.details)) {
            // 3. السكربتات البسيطة (Cookies, CORS)
            findings = tech.details;
        } else if (tech.details && typeof tech.details === 'object') {
            // 4. تفاصيل مفردة (Headers)
            findings = [tech.details];
        }

        // 🛡️ Data Sanitation System: طبقة تعقيم البيانات
        // نقوم بفلترة النتائج هنا فوراً لضمان أن العدادات (Counts) والأدلة نظيفة تماماً
        findings = findings.filter(f => {
            const str = JSON.stringify(f).toLowerCase();
            return !str.includes("no connection adapters") && 
                   !str.includes("request error") && 
                   !str.includes("timeout");
        });

        // 🧠 استنتاج الـ severity بشكل آمن
        const severity = vuln.severity || "Low";

        // 🧠 تقدير Evidence Confidence (Smart Logic)
        let evidenceConfidence = "Low";
        
        // تحليل ذكي للأدلة: نبحث عن مؤشرات قوية تؤكد الثغرة
        const hasStrongIndicators = findings.some(f => {
            const d = f.detail || f || {};
            const s = JSON.stringify(d).toLowerCase();
            
            // مؤشرات قوية لـ SQL Injection
            if (s.includes("syntax error") || s.includes("sqlstate") || s.includes("ora-") || s.includes("mysql_fetch")) return true;
            if (d.diff_ratio && d.diff_ratio > 0.05) return true; // فرق واضح في الحجم (Boolean Based)
            
            // مؤشرات قوية لـ XSS
            if (d.reflection === "raw" || d.found_raw === true) return true; // الكود انعكس كما هو
            
            return false;
        });

        if (hasStrongIndicators) evidenceConfidence = "High";
        else if (findings.length >= 2) evidenceConfidence = "Medium";

        return {
            id: `V-${String(index + 1).padStart(3, "0")}`,
            title: vuln.vulnerabilityName || "Unspecified Security Finding",
            severity,
            evidence_confidence: evidenceConfidence,

            detected: vuln.isDetected === true,
            finding_count: findings.length,

            // ⚠️ CVSS فقط لو منطقي
            cvss_hint:
                severity === "Critical"
                    ? "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
                    : severity === "High"
                    ? "AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N"
                    : null,

            evidence: findings
                .slice(0, 5)
                .map((f) => {
                const detail = f.detail || f || {};

                // ✅ Endpoint: نجرب كل المصادر الممكنة
                const endpoint =
                    detail.url ||
                    f.url ||
                    vuln.endpoint ||
                    vuln.path ||
                    "Not specified";

                // ✅ HTTP Method
                const method =
                    detail.method ||
                    f.method ||
                    "GET";

                // ✅ Parameter
                const parameter =
                    detail.param ||
                    f.param ||
                    f.parameter ||
                    f.cookie || // دعم الكوكيز
                    (detail.params ? detail.params.join(', ') : null) || // دعم مصفوفة الباراميترات
                    "Not specified";

                // ✅ Payload
                const payload =
                    detail.payload ||
                    f.payload ||
                    (f.missing_flags ? `Missing: ${f.missing_flags.join(', ')}` : null) ||
                    "Not captured";

                // ✅ Response / Evidence
                const responseIndicator =
                    detail.evidence ||
                    detail.response ||
                    f.response ||
                    (f.missing_headers ? `Missing: ${f.missing_headers.join(', ')}` : null) ||
                    "Behavioral anomaly observed during testing";

                return {
                    endpoint,
                    method,
                    parameter,
                    payload,
                    response_indicator: responseIndicator
                };
            })
        };
    })
    .filter(item => item.finding_count > 0); // 🔥 فلتر نهائي: حذف أي ثغرة لا تحتوي على أدلة صالحة
};
