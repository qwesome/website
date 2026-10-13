export type MessageId = number | string;
export type Status = 'online' | 'away' | 'offline';

export interface Message {
  id: MessageId;
  channel: string;
  author: string;
  text: string;
  image?: string | null;
  ts: number;
  reply_to?: MessageId | null;
  edited?: number;
  sending?: boolean;
  tempId?: string;
}

export interface OutgoingMessage {
  channel: string;
  text: string;
  image?: string | null;
  ts: number;
  reply_to?: MessageId | null;
  tempId?: string;
}

export interface Conversation {
  username: string;
  last_ts: number;
}

export interface ChannelMeta {
  cursor: number;
  hasMore: boolean;
  loading: boolean;
}

export interface UrlMeta {
  title?: string;
  description?: string;
  image?: string;
  hostname?: string;
  error?: boolean;
}

export interface Gif {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string };
    fixed_height_small: { url: string };
  };
}

export type ChatTarget =
  | { type: 'channel'; id: string }
  | { type: 'dm'; id: string; name: string };
