import fs from 'fs';
import https from 'https';
import path from 'path';

// --- НАСТРОЙКИ ---
// ТУК променяш пътя, ако трябва да е другаде.
// Ако React ти е в папка 'client', пътят трябва да е 'client/public'
const targetFolder = path.join(process.cwd(), 'client', 'public'); 
const fileName = 'dictionary.json';
const fullPath = path.join(targetFolder, fileName);
// -----------------

console.log(`📂 Целева папка: ${targetFolder}`);
console.log('⏳ Сваляне и обработка на думите...');

// 1. Създаване на папката, ако липсва (FIX за твоята грешка)
if (!fs.existsSync(targetFolder)) {
    console.log(`🔨 Папката липсва. Създавам я: ${targetFolder}`);
    fs.mkdirSync(targetFolder, { recursive: true });
}

https.get('https://raw.githubusercontent.com/tabatkins/wordle-list/main/words', (res) => {
    let data = '';

    res.on('data', chunk => data += chunk);

    res.on('end', () => {
        const words = data.split('\n');
        
        // Филтриране: само 5 букви, само букви, правим ги главни
        const cleanWords = words
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length === 5 && /^[A-Z]+$/.test(w));

        fs.writeFileSync(fullPath, JSON.stringify(cleanWords));

        console.log(`✅ Готово!`);
        console.log(`📄 Файлът е създаден: ${fullPath}`);
        console.log(`📊 Общо думи: ${cleanWords.length}`);
    }).on('error', (err) => {
        console.error('❌ Грешка при сваляне:', err.message);
    });
});