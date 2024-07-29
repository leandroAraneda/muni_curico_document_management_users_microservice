import { IsEmail, IsNumber, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsString()
    @MaxLength(100)
    lastname: string;

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsNumber()
    @IsPositive()
    roleId: number;
}