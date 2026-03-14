import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemService } from '../system.service';
import type { User, Member, System } from '@prisma/client';
import { CreateMemberDto } from './dto/createMember.dto';
import { UpdateMemberDto } from './dto/updateMember.dto';
import errorCodes from 'src/utils/errorCodes';
import { FieldType } from '../dto/updateCustomFieldDefinition.dto';
import { UpdateFieldContentDto } from './dto/updateFieldContent.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class MembersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly systemService: SystemService
    ) {}

    async createMember(system: System, dto: CreateMemberDto) : Promise<Member> {
        return await this.prisma.member.create({
            data: {
                name: dto.name,
                description: dto.description,
                pronouns: dto.pronouns,
                role: dto.role,
                systemId: system.id,
                privacy: dto.privacy
            }
        });
    }

    async updateMember(memberId: string, system: System, dto: UpdateMemberDto) : Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: {
                id: memberId
            }
        });

        if (!member || member.systemId !== system.id) {
            throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
        }

        return await this.prisma.member.update({
            where: {
                id: memberId
            },
            data: {
                name: dto.name,
                description: dto.description,
                pronouns: dto.pronouns,
                role: dto.role,
                privacy: dto.privacy
            }
        });
    }

    async getMembersFor(system: System, includeCustomFields: boolean = false) : Promise<Member[]> {
        return await this.prisma.member.findMany({
            where: {
                systemId: system.id
            },
            include: includeCustomFields ? {
                customFieldValues: {
                    select: {
                        value: true,
                        customFieldId: true,
                        customField: {
                            select: {
                                name: true,
                                type: true,
                                privacy: true
                            }
                        }
                    }
                }
            } : undefined
        });
    }

    async getMemberById(id: string, system: System, includeCustomFields: boolean = false) : Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: {
                id,
                systemId: system.id
            },
            include: includeCustomFields ? {
                customFieldValues: {
                    select: {
                        value: true,
                        customFieldId: true,
                        customField: {
                            select: {
                                name: true,
                                type: true,
                                privacy: true
                            }
                        }
                    }
                }
            } : undefined
        });

        if (!member) {
            throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
        }

        return member;
    }

    private castStringToType(value: string, type: FieldType) : string | number | Date {
        switch (type) {
            case FieldType.STRING:
                return value;
            case FieldType.NUMBER:
                const numberValue = Number(value);
                if (isNaN(numberValue)) {
                    throw new BadRequestException(errorCodes.INVALID_FIELD_VALUE_FOR_TYPE);
                }
                return numberValue;
            case FieldType.LONG_TEXT:
                return value;
            case FieldType.COLOR:
                // Basic validation for hex color code
                if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                    throw new BadRequestException(errorCodes.INVALID_FIELD_VALUE_FOR_TYPE);
                }
                return value;
            default:
                throw new BadRequestException(errorCodes.UNKNOWN_FIELD_TYPE);
        }
    }

    async updateMemberField(memberId: string, system: System, fieldId: string, dto: UpdateFieldContentDto) : Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: {
                id: memberId
            }
        });

        if (!member || member.systemId !== system.id) {
            throw new NotFoundException(errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM);
        }
        
        const customField = await this.systemService.getCustomFieldById(fieldId, system);
        if (!customField) {
            throw new NotFoundException(errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM);
        }

        const castedValue = this.castStringToType(dto.value, customField.type as FieldType);

        const existingFieldValue = await this.prisma.customFieldValue.findFirst({
            where: {
                AND: [
                    {memberId},
                    {customFieldId: fieldId}
                ]
            }
        });
        if (existingFieldValue) {
            await this.prisma.customFieldValue.update({
                where: {
                    id: existingFieldValue.id
                },
                data: {
                    value: String(castedValue)
                }
            });
        } else {
            await this.prisma.customFieldValue.create({
                data: {
                    memberId,
                    customFieldId: fieldId,
                    value: String(castedValue)
                }
            });
        }

        return await this.getMemberById(memberId, system, true);
    }
}