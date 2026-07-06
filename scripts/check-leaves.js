const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 2,
    include: {
      student: {
        select: { name: true, email: true, mentorId: true, mentor: { select: { name: true } } }
      }
    }
  });

  console.log('Last 2 Leave Requests in Database:');
  console.log(JSON.stringify(leaves, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
