import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
    BulkWriteResult,
    Db,
    DeleteResult,
    InsertOneResult,
    MongoClient,
    ObjectId,
    UnorderedBulkOperation,
    UpdateResult,
} from 'mongodb';
import { BoardService } from 'src/board/board.service';
import { SafeMongoIdTransform } from 'src/custom-validators/safeMongoIdTransform';
import { UserModelDto } from 'src/user/user.dto';
import { UserService } from 'src/user/user.service';
import {
    AssignUserDto,
    AttachFileDto,
    BatchUpdateIndexAndStateDto,
    CardCreateRequestDto,
    CardDeleteCommentDto,
    CardModelAttachment,
    CardModelCommentDto,
    CardModelDto,
    DeleteFileDto,
    PostCommentDto,
    UpdateDescriptionDto,
    UpdateTitleDto,
} from './card.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER_CARD_GET_BY_BOARD_ID } from 'src/const';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';

@Injectable()
export class CardService {
    constructor(
        @Inject('DATABASE_CONNECTION')
        private conn: { db: Db; client: MongoClient },
        private userService: UserService,
        private boardService: BoardService,
        private websocketGateway: WebsocketGateway,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    /**
     * INTERNAL
     */
    async getById(cardId: ObjectId): Promise<CardModelDto> {
        return await this.conn.db.collection<CardModelDto>('card').findOne({ _id: cardId }).then((data) => {
            if (data == null)
                throw new HttpException('Card not found', HttpStatus.NOT_FOUND);

            return data;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * INTERNAL
     */
    async getByBoardId(
        boardId: ObjectId
    ): Promise<Array<CardModelDto>> {
        const CACHE_KEY = CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString();
        let cards = await this.cacheManager.get<Array<CardModelDto>>(CACHE_KEY);
        if (cards == null) {
            cards = await this.conn.db.collection<CardModelDto>('card').find({
                boardId: boardId,
            }).toArray().then((findResult: Array<CardModelDto>) => {
                return findResult;
            }).catch((error) => {
                throw error;
            });

            if (process.env.CACHE == 'on')
                await this.cacheManager.set(CACHE_KEY, cards, 0);
        }

        return cards;
    }

    /**
     * API ENDPOINT
     */
    async getByIdWithAuth(cardId: ObjectId, userId: ObjectId): Promise<CardModelDto> {
        const card = await this.getById(cardId);
        await this.boardService.isUserBoardAuthorized(card.boardId, userId);
        return card;
    }

    /**
     * API ENDPOINT
     */
    async register(
        userId: ObjectId,
        body: CardCreateRequestDto
    ): Promise<CardModelDto> {
        const user = await this.userService.getById(userId, true);
        const cardModelDto: CardModelDto = new CardModelDto({
            boardId: body.boardId,
            description: body.description,
            title: body.title,
            state: body.state,
            user: user
        });

        const sortedCardsByIndex = await this.conn.db.collection<CardModelDto>('card').find({ boardId: body.boardId, state: body.state }).sort({ index: -1 }).limit(1).toArray();
        if (sortedCardsByIndex.length > 0)
            cardModelDto.index = sortedCardsByIndex[0].index + 1;

        await this.boardService.isUserBoardAuthorized(body.boardId, userId);
        return await this.conn.db.collection<CardModelDto>('card').insertOne(cardModelDto).then(async (ior: InsertOneResult<CardModelDto>) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + body.boardId.toHexString());
            this.websocketGateway.emitUpdateCards(body.boardId.toHexString(), userId.toHexString());
            return await this.getById(ior.insertedId);
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async updateTitle(
        body: UpdateTitleDto,
        userId: ObjectId
    ): Promise<UpdateResult> {
        console.log({ cardId: body.cardId });
        const boardId = (await this.getById(body.cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: body.cardId },
            {
                $set: {
                    'title': body.title
                },
            },
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(boardId.toHexString(), body.cardId.toHexString(), "TITLE", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async updateDescription(
        body: UpdateDescriptionDto,
        userId: ObjectId
    ): Promise<UpdateResult> {
        console.log({ cardId: body.cardId });
        const boardId = (await this.getById(body.cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: body.cardId },
            {
                $set: {
                    'description': body.description
                },
            },
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(boardId.toHexString(), body.cardId.toHexString(), "DESCRIPTION", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async attachFile(
        userId: ObjectId, body: AttachFileDto,
    ): Promise<UpdateResult> {
        const boardId = (await this.getById(body.cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);

        const cardModelAttachment: CardModelAttachment = new CardModelAttachment();
        cardModelAttachment.user = await this.userService.getById(userId, true);
        cardModelAttachment.url = body.url;
        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: body.cardId },
            {
                $push: {
                    attachments: cardModelAttachment,
                }
            }
        ).then(async (updateResult: UpdateResult<CardModelDto>) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(boardId.toHexString(), body.cardId.toHexString(), "ATTACHMENT", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        });
    }

    /**
     * API ENDPOINT
     */
    async deleteFile(
        userId: ObjectId,
        body: DeleteFileDto,
    ): Promise<UpdateResult> {
        const boardId = (await this.getById(body.cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: body.cardId },
            {
                $pull: {
                    attachments: {
                        _id: body.attachmentId,
                    },
                },
            },
        ).then(async (updateResult: UpdateResult<CardModelDto>) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(boardId.toHexString(), body.cardId.toHexString(), "ATTACHMENT", userId.toHexString());
            return updateResult;
        }).catch((err) => {
            throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
        });
    }

    /**
     * API ENDPOINT
     */
    async batchUpdateIndexAndState(
        userId: ObjectId,
        body: BatchUpdateIndexAndStateDto,
    ): Promise<BulkWriteResult> {
        const firstCard: CardModelDto = await this.getById(body.cards[0].cardId);
        await this.boardService.isUserBoardAuthorized(firstCard.boardId, userId);

        const bulkUpdate: UnorderedBulkOperation = this.conn.db.collection<CardModelDto>('card').initializeUnorderedBulkOp();
        body.cards.map((e) => {
            const toUpdate: Partial<CardModelDto> = { state: e.state, index: e.index };
            bulkUpdate.find(<CardModelDto>{ _id: e.cardId, boardId: firstCard.boardId }).updateOne({ $set: <CardModelDto>toUpdate });
        });

        return bulkUpdate.execute().then(async (result: BulkWriteResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + firstCard.boardId.toHexString());
            this.websocketGateway.emitUpdateCards(firstCard.boardId.toHexString(), userId.toHexString());
            return result;
        }).catch((error) => { throw error; });
    }

    /**
     * API ENDPOINT
     */
    async delete(cardId: ObjectId, userId: ObjectId): Promise<DeleteResult> {
        const boardId = (await this.getById(cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        return await this.conn.db.collection<CardModelDto>('card').deleteOne({ _id: cardId }).then(async (deleteResult: DeleteResult | null) => {
            if (deleteResult == null)
                throw new HttpException('Card not found', HttpStatus.NOT_FOUND);

            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            return deleteResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT
     */
    async getByBoardIdWithAuth(
        boardId: ObjectId,
        userId: ObjectId,
    ): Promise<Array<CardModelDto>> {
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        return await this.getByBoardId(boardId);
    }

    /**
     * API ENDPOINT
     */
    async postComment(
        cardId: ObjectId,
        userId: ObjectId,
        body: PostCommentDto,
    ): Promise<UpdateResult> {
        const boardId = (await this.getById(cardId)).boardId;
        await this.boardService.isUserBoardAuthorized(boardId, userId);
        const creator = await this.userService.getById(userId);
        let comment = new CardModelCommentDto({
            comment: body.comment,
            creator: creator
        });

        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: cardId },
            { $push: { comments: comment } }
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + boardId.toHexString());
            this.websocketGateway.emitUpdateCards(boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(boardId.toHexString(), cardId.toHexString(), "COMMENTS", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT - TODO
     */
    async assignUser(
        body: AssignUserDto,
        userId: ObjectId
    ): Promise<UpdateResult> {
        const card = (await this.getById(body.cardId));
        await this.boardService.isUserBoardAuthorized(card.boardId, userId);
        if (card.assignedTo.some(user => user._id.toHexString() === body.userId.toHexString()))
            throw new HttpException(HttpStatus.CONFLICT.toString, HttpStatus.CONFLICT);

        const userToAssign = await this.userService.getById(body.userId);
        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: card._id },
            { $push: { assignedTo: userToAssign } }
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + card.boardId.toHexString());
            this.websocketGateway.emitUpdateCards(card.boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(card.boardId.toHexString(), body.cardId.toHexString(), "ASSIGNED_TO", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT - TODO
     */
    async unassignUser(
        body: AssignUserDto,
        userId: ObjectId
    ): Promise<UpdateResult> {
        const card = (await this.getById(body.cardId));
        await this.boardService.isUserBoardAuthorized(card.boardId, userId);
        if (card.assignedTo.find(user => user._id.toHexString() === body.userId.toHexString()) == null)
            throw new HttpException(HttpStatus.CONFLICT.toString, HttpStatus.CONFLICT);

        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: card._id },
            {
                $pull: {
                    assignedTo: {
                        _id: body.userId
                    }
                }
            }
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + card.boardId.toHexString());
            this.websocketGateway.emitUpdateCards(card.boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(card.boardId.toHexString(), body.cardId.toHexString(), "ASSIGNED_TO", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * API ENDPOINT - TODO
     */
    async deleteComment(
        userId: ObjectId,
        body: CardDeleteCommentDto,
    ): Promise<UpdateResult> {
        const card = await this.getById(body.cardId);
        await this.boardService.isUserBoardAuthorized(card.boardId, userId);

        const comment = card.comments.find(({ _id, creator }) => _id.toHexString() == body.commentId.toHexString() && creator._id.toHexString() == userId.toHexString());
        if (comment == null)
            throw new HttpException(HttpStatus.NOT_FOUND.toString(), HttpStatus.NOT_FOUND);

        return await this.conn.db.collection<CardModelDto>('card').updateOne(
            { _id: body.cardId },
            { $pull: { comments: { _id: comment._id } } }
        ).then(async (updateResult: UpdateResult) => {
            await this.cacheManager.del(CACHE_MANAGER_CARD_GET_BY_BOARD_ID + card.boardId.toHexString());
            this.websocketGateway.emitUpdateCards(card.boardId.toHexString(), userId.toHexString());
            this.websocketGateway.emitUpdateCard(card.boardId.toHexString(), body.cardId.toHexString(), "COMMENTS", userId.toHexString());
            return updateResult;
        }).catch((error) => {
            throw error;
        });
    }
}
