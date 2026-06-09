// scripts/seed.js
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

// KUNCI UTAMA: Kredensial & Region harus sama persis dengan yang ada di app.js
const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "ap-southeast-1",
    credentials: {
        accessKeyId: "localMajuJaya",
        secretAccessKey: "localMajuJayaSecret"
    }
});

// Daftar tabel yang kemungkinan dipanggil oleh rute backend Anda
// Jika Anda menggunakan Single Table Architecture, Anda hanya butuh "HabitsTable"
const TABLES_TO_CREATE = ["HabitsTable", "TasksTable", "UsersTable"];

async function createTableWithSchema(tableName) {
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "SK", AttributeType: "S" }
        ],
        KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        // Cek apakah tabel sudah ada
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        console.log(`✅ Tabel "${tableName}" sudah aman tersedia.`);
    } catch (error) {
        if (error.name === "ResourceNotFoundException") {
            console.log(`⏳ Tabel "${tableName}" belum ada. Memproses pembuatan...`);
            await client.send(new CreateTableCommand(params));
            console.log(`🎉 BERHASIL: Tabel "${tableName}" telah dibuat di DynamoDB Local!`);
        } else {
            console.error(`🚨 Error pada tabel ${tableName}:`, error.message);
        }
    }
}

async function runSeed() {
    console.log("=== Memulai Sinkronisasi Database DynamoDB Local ===");
    for (const tableName of TABLES_TO_CREATE) {
        await createTableWithSchema(tableName);
    }
    console.log("=== Sinkronisasi Selesai ===");
}

runSeed();