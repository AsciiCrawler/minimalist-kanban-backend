import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Request,
    Res,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthDto } from 'src/auth/payload.dto';
import { JWTDto, UserLoginDto, UserModelDto, UserCreateDto } from './user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }
    @HttpCode(HttpStatus.CREATED)
    @Post('/create')
    async create(@Body() userCreateDto: UserCreateDto): Promise<void> {
        return await this.userService.create(userCreateDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body() userLoginDto: UserLoginDto
    ): Promise<{ token: string }> {
        const loginData: JWTDto = await this.userService.login(userLoginDto);
        return { token: loginData.token };
    }

    /* @HttpCode(HttpStatus.OK)
    @Post('/logout')
    async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
        res.clearCookie('auth_token', {
            domain: ".cloudfront.net",
            httpOnly: true,
            secure: false,
            sameSite: 'none',
            expires: new Date(Date.now() + 1 * 24 * 60 * 10000000),
        }).sendStatus(HttpStatus.OK);
    } */

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/profile')
    async profile(@Request() req: { user: AuthDto }): Promise<UserModelDto> {
        const jwtData: AuthDto = req.user;
        return await this.userService.profile(jwtData.userId);
    }

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('/is-user-logged-in')
    isUserAuth(): number {
        return 200;
    }

    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-cache')
    @Get('/is-username-available/:username')
    async isUsernameAvailable(
        @Param('username') username: string,
    ): Promise<{ isAvailable: boolean }> {
        const value = await this.userService.isUsernameAvailable(username);
        return value;
    }
}
