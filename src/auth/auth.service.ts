
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    //Cari user berdasarkan email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    //Periksa apakah user ditemukan
    if (!user) {
      throw new UnauthorizedException(
        'Email atau password salah',
      );
    }

    //Periksa apakah akun aktif
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akun kamu sudah dinonaktifkan',
      );
    }

    //Bandingkan password dengan hash di database
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Email atau password salah',
      );
    }

    //Buat payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    //Generate access token
    const accessToken = await this.jwtService.signAsync(
      payload,
    );

    //Kembalikan token dan informasi user
    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
