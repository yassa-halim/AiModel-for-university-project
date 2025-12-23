// scripts/setup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🚀 Starting Project Setup...");

const runCommand = (command, message) => {
    return new Promise((resolve, reject) => {
        console.log(`\n👉 ${message}...`);
        const process = exec(command);
        let output = '';
        process.stdout.on('data', (data) => {
            console.log(data.toString());
            output += data.toString();
        });
        process.stderr.on('data', (data) => console.error(data.toString()));
        process.on('exit', (code) => {
            if (code === 0) resolve(output);
            else reject(`❌ Error in ${message}`);
        });
    });
};

const setup = async () => {
    try {
        await runCommand('npm install', 'Installing Dependencies');
        
        // 1. إنشاء مجلد التقارير (حيث يتم حفظ الـ PDF)
        const pdfDir = path.join(__dirname, '../ai_PDF');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir);
            console.log("✅ 'ai_PDF' directory created.");
        }

        // 2. التأكد من وجود مجلد الـ CSS
        const cssDir = path.join(__dirname, '../reports');
        if (!fs.existsSync(cssDir)) {
            fs.mkdirSync(cssDir);
            console.log("✅ AI Model 'reports' directory checked.");
        }

        console.log("\n⏳ Checking Llama 3.1 Model...");
        // التحقق أولاً إذا كان الموديل موجوداً لتوفير الوقت
        const listOutput = await runCommand('ollama list', 'Checking installed models');
        if (listOutput.includes('llama3.1')) {
            console.log("✅ Model 'llama3.1' is already installed. Skipping download.");
        } else {
            await runCommand('ollama pull llama3.1', 'Pulling AI Model');
        }

        console.log("\n🎉 Setup Finished! Run 'npm start' to begin.");
    } catch (error) {
        console.error("\n💥 Setup Failed:", error);
    }
};

setup();