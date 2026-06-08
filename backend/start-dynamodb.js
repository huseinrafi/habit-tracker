/**
 * Starts DynamoDB Local for development.
 * Uses the Java JRE bundled with the VS Code Java extension.
 */
const dynamoDbLocal = require('dynamodb-local');
const path = require('path');

// Use the Java bundled with the editor extension
const JAVA_HOME = path.resolve(
  process.env.HOME,
  '.antigravity/extensions/redhat.java-1.54.0-linux-x64/jre/21.0.10-linux-x86_64'
);
process.env.JAVA_HOME = JAVA_HOME;
process.env.PATH = `${JAVA_HOME}/bin:${process.env.PATH}`;

const PORT = 8000;

dynamoDbLocal.launch(PORT, null, ['-sharedDb', '-inMemory'])
  .then(() => {
    console.log(`\n✅ DynamoDB Local is running on http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop.\n');
    process.on('SIGINT', () => {
      console.log('\nStopping DynamoDB Local...');
      dynamoDbLocal.stop(PORT);
      process.exit();
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start DynamoDB Local:', err.message);
    console.error('Make sure Java is available. Current JAVA_HOME:', JAVA_HOME);
    process.exit(1);
  });
