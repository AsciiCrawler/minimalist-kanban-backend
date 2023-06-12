import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SafeMongoIdTransform } from 'src/custom-validators/safeMongoIdTransform';
import { Request, Response } from 'express';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                JwtStrategy.extractJWTFromCookie,
            ]),
            ignoreExpiration: true,
            secretOrKey: process.env.JWT_SECRET_KEY,
        });
    }

    private static extractJWTFromCookie(req: Request): string | null {
        if (req.cookies && req.cookies.auth_token) {
            return req.cookies.auth_token;
        }
        return null;
    }

    async validate(payload: { userId: string }) {
        try {
            return { userId: SafeMongoIdTransform(payload.userId) };
        } catch (error) {}

        return '';
    }
}
