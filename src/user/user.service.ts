import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UserLoginDto, UserCreateDto, UserModelDto, JWTDto } from './user.dto';
import { Db, MongoClient, ObjectId, WithId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { CaptchaService } from 'src/captcha/captcha.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER_USER_ID, CACHE_MANAGER_USER_USERNAME } from 'src/const';

@Injectable()
export class UserService {
    constructor(
        @Inject('DATABASE_CONNECTION')
        private conn: { db: Db; client: MongoClient },
        private authService: AuthService,
        private captchaService: CaptchaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    /**
     * INTERNAL
     */
    async getById(
        id: ObjectId,
        deletePasswordField = true,
    ): Promise<UserModelDto> {
        const CACHE_KEY = CACHE_MANAGER_USER_ID + id.toHexString();
        let user = await this.cacheManager.get<UserModelDto>(CACHE_KEY);
        if (user == null) {
            user = await this.conn.db.collection<UserModelDto>('user').findOne({ _id: id }).then((findResult) => {
                if (findResult == null)
                    throw new HttpException(HttpStatus.NOT_FOUND.toString(), HttpStatus.NOT_FOUND);
                return findResult;
            }).catch((error) => { throw error; });

            if (process.env.CACHE == 'on')
                await this.cacheManager.set(CACHE_KEY, user, 0);
        }

        if (deletePasswordField == true)
            delete user.password;

        return user;
    }

    /**
     * INTERNAL
     */
    async getByUsername(
        username: string,
        deletePasswordField = true,
    ): Promise<UserModelDto> {
        username = username.toLowerCase();
        const CACHE_KEY = CACHE_MANAGER_USER_USERNAME + username;
        let user = await this.cacheManager.get<UserModelDto>(CACHE_KEY);
        if (user == null) {
            user = await this.conn.db.collection<UserModelDto>('user').findOne({ lowercaseUsername: username }).then((findResult) => {
                if (findResult == null)
                    throw new HttpException('User not found', HttpStatus.NOT_FOUND);
                return findResult;
            }).catch((error) => { throw error; });

            if (process.env.CACHE == 'on')
                await this.cacheManager.set(CACHE_KEY, user, 0);
        }

        if (deletePasswordField == true)
            delete user.password;

        return user;
    }

    /**
     * API ENDPOINT | INTERNAL
     */
    async isUsernameAvailable(username: string): Promise<{ isAvailable: boolean }> {
        try {
            await this.getByUsername(username);
            return { isAvailable: false }
        } catch (error) {
            return { isAvailable: true };
        }
    }

    /**
     * API ENDPOINT
     */
    async create(body: UserCreateDto): Promise<void> {
        if (body.phone.length > 0)
            throw new HttpException(HttpStatus.TOO_MANY_REQUESTS.toString(), HttpStatus.TOO_MANY_REQUESTS);

        await this.captchaService.isCaptchaSolved(body.uuid);
        await this.isUsernameAvailable(body.username.toLowerCase());
        let user = new UserModelDto({ user: body.username, password: body.password });
        await this.conn.db.collection('user').insertOne(user).then(() => { }).catch(error => { throw error; });
    }

    /**
     * API ENDPOINT
     */
    async login(body: UserLoginDto): Promise<JWTDto> {
        const user = await this.getByUsername(body.username, false);
        if (!user.password)
            throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR.toString(), HttpStatus.INTERNAL_SERVER_ERROR);

        if (await bcrypt.compare(body.password, user.password) == true)
            return { token: this.authService.sign(user._id.toHexString()) };

        throw new HttpException(HttpStatus.NOT_FOUND.toString(), HttpStatus.NOT_FOUND);
    }

    /**
     * API ENDPOINT
     */
    async profile(userId: ObjectId): Promise<UserModelDto> {
        return await this.getById(userId);
    }
}
