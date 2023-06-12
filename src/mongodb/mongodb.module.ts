import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [
        {
            provide: 'DATABASE_CONNECTION',
            useFactory: async (): Promise<{ db: Db; client: MongoClient }> => {
                try {
                    const client = await MongoClient.connect(
                        process.env.MONGO_CONNECTION_STRING
                            ? process.env.MONGO_CONNECTION_STRING
                            : 'DEFAULT_DATABASE',
                    );
                    return {
                        db: client.db('minimalist-kanvan'),
                        client: client,
                    };
                } catch (error) {
                    throw error;
                }
            },
        },
    ],
    exports: ['DATABASE_CONNECTION'],
})
export class MongodbModule {}
