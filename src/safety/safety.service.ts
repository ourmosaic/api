import { Injectable } from '@nestjs/common';
import { ReportType, User } from '@prisma/client';
import { ReportDto } from './dto/report.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async report(user: User, reportDto: ReportDto) {
    switch (reportDto.type) {
      case ReportType.USER: {
        const user = await this.prisma.user.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!user) {
          throw new Error('User not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.USER,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportUser.create({
          data: {
            reportId: defaultReport.id,
            userId: reportDto.targetId,
          },
        });
      }

      case ReportType.MEMBER: {
        const member = await this.prisma.member.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!member) {
          throw new Error('Member not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.MEMBER,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportMember.create({
          data: {
            reportId: defaultReport.id,
            memberId: reportDto.targetId,
          },
        });
      }

      case ReportType.SYSTEM: {
        const system = await this.prisma.system.findUnique({
          where: {
            id: reportDto.targetId,
          },
        });
        if (!system) {
          throw new Error('System not found');
        }
        const defaultReport = await this.prisma.report.create({
          data: {
            type: ReportType.SYSTEM,
            description: reportDto.reason,
            reporterId: user.id,
          },
        });
        return this.prisma.reportSystem.create({
          data: {
            reportId: defaultReport.id,
            systemId: reportDto.targetId,
          },
        });
      }

      default:
        throw new Error('Invalid report type');
    }
  }
}
