import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import {
    CaptchaCodeDto,
    captchaUUIDDto as RenewCaptchaParamDto,
} from './captcha.dto';

@Controller('captcha')
export class CaptchaController {
    constructor(private readonly captchaService: CaptchaService) {}

    @HttpCode(HttpStatus.OK)
    @Post('/generate-captcha')
    async generateCaptcha(): Promise<{ url: string; uuid: string }> {
        return await this.captchaService.generateCaptcha();
    }

    @HttpCode(HttpStatus.OK)
    @Post('/validate-captcha/:uuid')
    async validateCaptcha(
        @Param() params: RenewCaptchaParamDto,
        @Body() captchaValidateDto: CaptchaCodeDto,
    ): Promise<{ code: number }> {
        return await this.captchaService.validate(
            params.uuid,
            captchaValidateDto.code,
        );
    }

    @HttpCode(HttpStatus.OK)
    @Post('/renew-captcha/:uuid')
    async renewCaptcha(
        @Param() params: RenewCaptchaParamDto,
    ): Promise<{ url: string }> {
        return await this.captchaService.renewCaptcha(params.uuid);
    }
}
