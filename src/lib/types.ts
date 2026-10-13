// ============================================
// LiveChat SaaS - TypeScript Types
// ============================================

export type SenderType = "customer" | "agent" | "system";
export type RoomStatus = "open" | "closed";
export type GlobalRole = "master_admin" | "account_owner" | "agent";
export type AccountStatus = "pending" | "active" | "suspended" | "rejected";
export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type WidgetTheme = "light" | "dark";
export type VisitorStatus = "browsing" | "chatting" | "idle" | "offline";
export type CannedResponseScope = "shared" | "private";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  global_role: GlobalRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  owner_id: string;
  account_number: string;
  account_slug: string | null;
  company_name: string;
  status: AccountStatus;
  approved_at: string | null;
  approved_by: string | null;
  trial_ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface AccountSettings {
  account_id: string;
  widget_color: string;
  widget_position: WidgetPosition;
  widget_theme: WidgetTheme;
  widget_language: string;
  widget_title: string;
  welcome_message: string;
  pre_chat_enabled: boolean;
  pre_chat_message: string;
  pre_chat_fields: PreChatField[];
  offline_message: string;
  auto_responder_enabled: boolean;
  auto_responder_message: string;
  canned_responses: CannedResponse[];
  updated_at: string;
  // Enhanced customization (v4)
  page_title?: string;
  page_subtitle?: string;
  header_bg_color?: string;
  customer_bubble_color?: string;
  agent_bubble_color?: string;
  page_bg_color?: string;
  page_bg_type?: "color" | "gradient" | "image";
  page_bg_gradient?: string;
  page_bg_image?: string;
  agent_name?: string;
  agent_avatar?: string;
  agent_title?: string;
  show_powered_by?: boolean;
  custom_css?: string;
  font_family?: string;
  text_color?: string;
  subtitle_color?: string;
  header_text_color?: string;
  powered_by_color?: string;
}

export interface PreChatField {
  id?: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[]; // for select type
  placeholder?: string;
}

export interface CannedResponse {
  id: string;
  shortcut: string; // e.g. "hi", "bye", "transfer"
  text: string;
  scope: CannedResponseScope;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  created_at?: string;
}

export interface ChatRoom {
  id: string;
  account_id: string;
  customer_email: string | null;
  customer_name: string;
  customer_phone: string | null;
  visitor_id: string | null;
  visitor_ip: string | null;
  visitor_country: string | null;
  visitor_city: string | null;
  visitor_page: string | null;
  visitor_referrer: string | null;
  visitor_user_agent: string | null;
  pre_chat_data: Record<string, string> | null;
  assigned_agent_id: string | null;
  status: RoomStatus;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  is_archived: boolean;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  attachments: MessageAttachment[] | null;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface MessageAttachment {
  url: string;
  type: string; // mime type
  name: string;
  size: number;
}

export interface Visitor {
  id: string;
  account_id: string;
  visitor_id: string;
  name: string | null;
  email: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  current_page: string | null;
  referrer: string | null;
  user_agent: string | null;
  status: VisitorStatus;
  first_seen_at: string;
  last_seen_at: string;
  total_visits: number;
  pages_visited: PageVisit[];
}

export interface PageVisit {
  url: string;
  title?: string;
  visited_at: string;
  duration_ms?: number;
}

export interface Notification {
  id: string;
  account_id: string | null;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// Extended types for joined queries
export interface ChatRoomWithDetails extends ChatRoom {
  account?: Pick<Account, "id" | "company_name" | "account_number">;
  last_message?: Pick<Message, "content" | "sender_type" | "created_at"> | null;
  unread_count?: number;
}

export interface AccountWithSettings extends Account {
  settings?: AccountSettings;
}