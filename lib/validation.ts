import { z } from 'zod';

// Poll creation validation
export const createPollSchema = z.object({
  question: z.string()
    .min(1, 'Question is required')
    .max(500, 'Question must be 500 characters or less'),
  options: z.array(z.object({
    option_text: z.string().min(1, 'Option text is required').max(100, 'Option must be 100 characters or less')
  }))
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed'),
  expires_at: z.string()
    .refine((date) => {
      const expiryDate = new Date(date);
      const now = new Date();
      return expiryDate > now;
    }, 'Expiry date must be in the future'),
  scheduled_at: z.string().optional(),
  is_anonymous: z.boolean().optional().default(false),
  send_notification: z.boolean().optional().default(true),
  company_id: z.string().min(1, 'Company ID is required'),
  experience_id: z.string().min(1, 'Experience ID is required'),
});

// Vote validation
export const voteSchema = z.object({
  option_id: z.string().min(1, 'Option ID is required'),
});

// Poll ID validation
export const pollIdSchema = z.string().uuid('Invalid poll ID format');

// User ID validation
export const userIdSchema = z.string().min(1, 'User ID is required');

// Company ID validation
export const companyIdSchema = z.string().min(1, 'Company ID is required');

// Experience ID validation
export const experienceIdSchema = z.string().min(1, 'Experience ID is required');

// Type exports for TypeScript
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
