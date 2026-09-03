import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private getTaxRate(): number {
    const rateEnv = process.env.DEFAULT_TAX_RATE;
    if (rateEnv && !isNaN(Number(rateEnv))) {
      return Number(rateEnv);
    }
    return 0.11; // 11% default
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        invoiceNumber: { startsWith: `INV-${year}-` },
      },
    });
    let seq = count + 1;
    let candidate = `INV-${year}-${String(seq).padStart(4, '0')}`;

    while (await this.prisma.invoice.findUnique({ where: { invoiceNumber: candidate } })) {
      seq += 1;
      candidate = `INV-${year}-${String(seq).padStart(4, '0')}`;
    }

    return candidate;
  }

  async create(userId: string, dto: CreateInvoiceDto) {
    const taxRate = this.getTaxRate();

    // 1. Fetch all referenced products belonging to the current user
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Check for any missing / unauthorized products
    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID '${item.productId}' does not exist in your inventory`);
      }

      // Requirement V5: Stock guard — invoice line cannot exceed product's available stock
      if (item.quantity > product.quantityOnHand) {
        throw new BadRequestException(
          `Cannot invoice ${item.quantity} unit(s) of '${product.name}' (${product.sku}). Only ${product.quantityOnHand} available in stock.`,
        );
      }
    }

    // 2. Snapshot product data and calculate totals (Requirement V2 & V4)
    const lineItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.unitPrice * item.quantity;
      return {
        productId: product.id,
        productName: product.name, // Snapshot
        unitPrice: product.unitPrice, // Snapshot
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = lineItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        customerName: dto.customerName.trim(),
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: InvoiceStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        items: {
          create: lineItemsData,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findAll(userId: string, query: QueryInvoiceDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      whereClause.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where: whereClause }),
      this.prisma.invoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                quantityOnHand: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    return invoice;
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(userId, id);

    // Requirement V9: Only DRAFT invoices may have their line items edited
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT invoices can be edited. Current status is '${invoice.status}'.`,
      );
    }

    let subtotal = invoice.subtotal;
    let taxAmount = invoice.taxAmount;
    let total = invoice.total;
    let lineItemsData: any[] | null = null;

    if (dto.items && dto.items.length > 0) {
      const productIds = dto.items.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          userId,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product with ID '${item.productId}' does not exist`);
        }

        // Check stock
        if (item.quantity > product.quantityOnHand) {
          throw new BadRequestException(
            `Cannot invoice ${item.quantity} unit(s) of '${product.name}' (${product.sku}). Only ${product.quantityOnHand} available in stock.`,
          );
        }
      }

      lineItemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const lineTotal = product.unitPrice * item.quantity;
        return {
          productId: product.id,
          productName: product.name,
          unitPrice: product.unitPrice,
          quantity: item.quantity,
          lineTotal,
        };
      });

      subtotal = lineItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
      taxAmount = Math.round(subtotal * invoice.taxRate);
      total = subtotal + taxAmount;
    }

    return this.prisma.$transaction(async (tx) => {
      if (lineItemsData) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({
          data: lineItemsData.map((item) => ({
            ...item,
            invoiceId: id,
          })),
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          customerName: dto.customerName ? dto.customerName.trim() : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
          subtotal,
          taxAmount,
          total,
        },
        include: {
          items: true,
        },
      });
    });
  }

  async updateStatus(userId: string, id: string, targetStatus: InvoiceStatus) {
    const invoice = await this.findOne(userId, id);
    const currentStatus = invoice.status;

    if (currentStatus === targetStatus) {
      return invoice;
    }

    // Requirement V8: Status transitions state machine
    // Valid transitions:
    // DRAFT -> ISSUED, CANCELLED
    // ISSUED -> PAID, CANCELLED
    // PAID -> Terminal
    // CANCELLED -> Terminal
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
      [InvoiceStatus.ISSUED]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      [InvoiceStatus.PAID]: [],
      [InvoiceStatus.CANCELLED]: [],
    };

    const validNextStatuses = allowedTransitions[currentStatus];
    if (!validNextStatuses.includes(targetStatus)) {
      throw new BadRequestException(
        `Illegal status transition: Cannot change invoice from '${currentStatus}' to '${targetStatus}'. ${
          validNextStatuses.length > 0
            ? `Allowed transitions from '${currentStatus}' are: ${validNextStatuses.join(', ')}.`
            : `'${currentStatus}' is a terminal state and cannot be transitioned.`
        }`,
      );
    }

    // Execute transitions atomically (Requirement V6 & V7)
    return this.prisma.$transaction(async (tx) => {
      // 1. DRAFT -> ISSUED: Decrement stock atomically
      if (currentStatus === InvoiceStatus.DRAFT && targetStatus === InvoiceStatus.ISSUED) {
        for (const item of invoice.items) {
          const freshProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!freshProduct) {
            throw new NotFoundException(`Product '${item.productName}' no longer exists`);
          }

          if (freshProduct.quantityOnHand < item.quantity) {
            throw new BadRequestException(
              `Cannot issue invoice '${invoice.invoiceNumber}': Insufficient stock for product '${item.productName}' (${freshProduct.sku}). Available: ${freshProduct.quantityOnHand}, Requested: ${item.quantity}.`,
            );
          }

          // Decrement stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityOnHand: { decrement: item.quantity },
            },
          });
        }
      }

      // 2. ISSUED -> CANCELLED: Restore stock consumed
      if (currentStatus === InvoiceStatus.ISSUED && targetStatus === InvoiceStatus.CANCELLED) {
        for (const item of invoice.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityOnHand: { increment: item.quantity },
            },
          });
        }
      }

      // Update invoice status
      return tx.invoice.update({
        where: { id },
        data: { status: targetStatus },
        include: { items: true },
      });
    });
  }

  async getStats(userId: string) {
    const [
      totalProducts,
      stockAggregate,
      invoices,
    ] = await Promise.all([
      this.prisma.product.count({ where: { userId } }),
      this.prisma.product.aggregate({
        where: { userId },
        _sum: { quantityOnHand: true },
      }),
      this.prisma.invoice.findMany({
        where: { userId },
        select: { status: true, total: true },
      }),
    ]);

    const totalStock = stockAggregate._sum.quantityOnHand || 0;
    const totalInvoices = invoices.length;
    const draftInvoices = invoices.filter((i) => i.status === InvoiceStatus.DRAFT).length;
    const issuedInvoices = invoices.filter((i) => i.status === InvoiceStatus.ISSUED).length;
    const paidInvoices = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
    const cancelledInvoices = invoices.filter((i) => i.status === InvoiceStatus.CANCELLED).length;

    const totalRevenue = invoices
      .filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((sum, i) => sum + i.total, 0);

    const pendingRevenue = invoices
      .filter((i) => i.status === InvoiceStatus.ISSUED)
      .reduce((sum, i) => sum + i.total, 0);

    return {
      totalProducts,
      totalStock,
      totalInvoices,
      draftInvoices,
      issuedInvoices,
      paidInvoices,
      cancelledInvoices,
      totalRevenue,
      pendingRevenue,
    };
  }
}
