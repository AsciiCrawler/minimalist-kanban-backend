import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
    BoardAddUserRequestDto,
    BoardCreateRequestDto,
    RemoveUserDto,
    BoardModelDto,
    BoardPendingRoleDto,
    BoardIdDto,
} from './board.dto';
import {
    Db,
    InsertOneResult,
    Document,
    ObjectId,
    WithId,
    MongoClient,
    UpdateResult,
} from 'mongodb';
import { UserService } from 'src/user/user.service';
import { CardModelDto } from 'src/card/card.dto';
import { UserModelDto } from 'src/user/user.dto';
import { BOARD_ROLE_PENDING, BOARD_ROLE_USER, CACHE_MANAGER_BOARD_GET_BY_ID } from 'src/const';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class BoardService {
    constructor(
        @Inject('DATABASE_CONNECTION')
        private conn: { db: Db; client: MongoClient },
        private userService: UserService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    /**
     * INTERNAL
     */
    async getById(boardId: ObjectId): Promise<BoardModelDto> {
        const CACHE_KEY = CACHE_MANAGER_BOARD_GET_BY_ID + boardId.toHexString();
        let data = await this.cacheManager.get<BoardModelDto>(CACHE_KEY);
        if (data == null) {
            data = await this.conn.db.collection<BoardModelDto>('board').findOne({ _id: boardId }).then((data) => {
                if (data == null)
                    throw new HttpException('Board not found', HttpStatus.NOT_FOUND);
                return data;
            }).catch((error) => {
                throw error;
            });

            if (process.env.CACHE == 'on')
                await this.cacheManager.set(CACHE_KEY, data, 0);
        }

        return data;
    }

    /**
     * INTERNAL
     */
    async isUserBoardAuthorized(boardId: ObjectId, userId: ObjectId): Promise<void> {
        const board = await this.getById(boardId);
        if (board.users.some(user => user._id.toHexString() === userId.toHexString() && user.role === BOARD_ROLE_PENDING))
            throw new HttpException(HttpStatus.UNAUTHORIZED.toString(), HttpStatus.UNAUTHORIZED);
    }

    /**
     * API ENDPOINT
     */
    async create(body: BoardCreateRequestDto, userId: ObjectId): Promise<BoardIdDto> {
        const user = await this.userService.getById(userId, true);
        const boardModelDto: BoardModelDto = new BoardModelDto({ creator: user, title: body.title });
        return await this.conn.db.collection<BoardModelDto>('board').insertOne(boardModelDto).then(async (ior: InsertOneResult<Document>) => {
            return { boardId: ior.insertedId };
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async addUser(
        body: BoardAddUserRequestDto,
        userId: ObjectId,
    ): Promise<void> {
        const userData: UserModelDto & Partial<{ role: string }> = await this.userService.getByUsername(body.userName, true);
        const board = await this.getById(body.boardId);
        if (board.creator._id.toHexString() !== userId.toHexString() || board.users.some(u => u._id.toHexString() === userData._id.toHexString()))
            throw new HttpException(HttpStatus.CONFLICT.toString(), HttpStatus.CONFLICT);

        userData.role = BOARD_ROLE_PENDING;
        await this.conn.db.collection<BoardModelDto>('board').updateOne({ _id: board._id }, { $push: { users: userData } });
        await this.cacheManager.del(CACHE_MANAGER_BOARD_GET_BY_ID + board._id.toHexString());
    }

    /**
     * API ENDPOINT
     */
    async removeUser(
        body: RemoveUserDto,
        userId: ObjectId,
    ): Promise<void> {
        const board = await this.getById(body.boardId);
        if (!board.users.some(u => u._id.toHexString() === userId.toHexString()))
            throw new HttpException('Board doesnt exists', HttpStatus.NOT_FOUND);

        if ((userId.toHexString() === board.creator._id.toHexString() && body.userId.toHexString() !== userId.toHexString()) || (body.userId.toHexString() !== board.creator._id.toHexString() && body.userId.toHexString() === userId.toHexString())) {
            await this.conn.db.collection<BoardModelDto>('board').updateOne(
                { _id: board._id },
                {
                    $pull: {
                        users: {
                            _id: body.userId,
                        },
                    },
                },
            );
            await this.cacheManager.del(CACHE_MANAGER_BOARD_GET_BY_ID + board._id.toHexString());
        }
        else throw new HttpException(HttpStatus.UNAUTHORIZED.toString(), HttpStatus.UNAUTHORIZED);
    }

    /**
     * API ENDPOINT
     */
    async changePendingRoleToUser(
        body: BoardIdDto,
        userId: ObjectId,
    ): Promise<UpdateResult<BoardModelDto>> {
        const board = await this.getById(body.boardId);
        if (!board.users.some(u => u._id.toHexString() === userId.toHexString() && u.role === BOARD_ROLE_PENDING))
            throw new HttpException(HttpStatus.NOT_FOUND.toString(), HttpStatus.NOT_FOUND);

        return await this.conn.db.collection<BoardModelDto>('board').updateOne({ _id: board._id, 'users._id': userId }, {
            $set: {
                'users.$.role': BOARD_ROLE_USER,
            }
        }).then(async (updateResult: UpdateResult<BoardModelDto>) => {
            await this.cacheManager.del(CACHE_MANAGER_BOARD_GET_BY_ID + board._id.toHexString());
            return updateResult;
        }).catch(error => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async getAll(userId: ObjectId): Promise<Array<BoardModelDto>> {
        return await this.conn.db.collection<BoardModelDto>('board').find({
            'users._id': userId,
        }).toArray().then((result) => {
            return result.filter((board: BoardModelDto) => {
                const user: UserModelDto & Partial<{ role: string }> = board.users.filter(u => u._id.toHexString() == userId.toHexString())[0];
                if (user.role == null || user.role == BOARD_ROLE_PENDING) return false;
                return true;
            });
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     * CACHE GET => SET
     */
    async getAllPendingRole(userId: ObjectId): Promise<Array<BoardPendingRoleDto>> {
        return await this.conn.db.collection<BoardModelDto>('board').find({
            'users._id': userId,
        }).toArray().then((result: WithId<BoardModelDto>[]) => {
            return result.reduce((arr: Array<BoardPendingRoleDto>, el) => {
                const user: UserModelDto & Partial<{ role: string }> = el.users.filter(u => u._id.toHexString() == userId.toHexString())[0];

                if (user.role !== BOARD_ROLE_PENDING)
                    return arr;

                let data = new BoardPendingRoleDto();
                data._id = el._id;
                data.creator = el.creator;
                data.title = el.title;
                data.user = user;
                arr.push(data);

                return arr;
            }, [] as Array<BoardPendingRoleDto>);
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async delete(userId: ObjectId, boardId: ObjectId): Promise<void> {
        const board = await this.getById(boardId);
        if (board.creator._id.toHexString() !== userId.toHexString())
            throw new HttpException('Board not found', HttpStatus.NOT_FOUND);

        const session = this.conn.client.startSession();
        try {
            await session.withTransaction(async () => {
                await this.conn.db.collection('board').deleteOne({ _id: boardId }, { session });
                await this.conn.db.collection<CardModelDto>('card').deleteMany({ boardId: boardId }, { session });
            }).then(async () => {
                await this.cacheManager.del(CACHE_MANAGER_BOARD_GET_BY_ID + boardId);
                return;
            });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }
}
