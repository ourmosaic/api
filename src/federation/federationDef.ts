export const messageHeader = `$MOSAIC$`;

export enum MessagesBefore {
  GET_OUTBOX = `${messageHeader}GET_OUTBOX`,
  HANDSHAKE = `${messageHeader}HANDSHAKE`,
}

enum FederationMessageType {
  HANDSHAKE = 'HANDSHAKE',
  ERROR = 'ERROR',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPT = 'FRIEND_ACCEPT',
  FRIEND_REJECT = 'FRIEND_REJECT',
  USER_UPDATE = 'USER_UPDATE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  FRONT_UPDATE = 'FRONT_UPDATE',
  GET_OUTBOX = 'GET_OUTBOX',
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
  senderUsername: string;
  recipientUsername: string;
};

type FriendAcceptMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_ACCEPT;
  senderId: string;
  recipientId: string;
};

type FriendRejectMessage = FederationMessage & {
  type: FederationMessageType.FRIEND_REJECT;
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
  frontId: string;
  note?: string;
};

type AnyFederationMessage =
  | HandshakeMessage
  | ErrorMessage
  | FriendRequestMessage
  | FriendAcceptMessage
  | FriendRejectMessage
  | UserUpdateMessage
  | SystemUpdateMessage
  | FrontUpdateMessage;

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
  AnyFederationMessage,
};

export { FederationMessageType };
