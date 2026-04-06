'use client';
// CakeManager v3 - drag/drop + clipboard paste image upload - build 20260406
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Cake } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

interface CakeManagerProps {
  auctionId: string;
}

interface CakeFormData {
  name: string;
  flavor: string;
  description: string;
  donor_name: string;
  beneficiary_kid: string;
  starting_price: string;
  min_increment: string;
  max_increment: string;
  image_base64: string;
}

const EMPTY_FORM: CakeFormData = {
  name: '',
  flavor: '',
  description: '',
  donor_name: '',
  beneficiary_kid: '',
  starting_price: '0',
  min_increment: '5',
  max_increment: '25',
  image_base64: '',
};

export const CakeManager: React.FC<CakeManagerProps> = ({ auctionId }) => {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCake, setEditingCake] = useState<Cake | null>(null);
  const [form, setForm] = useState<CakeFormData>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCakes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cakes?auctionId=${auctionId}`);
      if (!res.ok) throw new Error('Failed to fetch cakes');
      const data = await res.json();
      setCakes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cakes');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchCakes();
  }, [fetchCakes]);

  const openAddModal = () => {
    setEditingCake(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (cake: Cake) => {
    setEditingCake(cake);
    setForm({
      name: cake.name,
      flavor: cake.flavor ?? '',
      description: cake.description ?? '',
      donor_name: cake.donor_name ?? '',
      beneficiary_kid: cake.beneficiary_kid ?? '',
      starting_price: String(cake.starting_price),
      min_increment: String(cake.min_increment),
      max_increment: String(cake.max_increment),
      image_base64: '',
    });
    setImagePreview(cake.imgbb_url ?? null);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCake(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((prev) => ({ ...prev, image_base64: base64 }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image.png', { type: imageType });
          processFile(file);
          return;
        }
      }
      setError('No image found on clipboard');
    } catch {
      setError('Could not read clipboard. Try Ctrl+V in the drop zone instead.');
    }
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
        return;
      }
    }
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image_base64: '' }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Cake name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      auction_id: auctionId,
      name: form.name.trim(),
      flavor: form.flavor.trim() || undefined,
      description: form.description.trim() || undefined,
      donor_name: form.donor_name.trim() || undefined,
      beneficiary_kid: form.beneficiary_kid.trim() || undefined,
      starting_price: parseFloat(form.starting_price) || 0,
      min_increment: parseFloat(form.min_increment) || 5,
      max_increment: parseFloat(form.max_increment) || 25,
      image: form.image_base64 || undefined,
    };

    try {
      const url = editingCake ? `/api/cakes/${editingCake.id}` : '/api/cakes';
      const method = editingCake ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save cake');
      }

      closeModal();
      await fetchCakes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cake');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cake: Cake) => {
    if (!window.confirm(`Delete "${cake.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/cakes/${cake.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete cake');
      await fetchCakes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cake');
    }
  };

  const formatPrice = (amount: number) =>
    `$${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8602C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Cakes</h2>
        <Button onClick={openAddModal}>Add Cake</Button>
      </div>

      {/* Error banner */}
      {error && !modalOpen && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {cakes.length === 0 && (
        <Card className="text-center">
          <p className="text-gray-500">No cakes yet. Add your first cake to get started.</p>
        </Card>
      )}

      {/* Cake grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cakes.map((cake) => (
          <Card key={cake.id} className="flex flex-col">
            {/* Image */}
            <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100">
              {cake.imgbb_url ? (
                <img
                  src={cake.imgbb_url}
                  alt={cake.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <svg
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <h3 className="font-semibold text-gray-900">{cake.name}</h3>
            {cake.flavor && (
              <p className="text-sm text-gray-500">{cake.flavor}</p>
            )}
            {cake.donor_name && (
              <p className="mt-1 text-xs text-gray-400">
                Donated by {cake.donor_name}
              </p>
            )}
            {cake.beneficiary_kid && (
              <p className="text-xs text-gray-400">
                For {cake.beneficiary_kid}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-[#E8602C]">
              Starting at {formatPrice(cake.starting_price)}
            </p>

            {/* Actions */}
            <div className="mt-auto flex gap-2 pt-3">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => openEditModal(cake)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => handleDelete(cake)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCake ? 'Edit Cake' : 'Add Cake'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            label="Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Triple Chocolate Delight"
            required
          />

          <Input
            label="Flavor"
            name="flavor"
            value={form.flavor}
            onChange={handleChange}
            placeholder="e.g. Chocolate, Vanilla, Red Velvet"
          />

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
              placeholder="Tell bidders about this cake..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Donor Name"
              name="donor_name"
              value={form.donor_name}
              onChange={handleChange}
              placeholder="Who donated this cake?"
            />
            <Input
              label="Beneficiary Kid"
              name="beneficiary_kid"
              value={form.beneficiary_kid}
              onChange={handleChange}
              placeholder="Who benefits?"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Starting Price"
              name="starting_price"
              type="number"
              min="0"
              step="0.01"
              value={form.starting_price}
              onChange={handleChange}
            />
            <Input
              label="Min Increment"
              name="min_increment"
              type="number"
              min="0"
              step="0.01"
              value={form.min_increment}
              onChange={handleChange}
            />
            <Input
              label="Max Increment"
              name="max_increment"
              type="number"
              min="0"
              step="0.01"
              value={form.max_increment}
              onChange={handleChange}
            />
          </div>

          {/* Image upload - drag/drop + paste */}
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cake Image
            </label>

            {imagePreview ? (
              <div className="relative mt-1 overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                  title="Remove image"
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
                onPaste={handlePasteEvent}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  isDragging
                    ? 'border-[#E8602C] bg-[#E8602C]/5'
                    : 'border-gray-300 hover:border-[#E8602C]/50 hover:bg-gray-50'
                }`}
              >
                <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">
                  {isDragging ? 'Drop image here' : 'Drag & drop image here'}
                </p>
                <p className="mt-1 text-xs text-gray-400">or click to browse</p>

                {/* Paste button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePasteFromClipboard();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#E8602C]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Paste from Clipboard
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingCake ? 'Save Changes' : 'Add Cake'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
