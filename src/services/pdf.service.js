const fs = require('fs');
const path = require('path');
const markdownpdf = require('markdown-pdf');
const logger = require('../../../utils/logger.utils');

// دالة مساعدة لاستخراج اسم الشركة (للاستخدام الداخلي)
const getCompanyName = (targetUrl) => {
    try {
        const urlObj = new URL(targetUrl);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            return parts.slice(0, 2).join('.');
        }
        return hostname;
    } catch (e) {
        return targetUrl.replace(/[^a-z0-9]/gi, '_');
    }
};

exports.generateAndSavePDF = (markdownContent, targetUrl) => {
    return new Promise((resolve, reject) => {
        try {
            // 1. تجهيز المسارات
            const reportsDir = path.join(__dirname, '../../ai_PDF');
            if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

            // 2. تجهيز اسم الملف
            const companyName = getCompanyName(targetUrl);
            const safeName = companyName.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
            
            let filename = `${safeName}.pdf`;
            let reportPath = path.join(reportsDir, filename);

            // 3. معالجة التكرار (Versioning)
            let counter = 1;
            while (fs.existsSync(reportPath)) {
                filename = `${safeName} (${counter}).pdf`;
                reportPath = path.join(reportsDir, filename);
                counter++;
            }

            // 4. إعدادات التصميم
            const cssPath = path.join(__dirname, '../../reports/report.css');
            const options = {
                cssPath: fs.existsSync(cssPath) ? cssPath : null,
                paperFormat: 'A4',
                renderDelay: 3000, // 🔥 انتظار 3 ثواني لضمان تحميل المحتوى والتنسيقات
            };

            // 5. التوليد
            markdownpdf(options)
                .from.string(markdownContent)
                .to(reportPath, function () {
                    if (logger) logger.info(`✅ PDF Saved locally: ${filename}`);
                    resolve({ filename, reportPath });
                });

        } catch (error) {
            if (logger) logger.error(`❌ PDF Generation Error: ${error.message}`);
            reject(error);
        }
    });
};

// تصدير دالة استخراج الاسم لاستخدامها في أماكن أخرى لو احتجنا
exports.getCompanyName = getCompanyName;
