import { registerDecorator } from 'class-validator';
import { CardStateEnum } from 'src/card/card.dto';

export function IsValidCardState() {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsValidCardState',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [
                /* property */
            ],
            options: { message: 'state is nos valid CardState' },
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return false;

                    for (let i = 0; i < Object.keys(CardStateEnum).length; i++)
                        if (Object.keys(CardStateEnum)[i] === value)
                            return true;

                    return false;
                },
            },
        });
    };
}
