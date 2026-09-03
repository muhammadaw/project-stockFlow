import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceStatusDto {
  @ApiProperty({
    enum: InvoiceStatus,
    example: InvoiceStatus.ISSUED,
    description: 'Target invoice status (DRAFT -> ISSUED | CANCELLED, ISSUED -> PAID | CANCELLED)',
  })
  @IsEnum(InvoiceStatus, {
    message: 'Status must be one of: DRAFT, ISSUED, PAID, CANCELLED',
  })
  @IsNotEmpty({ message: 'Target status is required' })
  status: InvoiceStatus;
}
