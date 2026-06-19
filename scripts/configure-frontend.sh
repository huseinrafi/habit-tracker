#!/bin/bash
# Configure frontend .env with deployed stack outputs
# Usage: ./scripts/configure-frontend.sh [stage]

STAGE=${1:-prod}

echo "Fetching CloudFormation outputs for habit-tracker-backend-${STAGE}..."

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "habit-tracker-backend-${STAGE}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

COGNITO_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "habit-tracker-backend-${STAGE}" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" \
  --output text)

COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "habit-tracker-backend-${STAGE}" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoClientId'].OutputValue" \
  --output text)

WEB_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "habit-tracker-backend-${STAGE}" \
  --query "Stacks[0].Outputs[?OutputKey=='WebBucketUrl'].OutputValue" \
  --output text)

if [ -z "$API_URL" ] || [ -z "$COGNITO_POOL_ID" ] || [ -z "$COGNITO_CLIENT_ID" ]; then
  echo "ERROR: Could not fetch stack outputs. Make sure 'serverless deploy --stage ${STAGE}' has been run."
  exit 1
fi

cat > frontend/.env << EOF
VITE_API_URL=${API_URL}/api
VITE_COGNITO_USER_POOL_ID=${COGNITO_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
EOF

echo "Done! frontend/.env updated:"
echo "  VITE_API_URL=${API_URL}/api"
echo "  VITE_COGNITO_USER_POOL_ID=${COGNITO_POOL_ID}"
echo "  VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}"
echo ""
echo "Web bucket URL: ${WEB_BUCKET}"
echo "Next: cd frontend && npm run build && aws s3 sync dist/ 's3://${WEB_BUCKET#http://}' --delete"
