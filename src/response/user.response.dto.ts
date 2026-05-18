import { Expose, Transform } from 'class-transformer';
export class UserResponseDto {
    @Expose()
    @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
    id: string;

    @Expose()
    email: string;

    @Expose()
    firstName: string;

    @Expose()
    lastName: string;

    @Expose()
    role: string;

    @Expose()
    isActive: boolean;
}

export class UserValidatorDto extends UserResponseDto {
    @Expose()
    password: string;
}

export class UserWithRefreshTokenDto extends UserResponseDto {
    @Expose()
    refreshToken: string;
}