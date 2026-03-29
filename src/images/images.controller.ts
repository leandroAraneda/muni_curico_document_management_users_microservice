import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ImagesService } from './images.service';

@Controller()
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @MessagePattern({ cmd: 'find.image' })
  findImage(@Payload() payload: { type: string, fileName: string }) {
    const { type, fileName } = payload;
    return this.imagesService.findImage(type, fileName);
  }

  @MessagePattern({ cmd: 'update.image.user' })
  updateImageUser(@Payload() payload: { id: string, type: string, file: { originalname: string, buffer: string } }) {
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

    return this.imagesService.updateImageUser(id, type, fileToSave);
  }

  @MessagePattern({ cmd: 'delete.user.image' })
  deleteImageUser(@Payload() id: string) {
    return this.imagesService.deleteUserImage(id);
  }
}
