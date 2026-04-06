'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Auction, Cake, Rule, AuctionWithStatus } from '@/types';
import { enrichAuctionWithStatus } from '@/lib/auction-status';
import { DEFAULT_RULES } from '@/lib/default-rules';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Tab = 'details' | 'cakes' | 'rules';

interface FormErrors {
  [key: string]: string;
}

// ─── Helpers ────────────────────────────────────────────

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ─── Main Page ──────────────────────────────────────────

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<AuctionWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const detailsPublishHandlerRef = useRef<(() => Promise<boolean>) | null>(null);

  const fetchAuction = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) throw new Error('Failed to load auction');
      const data: Auction = await res.json();
      setAuction(enrichAuctionWithStatus(data));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  async function handlePublish() {
    if (activeTab === 'details' && detailsPublishHandlerRef.current) {
      const published = await detailsPublishHandlerRef.current();
      if (published) {
        setShowPublish(false);
        setActionSuccess('Auction published.');
        setActionError('');
        await fetchAuction();
      }
      return;
    }

    if (!auction) return;
    setActionError('');
    setActionSuccess('');
    setPublishing(true);
    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) throw new Error('Failed to publish');
      setShowPublish(false);
      setActionSuccess('Auction published.');
      await fetchAuction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!auction) return;
    setActionError('');
    setActionSuccess('');
    setDeleting(true);
    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/admin/dashboard');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchError || !auction) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{fetchError || 'Auction not found'}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push('/admin/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'cakes', label: 'Cakes' },
    { key: 'rules', label: 'Rules' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{auction.title}</h1>
          <Badge variant={auction.effectiveStatus}>
            {auction.effectiveStatus}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[#E8602C] text-[#E8602C]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <DetailsTab
          auction={auction}
          onSaved={fetchAuction}
          registerPublishHandler={(handler) => {
            detailsPublishHandlerRef.current = handler;
          }}
        />
      )}
      {activeTab === 'cakes' && <CakesTab auctionId={auctionId} />}
      {activeTab === 'rules' && <RulesTab auctionId={auctionId} />}

      <AuctionActionBar
        activeTab={activeTab}
        auction={auction}
        actionError={actionError}
        actionSuccess={actionSuccess}
        publishing={publishing}
        deleting={deleting}
        onPublish={() => setShowPublish(true)}
        onDelete={() => setShowDelete(true)}
      />

      <Modal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        title="Publish Auction"
      >
        <p className="text-sm text-gray-600 mb-6">
          Publishing this auction will make it visible to bidders based on the
          schedule you have set. Are you sure you want to publish?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowPublish(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} loading={publishing}>
            Publish
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Auction"
      >
        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete the auction and all associated cakes,
          bids, and rules. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AuctionActionBar({
  activeTab,
  auction,
  actionError,
  actionSuccess,
  publishing,
  deleting,
  onPublish,
  onDelete,
}: {
  activeTab: Tab;
  auction: AuctionWithStatus;
  actionError: string;
  actionSuccess: string;
  publishing: boolean;
  deleting: boolean;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const saveDisabled = activeTab !== 'details';

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionSuccess}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          form="auction-details-form"
          disabled={saveDisabled}
          title={
            saveDisabled
              ? 'Cake and rule changes save immediately on their own tabs.'
              : undefined
          }
        >
          Save Changes
        </Button>

        {auction.status === 'draft' && (
          <Button
            type="button"
            variant="secondary"
            onClick={onPublish}
            loading={publishing}
          >
            Publish
          </Button>
        )}

        <div className="flex-1" />

        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          loading={deleting}
        >
          Delete Auction
        </Button>
      </div>
    </div>
  );
}

// ─── Details Tab ────────────────────────────────────────

function DetailsTab({
  auction,
  onSaved,
  registerPublishHandler,
}: {
  auction: AuctionWithStatus;
  onSaved: () => void;
  registerPublishHandler: (handler: (() => Promise<boolean>) | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(auction.imgbb_url || null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    auction.imgbb_url || null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [form, setForm] = useState({
    title: auction.title,
    description: auction.description || '',
    preview_at: toLocalDatetime(auction.preview_at),
    live_at: toLocalDatetime(auction.live_at),
    close_at: toLocalDatetime(auction.close_at),
    pickup_date: toLocalDate(auction.pickup_date),
    pickup_time: auction.pickup_time || '',
    pickup_location: auction.pickup_location || '',
    thank_you_msg: auction.thank_you_msg || '',
  });

  useEffect(() => {
    setImageUrl(auction.imgbb_url || null);
    setImagePreview(auction.imgbb_url || null);
  }, [auction.imgbb_url]);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setServerError('');
      setImageUploading(true);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: result.split(',')[1] }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to upload image');
        }
        setImageUrl(data.url);
        setImagePreview(data.url);
      } catch (err) {
        setImageUrl(auction.imgbb_url || null);
        setImagePreview(auction.imgbb_url || null);
        setServerError(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setImageUploading(false);
      }
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

  async function handlePasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processFile(new File([blob], 'auction-image.png', { type: imageType }));
          return;
        }
      }
      alert('No image found in clipboard');
    } catch {
      alert('Could not read clipboard. Try copying an image first.');
    }
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

  function removeImage() {
    setImagePreview(null);
    setImageUrl(null);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccessMsg('');
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

  async function saveDetails(publishAfter = false): Promise<boolean> {
    setServerError('');
    setSuccessMsg('');
    if (!validate()) return false;
    if (imageUploading) {
      setServerError('Wait for the auction image upload to finish.');
      return false;
    }

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
        status: publishAfter ? 'published' : undefined,
        imgbb_url: imageUrl ?? null,
      };

      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save');
      }

      setSuccessMsg(
        publishAfter ? 'Auction saved and published.' : 'Auction saved successfully.',
      );
      await onSaved();
      return true;
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await saveDetails(false);
  }

  useEffect(() => {
    registerPublishHandler(() => saveDetails(true));
    return () => registerPublishHandler(null);
  }, [
    registerPublishHandler,
    form,
    imageUrl,
    auction.imgbb_url,
    auction.id,
    auction.title,
    auction.description,
    auction.preview_at,
    auction.live_at,
    auction.close_at,
    auction.pickup_date,
    auction.pickup_time,
    auction.pickup_location,
    auction.thank_you_msg,
  ]);

  return (
    <>
      {serverError && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <form id="auction-details-form" onSubmit={handleSave} className="space-y-8">
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
            />
            <div className="w-full">
              <label
                htmlFor="edit-description"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="edit-description"
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
              />
            </div>

            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Auction Image
              </label>
              {imagePreview ? (
                <div className="relative mt-1 overflow-hidden rounded-lg border border-gray-200">
                  <img src={imagePreview} alt="Auction preview" className="h-52 w-full object-cover" />
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
                  className={`mt-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    isDragging
                      ? 'border-[#E8602C] bg-[#E8602C]/5'
                      : 'border-gray-300 bg-white'
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
                  {imageUploading && (
                    <p className="mt-2 text-xs text-[#E8602C]">Uploading image...</p>
                  )}
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#E8602C]"
                  >
                    Paste from Clipboard
                  </button>
                </div>
              )}
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

        {/* Pickup */}
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
              />
            </div>
          </div>
        </section>

        {/* Thank You */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Thank You Message</h2>
          <div className="w-full">
            <label
              htmlFor="edit-thank-you"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <textarea
              id="edit-thank-you"
              rows={3}
              value={form.thank_you_msg}
              onChange={(e) => updateField('thank_you_msg', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
            />
          </div>
        </section>
      </form>
    </>
  );
}

// ─── Cakes Tab ──────────────────────────────────────────

function CakesTab({ auctionId }: { auctionId: string }) {
  const EMPTY_CAKE_FORM = {
    name: '',
    flavor: '',
    description: '',
    donor_name: '',
    beneficiary_kid: '',
    starting_price: '0',
    min_increment: '5',
    max_increment: '25',
  };

  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCake, setEditingCake] = useState<Cake | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingCakeId, setDeletingCakeId] = useState<string | null>(null);
  const [approvingCakeId, setApprovingCakeId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [cakeForm, setCakeForm] = useState(EMPTY_CAKE_FORM);
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handlePasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processFile(new File([blob], 'pasted-image.png', { type: imageType }));
          return;
        }
      }
      alert('No image found in clipboard');
    } catch {
      alert('Could not read clipboard. Try copying an image first.');
    }
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

  function removeImage() {
    setImagePreview(null);
    setImageBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetCakeForm() {
    setCakeForm(EMPTY_CAKE_FORM);
    setEditingCake(null);
    setError('');
    removeImage();
  }

  function openAddModal() {
    resetCakeForm();
    setShowAdd(true);
  }

  function openEditModal(cake: Cake) {
    setEditingCake(cake);
    setCakeForm({
      name: cake.name,
      flavor: cake.flavor || '',
      description: cake.description || '',
      donor_name: cake.donor_name || '',
      beneficiary_kid: cake.beneficiary_kid || '',
      starting_price: String(cake.starting_price),
      min_increment: String(cake.min_increment),
      max_increment: String(cake.max_increment),
    });
    setImageBase64('');
    setImagePreview(cake.imgbb_url || null);
    setError('');
    setShowAdd(true);
  }

  function closeCakeModal() {
    setShowAdd(false);
    resetCakeForm();
  }

  const fetchCakes = useCallback(async () => {
    try {
      const res = await fetch(`/api/cakes?auctionId=${auctionId}`);
      if (res.ok) {
        setCakes(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchCakes();
  }, [fetchCakes]);

  async function handleSaveCake(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const isEditing = Boolean(editingCake);
      const res = await fetch(
        isEditing ? `/api/cakes/${editingCake!.id}` : '/api/cakes',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auction_id: auctionId,
            name: cakeForm.name,
            flavor: cakeForm.flavor || undefined,
            description: cakeForm.description || undefined,
            donor_name: cakeForm.donor_name || undefined,
            beneficiary_kid: cakeForm.beneficiary_kid || undefined,
            submitter_email: editingCake?.submitter_email || undefined,
            submitter_phone: editingCake?.submitter_phone || undefined,
            starting_price: Number(cakeForm.starting_price) || 0,
            min_increment: Number(cakeForm.min_increment) || 5,
            max_increment: Number(cakeForm.max_increment) || 25,
            sort_order: editingCake?.sort_order ?? cakes.length,
            approval_status: editingCake?.approval_status ?? 'approved',
            imgbb_url: imageBase64 ? undefined : editingCake?.imgbb_url,
            image: imageBase64 || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || (isEditing ? 'Failed to update cake' : 'Failed to add cake'),
        );
      }
      closeCakeModal();
      fetchCakes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingCake
            ? 'Failed to update cake'
            : 'Failed to add cake',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCake(cake: Cake) {
    const confirmed = window.confirm(
      `Delete "${cake.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError('');
    setDeletingCakeId(cake.id);
    try {
      const res = await fetch(`/api/cakes/${cake.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete cake');
      }
      if (editingCake?.id === cake.id) {
        closeCakeModal();
      }
      await fetchCakes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cake');
    } finally {
      setDeletingCakeId(null);
    }
  }

  async function handleApproveCake(cake: Cake) {
    setError('');
    setApprovingCakeId(cake.id);
    try {
      const res = await fetch(`/api/cakes/${cake.id}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'approved' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to approve cake');
      }
      await fetchCakes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve cake');
    } finally {
      setApprovingCakeId(null);
    }
  }

  const pendingCakes = cakes.filter((cake) => cake.approval_status === 'pending');
  const approvedCakes = cakes.filter((cake) => cake.approval_status !== 'pending');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Cakes ({approvedCakes.length})
        </h2>
        <Button size="sm" onClick={openAddModal}>
          + Add Cake
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {pendingCakes.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pending Submissions ({pendingCakes.length})
          </h3>
          <div className="space-y-3">
            {pendingCakes.map((cake) => (
              <div
                key={cake.id}
                className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                  {cake.imgbb_url ? (
                    <img
                      src={cake.imgbb_url}
                      alt={cake.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{cake.name}</p>
                  <p className="text-sm text-gray-600">
                    by {cake.donor_name || 'Unknown donor'}
                    {cake.flavor ? ` • ${cake.flavor}` : ''}
                  </p>
                  {cake.submitter_email && (
                    <p className="text-xs text-gray-500">{cake.submitter_email}</p>
                  )}
                  {cake.submitter_phone && (
                    <p className="text-xs text-gray-500">{cake.submitter_phone}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveCake(cake)}
                    loading={approvingCakeId === cake.id}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditModal(cake)}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deletingCakeId === cake.id}
                    onClick={() => handleDeleteCake(cake)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedCakes.length === 0 && pendingCakes.length === 0 && !showAdd ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No cakes yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvedCakes.map((cake) => (
            <div
              key={cake.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {cake.imgbb_url ? (
                  <img
                    src={cake.imgbb_url}
                    alt={cake.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    Cake
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{cake.name}</p>
                <p className="text-sm text-gray-500">
                  {cake.flavor && <span>{cake.flavor}</span>}
                  {cake.donor_name && (
                    <span className="ml-2">by {cake.donor_name}</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEditModal(cake)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={deletingCakeId === cake.id}
                  onClick={() => handleDeleteCake(cake)}
                >
                  Delete
                </Button>
              </div>
              <span className="shrink-0 text-sm font-medium text-gray-600">
                ${cake.starting_price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Cake Modal */}
      <Modal
        isOpen={showAdd}
        onClose={closeCakeModal}
        title={editingCake ? 'Edit Cake' : 'Add Cake'}
      >
        <form onSubmit={handleSaveCake} className="space-y-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            label="Cake Name"
            required
            value={cakeForm.name}
            onChange={(e) =>
              setCakeForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <Input
            label="Flavor"
            value={cakeForm.flavor}
            onChange={(e) =>
              setCakeForm((prev) => ({ ...prev, flavor: e.target.value }))
            }
          />
          <Input
            label="Donor Name"
            value={cakeForm.donor_name}
            onChange={(e) =>
              setCakeForm((prev) => ({ ...prev, donor_name: e.target.value }))
            }
          />
          <Input
            label="Beneficiary Kid"
            value={cakeForm.beneficiary_kid}
            onChange={(e) =>
              setCakeForm((prev) => ({ ...prev, beneficiary_kid: e.target.value }))
            }
          />
          <div className="w-full">
            <label
              htmlFor="cake-description"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="cake-description"
              rows={3}
              value={cakeForm.description}
              onChange={(e) =>
                setCakeForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
            />
          </div>
          {/* Image upload - drag/drop + paste */}
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cake Image
            </label>
            {imagePreview ? (
              <div className="relative mt-1 overflow-hidden rounded-lg border border-gray-200">
                <img src={imagePreview} alt="Preview" className="h-44 w-full object-cover" />
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

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Start Price"
              type="number"
              min="0"
              step="0.01"
              value={cakeForm.starting_price}
              onChange={(e) =>
                setCakeForm((prev) => ({ ...prev, starting_price: e.target.value }))
              }
            />
            <Input
              label="Min Increment"
              type="number"
              min="0"
              step="0.01"
              value={cakeForm.min_increment}
              onChange={(e) =>
                setCakeForm((prev) => ({ ...prev, min_increment: e.target.value }))
              }
            />
            <Input
              label="Max Increment"
              type="number"
              min="0"
              step="0.01"
              value={cakeForm.max_increment}
              onChange={(e) =>
                setCakeForm((prev) => ({ ...prev, max_increment: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCakeModal}
            >
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
}

// ─── Rules Tab ──────────────────────────────────────────

function RulesTab({ auctionId }: { auctionId: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleText, setEditRuleText] = useState('');
  const [newRule, setNewRule] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/rules?auctionId=${auctionId}`);
      if (res.ok) {
        setRules(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function startEditingRule(rule: Rule) {
    setEditingRuleId(rule.id);
    setEditRuleText(rule.rule_text);
    setError('');
  }

  function cancelEditingRule() {
    setEditingRuleId(null);
    setEditRuleText('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newRule.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          rule_text: newRule.trim(),
          sort_order: rules.length,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to add rule');
      }
      setNewRule('');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRule(ruleId: string) {
    if (!editRuleText.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          rule_text: editRuleText.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update rule');
      }
      cancelEditingRule();
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete rule');
      }
      if (editingRuleId === ruleId) {
        cancelEditingRule();
      }
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  }

  async function handleSeedDefaults() {
    setError('');
    setSeeding(true);
    try {
      const existingTexts = new Set(
        rules.map((rule) => rule.rule_text.trim().toLowerCase()),
      );
      const rulesToAdd = DEFAULT_RULES.filter(
        (ruleText) => !existingTexts.has(ruleText.trim().toLowerCase()),
      );

      for (let i = 0; i < rulesToAdd.length; i++) {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auction_id: auctionId,
            rule_text: rulesToAdd[i],
            sort_order: rules.length + i,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Failed to seed default rules');
        }
      }

      await fetchRules();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to seed default rules',
      );
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Rules ({rules.length})
        </h2>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={seeding}
          onClick={handleSeedDefaults}
        >
          Seed Default Rules
        </Button>
      </div>

      {/* Add rule form */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleAdd} className="mb-6 flex gap-3">
        <div className="flex-1">
          <Input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder="Enter a new rule..."
          />
        </div>
        <Button type="submit" size="md" loading={saving} disabled={!newRule.trim()}>
          Add
        </Button>
      </form>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No rules yet. Seed the default rules or add custom rules for this auction.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {rules.map((rule, i) => (
            <li
              key={rule.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8EEF6] text-xs font-semibold text-[#1B3C6D]">
                {i + 1}
              </span>
              {editingRuleId === rule.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editRuleText}
                    onChange={(e) => setEditRuleText(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveRule(rule.id);
                      }
                      if (e.key === 'Escape') {
                        cancelEditingRule();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    loading={saving}
                    onClick={() => handleSaveRule(rule.id)}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={cancelEditingRule}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm text-gray-800">{rule.rule_text}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => startEditingRule(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
