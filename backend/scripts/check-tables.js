const { DynamoDBClient, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const client = new DynamoDBClient({
  region: 'ap-southeast-1',
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function check() {
  const { TableNames } = await client.send(new ListTablesCommand({}));
  console.log('Tables:', TableNames);

  for (const name of TableNames) {
    const desc = await client.send(new DescribeTableCommand({ TableName: name }));
    console.log(`\n${name}:`);
    console.log('  KeySchema:', JSON.stringify(desc.Table.KeySchema));
    console.log('  Attributes:', JSON.stringify(desc.Table.AttributeDefinitions));
    const gsi = desc.Table.GlobalSecondaryIndexes || [];
    gsi.forEach(g => console.log('  GSI:', g.IndexName, JSON.stringify(g.KeySchema)));
  }
}

check().catch(e => console.error('Error:', e));
