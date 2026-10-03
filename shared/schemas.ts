import { z } from 'zod';

// Identity Schemas
export const SendOtpSchema = z.object({
  phone: z.string().min(10).max(18).regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format'),
});

export const VerifyOtpSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^[0-9]+$/),
});

// Drop Creation Schema
export const CreateDropSchema = z.object({
  name: z.string().min(3).max(120),
  venue: z.string().min(3).max(120),
  seatCount: z.number().int().min(1).max(5000),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  perPersonLimit: z.number().int().min(1).max(10).default(1),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  drawTime: z.string().datetime(),
  holdDurationSec: z.number().int().min(60).max(1800).default(300),
  mode: z.enum(['FAIR_DROP', 'FCFS']),
  heroImage: z.string().url().optional(),
});

// Drop Entry / Join Schema
export const JoinDropSchema = z.object({
  turnstileToken: z.string().optional(),
  powNonce: z.string().min(1, 'Proof of work nonce is required'),
  idempotencyKey: z.string().uuid(),
  honeypot: z.string().max(0, 'Bot detected via honeypot trap').optional(),
  clientTimestamp: z.number(),
});

// Seat Checkout Schema
export const CheckoutSchema = z.object({
  dropId: z.string().min(1),
  seatId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
  paymentMethod: z.enum(['card', 'upi', 'mock_gateway']),
});

// Appeal Submission Schema
export const SubmitAppealSchema = z.object({
  entryId: z.string().min(1),
  dropId: z.string().min(1),
  reason: z.string().min(10).max(1000),
});
