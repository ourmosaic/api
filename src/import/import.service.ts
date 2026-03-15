import { BadRequestException, Injectable } from '@nestjs/common';
import { PrivacyLevel, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FieldType } from 'src/system/dto/updateCustomFieldDefinition.dto';
import { GroupsService } from 'src/system/groups/groups.service';
import { MembersService } from 'src/system/members/members.service';
import { SystemService } from 'src/system/system.service';
import { randomUUID } from 'crypto';
import errorCodes from 'src/utils/errorCodes';

@Injectable()
export class ImportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly membersService: MembersService,
        private readonly systemService: SystemService,
        private readonly groupsService: GroupsService
    ) {}

    async importFromSimplyPlural(user: User, data: any) {
        const requiredKeys = [
            'customFields', 'users', 'notes', 'members', 'privateFront', 
            'comments', 'chatMessages', 'groups', 'privacyBuckets', 'frontHistory'
        ];
        
        for (const key of requiredKeys) {
            if (!data[key]) {
                throw new BadRequestException({ code: errorCodes.IMPORT_DATA_MISSING_KEY, key: key });
            }
        }

        const spUser = data.users[0];
        if (!spUser || !spUser.isAsystem) {
            throw new BadRequestException(errorCodes.IMPORT_DATA_INVALID_USER);
        }

        const system = await this.systemService.createSystem({
            customName: spUser.username || 'Simply Plural Import',
            description: spUser.desc
        }, user);
        
        await this.prisma.system.update({
            where: { id: system.id },
            data: {
                avatarUrl: spUser.avatarUrl,
                color: spUser.color
            }
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
            switch(field.type) {
                case 0: fieldType = FieldType.LONG_TEXT; break;
                case 1: fieldType = FieldType.COLOR; break;
                case 2:
                case 6: fieldType = FieldType.DATE; break;
                default: fieldType = FieldType.STRING;
            }

            let [orderInt, orderStr] = field.order.split('|');
            orderStr = orderStr.replace(/:/g, '');
            const order = parseInt(orderInt) + orderStr.split('').reduce(
                (acc, char) => acc + (char.charCodeAt(0) - 'a'.charCodeAt(0)) / Math.pow(26, orderStr.length - orderStr.indexOf(char)), 
                0
            );
            
            const newFieldId = randomUUID();
            customFieldsToCreate.push({
                id: newFieldId,
                name: field.name,
                type: fieldType,
                order: Math.round(order),
                systemId: system.id,
                privacy: PrivacyLevel.PRIVATE
            });
            customFieldIdMap[fieldIdToNameMap[field._id]] = newFieldId;
        }

        if (customFieldsToCreate.length > 0) {
            await this.prisma.customField.createMany({ data: customFieldsToCreate });
        }

        const privacyBucketMap: Record<string, PrivacyLevel> = {};
        for (const bucket of data.privacyBuckets) {
            if (bucket.rank.endsWith("a")) privacyBucketMap[bucket.id] = PrivacyLevel.PUBLIC;
            else if (bucket.rank.endsWith("z")) privacyBucketMap[bucket.id] = PrivacyLevel.FRIENDS;
            else privacyBucketMap[bucket.id] = PrivacyLevel.PRIVATE;
        }
        
        const memberIdMap: Record<string, string> = {};
        const membersToCreate: any[] = [];
        const customFieldValuesToCreate: any[] = [];

        for (const member of data.members) {
            const newMemberId = randomUUID();
            memberIdMap[member._id] = newMemberId;

            let avatarUrl : string | undefined = undefined;
            if (member.avatarUuid) {
                avatarUrl = `https://spaces.apparyllis.com/avatars/${member.uid}/${member.avatarUuid}`;
            }

            membersToCreate.push({
                id: newMemberId,
                name: member.name,
                description: member.desc,
                pronouns: member.pronouns,
                privacy: (privacyBucketMap[member.privacyBucketId] || PrivacyLevel.PRIVATE) as any,
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
                            customFieldId: mappedFieldId
                        });
                    }
                }
            }
        }

        if (membersToCreate.length > 0) {
            await this.prisma.member.createMany({ data: membersToCreate });
        }
        if (customFieldValuesToCreate.length > 0) {
            await this.prisma.customFieldValue.createMany({ data: customFieldValuesToCreate });
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
            if (!groupsToCreate.some(g => g._id === group._id)) {
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
            const parentId = group.parent && group.parent !== 'root' ? group.parent : null;
            
            groupsToInsert.push({
                id: groupIdMap[group._id],
                name: group.name || 'Group',
                color: group.color || '#000000',
                icon: group.emoji || group.icon || 'default-group-icon',
                parentId: parentId ? groupIdMap[parentId] : null,
                systemId: system.id
            });

            if (group.members && group.members.length > 0) {
                for (const spMemberId of group.members) {
                    const mappedMemberId = memberIdMap[spMemberId];
                    if (mappedMemberId) {
                        memberOnGroupsToCreate.push({
                            memberId: mappedMemberId,
                            groupId: groupIdMap[group._id]
                        });
                    }
                }
            }
        }

        if (groupsToInsert.length > 0) {
            await this.prisma.group.createMany({ data: groupsToInsert });
        }
        if (memberOnGroupsToCreate.length > 0) {
            await this.prisma.memberOnGroups.createMany({ 
                data: memberOnGroupsToCreate, 
                skipDuplicates: true 
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
                notes: session.customStatus
            });
        }

        if (frontSessionsToCreate.length > 0) {
            await this.prisma.frontSession.createMany({ data: frontSessionsToCreate });
        }

        return this.systemService.getSystemById(system.id);
    }
}

