import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

export const SafeMongoIdTransform = (value: any) => {
    if (ObjectId.isValid(value)) {
        return new ObjectId(value);
    }
    throw new BadRequestException('ObjectId validation fail');
};
