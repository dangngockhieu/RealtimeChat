import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'Old Password không được để trống' })
    @IsString()
    oldPassword: string;
    @IsNotEmpty({ message: 'New Password không được để trống' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    })
    @IsString()
    newPassword: string;
    @IsNotEmpty({ message: 'Confirm Password không được để trống' })
    @IsString()
    confirmPassword: string;
}

export class UpdateUserDto {
    @IsOptional()
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email?: string;
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'FirstName không được để trống nếu đã truyền lên' })
    firstName?: string;
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'LastName không được để trống nếu đã truyền lên' })
    lastName?: string;
}