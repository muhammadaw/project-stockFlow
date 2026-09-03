import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root & Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Root API status and available service endpoints' })
  getRoot() {
    return {
      name: 'StockFlow Backend API',
      status: 'online',
      version: '1.0.0',
      documentation: '/api/docs',
      frontend: 'http://localhost:3000',
      message: 'StockFlow API is running. Explore Swagger documentation at /api/docs or visit frontend at http://localhost:3000',
      endpoints: {
        swagger: '/api/docs',
        auth: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          me: 'GET /auth/me',
          logout: 'POST /auth/logout',
        },
        products: {
          list: 'GET /products',
          create: 'POST /products',
          detail: 'GET /products/:id',
          update: 'PATCH /products/:id',
          delete: 'DELETE /products/:id',
        },
        invoices: {
          list: 'GET /invoices',
          create: 'POST /invoices',
          stats: 'GET /invoices/stats',
          detail: 'GET /invoices/:id',
          update: 'PATCH /invoices/:id',
          status: 'PATCH /invoices/:id/status',
        },
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
