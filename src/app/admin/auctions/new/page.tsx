'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FormErrors {
  [key: string]: string;
}

export default function NewAuctionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    preview_at: '',
    live_at: '',
    close_at: '',
    pickup_date: '',
    pickup_time: '',
    pickup_location: '',
    thank_you_msg: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (form.live_at && form.preview_at && form.live_at < form.preview_at) {
      newErrors.live_at = 'Live date must be after preview date';
    }
    if (form.close_at && form.live_at && form.close_at < form.live_at) {
      newErrors.close_at = 'Close date must be after live date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        preview_at: form.preview_at || undefined,
        live_at: form.live_at || undefined,
        close_at: form.close_at || undefined,
        pickup_date: form.pickup_date || undefined,
        pickup_time: form.pickup_time || undefined,
        pickup_location: form.pickup_location || undefined,
        description: form.description || undefined,
        thank_you_msg: form.thank_you_msg || undefined,
      };

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create auction');
      }

      const auction = await res.json();
      router.push(`/admin/auctions/${auction.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="hover:text-[#E8602C] transition-colors"
        >
          Dashboard
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">New Auction</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Auction</h1>

      {serverError && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Title"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              error={errors.title}
              placeholder="e.g. Spring 2026 Cake Auction"
            />

            <div className="w-full">
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Optional description shown to bidders"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Schedule</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Preview At"
              type="datetime-local"
              value={form.preview_at}
              onChange={(e) => updateField('preview_at', e.target.value)}
              error={errors.preview_at}
            />
            <Input
              label="Live At"
              type="datetime-local"
              value={form.live_at}
              onChange={(e) => updateField('live_at', e.target.value)}
              error={errors.live_at}
            />
            <Input
              label="Close At"
              type="datetime-local"
              value={form.close_at}
              onChange={(e) => updateField('close_at', e.target.value)}
              error={errors.close_at}
            />
          </div>
        </section>

        {/* Pickup Details */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pickup Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Pickup Date"
              type="date"
              value={form.pickup_date}
              onChange={(e) => updateField('pickup_date', e.target.value)}
            />
            <Input
              label="Pickup Time"
              type="time"
              value={form.pickup_time}
              onChange={(e) => updateField('pickup_time', e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Pickup Location"
                value={form.pickup_location}
                onChange={(e) => updateField('pickup_location', e.target.value)}
                placeholder="e.g. School cafeteria, 123 Main St"
              />
            </div>
          </div>
        </section>

        {/* Thank You Message */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Thank You Message</h2>
          <div className="w-full">
            <label
              htmlFor="thank_you_msg"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <textarea
              id="thank_you_msg"
              rows={3}
              value={form.thank_you_msg}
              onChange={(e) => updateField('thank_you_msg', e.target.value)}
              placeholder="Shown to winning bidders after the auction closes"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/dashboard')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create Auction
          </Button>
        </div>
      </form>
    </div>
  );
}
