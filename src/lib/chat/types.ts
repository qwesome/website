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

export interface ServerChannel {
  id: number;
  name: string;
}

export interface Server {
  id: number;
  name: string;
  avatar: string | null;
  owner: string;
  /** case-insensitive shareable invite code (e.g. "K7FQ2A") */
  code?: string;
  is_default?: number;
  /** 1 = listed in the public join directory */
  is_public?: number;
  channels: ServerChannel[];
}

/** Lightweight server entry shown in the public join directory. */
export interface PublicServer {
  id: number;
  name: string;
  avatar: string | null;
  owner: string;
  member_count: number;
}

export interface FriendsData {
  friends: string[];
  incoming: string[];
  outgoing: string[];
}

export type ChatTarget =
  | { type: 'server'; id: string; serverId: number; channelId: number }
  | { type: 'dm'; id: string; name: string }
  | { type: 'admin'; id: string }
  | { type: 'home'; id: string };
