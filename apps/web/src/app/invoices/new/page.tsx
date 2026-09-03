'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/navigation';

interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantityOnHand: number;
}

interface LineItemInput {
  productId: string;
  quantity: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([
    { productId: '', quantity: 1 },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<{ data: Product[] }>('/products?limit=100')
      .then((res) => {
        setProducts(res.data);
        if (res.data.length > 0) {
          setItems([{ productId: res.data[0].id, quantity: 1 }]);
        }
      })
      .catch((err) => setError('Failed to load products'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Add line item
  const addLineItem = () => {
    const defaultProd = products.length > 0 ? products[0].id : '';
    setItems([...items, { productId: defaultProd, quantity: 1 }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Check if any line exceeds available stock (Requirement V5)
  const stockViolations = items
    .map((item, idx) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      if (item.quantity > product.quantityOnHand) {
        return {
          index: idx,
          productName: product.name,
          available: product.quantityOnHand,
          requested: item.quantity,
        };
      }
      return null;
    })
    .filter(Boolean);

  const hasStockViolation = stockViolations.length > 0;

  // Live Totals Calculation (Requirement V2 & V3)
  const taxRate = 0.11;
  const subtotal = items.reduce((sum, item) => {
    const prod = productMap.get(item.productId);
    if (!prod) return sum;
    return sum + prod.unitPrice * (item.quantity || 0);
  }, 0);

  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (items.length === 0) {
      setError('Invoice must contain at least one product');
      return;
    }

    if (hasStockViolation) {
      setError('Cannot create invoice: one or more items exceed available stock quantity.');
      return;
    }

    setIsSubmitting(true);

    try {
      const invoice = await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerName: customerName.trim(),
          issueDate: new Date(issueDate).toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: Number(i.quantity),
          })),
        }),
      });

      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center space-x-3">
            <a
              href="/invoices"
              className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:text-slate-900 shadow-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Invoice</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Build invoice lines with real-time stock verification and automatic tax calculation
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to generate invoice</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {hasStockViolation && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-900">Stock Guard Warning (Requirement V5)</p>
                {stockViolations.map((v: any, idx) => (
                  <p key={idx} className="mt-0.5">
                    Product &apos;<strong>{v.productName}</strong>&apos; has only {v.available} unit(s) in stock (requested {v.requested}).
                  </p>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer & Dates Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                1. Customer & Payment Terms
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Notes & Delivery Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Net 30 payment terms. Wire transfer instructions."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  2. Line Items
                </h2>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {loadingProducts ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                </div>
              ) : products.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  You have no products in inventory. Please <a href="/products" className="text-sky-600 underline">add products</a> first.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const product = productMap.get(item.productId);
                    const lineTotal = product ? product.unitPrice * (item.quantity || 0) : 0;
                    const isExceeding = product && item.quantity > product.quantityOnHand;

                    return (
                      <div
                        key={index}
                        className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center gap-3 transition ${
                          isExceeding
                            ? 'border-rose-300 bg-rose-50/40'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        {/* Product Select */}
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateLineItem(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {formatCurrency(p.unitPrice)} [Stock: {p.quantityOnHand}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-full md:w-32">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 0)
                            }
                            className={`w-full px-3 py-2 bg-white border rounded-lg text-sm tabular-nums focus:outline-none ${
                              isExceeding
                                ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 text-rose-900'
                                : 'border-slate-300 focus:ring-2 focus:ring-sky-600'
                            }`}
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-full md:w-36 text-right">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Line Total
                          </label>
                          <p className="text-sm font-mono font-bold text-slate-900 py-2 tabular-nums">
                            {formatCurrency(lineTotal)}
                          </p>
                        </div>

                        {/* Remove Action */}
                        <div className="flex md:items-end justify-end md:pb-1">
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            disabled={items.length <= 1}
                            className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Totals & Submission Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-xs text-slate-500 max-w-sm">
                <p>
                  * Invoices are created in <strong>DRAFT</strong> status. Stock on hand is atomically decremented when you choose to <strong>Issue Invoice</strong>.
                </p>
              </div>

              <div className="w-full md:w-72 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (11%)</span>
                  <span className="font-mono tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
                  <span>Total Due</span>
                  <span className="font-mono text-sky-700 tabular-nums">{formatCurrency(total)}</span>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || hasStockViolation || products.length === 0}
                    className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition shadow focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Draft Invoice'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
