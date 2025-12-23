// utils/ai-cleaner.utils.js
exports.prepareDataForAI = (scanDetails) => {
    if (!scanDetails || !Array.isArray(scanDetails)) return [];

    return scanDetails.map(vuln => {
        const techSummary = vuln.technicalDetail || {};
        
        // استخراج قائمة الثغرات المكتشفة
        let findings = [];
        if (techSummary.findings && Array.isArray(techSummary.findings)) {
            findings = techSummary.findings;
        }

        return {
            title: vuln.vulnerabilityName || "Unknown Vulnerability",
            severity: vuln.severity || "Low",
            count: findings.length > 0 ? findings.length : (vuln.isDetected ? 1 : 0),
            // 🔥 السرعة هنا: نأخذ أول 5 أمثلة فقط بدلاً من الملف بالكامل
            samples: findings.slice(0, 5).map(f => ({
                url: f.detail?.url || f.url || "N/A",
                param: f.detail?.param || f.param || "N/A"
            }))
        };
    });
};