'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { apiRequest } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  FileText,
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Loader2,
  Boxes,
} from 'lucide-react';
import Link from 'next/navigation';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate?: string | null;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  notes?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    product?: {
      quantityOnHand: number;
      sku: string;
    };
  }[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<InvoiceDetail>(`/invoices/${id}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleStatusTransition = async (targetStatus: 'ISSUED' | 'PAID' | 'CANCELLED') => {
    if (!invoice) return;

    let confirmMsg = `Are you sure you want to transition invoice '${invoice.invoiceNumber}' to ${targetStatus}?`;
    if (targetStatus === 'ISSUED') {
      confirmMsg += '\n\nThis will atomically decrement available stock on hand for all line items.';
    } else if (targetStatus === 'CANCELLED' && invoice.status === 'ISSUED') {
      confirmMsg += '\n\nThis will automatically restore consumed stock back to inventory.';
    }

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiRequest<InvoiceDetail>(`/invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });

      setInvoice(updated);
      setSuccessMsg(`Invoice status successfully transitioned to ${targetStatus}`);
    } catch (err: any) {
      setError(err.message || `Failed to transition invoice status to ${targetStatus}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            PAID
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ISSUED (AWAITING PAYMENT)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            DRAFT
          </span>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 print:bg-white">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Action Bar (Hidden on print) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
            <div className="flex items-center space-x-3">
              <a
                href="/invoices"
                className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:text-slate-900 shadow-sm transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </a>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-mono">
                  {invoice ? invoice.invoiceNumber : 'Invoice Details'}
                </h1>
                <p className="text-xs text-slate-500">
                  {invoice && getStatusBadge(invoice.status)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {invoice && (
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Print Invoice</span>
                </button>

                {invoice.status === 'DRAFT' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusTransition('ISSUED')}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Invoice (Deduct Stock)</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusTransition('CANCELLED')}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}

                {invoice.status === 'ISSUED' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusTransition('PAID')}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Paid</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusTransition('CANCELLED')}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel (Restore Stock)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-3 shadow-sm print:hidden">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-3 shadow-sm print:hidden">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Printable Invoice Document */}
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
          ) : !invoice ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-600 font-medium">Invoice record not found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-8 gap-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center font-bold">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">StockFlow</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Automated Inventory & Invoicing</p>
                </div>

                <div className="sm:text-right">
                  <h2 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                    {invoice.invoiceNumber}
                  </h2>
                  <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                </div>
              </div>

              {/* Billed To & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Billed To</span>
                  <p className="text-base font-semibold text-slate-900 mt-1">{invoice.customerName}</p>
                </div>

                <div className="sm:text-right space-y-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Issue Date: </span>
                    <span className="font-medium text-slate-900">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Due Date: </span>
                    <span className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Product Description</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-center">Quantity</th>
                      <th className="px-6 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600 tabular-nums">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-center tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between items-start pt-4 gap-6">
                <div className="text-xs text-slate-500 max-w-sm">
                  {invoice.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="font-semibold text-slate-700 mb-0.5">Notes / Terms:</p>
                      <p>{invoice.notes}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({(invoice.taxRate * 100).toFixed(0)}%)</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
                    <span>Grand Total</span>
                    <span className="font-mono text-sky-700 tabular-nums">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
