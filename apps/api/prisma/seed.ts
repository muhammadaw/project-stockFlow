import { PrismaClient, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding StockFlow database with comprehensive demo data...');

  const demoEmails = ['admin@stockflow.dev', 'staff@stockflow.dev', 'demo@stockflow.dev'];

  // Clean existing demo users and their related data safely
  for (const email of demoEmails) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`Cleaning existing demo data for ${email}...`);
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
  }

  const commonPasswordHash = await bcrypt.hash('Password123!', 10);

  // -------------------------------------------------------------
  // 1. Create Demo Users (Multi-tenant demonstration - Requirement A7)
  // -------------------------------------------------------------
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@stockflow.dev',
      passwordHash: commonPasswordHash,
      name: 'StockFlow Admin',
    },
  });
  console.log(`✓ Created primary demo user: ${adminUser.email} (Password: Password123!)`);

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@stockflow.dev',
      passwordHash: commonPasswordHash,
      name: 'Warehouse Operations',
    },
  });
  console.log(`✓ Created staff demo user: ${staffUser.email} (Password: Password123!)`);

  const auditUser = await prisma.user.create({
    data: {
      email: 'demo@stockflow.dev',
      passwordHash: commonPasswordHash,
      name: 'Evaluator Sandbox',
    },
  });
  console.log(`✓ Created sandbox demo user: ${auditUser.email} (Password: Password123!)`);

  // -------------------------------------------------------------
  // 2. Create Products for Primary Admin User (12 diverse items)
  // -------------------------------------------------------------
  const adminProductsData = [
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
    {
      sku: 'PROD-007',
      name: '4K Ultra-HD Streaming Webcam',
      description: 'Auto-focus HDR webcam with built-in stereo dual noise-cancelling mics',
      unitPrice: 8900, // $89.00
      quantityOnHand: 25,
    },
    {
      sku: 'PROD-008',
      name: 'USB-C Braided Fast Cable 2M (Pack of 3)',
      description: '100W PD rated heavy-duty nylon braided cables with reinforced collars',
      unitPrice: 2400, // $24.00
      quantityOnHand: 80,
    },
    {
      sku: 'PROD-009',
      name: 'Studio Condenser USB Microphone',
      description: 'Cardioid studio capsule with zero-latency 3.5mm monitor jack and pop filter',
      unitPrice: 11500, // $115.00
      quantityOnHand: 18,
    },
    {
      sku: 'PROD-010',
      name: 'Smart Desk Mat with Qi Fast Charging',
      description: 'Waterproof vegan leather desk pad with integrated 15W wireless phone charger',
      unitPrice: 4200, // $42.00
      quantityOnHand: 35,
    },
    {
      sku: 'PROD-011',
      name: 'Heavy-Duty Corrugated Shipping Boxes (25-Pack)',
      description: 'Double-wall ECT-32 kraft corrugated storage and dispatch carton boxes',
      unitPrice: 3200, // $32.00
      quantityOnHand: 75,
    },
    {
      sku: 'PROD-012',
      name: 'Thermal Barcode & Shipping Label Printer',
      description: 'High-speed 152mm/s direct thermal label printer supporting 4x6 labels',
      unitPrice: 16500, // $165.00
      quantityOnHand: 12,
    },
  ];

  const adminProducts = [];
  for (const item of adminProductsData) {
    const p = await prisma.product.create({
      data: {
        ...item,
        userId: adminUser.id,
      },
    });
    adminProducts.push(p);
  }
  console.log(`✓ Created ${adminProducts.length} products for ${adminUser.email}`);

  // -------------------------------------------------------------
  // 3. Create Products for Warehouse Staff (Proving SKU per-user isolation)
  // -------------------------------------------------------------
  const staffProductsData = [
    {
      sku: 'PROD-001', // Demonstrates identical SKU allowed for different user!
      name: 'Heavy-Duty Hydraulic Pallet Jack 2500KG',
      description: 'Reinforced steel pallet truck with polyurethane wheels',
      unitPrice: 38000, // $380.00
      quantityOnHand: 6,
    },
    {
      sku: 'PROD-002',
      name: 'Industrial Rugged Handheld Barcode Scanner',
      description: 'IP65 drop-resistant 2D QR and barcode scanner with Bluetooth cradle',
      unitPrice: 22000, // $220.00
      quantityOnHand: 14,
    },
    {
      sku: 'PROD-003',
      name: 'Recycled Cushion Bubble Wrap Roll 50M',
      description: 'High-tensile protective packaging roll 500mm width',
      unitPrice: 2900, // $29.00
      quantityOnHand: 40,
    },
  ];

  for (const item of staffProductsData) {
    await prisma.product.create({
      data: {
        ...item,
        userId: staffUser.id,
      },
    });
  }
  console.log(`✓ Created ${staffProductsData.length} warehouse products for ${staffUser.email} (proving per-user SKU isolation)`);

  // -------------------------------------------------------------
  // 4. Create Invoices for Admin User across ALL Statuses
  // -------------------------------------------------------------

  // Invoice 1: ISSUED (Awaiting payment, stock decremented)
  const inv1Items = [
    { product: adminProducts[0], quantity: 2 }, // 2x Keyboard = 24000
    { product: adminProducts[3], quantity: 4 }, // 4x Mouse = 22000
  ];
  const inv1Subtotal = 24000 + 22000; // 46000
  const inv1Tax = Math.round(inv1Subtotal * 0.11); // 5060
  const inv1Total = inv1Subtotal + inv1Tax; // 51060

  await prisma.invoice.create({
    data: {
      userId: adminUser.id,
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Acme Logistics Corp',
      status: InvoiceStatus.ISSUED,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Standard Net 14 terms. Delivery to Distribution Center Building B.',
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

  // Invoice 2: PAID (Settled order)
  const inv2Subtotal = 49900 + 18500; // Monitor + Dock = 68400
  const inv2Tax = Math.round(inv2Subtotal * 0.11); // 7524
  const inv2Total = inv2Subtotal + inv2Tax; // 75924

  await prisma.invoice.create({
    data: {
      userId: adminUser.id,
      invoiceNumber: 'INV-2026-0002',
      customerName: 'Apex Technology Solutions',
      status: InvoiceStatus.PAID,
      issueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Paid via Corporate Wire Transfer Ref #TRX-98214.',
      subtotal: inv2Subtotal,
      taxRate: 0.11,
      taxAmount: inv2Tax,
      total: inv2Total,
      items: {
        create: [
          {
            productId: adminProducts[1].id,
            productName: adminProducts[1].name,
            unitPrice: adminProducts[1].unitPrice,
            quantity: 1,
            lineTotal: adminProducts[1].unitPrice,
          },
          {
            productId: adminProducts[4].id,
            productName: adminProducts[4].name,
            unitPrice: adminProducts[4].unitPrice,
            quantity: 1,
            lineTotal: adminProducts[4].unitPrice,
          },
        ],
      },
    },
  });

  // Invoice 3: DRAFT (Pending quote, stock untouched)
  const inv3Subtotal = 19900 * 2 + 3500 * 3 + 8900; // 2x Headphones + 3x Stand + 1x Webcam = 39800 + 10500 + 8900 = 59200
  const inv3Tax = Math.round(inv3Subtotal * 0.11); // 6512
  const inv3Total = inv3Subtotal + inv3Tax; // 65712

  await prisma.invoice.create({
    data: {
      userId: adminUser.id,
      invoiceNumber: 'INV-2026-0003',
      customerName: 'Starlight Media Studio',
      status: InvoiceStatus.DRAFT,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Draft quotation awaiting PO clearance from procurement.',
      subtotal: inv3Subtotal,
      taxRate: 0.11,
      taxAmount: inv3Tax,
      total: inv3Total,
      items: {
        create: [
          {
            productId: adminProducts[2].id,
            productName: adminProducts[2].name,
            unitPrice: adminProducts[2].unitPrice,
            quantity: 2,
            lineTotal: adminProducts[2].unitPrice * 2,
          },
          {
            productId: adminProducts[5].id,
            productName: adminProducts[5].name,
            unitPrice: adminProducts[5].unitPrice,
            quantity: 3,
            lineTotal: adminProducts[5].unitPrice * 3,
          },
          {
            productId: adminProducts[6].id,
            productName: adminProducts[6].name,
            unitPrice: adminProducts[6].unitPrice,
            quantity: 1,
            lineTotal: adminProducts[6].unitPrice,
          },
        ],
      },
    },
  });

  // Invoice 4: CANCELLED (Illustrates cancelled terminal state and audit history)
  const inv4Subtotal = 16500 + 3200 * 2; // 1x Label Printer + 2x Shipping Boxes = 22900
  const inv4Tax = Math.round(inv4Subtotal * 0.11); // 2519
  const inv4Total = inv4Subtotal + inv4Tax; // 25419

  await prisma.invoice.create({
    data: {
      userId: adminUser.id,
      invoiceNumber: 'INV-2026-0004',
      customerName: 'BlueSky Express Freight',
      status: InvoiceStatus.CANCELLED,
      issueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Order cancelled by customer prior to dispatch. Stock was restored.',
      subtotal: inv4Subtotal,
      taxRate: 0.11,
      taxAmount: inv4Tax,
      total: inv4Total,
      items: {
        create: [
          {
            productId: adminProducts[11].id,
            productName: adminProducts[11].name,
            unitPrice: adminProducts[11].unitPrice,
            quantity: 1,
            lineTotal: adminProducts[11].unitPrice,
          },
          {
            productId: adminProducts[10].id,
            productName: adminProducts[10].name,
            unitPrice: adminProducts[10].unitPrice,
            quantity: 2,
            lineTotal: adminProducts[10].unitPrice * 2,
          },
        ],
      },
    },
  });

  console.log(`✓ Created 4 invoices for ${adminUser.email} (DRAFT, ISSUED, PAID, CANCELLED)`);

  console.log('\n========================================');
  console.log('🎉 Seed completed successfully!');
  console.log('Available Demo Logins (Password: Password123!):');
  console.log('1. admin@stockflow.dev (Primary Admin - 12 Products, 4 Invoices)');
  console.log('2. staff@stockflow.dev (Warehouse Workspace - 3 Heavy Products)');
  console.log('3. demo@stockflow.dev  (Fresh Sandbox Workspace)');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
