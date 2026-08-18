export const POSTING_CHANNELS = ['Facebook', 'Instagram', 'TikTok', 'YouTube'] as const;
export type PostingChannel = typeof POSTING_CHANNELS[number];
