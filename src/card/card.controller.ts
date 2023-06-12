import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Post,
    Put,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { BulkWriteResult, DeleteResult, UpdateDescription, UpdateResult } from 'mongodb';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthDto } from 'src/auth/payload.dto';
import {
    AssignUserDto,
    AttachFileDto,
    BatchUpdateIndexAndStateDto,
    CardCreateRequestDto,
    CardDeleteCommentDto,
    CardGetByBoardIdParamDto,
    CardGetByIdParamDto,
    CardModelDto,
    CardUpdateCardParamDto,
    DeleteFileDto,
    PostCommentDto,
    UpdateDescriptionDto,
    UpdateTitleDto,
} from './card.dto';
import { CardService } from './card.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('card')
export class CardController {
    constructor(
        private readonly cardService: CardService
    ) { }

    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard)
    @Post('/create')
    async create(
        @Req() req: { user: AuthDto },
        @Body() body: CardCreateRequestDto,
    ): Promise<CardModelDto> {
        const jwtData: AuthDto = req.user;
        return this.cardService.register(
            jwtData.userId,
            body,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/update-title')
    async updateTitle(
        @Req() auth: { user: AuthDto },
        @Body() body: UpdateTitleDto,
    ): Promise<UpdateResult> {
        return this.cardService.updateTitle(body, auth.user.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/update-description')
    async updateDescription(
        @Req() auth: { user: AuthDto },
        @Body() body: UpdateDescriptionDto,
    ): Promise<UpdateResult> {
        return this.cardService.updateDescription(body, auth.user.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/batch-update-index-and-state')
    async batchUpdateIndexAndState(
        @Req() req: { user: AuthDto },
        @Body() body: BatchUpdateIndexAndStateDto,
    ): Promise<BulkWriteResult> {
        return this.cardService.batchUpdateIndexAndState(
            req.user.userId,
            body,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Delete('/delete/:cardId')
    async delete(
        @Param() params: CardUpdateCardParamDto,
        @Req() req: { user: AuthDto },
    ): Promise<DeleteResult> {
        return this.cardService.delete(params.cardId, req.user.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/attatch-file')
    async attachImage(
        @Req() req: { user: AuthDto },
        @Body() body: AttachFileDto,
    ): Promise<UpdateResult> {
        return this.cardService.attachFile(req.user.userId, body);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/delete-file')
    async deleteImage(
        @Req() req: { user: AuthDto },
        @Body() body: DeleteFileDto,
    ): Promise<UpdateResult> {
        return this.cardService.deleteFile(req.user.userId, body);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/get-by-board-id/:boardId')
    async getByBoardId(
        @Param() params: CardGetByBoardIdParamDto,
        @Req() req: { user: AuthDto },
    ): Promise<Array<CardModelDto>> {
        return await this.cardService.getByBoardIdWithAuth(
            params.boardId,
            req.user.userId,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/get-by-id/:cardId')
    async getById(
        @Param() params: CardGetByIdParamDto,
        @Req() req: { user: AuthDto },
    ): Promise<CardModelDto> {
        return await this.cardService.getByIdWithAuth(
            params.cardId,
            req.user.userId,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/post-comment/:cardId')
    async PostComment(
        @Param() params: CardUpdateCardParamDto,
        @Req() req: { user: AuthDto },
        @Body() body: PostCommentDto,
    ): Promise<UpdateResult> {
        return this.cardService.postComment(
            params.cardId,
            req.user.userId,
            body,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Delete('/delete-comment/:cardId/:commentId')
    async deleteComment(
        @Param() params: CardDeleteCommentDto,
        @Req() req: { user: AuthDto },
    ): Promise<UpdateResult> {
        return this.cardService.deleteComment(req.user.userId, params);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/assign-user')
    async assignUser(
        @Req() auth: { user: AuthDto },
        @Body() body: AssignUserDto,
    ): Promise<UpdateResult> {
        return this.cardService.assignUser(
            body,
            auth.user.userId
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/unassign-user')
    async unassignUser(
        @Req() auth: { user: AuthDto },
        @Body() body: AssignUserDto,
    ): Promise<UpdateResult> {
        return this.cardService.unassignUser(
            body,
            auth.user.userId
        );
    }
}
