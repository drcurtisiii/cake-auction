'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Auction } from '@/types';
import { CAKE_REGISTRATION_CLOSE_HOURS } from '@/lib/cake-registration';
import { formatInAppTimeZone } from '@/lib/timezone';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CakeRegistrationPage() {
  const [lockedAuctionId, setLockedAuctionId] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    auction_id: '',
    donor_name: '',
    submitter_email: '',
    submitter_phone: '',
    name: '',
    flavor: '',
    description: '',
    beneficiary_kid: '',
    starting_price: '0',
    min_increment: '5',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setLockedAuctionId(params.get('auction') || '');
  }, []);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const res = await fetch('/api/cake-registration');
        if (!res.ok) throw new Error('Failed to load available auctions');
        const data = (await res.json()) as Auction[];
        setAuctions(data);
        const preferredAuctionId =
          lockedAuctionId && data.some((auction) => auction.id === lockedAuctionId)
            ? lockedAuctionId
            : data[0]?.id || '';
        setForm((prev) => ({
          ...prev,
          auction_id: prev.auction_id || preferredAuctionId,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load available auctions');
      } finally {
        setLoading(false);
      }
    }
    fetchAuctions();
  }, [lockedAuctionId]);

  useEffect(() => {
    if (!lockedAuctionId) return;
    setForm((prev) => ({ ...prev, auction_id: lockedAuctionId }));
  }, [lockedAuctionId]);

  const selectedAuction = useMemo(
    () => auctions.find((auction) => auction.id === form.auction_id) || null,
    [auctions, form.auction_id],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handlePasteEvent(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.auction_id) {
      setError('Select an auction.');
      return;
    }
    if (!imageBase64) {
      setError('Cake image is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/cake-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          flavor: form.flavor || undefined,
          description: form.description || undefined,
          beneficiary_kid: form.beneficiary_kid || undefined,
          submitter_phone: form.submitter_phone || undefined,
          starting_price: Number(form.starting_price) || 0,
          min_increment: Number(form.min_increment) || 5,
          image: imageBase64,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit cake');
      }

      setSuccess('Cake submitted. The admin team will review it before it appears publicly.');
      setForm({
        auction_id: form.auction_id,
        donor_name: '',
        submitter_email: '',
        submitter_phone: '',
        name: '',
        flavor: '',
        description: '',
        beneficiary_kid: '',
        starting_price: '0',
        min_increment: '5',
      });
      setImageBase64('');
      setImagePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit cake');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6" style={{ background: 'var(--public-page-bg)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--public-text)' }}>
            Cake Registration
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base" style={{ color: 'var(--public-text-muted)' }}>
            Want to donate a cake? Submit it here. Every submission must be approved
            by an admin before it appears publicly.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border px-8 py-16 text-center shadow-sm" style={{ borderColor: 'var(--public-border)', background: 'var(--public-panel)' }}>
            <p style={{ color: 'var(--public-text-muted)' }}>Loading registration form...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="rounded-3xl border px-8 py-16 text-center shadow-sm" style={{ borderColor: 'var(--public-border)', background: 'var(--public-panel)' }}>
            <p className="text-lg font-medium" style={{ color: 'var(--public-text)' }}>
              No cake registrations are open right now.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--public-text-muted)' }}>
              Check back later or contact the organizer for the next registration window.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            onPaste={handlePasteEvent}
            className="rounded-3xl border p-6 shadow-sm sm:p-8"
            style={{ borderColor: 'var(--public-border)', background: 'var(--public-panel)' }}
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Auction
                </label>
                <select
                  value={form.auction_id}
                  onChange={(e) => updateField('auction_id', e.target.value)}
                  disabled={Boolean(lockedAuctionId)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                >
                  {auctions.map((auction) => (
                    <option key={auction.id} value={auction.id}>
                      {auction.title}
                    </option>
                  ))}
                </select>
                {selectedAuction && (
                  <p className="mt-2 text-xs text-gray-500">
                    Bidding opens {formatDate(selectedAuction.live_at)}. Submissions close{' '}
                    {selectedAuction.cake_submission_close_at
                      ? formatInAppTimeZone(selectedAuction.cake_submission_close_at)
                      : `${CAKE_REGISTRATION_CLOSE_HOURS} hours before bidding opens`}.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <input
                  value={form.donor_name}
                  onChange={(e) => updateField('donor_name', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.submitter_email}
                  onChange={(e) => updateField('submitter_email', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={form.submitter_phone}
                  onChange={(e) => updateField('submitter_phone', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cake Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Flavor
                </label>
                <input
                  value={form.flavor}
                  onChange={(e) => updateField('flavor', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Beneficiary Student
                </label>
                <input
                  value={form.beneficiary_kid}
                  onChange={(e) => updateField('beneficiary_kid', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Starting Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.starting_price}
                  onChange={(e) => updateField('starting_price', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Bid Increment
                </label>
                <select
                  value={form.min_increment}
                  onChange={(e) => updateField('min_increment', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                >
                  {['5', '10', '15', '20', '25'].map((option) => (
                    <option key={option} value={option}>
                      ${option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cake Image
                </label>
                {imagePreview ? (
                  <div className="relative overflow-hidden rounded-lg border border-gray-200">
                    <img src={imagePreview} alt="Cake preview" className="h-56 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageBase64('');
                        setImagePreview(null);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                      isDragging ? 'border-[#E8602C] bg-[#E8602C]/5' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="mx-auto mb-3 block text-sm text-gray-600"
                    />
                    <p className="text-sm font-medium text-gray-600">
                      Drag and drop, select a file, or press Ctrl+V to paste
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#E8602C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C74E1F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Cake for Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
