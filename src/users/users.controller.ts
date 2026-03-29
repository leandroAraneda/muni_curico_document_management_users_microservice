import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';


import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @MessagePattern({ cmd: 'find.all.users' })
  findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @MessagePattern({ cmd: 'find.users' })
  findUsers() {
    return this.usersService.findUsers();
  }

  @MessagePattern({ cmd: 'find.user' })
  findUser(@Payload() id: string) {
    return this.usersService.findUser(id);
  }

  @MessagePattern({ cmd: 'create.user' })
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern({ cmd: 'update.user' })
  updateUser(@Payload() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(updateUserDto.id, updateUserDto);
  }

  @MessagePattern({ cmd: 'change.status.user' })
  changeStatusUser(@Payload() id: string) {
    return this.usersService.changeStatusUser(id);
  }
}