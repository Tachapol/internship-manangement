const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const data = {};
  
  const models = [
    'company',
    'user',
    'team',
    'trainingPlan',
    'trainingPlanModule',
    'attendance',
    'leaveRequest',
    'auditLog',
    'notification',
    'supportTicket',
    'supportTicketReply'
  ];

  for (const model of models) {
    try {
      if (prisma[model]) {
        console.log(`Exporting ${model}...`);
        data[model] = await prisma[model].findMany();
      } else {
        console.log(`Model ${model} not found on Prisma Client`);
      }
    } catch (err) {
      console.error(`Failed to export ${model}:`, err.message);
    }
  }

  const outputPath = path.join(__dirname, '../backup.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nSuccessfully exported all tables to ${outputPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
