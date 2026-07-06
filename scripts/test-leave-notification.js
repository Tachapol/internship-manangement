const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const studentId = 'cdab7310-df74-4755-af89-2b0d50ad6fcc'; // Student 2
  const student = await prisma.user.findUnique({
    where: { id: studentId }
  });

  console.log('Student details:', student);

  if (student && student.mentorId) {
    console.log('Creating notification for mentor:', student.mentorId);
    const noti = await prisma.notification.create({
      data: {
        userId: student.mentorId,
        title: 'New Leave Request',
        message: `${student.name} has submitted a new leave request (sick) that needs to be processed.`,
        type: 'LEAVE',
        metadata: { leaveRequestId: 'dummy-id' }
      }
    });
    console.log('Created notification:', noti);
  } else {
    console.log('Student has no mentor assigned');
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
