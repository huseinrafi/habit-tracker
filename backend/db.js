const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const isOffline = process.env.IS_OFFLINE || process.env.NODE_ENV !== 'production';

const clientParams = {
  region: process.env.AWS_REGION || 'ap-southeast-1',
};

if (isOffline) {
  clientParams.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
  clientParams.credentials = {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  };
}

const client = new DynamoDBClient(clientParams);
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'HabitTracker_Users';
const TASKS_TABLE = process.env.TASKS_TABLE || 'HabitTracker_Tasks';
const HABITS_TABLE = process.env.HABITS_TABLE || 'HabitTracker_Habits';

const tablesConfig = [
  {
    TableName: USERS_TABLE,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: TASKS_TABLE,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: HABITS_TABLE,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  }
];

async function ensureTablesExist() {
  try {
    const listCmd = new ListTablesCommand({});
    const { TableNames } = await client.send(listCmd);
    
    for (const config of tablesConfig) {
      if (!TableNames.includes(config.TableName)) {
        console.log(`Creating table ${config.TableName}...`);
        const createCmd = new CreateTableCommand(config);
        await client.send(createCmd);
        console.log(`Table ${config.TableName} created.`);
      }
    }
    
    // Seed data if empty
    const tasksScan = new ScanCommand({ TableName: TASKS_TABLE, Limit: 1 });
    const tasksData = await docClient.send(tasksScan);
    if (!tasksData.Items || tasksData.Items.length === 0) {
      console.log('Seeding tasks...');
      const seedTasks = [
        {
          id: 'task-1', title: 'Project Q4 Strategy Document', category: 'OFFICE', priority: 1, 
          startDate: '2023-10-24', startTime: '10:00', endDate: '2023-10-24', endTime: '12:00', 
          completed: 0, notes: 'Coordinate with the infrastructure team...', created_at: new Date().toISOString(),
          attachments: [
            { name: 'Syllabus_v2.pdf', size: '1.2 MB' },
            { name: 'Google Docs Link', url: 'https://docs.google.com' }
          ]
        },
        {
          id: 'task-2', title: 'Advanced Algorithms Assignment', category: 'CAMPUS', priority: 0, 
          startDate: '2023-10-27', startTime: '14:00', endDate: '2023-10-27', endTime: '16:30', 
          completed: 0, notes: 'Implement the Floyd-Warshall...', created_at: new Date().toISOString(),
          attachments: [{ name: 'Resources_Zip_v1.zip', size: '45.8 MB' }]
        }
      ];
      for (const t of seedTasks) {
        await docClient.send(new PutCommand({ TableName: TASKS_TABLE, Item: t }));
      }
      console.log('✅ Seeded default tasks into DynamoDB.');
    }

    const habitsScan = new ScanCommand({ TableName: HABITS_TABLE, Limit: 1 });
    const habitsData = await docClient.send(habitsScan);
    if (!habitsData.Items || habitsData.Items.length === 0) {
      console.log('Seeding habits...');
      const seedHabits = [
        { id: 'habit-1', name: 'Coding Routine', streak: 24, day_mon: 1, day_tue: 1, day_wed: 1, day_thu: 0, day_fri: 1, day_sat: 1, day_sun: 0, created_at: new Date().toISOString() },
        { id: 'habit-2', name: 'Exercise & Cardio', streak: 12, day_mon: 1, day_tue: 0, day_wed: 1, day_thu: 0, day_fri: 1, day_sat: 0, day_sun: 0, created_at: new Date().toISOString() }
      ];
      for (const h of seedHabits) {
        await docClient.send(new PutCommand({ TableName: HABITS_TABLE, Item: h }));
      }
      console.log('✅ Seeded default habits into DynamoDB.');
    }
  } catch (err) {
    console.error('Error ensuring DynamoDB tables exist:', err);
  }
}

// Automatically check and create tables on startup
ensureTablesExist();

module.exports = {
  client,
  docClient,
  USERS_TABLE,
  TASKS_TABLE,
  HABITS_TABLE
};
