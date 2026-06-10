const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb, TABLES } = require('../src/lib/dynamodb');

async function test() {
  console.log('Table names:', TABLES);
  
  try {
    const result = await dynamodb.send(new QueryCommand({
      TableName: TABLES.HABITS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': '00000000-0000-0000-0000-000000000001' },
    }));
    console.log('Habits query OK:', JSON.stringify(result.Items));
  } catch (e) {
    console.error('Habits query ERROR:', e.name, e.message);
  }

  try {
    const result = await dynamodb.send(new QueryCommand({
      TableName: TABLES.TASKS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': '00000000-0000-0000-0000-000000000001' },
    }));
    console.log('Tasks query OK:', JSON.stringify(result.Items));
  } catch (e) {
    console.error('Tasks query ERROR:', e.name, e.message);
  }
}

test();
