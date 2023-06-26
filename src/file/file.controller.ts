import {
    Controller,
    Post,
    Body,
    Req,
    UseGuards
} from '@nestjs/common';
import { FileService } from './file.service';
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
