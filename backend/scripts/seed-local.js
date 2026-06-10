const {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} = require('@aws-sdk/client-dynamodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const REGION = process.env.AWS_REGION || 'ap-southeast-1';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

const TABLES = [
  {
    TableName: 'HabitTracker_Users',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'KEYS_ONLY' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'HabitTracker_Tasks',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'taskId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'taskId', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'HabitTracker_Habits',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'habitId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'habitId', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'HabitTracker_Logs',
    AttributeDefinitions: [
      { AttributeName: 'habitId', AttributeType: 'S' },
      { AttributeName: 'dateCompleted#logId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'dateCompleted', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'habitId', KeyType: 'HASH' },
      { AttributeName: 'dateCompleted#logId', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-date-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'dateCompleted', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function seed() {
  const { TableNames } = await client.send(new ListTablesCommand({}));

  for (const tableDef of TABLES) {
    if (TableNames.includes(tableDef.TableName)) {
      console.log(`Table "${tableDef.TableName}" already exists — skipping`);
      continue;
    }
    await client.send(new CreateTableCommand(tableDef));
    console.log(`Created table: "${tableDef.TableName}"`);
  }

  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
