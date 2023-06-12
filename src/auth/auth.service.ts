import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    sign(userId: string): string {
        const payload = { userId: userId };
        return this.jwtService.sign(payload);
    }
}
