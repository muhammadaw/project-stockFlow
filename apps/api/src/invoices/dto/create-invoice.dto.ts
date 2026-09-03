import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'Acme Corporation Ltd', description: 'Customer or company name' })
  @IsString({ message: 'Customer name must be a string' })
  @IsNotEmpty({ message: 'Customer name is required' })
  customerName: string;

  @ApiPropertyOptional({ example: '2026-09-02T00:00:00.000Z', description: 'Invoice issue date' })
  @IsDateString({}, { message: 'Issue date must be a valid ISO date string' })
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2026-09-16T00:00:00.000Z', description: 'Invoice due date' })
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Payment terms: Net 14. Deliver to dock 3.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'One or more invoice product lines' })
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Invoice must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
