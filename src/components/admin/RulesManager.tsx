'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Rule } from '@/types';
import { DEFAULT_RULES } from '@/lib/default-rules';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface RulesManagerProps {
  auctionId: string;
}

export const RulesManager: React.FC<RulesManagerProps> = ({ auctionId }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [addingRule, setAddingRule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rules?auctionId=${auctionId}`);
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditText(rule.rule_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (ruleId: string) => {
    if (!editText.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          rule_text: editText.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      setEditingId(null);
      setEditText('');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    if (!newRuleText.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          rule_text: newRuleText.trim(),
          sort_order: rules.length,
        }),
      });
      if (!res.ok) throw new Error('Failed to add rule');
      setNewRuleText('');
      setAddingRule(false);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: Rule) => {
    if (!window.confirm('Delete this rule?')) return;

    setError(null);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const moveRule = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= rules.length) return;

    const reordered = [...rules];
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex],
      reordered[index],
    ];

    // Optimistic update
    setRules(reordered);

    setError(null);
    try {
      const res = await fetch('/api/rules/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          rule_ids: reordered.map((r) => r.id),
        }),
      });
      if (!res.ok) throw new Error('Failed to reorder rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
      await fetchRules(); // Revert on error
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    setError(null);
    try {
      for (let i = 0; i < DEFAULT_RULES.length; i++) {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auction_id: auctionId,
            rule_text: DEFAULT_RULES[i],
            sort_order: i,
          }),
        });
        if (!res.ok) throw new Error('Failed to seed rules');
      }
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed rules');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Auction Rules</h2>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {rules.length === 0 && !addingRule && (
        <Card className="text-center">
          <p className="mb-4 text-gray-500">
            No rules have been set for this auction.
          </p>
          <Button onClick={seedDefaults} loading={seeding}>
            Seed Default Rules
          </Button>
        </Card>
      )}

      {/* Rules list */}
      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <Card key={rule.id} className="!p-3">
              <div className="flex items-center gap-3">
                {/* Order number */}
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {index + 1}
                </span>

                {/* Rule text or edit input */}
                {editingId === rule.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(rule.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveEdit(rule.id)}
                      loading={saving}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="flex-1 text-sm text-gray-700">
                    {rule.rule_text}
                  </p>
                )}

                {/* Action buttons */}
                {editingId !== rule.id && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {/* Move up */}
                    <button
                      onClick={() => moveRule(index, 'up')}
                      disabled={index === 0}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        />
                      </svg>
                    </button>

                    {/* Move down */}
                    <button
                      onClick={() => moveRule(index, 'down')}
                      disabled={index === rules.length - 1}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(rule)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Edit rule"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                        />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteRule(rule)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete rule"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add rule section */}
      <div className="mt-4">
        {addingRule ? (
          <Card className="!p-3">
            <div className="flex items-center gap-2">
              <Input
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Enter rule text..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addRule();
                  if (e.key === 'Escape') {
                    setAddingRule(false);
                    setNewRuleText('');
                  }
                }}
              />
              <Button size="sm" onClick={addRule} loading={saving}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingRule(false);
                  setNewRuleText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setAddingRule(true)}
            className="w-full"
          >
            + Add Rule
          </Button>
        )}
      </div>
    </div>
  );
};
