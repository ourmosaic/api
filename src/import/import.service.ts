import { BadRequestException, Injectable } from '@nestjs/common';
import { PrivacyLevel, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FieldType } from 'src/system/dto/updateCustomFieldDefinition.dto';
import { GroupsService } from 'src/system/groups/groups.service';
import { MembersService } from 'src/system/members/members.service';
import { SystemService } from 'src/system/system.service';
import { randomUUID } from 'crypto';
import errorCodes from 'src/utils/errorCodes';
import axios from 'axios';
import sharp from 'sharp';
import { StorageService } from 'src/storage/storage.service';
import { MINIO_BUCKET_NAME, MINIO_URL } from 'src/utils/constants';

const BATCH_SIZE = 1000;

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly systemService: SystemService,
    private readonly groupsService: GroupsService,
  ) {}

  async importFromSimplyPlural(user: User, data: any) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException();
    }
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
      if (!data[key]) {
        throw new BadRequestException({
          code: errorCodes.IMPORT_DATA_MISSING_KEY,
          key: key,
        });
      }
    }

    const spUser = data.users[0];
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
    const fieldIdToNameMap: Record<string, string> = {};
    const customFieldsToCreate: any[] = [];

    for (const fieldName of Object.keys(spUser.fields)) {
      const fieldId = spUser.fields[fieldName].name;
      fieldIdToNameMap[fieldId] = fieldName;
    }

    for (const field of data.customFields) {
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

      let [orderInt, orderStr] = field.order.split('|');
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
      customFieldIdMap[fieldIdToNameMap[field._id]] = newFieldId;
    }

    for (let i = 0; i < customFieldsToCreate.length; i += BATCH_SIZE) {
      await this.prisma.customField.createMany({
        data: customFieldsToCreate.slice(i, i + BATCH_SIZE),
      });
    }

    const privacyBucketMap: Record<string, PrivacyLevel> = {};
    for (const bucket of data.privacyBuckets) {
      if (bucket.rank.endsWith('a'))
        privacyBucketMap[bucket.id] = PrivacyLevel.PUBLIC;
      else if (bucket.rank.endsWith('z'))
        privacyBucketMap[bucket.id] = PrivacyLevel.FRIENDS;
      else privacyBucketMap[bucket.id] = PrivacyLevel.PRIVATE;
    }

    const memberIdMap: Record<string, string> = {};
    const membersToCreate: any[] = [];
    const customFieldValuesToCreate: any[] = [];

    for (const member of data.members) {
      const newMemberId = randomUUID();
      memberIdMap[member._id] = newMemberId;

      let avatarUrl: string | undefined = undefined;
      if (member.avatarUuid) {
        avatarUrl = `https://spaces.apparyllis.com/avatars/${member.uid}/${member.avatarUuid}`;
      }

      if (avatarUrl) {
        try {
          const response = await axios.get(avatarUrl, {
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(response.data, 'binary');
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
          avatarUrl = `${MINIO_URL}/${MINIO_BUCKET_NAME}/${fileName}`;
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
        privacy: (privacyBucketMap[member.privacyBucketId] ||
          PrivacyLevel.PRIVATE) as any,
        avatarUrl,
        systemId: system.id,
      });

      if (member.info) {
        for (const fieldId in member.info) {
          const value = member.info[fieldId];
          const mappedFieldId = customFieldIdMap[fieldId];
          if (value && mappedFieldId) {
            customFieldValuesToCreate.push({
              id: randomUUID(),
              value: String(value),
              memberId: newMemberId,
              customFieldId: mappedFieldId,
            });
          }
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
    const groupsToCreate: any[] = [];
    const groupMap: Record<string, any> = {};

    for (const group of data.groups) {
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

    for (const group of data.groups) {
      visitGroup(group._id);
    }

    const groupsToInsert: any[] = [];
    const memberOnGroupsToCreate: any[] = [];

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

    const frontSessionsToCreate: any[] = [];
    for (const session of data.frontHistory) {
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

    const channelCategoriesToCreate: any[] = [];
    const channelsToCreate: any[] = [];
    const chatMessagesToCreate: any[] = [];
    const channelIdMap: Record<string, string> = {};
    const categoryIdMap: Record<string, string> = {};
    const channelCategoryMap: Record<string, any> = {};

    for (const category of data.channelCategories) {
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

    for (const channel of data.channels) {
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

    for (const message of data.chatMessages) {
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

    const boardMessagesToCreate: any[] = [];
    for (const message of data.boardMessages) {
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
