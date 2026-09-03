'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import {
  Boxes,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import Link from 'next/navigation';

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalInvoices: number;
  draftInvoices: number;
  issuedInvoices: number;
  paidInvoices: number;
  cancelledInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<DashboardStats>('/invoices/stats'),
      apiRequest<{ data: any[] }>('/products?limit=5'),
      apiRequest<{ data: any[] }>('/invoices?limit=5'),
    ])
      .then(([statsData, productsRes, invoicesRes]) => {
        setStats(statsData);
        setLowStockProducts(productsRes.data.filter((p) => p.quantityOnHand <= 10));
        setRecentInvoices(invoicesRes.data);
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Real-time snapshot of your stock on hand and invoicing activity
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="/products"
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition"
              >
                <Boxes className="w-4 h-4 text-slate-500" />
                <span>Manage Products</span>
              </a>
              <a
                href="/invoices/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-sm font-medium text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Invoice</span>
              </a>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Stock */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Stock On Hand
                </span>
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {loading ? '...' : stats?.totalStock.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Across {stats?.totalProducts || 0} unique product SKUs
                </p>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Collected Revenue
                </span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
                  {loading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  From {stats?.paidInvoices || 0} paid invoices
                </p>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Issued / Pending
                </span>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
                  {loading ? '...' : formatCurrency(stats?.pendingRevenue || 0)}
                </p>
                <p className="text-xs text-amber-600 font-medium mt-1">
                  {stats?.issuedInvoices || 0} invoices awaiting payment
                </p>
              </div>
            </div>

            {/* Total Invoices Count */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Draft Invoices
                </span>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {loading ? '...' : stats?.draftInvoices}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ready to be reviewed & issued
                </p>
              </div>
            </div>
          </div>

          {/* Two-Column Section: Low Stock & Recent Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Low Stock Watchlist */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-base font-semibold text-slate-900">Inventory Watchlist</h2>
                </div>
                <a href="/products" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center space-x-1">
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  All products currently have healthy stock levels.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${
                            product.quantityOnHand === 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {product.quantityOnHand} on hand
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h2 className="text-base font-semibold text-slate-900">Recent Invoices</h2>
                </div>
                <a href="/invoices" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center space-x-1">
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No invoices created yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => (
                    <a
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition -mx-2 text-sm"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-medium text-slate-900">{inv.invoiceNumber}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'ISSUED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : inv.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{inv.customerName}</p>
                      </div>
                      <div className="text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(inv.total)}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
