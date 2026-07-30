const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const firstNames = [
  "James", "John", "Robert", "Michael", "William",
  "David", "Richard", "Joseph", "Thomas", "Charles",
  "Christopher", "Daniel", "Matthew", "Anthony", "Mark",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth",
  "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Lisa", "Nancy", "Betty", "Sandra", "Margaret"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones",
  "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris",
  "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
];

async function main() {
  console.log("🌱 Cleaning up existing mock students...");
  await prisma.user.deleteMany({
    where: {
      role: 'STUDENT',
      email: {
        startsWith: 'student.'
      }
    }
  });

  console.log("🌱 Creating 30 mock students with English names...");

  // Fetch all companies and their teams
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      teams: {
        where: { deletedAt: null }
      }
    }
  });

  if (companies.length === 0) {
    console.error("❌ No companies found in the database. Please seed companies first.");
    return;
  }

  // Fetch a mentor to assign (if any exists)
  const mentor = await prisma.user.findFirst({
    where: { role: 'MENTOR', deletedAt: null }
  });

  const passwordHash = await bcrypt.hash("Password1234!", 10);

  let studentCount = 0;

  for (let i = 0; i < 30; i++) {
    // Round robin over companies and teams
    const company = companies[i % companies.length];
    const team = company.teams.length > 0 ? company.teams[i % company.teams.length] : null;

    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const email = `student.${studentCount + 1}@${company.domain || 'devplus.co.th'}`;

    await prisma.user.upsert({
      where: { email },
      update: {
        companyId: company.id,
        teamId: team ? team.id : null,
        mentorId: mentor ? mentor.id : null,
        status: UserStatus.ACTIVE
      },
      create: {
        email,
        passwordHash,
        name,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        companyId: company.id,
        teamId: team ? team.id : null,
        mentorId: mentor ? mentor.id : null
      }
    });

    console.log(`✅ Created Student ${studentCount + 1}: ${name} (${email}) -> Company: ${company.name}, Team: ${team ? team.name : 'None'}`);
    studentCount++;
  }

  console.log("🎉 Successfully created and assigned 30 mock students!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
