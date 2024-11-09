import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as sharp from 'sharp';
const { v4: uuidv4 } = require('uuid');
import { PrismaClient } from '@prisma/client';

import { CreateUserDto } from './dto/create-user.dto';
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

  async findAll() {
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

      if (!users) {
        throw new RpcException({
          status: 204,
          message: 'No user data.',
        });
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
      throw new RpcException({
        status: 204,
        message: `There are no users with the d: ${id}`,
      });
    }

    const user_data = this.convertBigInts({
      ...user,
      roles: user.roles ? {
        ...user.roles,
        id: user.roles.id ? user.roles.id.toString() : null,
      } : null,
    });

    return user_data;
  }

  async findImage(type: string, fileName: string) {
    try {
      const validImageTypes = ['users', 'persons'];

      if (!validImageTypes.includes(type)) {
        throw new RpcException({
          status: 400,
          message: 'Invalid image type.',
        });
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
        throw new RpcException({
          status: 400,
          message: 'User already exists',
        });
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

  async update(id: string, type: string, file?: Express.Multer.File) {
    try {
      // validate image types
      const validImageTypes = ['users', 'persons'];
      if (!validImageTypes.includes(type)) {
        throw new RpcException({
          status: 400,
          message: 'Invalid image type.',
        });
      }

      // validate file extensions
      const cutName = file.originalname.split('.');
      const extensionFile = cutName[cutName.length - 1].toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg'];

      if (!validExtensions.includes(extensionFile)) {
        throw new RpcException({
          status: 415,
          message: 'Unsupported Media Type: Invalid image extension.',
        });
      }

      if (file && Buffer.isBuffer(file.buffer)) {
        const fileName = `${uuidv4()}.${extensionFile}`;
        const uploadsPath = path.join(__dirname, '..', 'uploads', type);

        if (!fs.existsSync(uploadsPath)) {
          fs.mkdirSync(uploadsPath, { recursive: true });
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
      case 'persons':
        const person = await this.users.findUnique({
          where: { id },
          select: { image: true }
        });

        if (!person) return false;

        oldPath = `${process.cwd()}/dist/uploads/persons/${person.image}`;
        this.deleteImage(oldPath);

        await this.users.update({
          where: { id },
          data: { image: fileName }
        });
        return true;
    }
  }

  deleteImage(path: string) {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  convertBigInts(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  }
}