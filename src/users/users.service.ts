import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';

import { PrismaClient } from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Injectable()
export class UsersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('UsersService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async singJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async findAllUsers() {
    try {
      const users = await this.users.findMany({
        select: {
          id: true,
          rut: true,
          first_name: true,
          second_name: true,
          paternal_lastname: true,
          maternal_lastname: true,
          email: true,
          image: true,
          creator_user: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!users.length) {
        return {
          status: 204,
          message: 'No user data.',
        };
      }

      const users_data = users.map(user => this.convertBigInts({
        ...user,
        roles: user.roles ? {
          ...user.roles,
          id: user.roles.id ? user.roles.id.toString() : null,
        } : null,
      }));

      return users_data;
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message,
      });
    }
  }

  async findUsers() {
    try {
      const users = await this.users.findMany({
        select: {
          id: true,
          first_name: true,
          second_name: true,
          paternal_lastname: true,
          maternal_lastname: true,
          email: true,
          status: true,
          roles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          paternal_lastname: 'asc',
        },
      });

      if (!users.length) {
        return {
          status: 204,
          message: 'No user data.',
        };
      }

      const users_data = users.map(user => this.convertBigInts({
        ...user,
        roles: user.roles ? {
          ...user.roles,
          id: user.roles.id ? user.roles.id.toString() : null,
        } : null,
      }));

      return users_data;
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message,
      });
    }
  }

  async findUser(id: string) {
    try {
      const user = await this.users.findUnique({
        where: { id },
        select: {
          id: true,
          rut: true,
          first_name: true,
          second_name: true,
          paternal_lastname: true,
          maternal_lastname: true,
          email: true,
          image: true,
          creator_user: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        return {
          status: 204,
          message: 'No user data.',
        };
      }

      const user_data = this.convertBigInts({
        ...user,
        roles: user.roles ? {
          ...user.roles,
          id: user.roles.id ? user.roles.id.toString() : null,
        } : null,
      });

      return user_data;
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching the image.',
      });
    }
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const {
        rut,
        first_name,
        second_name,
        paternal_lastname,
        maternal_lastname,
        email,
        password,
        creator_user,
        roleId
      } = createUserDto;

      const user = await this.users.findFirst({
        where: {
          OR: [
            { rut },
            { email }
          ]
        }
      });

      if (user) {
        return {
          status: 400,
          message: 'User already exists',
        };
      }

      const newUser = await this.users.create({
        data: {
          rut,
          first_name,
          second_name,
          paternal_lastname,
          maternal_lastname,
          email,
          password: bcrypt.hashSync(password, 10),
          creator_user,
          roleId,
        },
      });

      const { password: __, ...rest } = newUser;

      const serializedUser = {
        ...rest,
        name: `${first_name} ${paternal_lastname}`,
        roleId: Number(roleId)
      };

      return {
        user: serializedUser,
        token: await this.singJWT(serializedUser),
        status: 201
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    try {
      let { id: __, ...data } = updateUserDto;

      const currentUser = await this.users.findUnique({
        where: { id },
        select: { email: true }
      });

      if (currentUser.email === data.email) {
        delete data.email;
      } else {
        const emailExists = await this.users.findUnique({
          where: { email: data.email },
          select: { id: true }
        });

        if (emailExists) {
          return {
            status: 409,
            message: 'There is already a user with this email'
          }
        }
      }

      const newUser = await this.users.update({
        where: { id },
        data: data,
      });

      const serializedUser = {
        ...newUser,
        roleId: Number(newUser.roleId),
      };

      const { image, password, ...cleanedUser } = serializedUser;

      return {
        status: 200,
        message: 'User updated successfully',
        newUserData: cleanedUser,
      };
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while updating the user.',
      });
    }
  }

  async changeStatusUser(id: string) {
    try {
      const user = await this.users.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
        },
      });

      if (!user) {
        return {
          status: 204,
          message: `User with id ${id} not found.`,
        };
      }

      const updatedStatus = !user.status;

      await this.users.update({
        where: { id },
        data: { status: updatedStatus },
      });

      return {
        status: 200,
        message: 'User status updated successfully',
        userId: id,
        newStatus: updatedStatus,
      };
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while updating the user status.',
      });
    }
  }

  convertBigInts(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  }
}