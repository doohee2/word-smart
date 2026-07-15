const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFiles = {
  light: path.join(__dirname, 'stitch_design', 'lightmode_icon.png'),
  dark: path.join(__dirname, 'stitch_design', 'darkmode_icon.png'),
};

const outputDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [192, 512];

async function processIcons() {
  for (const [theme, inputFile] of Object.entries(inputFiles)) {
    for (const size of sizes) {
      const radius = size * 0.225; // iOS-like rounding
      const roundedCorners = Buffer.from(
        `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`
      );

      await sharp(inputFile)
        .resize(size, size)
        .composite([{
          input: roundedCorners,
          blend: 'dest-in'
        }])
        .toFile(path.join(outputDir, `icon-${theme}-${size}x${size}.png`));
    }
  }
  
  // Create a default one
  await sharp(inputFiles.light)
    .resize(192, 192)
    .composite([{
      input: Buffer.from(`<svg><rect x="0" y="0" width="192" height="192" rx="43" ry="43"/></svg>`),
      blend: 'dest-in'
    }])
    .toFile(path.join(outputDir, `icon-192x192.png`));
    
  await sharp(inputFiles.light)
    .resize(512, 512)
    .composite([{
      input: Buffer.from(`<svg><rect x="0" y="0" width="512" height="512" rx="115" ry="115"/></svg>`),
      blend: 'dest-in'
    }])
    .toFile(path.join(outputDir, `icon-512x512.png`));
}

processIcons().then(() => console.log('Icons processed.')).catch(console.error);
