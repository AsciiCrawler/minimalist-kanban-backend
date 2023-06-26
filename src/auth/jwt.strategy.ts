import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SafeMongoIdTransform } from 'src/custom-validators/safeMongoIdTransform';
import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true,
            secretOrKey: process.env.JWT_SECRET_KEY,
        });
    }

    async validate(payload: { userId: string }) {
        try {
            return { userId: SafeMongoIdTransform(payload.userId) };
        } catch (error) { }

        return '';
    }
}
