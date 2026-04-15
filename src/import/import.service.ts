import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivacyLevel, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FieldType } from 'src/system/dto/updateCustomFieldDefinition.dto';
import { SystemService } from 'src/system/system.service';
import { randomUUID } from 'crypto';
import errorCodes from 'src/utils/errorCodes';
import axios from 'axios';
import sharp from 'sharp';
import { StorageService } from 'src/storage/storage.service';
import { buildMinioUrl, MINIO_BUCKET_NAME } from 'src/utils/constants';

const BATCH_SIZE = 1000;

type SimplyPluralUser = {
  isAsystem: boolean;
  username?: string;
  desc?: string;
  avatarUrl?: string;
  color?: string;
  fields: Record<
    string,
    {
      name: string;
      order?: number;
      type?: number;
      private?: boolean;
    }
  >;
};

type SimplyPluralCustomField = {
  _id: string;
  name: string;
  type: number;
  order: string;
};

type SimplyPluralPrivacyBucket = { id: string; rank: string };

type SimplyPluralMember = {
  _id: string;
  uid: string;
  name: string;
  desc?: string;
  pronouns?: string;
  color?: string;
  avatarUuid?: string;
  privacyBucketId?: string;
  info?: Record<string, unknown>;
};

type SimplyPluralGroup = {
  _id: string;
  parent?: string | null;
  name?: string;
  color?: string;
  emoji?: string;
  icon?: string;
  members?: string[];
};

type SimplyPluralFrontSession = {
  member: string;
  startTime: string | number | Date;
  endTime?: string | number | Date | null;
  customStatus?: string;
};

type SimplyPluralChannelCategory = {
  _id: string;
  name: string;
  desc?: string;
  channels: string[];
};

type SimplyPluralChannel = { _id: string; name: string; desc?: string };

type SimplyPluralChatMessage = {
  writer: string;
  channel: string;
  message: string;
  writtenAt: string | number | Date;
};

type SimplyPluralBoardMessage = {
  writtenBy: string;
  writtenFor: string;
  read: boolean;
  message: string;
  writtenAt: string | number | Date;
};

type SimplyPluralImportPayload = {
  customFields: SimplyPluralCustomField[];
  users: SimplyPluralUser[];
  notes: unknown[];
  members: SimplyPluralMember[];
  privateFront: unknown;
  comments: unknown[];
  chatMessages: SimplyPluralChatMessage[];
  groups: SimplyPluralGroup[];
  privacyBuckets: SimplyPluralPrivacyBucket[];
  frontHistory: SimplyPluralFrontSession[];
  channelCategories: SimplyPluralChannelCategory[];
  channels: SimplyPluralChannel[];
  boardMessages: SimplyPluralBoardMessage[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

const isSimplyPluralImportPayload = (
  value: unknown,
): value is SimplyPluralImportPayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.customFields) &&
    Array.isArray(value.users) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.members) &&
    Array.isArray(value.comments) &&
    Array.isArray(value.chatMessages) &&
    Array.isArray(value.groups) &&
    Array.isArray(value.privacyBuckets) &&
    Array.isArray(value.frontHistory) &&
    Array.isArray(value.channelCategories) &&
    Array.isArray(value.channels) &&
    Array.isArray(value.boardMessages) &&
    'privateFront' in value
  );
};

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly systemService: SystemService,
    private readonly configService: ConfigService,
  ) {}

  private getMinioUrl(): string {
    return buildMinioUrl({
      MINIO_ENDPOINT: this.configService.get<string>('MINIO_ENDPOINT'),
      MINIO_PORT: this.configService.get<string>('MINIO_PORT'),
      MINIO_USE_SSL: this.configService.get<string>('MINIO_USE_SSL'),
    });
  }

  async importFromSimplyPlural(user: User, data: unknown) {
    const minioUrl = this.getMinioUrl();

    if (!isSimplyPluralImportPayload(data)) {
      throw new BadRequestException();
    }
    const payload = data;
    const requiredKeys = [
      'customFields',
      'users',
      'notes',
      'members',
      'privateFront',
      'comments',
      'chatMessages',
      'groups',
      'privacyBuckets',
      'frontHistory',
    ];

    for (const key of requiredKeys) {
      if (!(key in payload)) {
        throw new BadRequestException({
          code: errorCodes.IMPORT_DATA_MISSING_KEY,
          key: key,
        });
      }
    }

    const spUser = payload.users[0];
    if (!spUser || !spUser.isAsystem) {
      throw new BadRequestException(errorCodes.IMPORT_DATA_INVALID_USER);
    }

    const system = await this.systemService.createSystem(
      {
        customName: spUser.username || 'Simply Plural Import',
        description: spUser.desc,
      },
      user,
    );

    await this.prisma.system.update({
      where: { id: system.id },
      data: {
        avatarUrl: spUser.avatarUrl,
        color: spUser.color,
      },
    });

    const customFieldIdMap: Record<string, string> = {};
    const sourceFieldIds = new Set<string>(
      payload.customFields.map((field) => field._id),
    );
    const sourceFieldIdToAliasesMap: Record<string, string[]> = {};
    const customFieldsToCreate: Array<{
      id: string;
      name: string;
      type: FieldType;
      order: number;
      systemId: string;
      privacy: PrivacyLevel;
    }> = [];

    for (const fieldAlias of Object.keys(spUser.fields)) {
      const sourceFieldId = spUser.fields[fieldAlias]?.name;
      if (!sourceFieldId) continue;

      if (!sourceFieldIdToAliasesMap[sourceFieldId]) {
        sourceFieldIdToAliasesMap[sourceFieldId] = [];
      }
      sourceFieldIdToAliasesMap[sourceFieldId].push(fieldAlias);
    }

    for (const field of payload.customFields) {
      let fieldType: FieldType;
      switch (field.type) {
        case 0:
          fieldType = FieldType.LONG_TEXT;
          break;
        case 1:
          fieldType = FieldType.COLOR;
          break;
        case 2:
        case 6:
          fieldType = FieldType.DATE;
          break;
        default:
          fieldType = FieldType.STRING;
      }

      const [orderInt, rawOrderStr] = field.order.split('|');
      let orderStr = rawOrderStr ?? '';
      orderStr = orderStr.replace(/:/g, '');
      const order =
        parseInt(orderInt) +
        orderStr
          .split('')
          .reduce(
            (acc, char) =>
              acc +
              (char.charCodeAt(0) - 'a'.charCodeAt(0)) /
                Math.pow(26, orderStr.length - orderStr.indexOf(char)),
            0,
          );

      const newFieldId = randomUUID();
      customFieldsToCreate.push({
        id: newFieldId,
        name: field.name,
        type: fieldType,
        order: Math.round(order),
        systemId: system.id,
        privacy: PrivacyLevel.PRIVATE,
      });
      customFieldIdMap[field._id] = newFieldId;
      for (const fieldAlias of sourceFieldIdToAliasesMap[field._id] ?? []) {
        customFieldIdMap[fieldAlias] = newFieldId;
      }
    }

    // Some exports only list field descriptors in `users[0].fields`.
    let fallbackFieldOrder = customFieldsToCreate.length;
    for (const [fieldAlias, fieldConfig] of Object.entries(spUser.fields)) {
      const sourceFieldId = fieldConfig?.name;
      if (!sourceFieldId) continue;
      if (customFieldIdMap[sourceFieldId] || customFieldIdMap[fieldAlias])
        continue;

      const newFieldId = randomUUID();
      const order =
        typeof fieldConfig.order === 'number'
          ? Math.round(fieldConfig.order)
          : fallbackFieldOrder++;

      customFieldsToCreate.push({
        id: newFieldId,
        name: fieldAlias,
        type: FieldType.STRING,
        order,
        systemId: system.id,
        privacy: PrivacyLevel.PRIVATE,
      });

      customFieldIdMap[sourceFieldId] = newFieldId;
      customFieldIdMap[fieldAlias] = newFieldId;
    }

    for (let i = 0; i < customFieldsToCreate.length; i += BATCH_SIZE) {
      await this.prisma.customField.createMany({
        data: customFieldsToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    const privacyBucketMap: Record<string, PrivacyLevel> = {};
    for (const bucket of payload.privacyBuckets) {
      if (bucket.rank.endsWith('a'))
        privacyBucketMap[bucket.id] = PrivacyLevel.PUBLIC;
      else if (bucket.rank.endsWith('z'))
        privacyBucketMap[bucket.id] = PrivacyLevel.FRIENDS;
      else privacyBucketMap[bucket.id] = PrivacyLevel.PRIVATE;
    }

    const memberIdMap: Record<string, string> = {};
    const membersToCreate: Array<{
      id: string;
      name: string;
      description: string | undefined;
      pronouns: string | undefined;
      color: string | undefined;
      privacy: PrivacyLevel;
      avatarUrl: string | undefined;
      systemId: string;
    }> = [];
    const customFieldValuesToCreate: Array<{
      id: string;
      value: string;
      memberId: string;
      customFieldId: string;
    }> = [];

    for (const member of payload.members) {
      const newMemberId = randomUUID();
      memberIdMap[member._id] = newMemberId;

      let avatarUrl: string | undefined = undefined;
      if (member.avatarUuid) {
        avatarUrl = `https://spaces.apparyllis.com/avatars/${member.uid}/${member.avatarUuid}`;
      }

      if (avatarUrl) {
        try {
          const response = await axios.get<ArrayBuffer>(avatarUrl, {
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(new Uint8Array(response.data));
          const metadata = await sharp(buffer).metadata();
          if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
            continue;
          }
          const optimizedBuffer = await sharp(buffer)
            .resize(512, 512, { fit: 'inside' })
            .toFormat('webp', { quality: 80 })
            .toBuffer();
          const fileName = `avatars/systems/${system.id}/members/${newMemberId}/${Date.now()}.webp`;
          await this.storageService.uploadFile(
            MINIO_BUCKET_NAME,
            fileName,
            optimizedBuffer,
            metadata.size,
            'image/webp',
          );
          avatarUrl = `${minioUrl}/${MINIO_BUCKET_NAME}/${fileName}`;
        } catch (error) {
          console.error(
            `Failed to upload avatar for member ${member.name}:`,
            error,
          );
          avatarUrl = undefined;
        }
      }

      membersToCreate.push({
        id: newMemberId,
        name: member.name,
        description: member.desc,
        pronouns: member.pronouns,
        color: member.color,
        privacy:
          member.privacyBucketId && privacyBucketMap[member.privacyBucketId]
            ? privacyBucketMap[member.privacyBucketId]
            : PrivacyLevel.PRIVATE,
        avatarUrl,
        systemId: system.id,
      });

      if (member.info) {
        const valuesByCustomFieldId = new Map<
          string,
          { value: string; sourceFieldId: string }
        >();

        for (const fieldId in member.info) {
          const value = member.info[fieldId];
          const mappedFieldId = customFieldIdMap[fieldId];
          if (value !== undefined && value !== null && mappedFieldId) {
            let normalizedValue: string;
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              typeof value === 'bigint'
            ) {
              normalizedValue = `${value}`;
            } else if (value instanceof Date) {
              normalizedValue = value.toISOString();
            } else if (typeof value === 'object') {
              normalizedValue = JSON.stringify(value);
            } else {
              continue;
            }

            const existing = valuesByCustomFieldId.get(mappedFieldId);
            const currentIsCanonicalId = sourceFieldIds.has(fieldId);
            const existingIsCanonicalId = existing
              ? sourceFieldIds.has(existing.sourceFieldId)
              : false;

            // If aliases and canonical IDs both exist for the same field, keep canonical.
            if (!existing || (currentIsCanonicalId && !existingIsCanonicalId)) {
              valuesByCustomFieldId.set(mappedFieldId, {
                value: normalizedValue,
                sourceFieldId: fieldId,
              });
            }
          }
        }

        for (const [
          customFieldId,
          { value },
        ] of valuesByCustomFieldId.entries()) {
          customFieldValuesToCreate.push({
            id: randomUUID(),
            value,
            memberId: newMemberId,
            customFieldId,
          });
        }
      }
    }

    for (let i = 0; i < membersToCreate.length; i += BATCH_SIZE) {
      await this.prisma.member.createMany({
        data: membersToCreate.slice(i, i + BATCH_SIZE),
      });
    }
    for (let i = 0; i < customFieldValuesToCreate.length; i += BATCH_SIZE) {
      await this.prisma.customFieldValue.createMany({
        data: customFieldValuesToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    const groupIdMap: Record<string, string> = {};
    const groupsToCreate: SimplyPluralGroup[] = [];
    const groupMap: Record<string, SimplyPluralGroup> = {};

    for (const group of payload.groups) {
      groupMap[group._id] = group;
    }

    const visitedGroups = new Set<string>();
    const visitGroup = (groupId: string) => {
      if (visitedGroups.has(groupId)) return;
      const group = groupMap[groupId];
      if (!group) return;

      if (group.parent && group.parent !== 'root') {
        visitGroup(group.parent);
      }
      if (!groupsToCreate.some((g) => g._id === group._id)) {
        groupsToCreate.push(group);
      }
      visitedGroups.add(groupId);
    };

    for (const group of payload.groups) {
      visitGroup(group._id);
    }

    const groupsToInsert: Array<{
      id: string;
      name: string;
      color: string;
      icon: string;
      parentId: string | null;
      systemId: string;
    }> = [];
    const memberOnGroupsToCreate: Array<{ memberId: string; groupId: string }> =
      [];

    for (const group of groupsToCreate) {
      groupIdMap[group._id] = randomUUID();
    }

    for (const group of groupsToCreate) {
      const parentId =
        group.parent && group.parent !== 'root' ? group.parent : null;

      groupsToInsert.push({
        id: groupIdMap[group._id],
        name: group.name || 'Group',
        color: group.color || '#000000',
        icon: group.emoji || group.icon || 'default-group-icon',
        parentId: parentId ? groupIdMap[parentId] : null,
        systemId: system.id,
      });

      if (group.members && group.members.length > 0) {
        for (const spMemberId of group.members) {
          const mappedMemberId = memberIdMap[spMemberId];
          if (mappedMemberId) {
            memberOnGroupsToCreate.push({
              memberId: mappedMemberId,
              groupId: groupIdMap[group._id],
            });
          }
        }
      }
    }

    for (let i = 0; i < groupsToInsert.length; i += BATCH_SIZE) {
      await this.prisma.group.createMany({
        data: groupsToInsert.slice(i, i + BATCH_SIZE),
      });
    }
    for (let i = 0; i < memberOnGroupsToCreate.length; i += BATCH_SIZE) {
      await this.prisma.memberOnGroups.createMany({
        data: memberOnGroupsToCreate.slice(i, i + BATCH_SIZE),
        skipDuplicates: true,
      });
    }

    const frontSessionsToCreate: Array<{
      id: string;
      memberId: string;
      systemId: string;
      startTime: Date;
      endTime: Date | null;
      notes: string | undefined;
    }> = [];
    for (const session of payload.frontHistory) {
      const mappedMemberId = memberIdMap[session.member];
      if (!mappedMemberId) continue;

      frontSessionsToCreate.push({
        id: randomUUID(),
        memberId: mappedMemberId,
        systemId: system.id,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        notes: session.customStatus,
      });
    }

    for (let i = 0; i < frontSessionsToCreate.length; i += BATCH_SIZE) {
      await this.prisma.frontSession.createMany({
        data: frontSessionsToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    const channelCategoriesToCreate: Array<{
      id: string;
      name: string;
      desc: string | undefined;
      systemId: string;
    }> = [];
    const channelsToCreate: Array<{
      id: string;
      name: string;
      description: string | undefined;
      categoryId: string | null;
      systemId: string;
    }> = [];
    const chatMessagesToCreate: Array<{
      id: string;
      content: string;
      timestamp: Date;
      senderId: string;
      channelId: string;
    }> = [];
    const channelIdMap: Record<string, string> = {};
    const categoryIdMap: Record<string, string> = {};
    const channelCategoryMap: Record<string, string> = {};

    for (const category of payload.channelCategories) {
      const newCategoryId = randomUUID();
      categoryIdMap[category._id] = newCategoryId;
      channelCategoriesToCreate.push({
        id: newCategoryId,
        name: category.name,
        desc: category.desc,
        systemId: system.id,
      });
      for (const channel of category.channels) {
        channelCategoryMap[channel] = category._id;
      }
    }

    for (const channel of payload.channels) {
      const newChannelId = randomUUID();
      channelIdMap[channel._id] = newChannelId;
      channelsToCreate.push({
        id: newChannelId,
        name: channel.name,
        description: channel.desc,
        categoryId: channelCategoryMap[channel._id]
          ? categoryIdMap[channelCategoryMap[channel._id]]
          : null,
        systemId: system.id,
      });
    }

    for (const message of payload.chatMessages) {
      const mappedMemberId = memberIdMap[message.writer];
      const mappedChannelId = channelIdMap[message.channel];
      if (!mappedMemberId || !mappedChannelId) continue;

      chatMessagesToCreate.push({
        id: randomUUID(),
        content: message.message,
        timestamp: new Date(message.writtenAt),
        senderId: mappedMemberId,
        channelId: mappedChannelId,
      });
    }

    for (let i = 0; i < channelCategoriesToCreate.length; i += BATCH_SIZE) {
      await this.prisma.channelCategory.createMany({
        data: channelCategoriesToCreate.slice(i, i + BATCH_SIZE),
      });
    }
    for (let i = 0; i < channelsToCreate.length; i += BATCH_SIZE) {
      await this.prisma.channel.createMany({
        data: channelsToCreate.slice(i, i + BATCH_SIZE),
      });
    }
    for (let i = 0; i < chatMessagesToCreate.length; i += BATCH_SIZE) {
      await this.prisma.chatMessage.createMany({
        data: chatMessagesToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    const boardMessagesToCreate: Array<{
      id: string;
      content: string;
      timestamp: Date;
      fromId: string;
      toId: string;
      read: boolean;
    }> = [];
    for (const message of payload.boardMessages) {
      const mappedSenderId = memberIdMap[message.writtenBy];
      const mappedReceiverId = memberIdMap[message.writtenFor];
      const hasBeenRead = message.read;
      const createdAt = new Date(message.writtenAt);
      if (!mappedSenderId || !mappedReceiverId) continue;
      boardMessagesToCreate.push({
        id: randomUUID(),
        content: message.message,
        timestamp: createdAt,
        fromId: mappedSenderId,
        toId: mappedReceiverId,
        read: hasBeenRead,
      });
    }

    for (let i = 0; i < boardMessagesToCreate.length; i += BATCH_SIZE) {
      await this.prisma.boardMessage.createMany({
        data: boardMessagesToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    return this.systemService.getSystemById(system.id);
  }
}
