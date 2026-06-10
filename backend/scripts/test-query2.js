require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { dynamodb, TABLES } = require('../src/lib/dynamodb');

async function test() {
  console.log('ENV DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
  console.log('Table names:', TABLES);
  
  try {
    const result = await dynamodb.send(new (require('@aws-sdk/lib-dynamodb').QueryCommand)({
      TableName: TABLES.HABITS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': '00000000-0000-0000-0000-000000000001' },
    }));
    console.log('Habits query OK:', JSON.stringify(result.Items));
  } catch (e) {
    console.error('Habits query ERROR:', e.name, e.message);
  }
}

test();
