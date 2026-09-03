import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductDto) {
    const sku = dto.sku.trim().toUpperCase();

    // Check SKU uniqueness per user
    const existing = await this.prisma.product.findUnique({
      where: {
        userId_sku: {
          userId,
          sku,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`A product with SKU '${sku}' already exists in your inventory`);
    }

    return this.prisma.product.create({
      data: {
        userId,
        sku,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        unitPrice: dto.unitPrice,
        quantityOnHand: dto.quantityOnHand,
      },
    });
  }

  async findAll(userId: string, query: QueryProductDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(userId, id);

    if (dto.sku && dto.sku.trim().toUpperCase() !== existing.sku) {
      const sku = dto.sku.trim().toUpperCase();
      const duplicate = await this.prisma.product.findUnique({
        where: {
          userId_sku: {
            userId,
            sku,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(`A product with SKU '${sku}' already exists in your inventory`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku ? dto.sku.trim().toUpperCase() : undefined,
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        unitPrice: dto.unitPrice !== undefined ? dto.unitPrice : undefined,
        quantityOnHand: dto.quantityOnHand !== undefined ? dto.quantityOnHand : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const product = await this.findOne(userId, id);

    // Requirement I4: A product referenced by an existing invoice must not silently disappear
    const invoiceItemCount = await this.prisma.invoiceItem.count({
      where: { productId: id },
    });

    if (invoiceItemCount > 0) {
      throw new BadRequestException(
        `Cannot delete product '${product.name}' (${product.sku}) because it is referenced by ${invoiceItemCount} invoice line item(s). Consider updating stock to 0 instead.`,
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Product '${product.name}' was deleted successfully`,
    };
  }
}
