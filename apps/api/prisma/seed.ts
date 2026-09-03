import { PrismaClient, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding StockFlow database...');

  // Clean existing demo data safely
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@stockflow.dev' },
  });

  if (existingUser) {
    console.log('Cleaning existing demo data...');
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { userId: existingUser.id } },
    });
    await prisma.invoice.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.product.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.user.delete({
      where: { id: existingUser.id },
    });
  }

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@stockflow.dev',
      passwordHash,
      name: 'StockFlow Admin',
    },
  });
  console.log(`Created demo user: ${user.email} (Password: Password123!)`);

  // 2. Create Products
  const productsData = [
    {
      sku: 'PROD-001',
      name: 'Ergonomic Mechanical Keyboard',
      description: 'Wireless RGB mechanical keyboard with hot-swappable tactile switches',
      unitPrice: 12000, // $120.00
      quantityOnHand: 45,
    },
    {
      sku: 'PROD-002',
      name: 'Ultra-Wide Curved Monitor 34"',
      description: '144Hz WQHD IPS panel with HDR400 and USB-C 90W charging',
      unitPrice: 49900, // $499.00
      quantityOnHand: 15,
    },
    {
      sku: 'PROD-003',
      name: 'Noise-Cancelling Headphones Pro',
      description: 'Premium active noise cancellation with 40-hour battery life',
      unitPrice: 19900, // $199.00
      quantityOnHand: 30,
    },
    {
      sku: 'PROD-004',
      name: 'Precision Wireless Mouse',
      description: '4000 DPI ergonomic multi-device Bluetooth mouse',
      unitPrice: 5500, // $55.00
      quantityOnHand: 60,
    },
    {
      sku: 'PROD-005',
      name: 'Thunderbolt 4 Docking Station',
      description: 'Dual 4K display output with 100W Power Delivery and Gigabit Ethernet',
      unitPrice: 18500, // $185.00
      quantityOnHand: 20,
    },
    {
      sku: 'PROD-006',
      name: 'Aluminum Laptop Riser',
      description: 'Adjustable ergonomic stand with anti-slip silicone padding',
      unitPrice: 3500, // $35.00
      quantityOnHand: 50,
    },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        ...item,
        userId: user.id,
      },
    });
    createdProducts.push(product);
  }
  console.log(`Created ${createdProducts.length} demo products.`);

  // 3. Create Sample Invoices
  // Invoice 1: ISSUED
  const inv1Items = [
    { product: createdProducts[0], quantity: 2 }, // 2x Keyboard = 24000
    { product: createdProducts[3], quantity: 4 }, // 4x Mouse = 22000
  ];
  const inv1Subtotal = 24000 + 22000; // 46000
  const inv1Tax = Math.round(inv1Subtotal * 0.11); // 5060
  const inv1Total = inv1Subtotal + inv1Tax; // 51060

  await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Acme Logistics Corp',
      status: InvoiceStatus.ISSUED,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Standard 14-day payment terms. Deliver to Building B.',
      subtotal: inv1Subtotal,
      taxRate: 0.11,
      taxAmount: inv1Tax,
      total: inv1Total,
      items: {
        create: inv1Items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          unitPrice: item.product.unitPrice,
          quantity: item.quantity,
          lineTotal: item.product.unitPrice * item.quantity,
        })),
      },
    },
  });

  // Invoice 2: PAID
  const inv2Subtotal = 49900 + 18500; // Monitor + Dock = 68400
  const inv2Tax = Math.round(inv2Subtotal * 0.11); // 7524
  const inv2Total = inv2Subtotal + inv2Tax; // 75924

  await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: 'INV-2026-0002',
      customerName: 'Apex Technology Solutions',
      status: InvoiceStatus.PAID,
      issueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Paid via Bank Transfer ref #TRX-98214.',
      subtotal: inv2Subtotal,
      taxRate: 0.11,
      taxAmount: inv2Tax,
      total: inv2Total,
      items: {
        create: [
          {
            productId: createdProducts[1].id,
            productName: createdProducts[1].name,
            unitPrice: createdProducts[1].unitPrice,
            quantity: 1,
            lineTotal: createdProducts[1].unitPrice,
          },
          {
            productId: createdProducts[4].id,
            productName: createdProducts[4].name,
            unitPrice: createdProducts[4].unitPrice,
            quantity: 1,
            lineTotal: createdProducts[4].unitPrice,
          },
        ],
      },
    },
  });

  // Invoice 3: DRAFT
  const inv3Subtotal = 19900 * 2 + 3500 * 3; // 2x Headphones + 3x Stand = 39800 + 10500 = 50300
  const inv3Tax = Math.round(inv3Subtotal * 0.11); // 5533
  const inv3Total = inv3Subtotal + inv3Tax; // 55833

  await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: 'INV-2026-0003',
      customerName: 'Starlight Media Hub',
      status: InvoiceStatus.DRAFT,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Pending purchase order approval from finance committee.',
      subtotal: inv3Subtotal,
      taxRate: 0.11,
      taxAmount: inv3Tax,
      total: inv3Total,
      items: {
        create: [
          {
            productId: createdProducts[2].id,
            productName: createdProducts[2].name,
            unitPrice: createdProducts[2].unitPrice,
            quantity: 2,
            lineTotal: createdProducts[2].unitPrice * 2,
          },
          {
            productId: createdProducts[5].id,
            productName: createdProducts[5].name,
            unitPrice: createdProducts[5].unitPrice,
            quantity: 3,
            lineTotal: createdProducts[5].unitPrice * 3,
          },
        ],
      },
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
