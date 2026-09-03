import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-001', description: 'Unique SKU identifier for the product' })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  sku: string;

  @ApiProperty({ example: 'Ergonomic Mechanical Keyboard', description: 'Product title' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @ApiProperty({ example: 'Tactile hot-swappable switches', description: 'Product description', required: false })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 12000, description: 'Unit price in integer minor units (e.g. 12000 = $120.00)' })
  @Type(() => Number)
  @IsInt({ message: 'Unit price must be an integer (in minor currency units/cents)' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @ApiProperty({ example: 45, description: 'Current available stock quantity on hand' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity on hand must be an integer' })
  @Min(0, { message: 'Quantity on hand cannot be negative' })
  quantityOnHand: number;
}
