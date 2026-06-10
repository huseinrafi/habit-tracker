const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
  s3Bucket: import.meta.env.VITE_S3_BUCKET || '',
  uploadUrl: import.meta.env.VITE_UPLOAD_URL || '/api/upload',
};

export default config;
