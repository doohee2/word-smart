/* eslint-disable @typescript-eslint/no-require-imports */
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
const scale = 1.2; // 로고 디자인 영역 20% 확대

async function processIcons() {
  for (const [theme, inputFile] of Object.entries(inputFiles)) {
    for (const size of sizes) {
      const zoomedSize = Math.round(size * scale);
      const offset = Math.floor((zoomedSize - size) / 2);

      const radius = size * 0.225; // iOS-like rounding
      const roundedCorners = Buffer.from(
        `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`
      );

      await sharp(inputFile)
        .resize(zoomedSize, zoomedSize)
        .extract({ left: offset, top: offset, width: size, height: size })
        .composite([{
          input: roundedCorners,
          blend: 'dest-in'
        }])
        .toFile(path.join(outputDir, `icon-${theme}-${size}x${size}.png`));
    }
  }
  
  // Create default icons
  for (const size of [192, 512]) {
    const zoomedSize = Math.round(size * scale);
    const offset = Math.floor((zoomedSize - size) / 2);
    const radius = size * 0.225;
    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`
    );

    await sharp(inputFiles.light)
      .resize(zoomedSize, zoomedSize)
      .extract({ left: offset, top: offset, width: size, height: size })
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }])
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
  }
}

processIcons().then(() => console.log('Icons processed successfully with 20% zoom.')).catch(console.error);
