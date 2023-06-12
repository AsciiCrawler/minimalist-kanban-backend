import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthDto } from 'src/auth/payload.dto';
import {
    BoardAddUserRequestDto,
    BoardCreateRequestDto,
    BoardDeleteRequestDto,
    RemoveUserDto,
    BoardModelDto,
    BoardPendingRoleDto,
    BoardIdDto,
} from './board.dto';
import { BoardService } from './board.service';
import { Response } from 'express';
import { UpdateResult } from 'mongodb';

@Controller('board')
export class BoardController {
    constructor(private readonly boardService: BoardService) {}

    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard)
    @Post('/create')
    async create(
        @Req() req: { user: AuthDto },
        @Body() boardCreateRequestDto: BoardCreateRequestDto,
    ): Promise<BoardIdDto> {
        const authData: AuthDto = req.user;
        return await this.boardService.create(
            boardCreateRequestDto,
            authData.userId,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Delete('/delete/:boardId')
    async delete(
        @Param() params: BoardDeleteRequestDto,
        @Req() req: { user: AuthDto },
    ): Promise<void> {
        const jwtData: AuthDto = req.user;
        return await this.boardService.delete(jwtData.userId, params.boardId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/get-all')
    async getAll(@Req() req: { user: AuthDto }): Promise<Array<BoardModelDto>> {
        const jwtData: AuthDto = req.user;
        return await this.boardService.getAll(jwtData.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/get-all-pending-role')
    async getAllPendingRole(@Req() req: { user: AuthDto }): Promise<Array<BoardPendingRoleDto>> {
        const jwtData: AuthDto = req.user;
        return await this.boardService.getAllPendingRole(jwtData.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('/remove-user')
    async rejectPendingRole(
        @Req() req: { user: AuthDto },
        @Body() body: RemoveUserDto,
    ): Promise<void> {
        const jwtData: AuthDto = req.user;
        return await this.boardService.removeUser(
            body,
            jwtData.userId,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('/change-pending-role-to-user')
    async changePendingRoleToUser(
        @Req() req: { user: AuthDto },
        @Body() body: BoardIdDto,
    ): Promise<UpdateResult<BoardModelDto>> {
        const jwtData: AuthDto = req.user;
        return await this.boardService.changePendingRoleToUser(
            body,
            jwtData.userId,
        );
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Put('/add-user')
    async addUser(
        @Req() req: { user: AuthDto },
        @Body() body: BoardAddUserRequestDto,
    ): Promise<void> {
        const jwtData: AuthDto = req.user;

        console.log({boardAddUserRequestDto: body});

        return await this.boardService.addUser(
            body,
            jwtData.userId,
        );
    }
}
