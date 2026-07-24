import postgres from "postgres";
import fs from "fs";
import path from "path";

interface SchemaData {
  schemaName: string;
  tables: {
    tableName: string;
    rows: any[];
  }[];
}

interface DatabaseDump {
  dbName: string;
  schemas: SchemaData[];
}

async function dumpAllDatabases() {
  console.log("==================================================");
  console.log("📦 EXPORTING COMPLETE MULTI-DATABASE POSTGRES DUMP");
  console.log("==================================================\n");

  const dbs = ["postgres", "vt_db", "vti_db", "nvidia_db", "test1_db"];
  const dumpResults: DatabaseDump[] = [];

  for (const dbName of dbs) {
    console.log(`📡 Dumping database '${dbName}'...`);
    const sql = postgres(`postgresql://coe_admin:SecretPassword123@127.0.0.1:5433/${dbName}`);

    try {
      const schemasList = await sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
      `;

      const schemasData: SchemaData[] = [];

      for (const sRow of schemasList) {
        const schemaName = sRow.schema_name;
        if (schemaName === "information_schema" || schemaName.startsWith("pg_")) continue;

        console.log(`   └─ Dumping schema '${schemaName}'...`);

        const tablesList = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = ${schemaName} AND table_type = 'BASE TABLE'
        `;

        const tablesData: { tableName: string; rows: any[] }[] = [];

        for (const tRow of tablesList) {
          const tableName = tRow.table_name;
          const rows = await sql.unsafe(`SELECT * FROM "${schemaName}"."${tableName}"`);
          tablesData.push({
            tableName,
            rows: Array.from(rows)
          });
        }

        schemasData.push({
          schemaName,
          tables: tablesData
        });
      }

      dumpResults.push({
        dbName,
        schemas: schemasData
      });

      await sql.end();
    } catch (err: any) {
      console.error(`❌ Failed dumping database '${dbName}':`, err.message);
    }
  }

  const outputPath = path.join(process.cwd(), "scripts", "production-db-dump.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dumpResults, null, 2), "utf-8");

  console.log("\n==================================================");
  console.log(`🎉 FULL DATABASE DUMP SAVED SUCCESSFULLY!`);
  console.log(`📍 Output File: ${outputPath}`);
  console.log(`📊 Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log("==================================================");

  process.exit(0);
}

dumpAllDatabases();
