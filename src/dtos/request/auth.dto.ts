import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export class LoginRequestDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @IsNotEmpty({ message: 'Password không được để trống' })
    @IsString({ message: 'Password phải là một chuỗi' })
    password: string;
}

export class RegisterRequestDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @IsNotEmpty({ message: 'Password không được để trống' })
    @IsString({ message: 'Password phải là một chuỗi' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
            message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
        })
    password: string;

    @IsNotEmpty({ message: 'FirstName không được để trống' })
    @IsString({ message: 'FirstName phải là một chuỗi' })
    firstName: string;

    @IsNotEmpty({ message: 'LastName không được để trống' })
    @IsString({ message: 'LastName phải là một chuỗi' })
    lastName: string;
}