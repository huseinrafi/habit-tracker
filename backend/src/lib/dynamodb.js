const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  }),
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLES = {
  USERS: process.env.USERS_TABLE || 'HabitTracker_Users',
  TASKS: process.env.TASKS_TABLE || 'HabitTracker_Tasks',
  HABITS: process.env.HABITS_TABLE || 'HabitTracker_Habits',
  LOGS: process.env.HABIT_LOGS_TABLE || 'HabitTracker_Logs',
};

module.exports = { dynamodb: docClient, TABLES };
