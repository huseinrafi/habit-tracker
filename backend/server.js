const { app } = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 Habit Tracker Backend is running!                ║
║   📡 API:      http://localhost:${PORT}/api             ║
║   🗄️  Database: DynamoDB (AWS)                         ║
╚════════════════════════════════════════════════════════╝
  `);
});
