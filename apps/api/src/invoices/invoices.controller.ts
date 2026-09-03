import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Invoicing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice with line items (DRAFT)' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Stock validation failed or invalid items' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(user.id, createInvoiceDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get summary statistics for dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics and totals' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.getStats(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices with pagination and status filtering' })
  @ApiResponse({ status: 200, description: 'Paginated invoice list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryInvoiceDto,
  ) {
    return this.invoicesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single invoice details with line items' })
  @ApiResponse({ status: 200, description: 'Invoice found' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing DRAFT invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot edit non-DRAFT invoice or stock violation' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user.id, id, updateInvoiceDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition invoice status (ISSUE, PAY, CANCEL)' })
  @ApiResponse({ status: 200, description: 'Status updated and stock adjusted atomically' })
  @ApiResponse({ status: 400, description: 'Illegal transition or insufficient stock' })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(user.id, id, updateStatusDto.status);
  }
}
