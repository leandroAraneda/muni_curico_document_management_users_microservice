import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @MessagePattern({ cmd: 'findAll' })
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern({ cmd: 'findAllUsers' })
  findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @MessagePattern({ cmd: 'findUser' })
  findUser(@Payload() id: string) {
    return this.usersService.findUser(id);
  }

  @MessagePattern({ cmd: 'findImage' })
  findImage(@Payload() payload: { type: string, fileName: string }) {
    const { type, fileName } = payload;
    return this.usersService.findImage(type, fileName);
  }

  @MessagePattern({ cmd: 'createUser' })
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern({ cmd: 'updateUser' })
  update(@Payload() payload: { id: string, type: string, file: { originalname: string, buffer: string } }) {
    const { id, type, file } = payload;
    const buffer = Buffer.from(file.buffer, 'base64');

    const fileToSave: Express.Multer.File = {
      fieldname: 'file', // name of the field containing the file
      originalname: file.originalname,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      buffer: buffer,
      size: buffer.length,
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    return this.usersService.update(id, type, fileToSave);
  }

}