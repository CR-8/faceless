/**
 * One-time script: uploads all background videos to Cloudinary
 * Run with: node scripts/upload-backgrounds.mjs
 *
 * Outputs a JSON mapping of { id -> cloudinary_url } to stdout.
 * Copy the URLs into src/data/data.ts BG_ASSETS videoUrl fields.
 */

import { v2 as cloudinary } from 'cloudinary';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';
import { config } from 'dotenv';

config(); // load .env

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BG_DIR = join(process.cwd(), 'public', 'background');

const folders = await readdir(BG_DIR, { withFileTypes: true });
const results = {};

for (const folder of folders.filter(f => f.isDirectory())) {
  const folderPath = join(BG_DIR, folder.name);
  const files = (await readdir(folderPath)).filter(f => f.endsWith('.mp4'));

  for (const file of files) {
    const filePath = join(folderPath, file);
    const publicId = `backgrounds/${folder.name}/${basename(file, '.mp4')}`;

    process.stdout.write(`Uploading ${publicId}... `);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        public_id: publicId,
        overwrite: false,
        // Deliver as-is, no transformation
      });
      results[publicId] = result.secure_url;
      console.log('✓');
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }
}

console.log('\n--- Cloudinary URLs ---');
console.log(JSON.stringify(results, null, 2));
