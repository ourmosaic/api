import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { UploadedObjectInfo } from 'node_modules/minio/dist/esm/internal/type.mjs';
import sharp from 'sharp';

@Injectable()
export class StorageService {
    private minioClient: Minio.Client;

    constructor(private readonly configService: ConfigService) {
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
            port: this.configService.get<number>('MINIO_PORT')!,
            useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!,
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!
        })
    }

    async uploadFile(bucket: string, fileName: string, file: Buffer, size?: number, contentType?: string) : Promise<UploadedObjectInfo> {
        return this.minioClient.putObject(bucket, fileName, file, size, {
            'Content-Type': contentType
        });
    }
}
