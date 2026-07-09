export const messageHeader = `$MOSAIC$`;

enum FederationMessageType {
  HANDSHAKE = 'HANDSHAKE',
  ERROR = 'ERROR',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPT = 'FRIEND_ACCEPT',
  FRIEND_REJECT = 'FRIEND_REJECT',
  FRIEND_REMOVAL = 'FRIEND_REMOVAL',
  FRIENDSHIP_PERMISSIONS = 'FRIENDSHIP_PERMISSIONS',
  USER_UPDATE = 'USER_UPDATE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  FRONT_UPDATE = 'FRONT_UPDATE',
  GET_OUTBOX = 'GET_OUTBOX',
  QUERY = 'QUERY',
}

export enum MessagesBefore {
  GET_OUTBOX = `${messageHeader}${FederationMessageType.GET_OUTBOX}`,
  HANDSHAKE = `${messageHeader}${FederationMessageType.HANDSHAKE}`,
  QUERY = `${messageHeader}${FederationMessageType.QUERY}`,
}

enum FrontUpdateEvent {
  FRONT_SESSION_STARTED = 'FRONT_SESSION_STARTED',
  FRONT_SESSION_ENDED = 'FRONT_SESSION_ENDED',
}

type FederationMessage = {
  type: FederationMessageType;
  timestamp: number;
  signature?: string;
  targetFederation: string;
  nonce?: string;
};

type HandshakeMessage = FederationMessage & {
  type: FederationMessageType.HANDSHAKE;
  federationInfo: {
    version: string;
    publicKey: string;
  };
};

type ErrorMessage = FederationMessage & {
  type: FederationMessageType.ERROR;
  errorCode: string;
};

type FriendRequestMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_REQUEST;
  distantId?: string;
  senderUsername: string;
  recipientUsername: string;
};

type FriendAcceptMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_ACCEPT;
  distantId: string;
  senderUsername: string;
  recipientUsername: string;
};

type FriendRejectMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_REJECT;
  distantId: string;
  senderUsername: string;
  recipientUsername: string;
};

type FriendRemovalMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_REMOVAL;
  distantId: string;
  senderId: string;
  recipientId: string;
};

type UserUpdateMessage = FederationMessage & {
  type: FederationMessageType.USER_UPDATE;
  userId: string;
  updatedFields: Partial<{
    username: string;
    avatarUrl: string;
    status: string;
  }>;
};

type SystemUpdateMessage = FederationMessage & {
  type: FederationMessageType.SYSTEM_UPDATE;
  systemId: string;
  updatedFields: Partial<{
    name: string;
    description: string;
    avatarUrl: string;
  }>;
};

type FrontUpdateMessage = FederationMessage & {
  type: FederationMessageType.FRONT_UPDATE;
  event: FrontUpdateEvent;
  systemId: string;
  memberId: string;
  frontId: string;
  note?: string;
};

export type FriendshipPermissionFlags = Partial<{
  canViewFront: boolean;
  canReceiveFrontNotifications: boolean;
  canViewSharedMembers: boolean;
  notifyMeOnFriendFrontChange: boolean;
}>;

type FriendPermissionsMessage = FederationMessage & {
  type: FederationMessageType.FRIENDSHIP_PERMISSIONS;
  distantId?: string;
  senderUsername: string;
  recipientUsername: string;
  permissions: FriendshipPermissionFlags;
};

type AnyFederationMessage =
  | HandshakeMessage
  | ErrorMessage
  | FriendRequestMessage
  | FriendAcceptMessage
  | FriendRejectMessage
  | UserUpdateMessage
  | SystemUpdateMessage
  | FrontUpdateMessage
  | FriendPermissionsMessage
  | FriendRemovalMessage;

export type {
  FederationMessage,
  HandshakeMessage,
  ErrorMessage,
  FriendRequestMessage,
  FriendAcceptMessage,
  FriendRejectMessage,
  UserUpdateMessage,
  SystemUpdateMessage,
  FrontUpdateMessage,
  FriendPermissionsMessage,
  AnyFederationMessage,
  FriendRemovalMessage,
};

export { FederationMessageType, FrontUpdateEvent };
