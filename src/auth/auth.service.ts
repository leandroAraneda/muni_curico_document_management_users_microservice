import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';

import { PrismaClient } from '@prisma/client';

import { envs } from 'src/config';

import { JwtPayload } from './interfaces/jwt-payload.interface';

import { LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger('AuthService');

    constructor(private readonly jwtService: JwtService) {
        super();
    }

    onModuleInit() {
        this.$connect();
        this.logger.log('Data Base connected');
    }

    async singJWT(payload: JwtPayload) {
        return this.jwtService.sign(payload);
    }

    async verifyToken(token: string) {
        try {
            const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
                secret: envs.jwtSecret,
            });

            return {
                user: user,
                token: await this.singJWT(user),
            }
        } catch (error) {
            throw new RpcException({
                status: 401,
                message: 'Invalid token'
            })
        }
    }

    async loginUser(loginUserDto: LoginUserDto) {
        try {
            const { email, password } = loginUserDto;

            const user = await this.users.findUnique({
                where: {
                    email: email,
                    status: true
                },
            });

            if (!user) {
                throw new RpcException({
                    status: 401,
                    message: 'A user with the provided credentials was not found.',
                });
            }

            const isPasswordValid = bcrypt.compareSync(password, user.password);

            if (!isPasswordValid) {
                throw new RpcException({
                    status: 401,
                    message: 'A user with the provided credentials was not found.',
                });
            }

            const { password: __, roleId, ...rest } = user;

            const serializedUser = {
                ...rest,
                name: `${user.first_name} ${user.paternal_lastname}`,
                roleId: Number(roleId),
            };

            return {
                user: serializedUser,
                token: await this.singJWT(serializedUser),
            };
        } catch (error) {
            throw new RpcException({
                status: 400,
                message: error.message,
            });
        }
    }
}