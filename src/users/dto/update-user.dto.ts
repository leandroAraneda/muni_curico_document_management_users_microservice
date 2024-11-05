import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
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

    @IsEmail()
    image: string;

    @IsString()
    password: string;

    @IsString()
    creator_user: string;

    @IsNumber()
    @IsPositive()
    roleId: number;
}
