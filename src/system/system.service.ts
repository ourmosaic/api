import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSystemDto } from './dto/createSystem.dto';
import { User } from '@prisma/client';
import errorCodes from 'src/utils/errorCodes';

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
}
