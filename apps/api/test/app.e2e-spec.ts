import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('StockFlow Integration Tests (Requirement N4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: `test-${Date.now()}@stockflow.dev`,
    password: 'Password123!',
    name: 'Test Runner',
  };

  let authToken: string;
  let testProductId: string;
  const initialStock = 20;
  const initialPrice = 5000; // $50.00 in cents

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    authToken = regRes.body.accessToken;

    // Create a product for testing
    const prodRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sku: `SKU-${Date.now()}`,
        name: 'Test Smart Watch',
        description: 'For automated testing',
        unitPrice: initialPrice,
        quantityOnHand: initialStock,
      })
      .expect(201);

    testProductId = prodRes.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await prisma.invoiceItem.deleteMany({
        where: { productId: testProductId },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
    }
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // (a) Login with a wrong password is rejected (Requirement N4.a & A9)
  // ---------------------------------------------------------------------------
  it('(a) login with a wrong password is rejected with 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  // ---------------------------------------------------------------------------
  // (b) An unauthenticated request to a protected route returns 401 (Requirement N4.b & A6)
  // ---------------------------------------------------------------------------
  it('(b) an unauthenticated request to a protected route returns 401', async () => {
    const productsRes = await request(app.getHttpServer())
      .get('/products')
      .expect(401);

    expect(productsRes.body).toHaveProperty('statusCode', 401);

    const invoicesRes = await request(app.getHttpServer())
      .get('/invoices')
      .expect(401);

    expect(invoicesRes.body).toHaveProperty('statusCode', 401);
  });

  // ---------------------------------------------------------------------------
  // (c) Invoicing more than the available stock is rejected (Requirement N4.c & V5)
  // ---------------------------------------------------------------------------
  it('(c) invoicing more than the available stock is rejected with clear error', async () => {
    const excessiveQuantity = initialStock + 10; // 30 > 20

    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerName: 'Oversell Corp',
        items: [
          {
            productId: testProductId,
            quantity: excessiveQuantity,
          },
        ],
      })
      .expect(400);

    expect(response.body).toHaveProperty('statusCode', 400);
    expect(response.body.message).toContain('available in stock');
  });

  // ---------------------------------------------------------------------------
  // (d) Issuing an invoice decrements stock correctly (Requirement N4.d & V6)
  // ---------------------------------------------------------------------------
  let issuedInvoiceId: string;
  const invoiceQuantity = 5;

  it('(d) creating a DRAFT invoice and issuing it decrements stock correctly', async () => {
    // 1. Create DRAFT invoice
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerName: 'Valid Customer Ltd',
        items: [
          {
            productId: testProductId,
            quantity: invoiceQuantity,
          },
        ],
      })
      .expect(201);

    issuedInvoiceId = createRes.body.id;
    expect(createRes.body.status).toBe('DRAFT');

    // Verify stock remains untouched while invoice is DRAFT
    let product = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(product!.quantityOnHand).toBe(initialStock);

    // 2. Issue the invoice
    const issueRes = await request(app.getHttpServer())
      .patch(`/invoices/${issuedInvoiceId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'ISSUED' })
      .expect(200);

    expect(issueRes.body.status).toBe('ISSUED');

    // 3. Verify stock has been decremented atomically
    product = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(product!.quantityOnHand).toBe(initialStock - invoiceQuantity); // 20 - 5 = 15
  });

  // ---------------------------------------------------------------------------
  // (e) Cancelling an issued invoice restores stock (Requirement N4.e & V7)
  // ---------------------------------------------------------------------------
  it('(e) cancelling an issued invoice restores stock correctly', async () => {
    const cancelRes = await request(app.getHttpServer())
      .patch(`/invoices/${issuedInvoiceId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');

    // Verify stock restored back to initialStock
    const product = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(product!.quantityOnHand).toBe(initialStock); // 15 + 5 = 20
  });

  // ---------------------------------------------------------------------------
  // (f) Illegal status transitions are rejected (Requirement V8)
  // ---------------------------------------------------------------------------
  it('(f) illegal status transitions from terminal states are rejected with 400', async () => {
    // issuedInvoiceId is now CANCELLED (terminal)
    const response = await request(app.getHttpServer())
      .patch(`/invoices/${issuedInvoiceId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'DRAFT' })
      .expect(400);

    expect(response.body).toHaveProperty('statusCode', 400);
    expect(response.body.message).toContain('Illegal status transition');
  });

  // ---------------------------------------------------------------------------
  // (g) Changing product price does not alter an existing invoice (Requirement V4)
  // ---------------------------------------------------------------------------
  it('(g) changing product price does not alter snapshotted invoice line items', async () => {
    // 1. Create a draft invoice
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerName: 'Price Stability Test',
        items: [{ productId: testProductId, quantity: 2 }],
      })
      .expect(201);

    const invoiceId = createRes.body.id;
    const originalItemUnitPrice = createRes.body.items[0].unitPrice;
    expect(originalItemUnitPrice).toBe(initialPrice);

    // 2. Change product price
    const newPrice = 99900;
    await request(app.getHttpServer())
      .patch(`/products/${testProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ unitPrice: newPrice })
      .expect(200);

    // 3. Re-fetch invoice and ensure unitPrice is still the snapshotted price
    const checkRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(checkRes.body.items[0].unitPrice).toBe(initialPrice);
    expect(checkRes.body.items[0].unitPrice).not.toBe(newPrice);
  });

  // ---------------------------------------------------------------------------
  // (h) Cannot delete a product referenced by existing invoices (Requirement I4)
  // ---------------------------------------------------------------------------
  it('(h) product referenced by invoices cannot be deleted', async () => {
    const deleteRes = await request(app.getHttpServer())
      .delete(`/products/${testProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(deleteRes.body).toHaveProperty('statusCode', 400);
    expect(deleteRes.body.message).toContain('referenced by');
  });
});
