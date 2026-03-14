import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSystemDto } from './dto/createSystem.dto';
import { CustomField, System, User } from '@prisma/client';
import errorCodes from 'src/utils/errorCodes';
import { UpdateCustomFieldDefinitionDto } from './dto/updateCustomFieldDefinition.dto';

@Injectable()
export class SystemService {
    constructor(
        private readonly prismaService: PrismaService
    ) {}

    async createSystem(createSystemDto: CreateSystemDto, user: User) {
        await this.prismaService.user.update({
            where: {
                id: user.id
            },
            data: {
                isSystem: true
            }
        });
        return await this.prismaService.system.create({
            data: {
                customName: createSystemDto.customName || user.username,
                description: createSystemDto.description,
                userId: user.id
            }
        });
    }

    async getSystemByUser(user: User) {
        const system = await this.prismaService.system.findFirst({
            where: {
                userId: user.id
            }
        });

        if (!system) {
            throw new NotFoundException(errorCodes.USER_HAS_NO_SYSTEM);
        }

        return system;
    }

    async getSystemById(id: string) {
        const system = await this.prismaService.system.findUnique({
            where: {
                id
            }
        });
        
        if (!system) {
            throw new NotFoundException(errorCodes.SYSTEM_NOT_FOUND);
        }

        return system;
    }

    async deleteSystemForUser(user: User) {
        await this.prismaService.system.deleteMany({
            where: {
                userId: user.id
            }
        });

        await this.prismaService.user.update({
            where: {
                id: user.id
            },
            data: {
                isSystem: false
            }
        });
    }

    async createCustomFieldForSystem(system: System, dto?: UpdateCustomFieldDefinitionDto) : Promise<CustomField> {
        return await this.prismaService.customField.create({
            data: {
                systemId: system.id,
                name: dto?.name ? dto.name : "",
                type: dto?.type,
                order: dto?.order,
                privacy: dto?.privacy
            }
        })
    }

    async updateCustomField(system: System, customFieldId: string, updateCustomFieldDto: UpdateCustomFieldDefinitionDto) {
        const customField = await this.prismaService.customField.findUnique({
            where: {
                id: customFieldId
            }
        });

        if (!customField || customField.systemId !== system.id) {
            throw new NotFoundException(errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM);
        }

        return await this.prismaService.customField.update({
            where: {
                id: customFieldId
            },
            data: {
                name: updateCustomFieldDto.name,
                type: updateCustomFieldDto.type,
                order: updateCustomFieldDto.order,
                privacy: updateCustomFieldDto.privacy
            }
        });
    }

    async getCustomFieldById(customFieldId: string, system: System) : Promise<CustomField> {
        const customField = await this.prismaService.customField.findUnique({
            where: {
                id: customFieldId
            }
        });

        if (!customField || customField.systemId !== system.id) {
            throw new NotFoundException(errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM);
        }

        return customField;
    }

    async deleteCustomField(system: System, customFieldId: string) {
        const customField = await this.prismaService.customField.findUnique({
            where: {
                id: customFieldId
            }
        });

        if (!customField || customField.systemId !== system.id) {
            throw new NotFoundException(errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM);
        }

        await this.prismaService.customField.delete({
            where: {
                id: customFieldId
            }
        });
    }
}
