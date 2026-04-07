'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface BidderData {
  id: string;
  name: string;
  phone: string;
  device_token: string;
}

interface BidderRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: string;
  deviceKey: string;
  onRegistered: (bidder: BidderData) => void;
}

export const BidderRegistration: React.FC<BidderRegistrationProps> = ({
  isOpen,
  onClose,
  auctionId,
  deviceKey,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; general?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (phone.trim().length < 7) newErrors.phone = 'Phone number is too short';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bidders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          device_key: deviceKey,
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ general: data.error || 'Registration failed. Please try again.' });
        return;
      }

      const bidder: BidderData = await res.json();

      setName('');
      setPhone('');
      onRegistered(bidder);
    } catch {
      setErrors({ general: 'Something went wrong. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register to Bid">
      <p className="mb-4 text-sm text-gray-600">
        Quick registration to start bidding!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          autoFocus
        />

        <Input
          label="Phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          required
        />

        {errors.general && (
          <p className="text-sm text-red-600">{errors.general}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Register
          </Button>
        </div>
      </form>
    </Modal>
  );
};
