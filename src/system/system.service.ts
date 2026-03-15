import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSystemDto } from './dto/createSystem.dto';
import { CustomField, System, User } from '@prisma/client';
import errorCodes from 'src/utils/errorCodes';
import { UpdateCustomFieldDefinitionDto } from './dto/updateCustomFieldDefinition.dto';
import { StorageService } from 'src/storage/storage.service';
import { MINIO_BUCKET_NAME, MINIO_URL } from 'src/utils/constants';
import sharp from 'sharp';
import { UpdateSystemDto } from 'src/@generated/prisma-nestjs-dto/update-system.dto';

@Injectable()
export class SystemService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly storageService: StorageService
    ) {}

    async createSystem(createSystemDto: CreateSystemDto, user: User) {
        // check if user already has a system
        if (user.isSystem) {
            throw new BadRequestException(errorCodes.USER_ALREADY_HAS_SYSTEM);
        }
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

    async updateSystemAvatar(system: System, file: Express.Multer.File): Promise<System> {
       try {
        const metadata = await sharp(file.buffer).metadata();
        if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
            throw new BadRequestException(errorCodes.GIFS_NOT_SUPPORTED);
        }
        const procImage = await sharp(file.buffer)
            .resize({ width: 512, height: 512, fit: sharp.fit.cover })
            .webp({ quality: 80 })
            .toBuffer();

        const fileName = `avatars/systems/${system.id}/${Date.now()}.webp`;
        await this.storageService.uploadFile(MINIO_BUCKET_NAME, fileName, procImage, metadata.size, 'image/webp');

        const avatarUrl = `${MINIO_URL}/${MINIO_BUCKET_NAME}/${fileName}`;

        if (system.avatarUrl) {
            const oldFileName = system.avatarUrl.replace(`${MINIO_URL}/${MINIO_BUCKET_NAME}/`, '');
            await this.storageService.removeFile(MINIO_BUCKET_NAME, oldFileName).catch((err) => {
                console.error('Error deleting old avatar from storage:', err);
            });
        }

        return await this.prismaService.system.update({
            where: {
                id: system.id
            },
            data: {
                avatarUrl
            }
        });
       } catch (err) {
        console.error('Error uploading system avatar:', err);
        throw new BadRequestException(errorCodes.GIFS_NOT_SUPPORTED);
       }
    }

    async updateSystemInfo(system: System, dto: Partial<UpdateSystemDto>) : Promise<System> {
        if (dto.color && !/^#([0-9A-F]{3}){1,2}$/i.test(dto.color)) {
            throw new BadRequestException(errorCodes.INVALID_COLOR);
         }
        return await this.prismaService.system.update({
            where: {
                id: system.id
            },
            data: {
                customName: dto.customName,
                description: dto.description,
                color: dto.color
            }
        });
    } 
}
