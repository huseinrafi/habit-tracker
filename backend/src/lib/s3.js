const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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

module.exports = { s3, ATTACHMENTS_BUCKET, generateUploadUrl };
