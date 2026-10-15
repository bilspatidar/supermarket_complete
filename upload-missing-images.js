import dotenv from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const SOURCE_DIR = path.resolve("./missing_images");

const bucket = process.env.CLOUDFLARE_R2_BUCKET || "swastikmarket";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Folder not found: ${SOURCE_DIR}`);
  }

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((file) => file.toLowerCase().endsWith(".webp"));

  console.log("");
  console.log("======================================");
  console.log("   UPLOADING MISSING IMAGES TO R2");
  console.log("======================================");
  console.log(`Source : ${SOURCE_DIR}`);
  console.log(`Bucket : ${bucket}`);
  console.log(`Images : ${files.length}`);
  console.log("");

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);

    try {
      const body = fs.readFileSync(filePath);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: file,
          Body: body,
          ContentType: "image/webp",
        })
      );

      success++;

      console.log(`✓ ${file}`);
    } catch (error) {
      failed++;

      console.error(`✗ ${file}`);
      console.error(`  ${error.message}`);
    }
  }

  console.log("");
  console.log("======================================");
  console.log("UPLOAD COMPLETE");
  console.log("======================================");
  console.log(`Total  : ${files.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed : ${failed}`);
  console.log("======================================");
}

main().catch((error) => {
  console.error("");
  console.error("❌ ERROR:", error.message);
  process.exit(1);
});
