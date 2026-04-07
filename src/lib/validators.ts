/* ───────────────────────────────────────────────────────
   Cake Auction – Zod input-validation schemas
   Each schema validates the *input* payload for create /
   update operations.  Inferred types are re-exported so
   the rest of the app never touches raw `z.infer<>`.
   ─────────────────────────────────────────────────────── */

import { z } from "zod";

// ─── Auction ─────────────────────────────────────────────

export const auctionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  imgbb_url: z.string().url("Invalid image URL").nullable().optional(),
  preview_at: z.string().optional(),
  live_at: z.string().optional(),
  close_at: z.string().optional(),
  cake_submission_close_at: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  pickup_end_time: z.string().optional(),
  pickup_location: z.string().optional(),
  thank_you_msg: z.string().optional(),
});

export type CreateAuctionInput = z.infer<typeof auctionSchema>;

// ─── Cake ────────────────────────────────────────────────

export const cakeSchema = z.object({
  auction_id: z.string().uuid("Invalid auction ID"),
  name: z.string().min(1, "Cake name is required"),
  flavor: z.string().optional(),
  description: z.string().optional(),
  donor_name: z.string().optional(),
  submitter_email: z.string().email("Invalid email").optional(),
  submitter_phone: z.string().optional(),
  beneficiary_kid: z.string().optional(),
  imgbb_url: z.string().url("Invalid image URL").optional(),
  approval_status: z.enum(["pending", "approved"]).optional(),
  starting_price: z.number().min(0).default(0),
  min_increment: z.number().min(0).default(5),
  max_increment: z.number().min(0).default(25),
  sort_order: z.number().int().default(0),
  picked_up: z.boolean().optional(),
  final_buyer_name: z.string().optional(),
  final_amount_paid: z.number().min(0).nullable().optional(),
});

export type CreateCakeInput = z.infer<typeof cakeSchema>;

export const cakePickupSchema = z.object({
  picked_up: z.boolean(),
  final_buyer_name: z.string().optional(),
  final_amount_paid: z.number().min(0).nullable().optional(),
});

// ─── Bidder ──────────────────────────────────────────────

export const bidderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .regex(/^[\d\s\-\+\(\)\.]+$/, "Invalid phone format"),
});

export type CreateBidderInput = z.infer<typeof bidderSchema>;

export const bidderRegistrationSchema = bidderSchema.extend({
  auction_id: z.string().uuid("Invalid auction ID"),
  device_key: z.string().min(1, "Device key is required"),
});

export type CreateBidderRegistrationInput = z.infer<typeof bidderRegistrationSchema>;

// ─── Bid ─────────────────────────────────────────────────

export const bidSchema = z.object({
  cake_id: z.string().uuid("Invalid cake ID"),
  amount: z.number().positive("Bid amount must be positive"),
});

export type CreateBidInput = z.infer<typeof bidSchema>;

// ─── Rule ────────────────────────────────────────────────

export const ruleSchema = z.object({
  auction_id: z.string().uuid("Invalid auction ID"),
  rule_text: z.string().min(1, "Rule text is required"),
  sort_order: z.number().int().default(0),
});

export type CreateRuleInput = z.infer<typeof ruleSchema>;

// ─── Login ───────────────────────────────────────────────

export const loginSchema = z.object({
  passcode: z
    .string()
    .length(6, "Passcode must be exactly 6 digits")
    .regex(/^\d{6}$/, "Passcode must be exactly 6 digits"),
  deviceToken: z.string().min(1, "Device token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
