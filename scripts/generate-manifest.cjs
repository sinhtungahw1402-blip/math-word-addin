const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.log('Usage: node scripts/generate-manifest.cjs <https://your-domain.netlify.app>');
  process.exit(1);
}

// Clean up trailing slash
const cleanUrl = targetUrl.replace(/\/+$/, '');

const templatePath = path.resolve(__dirname, '../manifest.xml');
let manifestContent = fs.readFileSync(templatePath, 'utf8');

// Replace all localhost:3000 with the cleanUrl
manifestContent = manifestContent.replace(/https:\/\/localhost:3000/g, cleanUrl);

const outputPath = path.resolve(__dirname, '../manifest.prod.xml');
fs.writeFileSync(outputPath, manifestContent, 'utf8');

console.log(`\n========================================`);
console.log(`✅ Đã tạo thành công: manifest.prod.xml`);
console.log(`🌐 Tên miền máy chủ Cloud: ${cleanUrl}`);
console.log(`📁 Đường dẫn file: ${outputPath}`);
console.log(`========================================\n`);
