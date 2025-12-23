const fs = require('fs-extra');
const path = require('path');

// استدعاء الموديلات والأدوات
const ScanResult = require('../../../model/results.model'); 
const logger = require('../../../utils/logger.utils');
const { prepareDataForAI } = require('../utils/ai-cleaner.utils');
const { generateReportContent } = require('../utils/ollama.service');
const { generateAndSavePDF } = require('../services/pdf.service'); // الخدمة الجديدة

exports.generateAndDownloadPDF = async (req, res) => {
    const { scanId } = req.params;

    try {
        if(logger) logger.info(`📄 Requesting PDF for Scan ID: ${scanId}`);

        // 1. جلب الداتا من الداتابيز
        const scan = await ScanResult.findById(scanId).populate('url');
        
        if (!scan) {
            return res.status(404).json({ message: "Scan not found" });
        }

        const targetUrl = scan.url ? scan.url.originalUrl : "Target Website";

        let markdownContent = "";
        let filenameToDownload = scan.pdfFilename;
        // 🔥 التحقق: هل التقرير موجود بالفعل في الداتابيز؟
        if (scan.aiReportContent && scan.aiReportContent.length > 50) {
            console.log("🚀 Using cached AI report from Database.");
            markdownContent = scan.aiReportContent;
        } else {
            // لو مش موجود (لأي سبب)، نولده دلوقتي (Fallback)
            console.log("⚠️ No cached report found. Generating new one...");
            const scanDetails = scan.details ? scan.details : scan;
            const cleanedData = prepareDataForAI(scanDetails);
            
            console.log("🤖 AI is writing the report...");
            markdownContent = await generateReportContent(targetUrl, cleanedData);
        }

        // تحديد المسار
        const reportsDir = path.join(__dirname, '../../ai_PDF');

        // إذا كان الملف غير موجود في الداتابيز أو غير موجود فعلياً على القرص، نولده
        let reportPath = filenameToDownload ? path.join(reportsDir, filenameToDownload) : null;

        if (!filenameToDownload || !(await fs.pathExists(reportPath))) {
            console.log("⚠️ PDF file missing. Generating new one...");
            const result = await generateAndSavePDF(markdownContent, targetUrl);
            filenameToDownload = result.filename;
            reportPath = result.reportPath;
            
            // تحديث الداتابيز للمستقبل
            scan.pdfFilename = filenameToDownload;
            await scan.save();
        }
        
        // تحميل الملف
        if(logger) logger.info(`🚀 Serving PDF: ${filenameToDownload}`);
        res.download(reportPath);

    } catch (error) {
        console.error("💥 Report Generation Failed:", error);
        res.status(500).json({ message: "Report Generation Failed", error: error.message });
    }
};