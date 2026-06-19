const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const ATTACHMENTS_BUCKET = process.env.ATTACHMENTS_BUCKET || 'habit-tracker-attachments-local';

async function generateUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: ATTACHMENTS_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return signedUrl;
}

async function uploadFromBase64(key, contentType, base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');

  const command = new PutObjectCommand({
    Bucket: ATTACHMENTS_BUCKET,
    Key: key,
    ContentType: contentType,
    Body: buffer,
  });

  await s3.send(command);
}

async function generateDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: ATTACHMENTS_BUCKET,
    Key: key,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });
  return signedUrl;
}

module.exports = { s3, ATTACHMENTS_BUCKET, generateUploadUrl, uploadFromBase64, generateDownloadUrl };
