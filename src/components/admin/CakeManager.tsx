'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((prev) => ({ ...prev, image_base64: base64 }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
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
      image_base64: form.image_base64 || undefined,
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7B1113] border-t-transparent" />
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
            <p className="mt-2 text-sm font-medium text-[#7B1113]">
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
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#9B1517] focus:outline-none focus:ring-2 focus:ring-[#7B1113]/20"
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

          {/* Image upload */}
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cake Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#FBF5EB] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#5C0D0F] hover:file:bg-[#F5E6D0]"
            />
            {imagePreview && (
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
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
