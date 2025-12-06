import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo family
  const family = await prisma.family.create({
    data: {
      name: 'Demo Family',
      inviteCode: 'DEMO01',
    },
  });

  console.log(`✅ Created family: ${family.name} (Code: ${family.inviteCode})`);

  // Create a demo parent
  const parentPassword = await bcrypt.hash('password123', 12);
  const parent = await prisma.user.create({
    data: {
      familyId: family.id,
      role: UserRole.PARENT,
      name: 'Demo Parent',
      email: 'demo@chorechomper.com',
      passwordHash: parentPassword,
    },
  });

  console.log(`✅ Created parent: ${parent.email}`);

  // Create demo children
  const childPin = await bcrypt.hash('1234', 12);
  
  const child1 = await prisma.user.create({
    data: {
      familyId: family.id,
      role: UserRole.CHILD,
      name: 'Emma',
      pinHash: childPin,
      avatarPreset: '👧',
      pointsBalance: 150,
    },
  });

  const child2 = await prisma.user.create({
    data: {
      familyId: family.id,
      role: UserRole.CHILD,
      name: 'Jake',
      pinHash: childPin,
      avatarPreset: '👦',
      pointsBalance: 85,
    },
  });

  console.log(`✅ Created children: ${child1.name}, ${child2.name} (PIN: 1234)`);

  // Create some categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        familyId: family.id,
        name: 'Cleaning',
        color: '#3b82f6',
        icon: 'sparkles',
      },
    }),
    prisma.category.create({
      data: {
        familyId: family.id,
        name: 'Homework',
        color: '#8b5cf6',
        icon: 'book',
      },
    }),
    prisma.category.create({
      data: {
        familyId: family.id,
        name: 'Pet Care',
        color: '#f59e0b',
        icon: 'heart',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create some rewards
  const rewards = await Promise.all([
    prisma.reward.create({
      data: {
        familyId: family.id,
        name: 'Ice Cream Trip',
        description: 'Go out for ice cream!',
        pointCost: 100,
      },
    }),
    prisma.reward.create({
      data: {
        familyId: family.id,
        name: '30 Min Extra Screen Time',
        description: '30 extra minutes of games or TV',
        pointCost: 50,
      },
    }),
    prisma.reward.create({
      data: {
        familyId: family.id,
        name: '$10 Amazon Gift Card',
        description: 'Digital gift card',
        pointCost: 500,
      },
    }),
  ]);

  console.log(`✅ Created ${rewards.length} rewards`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Parent: demo@chorechomper.com / password123');
  console.log('   Children: Family Code DEMO01, PIN 1234');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
