import { IsEmail, IsNumber, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @MaxLength(12)
    rut: string;

    @IsString()
    @MaxLength(100)
    first_name: string;

    @IsString()
    @MaxLength(100)
    second_name: string;

    @IsString()
    @MaxLength(100)
    paternal_lastname: string;

    @IsString()
    @MaxLength(100)
    maternal_lastname: string;

    @IsEmail()
    email: string;

    @IsString()
    @MaxLength(100)
    image: string;

    @IsString()
    password: string;

    @IsString()
    creator_user: string;

    @IsNumber()
    @IsPositive()
    roleId: number;
}