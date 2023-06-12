import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    Injectable,
    PipeTransform,
    ArgumentMetadata,
    ParseFilePipeBuilder,
    HttpStatus,
    HttpException,
    FileTypeValidator,
    MaxFileSizeValidator,
    HttpCode,
    Res,
    Next,
    Req,
    UseGuards,
    Request as NestRequest,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest, Response } from 'express';
import { join } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthDto } from 'src/auth/payload.dto';
import { GetSignedUrlDto, UUIDDto } from './file.dto';

@Controller('file')
export class FileController {
    constructor(private readonly fileService: FileService) { }
    @Post("/get-signed-url")
    @UseGuards(JwtAuthGuard)
    async getSignedUrl(
        @Req() req: { user: AuthDto },
        @Body() body: GetSignedUrlDto): Promise<{ signedUrl: string, fileUUID: string }> {
        return await this.fileService.getSignedUrl(body, req.user.userId);
    }

    @Post("/process-file")
    @UseGuards(JwtAuthGuard)
    async processFile(
        @Req() req: { user: AuthDto },
        @Body() body: UUIDDto): Promise<{ url: string }> {
        return await this.fileService.processFile(body, req.user.userId);
    }
}
