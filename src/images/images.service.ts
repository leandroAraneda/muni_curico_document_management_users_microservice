import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

const { v4: uuidv4 } = require('uuid');

@Injectable()
export class ImagesService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('imagesServiceUsers');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async findImage(type: string, fileName: string) {
    try {
      const validImageTypes = ['users', 'persons'];

      if (!validImageTypes.includes(type)) {
        return {
          status: 400,
          message: 'Invalid image type.',
        };
      }

      let pathImage = path.join(process.cwd(), 'dist', 'uploads', type, fileName);

      if (!fs.existsSync(pathImage)) {
        pathImage = path.join(process.cwd(), 'dist', 'uploads', 'no-image.png');
      }

      const imageBuffer = fs.readFileSync(pathImage).toString('base64');

      return {
        imageBuffer,
        contentType: 'image/jpeg',
      };

    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching the image.',
      });
    }
  }

  async updateImageUser(id: string, type: string, file?: Express.Multer.File) {
    try {
      // validate image types
      const validImageTypes = ['users', 'persons'];
      if (!validImageTypes.includes(type)) {
        return {
          status: 400,
          message: 'Invalid image type.',
        };
      }

      // validate file extensions
      const cutName = file.originalname.split('.');
      const extensionFile = cutName[cutName.length - 1].toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg'];

      if (!validExtensions.includes(extensionFile)) {
        return {
          status: 415,
          message: 'Unsupported Media Type: Invalid image extension.',
        };
      }

      if (file && Buffer.isBuffer(file.buffer)) {
        const fileName = `${uuidv4()}.${extensionFile}`;
        const uploadsPath = path.resolve(process.cwd(), 'dist', 'uploads', type);

        if (!fs.existsSync(uploadsPath)) {
          try {
            fs.mkdirSync(uploadsPath, { recursive: true });
          } catch (error) {
            throw new RpcException({
              status: 500,
              message: `Failed to create directory: ${error.message}`,
            });
          }
        }

        const filePath = path.join(uploadsPath, fileName);

        // process image (size and KB)
        const processedImageBuffer = await this.processImage(file.buffer);
        fs.writeFileSync(filePath, processedImageBuffer);

        await this.updateImage(id, type, fileName);

        return {
          status: 201,
          message: 'file loaded successfully',
          file_name: fileName
        };
      } else {
        throw new RpcException({
          status: 400,
          message: 'No file uploaded',
        });
      }
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while loading an image.',
      });
    }
  }

  async updateImage(id: string, type: string, fileName: string) {
    let oldPath = '';

    switch (type) {
      case 'users':
        const user = await this.users.findUnique({
          where: { id },
          select: { image: true }
        });

        if (!user) return false;

        oldPath = `${process.cwd()}/dist/uploads/users/${user.image}`;
        this.deleteImage(oldPath);

        await this.users.update({
          where: { id },
          data: { image: fileName }
        });
        return true;
    }
  }

  deleteImage(path: string) {
    try {
      if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
        fs.unlinkSync(path);
      }
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while deleting an image.',
      });
    }
  }

  async deleteUserImage(id: string) {
    try {
      const user = await this.users.findUnique({
        where: { id },
        select: { id: true, image: true },
      });

      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'User not found',
        });
      }

      if (user.image) {
        const oldPath = path.join(process.cwd(), 'dist', 'uploads', 'users', user.image);
        this.deleteImage(oldPath);
      }

      await this.updateUserImage(id, null);

      return {
        status: 201,
        message: 'Image updated successfully',
        file_name: 'default image'
      };
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while deleting an image.',
      });
    }
  }

  async updateUserImage(id: string, fileName: string) {
    try {
      await this.users.update({
        where: { id },
        data: { image: fileName },
      });
    } catch (error) {
      return false;
    }
  }

  async processImage(imageBuffer: Buffer): Promise<Buffer> {
    const maxSize = 50 * 1024; // 50 KB

    // the image exceeds 50 KB
    if (imageBuffer.length > maxSize) {
      let quality = 80;
      let compressedBuffer = imageBuffer;

      // reduce quality until size is less than 50 KB
      while (compressedBuffer.length > maxSize && quality > 10) {
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ quality })
          .toBuffer();
        quality -= 10;
      }

      return compressedBuffer;
    }

    // If none of the conditions are met, the original buffer is returned
    return imageBuffer;
  }
}
