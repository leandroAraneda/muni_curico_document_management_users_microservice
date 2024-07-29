import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('UsersService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createUserDto: CreateUserDto) {
    const resp = await this.users.create({
      data: createUserDto,
    });

    const resp_data = {
      ...resp,
      roleId: resp.roleId.toString(),
    };

    return resp_data;
  }

  async findAll() {
    const users = await this.users.findMany();

    const users_data = users.map(user => ({
      ...user,
      roleId: user.roleId ? user.roleId.toString() : null,
    }));

    return users_data;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
